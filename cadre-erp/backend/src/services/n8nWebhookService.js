const axios = require('axios');

class N8nWebhookService {
  constructor() {
    this.webhookUrl = 'https://n8n-n8n.o1nqjj.easypanel.host/webhook/d3b8edc9-a549-4f0e-ab14-794b493e44df';
  }

  /**
   * Sanitizes and formats phone numbers into the strict international format.
   * Converts numbers like '03001234567' to '923001234567'.
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-numeric characters (spaces, dashes, plus signs, brackets)
    let cleaned = phone.replace(/\D/g, '');

    // Common Pakistan format correction (starts with 03, needs to be 923)
    if (cleaned.startsWith('03') && cleaned.length === 11) {
      cleaned = '92' + cleaned.substring(1);
    }
    // If they provided a 10 digit number missing the leading 0 or 92
    else if (cleaned.startsWith('3') && cleaned.length === 10) {
      cleaned = '92' + cleaned;
    }

    return cleaned;
  }

  /**
   * Sends a webhook payload to n8n.
   */
  async sendWebhook(phoneNumber, eventType, data = {}) {
    if (!phoneNumber) {
      console.warn('Cannot send n8n webhook: No phone number provided.');
      return;
    }

    const formattedId = this.formatPhoneNumber(phoneNumber);
    if (!formattedId) return;

    try {
      console.log(`[n8n Webhook] Sending '${eventType}' to ${formattedId}...`);

      const payload = {
        phone: formattedId,
        originalPhone: phoneNumber,
        event_type: eventType,
        ...data
      };

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`[n8n Webhook] Successfully sent '${eventType}' to ${formattedId}. Status: ${response.status}`);
    } catch (error) {
      console.error(`[n8n Webhook] Failed to send '${eventType}' to ${formattedId}:`, error?.response?.data || error.message);
    }
  }
}

// Export as a singleton instance
const n8nWebhookService = new N8nWebhookService();
module.exports = n8nWebhookService;
