const mysql = require('mysql2/promise');
require('dotenv').config();
async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Bestfather@51', database: 'cadre_erp' });
  try {
    const query = `
      SELECT id, entry_date, party_client, description, payment_mode, bank, reference_number, receipt, payment, balance, created_at, 'cashbook' as source
      FROM cashbook_entries
      
      UNION ALL
      
      SELECT ip.id, ip.payment_date as entry_date, c.full_name as party_client, 
             CONCAT('Invoice Payment', IF(ip.notes IS NOT NULL AND ip.notes != '', CONCAT(' - ', ip.notes), '')) as description, 
             ip.payment_mode, ip.bank as bank, ip.transaction_id as reference_number, 
             ip.amount as receipt, 0 as payment, 0 as balance, ip.payment_date as created_at, 'invoice_payment' as source
      FROM invoice_payments ip
      JOIN invoices i ON ip.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id

      UNION ALL
      
      SELECT cp.id, cp.payment_date as entry_date, c.full_name as party_client, 
             'Client Payment' as description, 
             cp.payment_method as payment_mode, NULL as bank, cp.reference_number as reference_number, 
             cp.amount as receipt, 0 as payment, 0 as balance, cp.payment_date as created_at, 'client_payment' as source
      FROM client_payments cp
      JOIN invoices i ON cp.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id
      
      ORDER BY entry_date DESC, created_at DESC
    `;
    const [res] = await pool.query(query);
    console.log('Success, entries:', res.length);
  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit();
}
test();
