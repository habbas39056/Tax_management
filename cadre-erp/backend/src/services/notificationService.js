const axios = require('axios');

const sendWhatsAppMessage = async (to, templateName, variables) => {
  console.log('[WhatsApp Notification] Sending', templateName, 'to', to, 'with variables:', variables);
  
  if (!process.env.WHATSAPP_TOKEN) {
    console.warn('WhatsApp Token not configured. Skipping real message.');
    return;
  }

  try {
    const response = await axios.post(
      'https://graph.facebook.com/v17.0/' + process.env.WHATSAPP_PHONE_ID + '/messages',
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: variables.map(v => ({ type: 'text', text: v }))
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': 'Bearer ' + process.env.WHATSAPP_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);
  }
};

module.exports = { sendWhatsAppMessage };
