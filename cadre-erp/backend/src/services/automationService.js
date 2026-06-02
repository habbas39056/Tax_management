const cron = require('node-cron');
const mysql = require('mysql2/promise');
const { sendWhatsAppMessage } = require('./notificationService');

// DB connection for the cron job
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'Bestfather@51',
  database: process.env.DB_NAME || 'cadre_erp',
  waitForConnections: true,
  connectionLimit: 10
});

const runDueMilestoneCheck = async () => {
  console.log('[Automation] Checking for milestones due today...');
  
  try {
    // Get milestones due today that haven't had a follow-up sent yet
    const [steps] = await pool.query(`
      SELECT 
        ps.id, ps.title as step_title, ps.due_date,
        p.title as project_title,
        c.full_name as client_name, c.whatsapp_number as client_phone
      FROM project_steps_new ps
      JOIN projects p ON ps.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE DATE(ps.due_date) = CURDATE()
      AND ps.status != 'Completed'
      AND ps.follow_up_sent_at IS NULL
    `);

    for (const step of steps) {
      console.log(`[Automation] Sending reminder for "${step.step_title}" to ${step.client_name} (${step.client_phone})`);
      
      // Send WhatsApp
      if (step.client_phone) {
        await sendWhatsAppMessage(
          step.client_phone, 
          'milestone_reminder', 
          [step.client_name, step.step_title, step.project_title, new Date(step.due_date).toLocaleDateString()]
        );
      }

      // Mark as sent
      await pool.query(
        'UPDATE project_steps_new SET follow_up_sent_at = NOW() WHERE id = ?',
        [step.id]
      );
    }
    
    console.log(`[Automation] Processed ${steps.length} milestones.`);
  } catch (error) {
    console.error('[Automation Error]', error);
  }
};

// Schedule to run every day at 10:00 AM (or whatever time is preferred)
// Here we set it to run every hour for testing, but typically once a day is enough
cron.schedule('0 10 * * *', runDueMilestoneCheck);

module.exports = { runDueMilestoneCheck };
