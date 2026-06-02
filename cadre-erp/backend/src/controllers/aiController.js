const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../config/db');

const analyzeBankStatement = async (req, res) => {
  let filePath = null;

  try {
    console.log('=== Bank Statement Analysis Started ===');

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    filePath = req.file.path;
    console.log('File uploaded:', filePath);
    console.log('File size:', req.file.size);
    console.log('File mimetype:', req.file.mimetype);

    // Read & parse the PDF
    console.log('Reading PDF file...');
    const dataBuffer = fs.readFileSync(filePath);
    console.log('PDF buffer size:', dataBuffer.length);

    console.log('Parsing PDF...');
    const pdfData = await pdfParse(dataBuffer);
    const textContent = pdfData.text;
    console.log('Extracted text length:', textContent.length);
    console.log('First 200 chars of text:', textContent.substring(0, 200));

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('GEMINI_API_KEY exists?', !!apiKey);

    if (!apiKey) {
      console.log('API key missing');
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured in .env file' });
    }

    const prompt = `You are a professional financial analyst. I am providing you with the text extracted from a bank statement PDF.
Analyze this bank statement and extract the following information. You must meticulously identify account details, calculate financial turnovers, categorize transactions, identify risks, and provide a compliance summary.

Return the result EXCLUSIVELY as a valid JSON object matching this exact schema:
{
  "accountCredentials": {
    "clientName": "string",
    "bankName": "string",
    "accountType": "string",
    "currency": "string",
    "accountNumber": "string",
    "iban": "string",
    "statementPeriod": "string",
    "branchLocation": "string"
  },
  "financialSummary": {
    "openingBalance": "numeric string (e.g. 8.14)",
    "totalCreditTurnover": "numeric string",
    "totalDebitTurnover": "numeric string",
    "closingBalance": "numeric string",
    "creditCount": "number",
    "debitCount": "number"
  },
  "transactionalBreakdowns": {
    "bankToBankTransfers": { "amount": "numeric string", "relevance": "string (e.g. Aggregated online digital flows)" },
    "cashDeposits": { "amount": "numeric string", "relevance": "string" },
    "chequeDeposits": { "amount": "numeric string", "relevance": "string" },
    "remittance": { "amount": "numeric string", "relevance": "string" },
    "bankingProfits": { "amount": "numeric string", "relevance": "string" },
    "withholdingTax": { "amount": "numeric string", "relevance": "string" }
  },
  "unusualActivity": [
    {
      "title": "string (e.g. Technical Overdrafts / Negative Balance Intervals)",
      "description": "string (Detailed explanation of the risk or unusual pattern)"
    }
  ],
  "generalSummary": "string (A detailed paragraph summarizing the bank activity, compliance notes, and source of wealth declarations)"
}

If any specific value cannot be found, output "N/A" for strings or "0.00" for numeric fields. Do not hallucinate data.

Bank Statement Text:
${textContent.substring(0, 50000)}`;

    // Call Gemini REST API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log('Calling Gemini API...');
    console.log('URL:', geminiUrl.replace(apiKey, 'HIDDEN'));

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json"
        }
      })
    });

    console.log('Gemini API response status:', response.status);
    const geminiData = await response.json();
    console.log('Gemini API response received');

    if (!response.ok) {
      console.error('Gemini API Error Details:', JSON.stringify(geminiData, null, 2));
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({
        message: 'Error communicating with Gemini AI',
        detail: geminiData?.error?.message || 'Unknown error',
        status: response.status
      });
    }

    // Extract text from Gemini response
    const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Gemini response text length:', textResponse?.length || 0);

    if (!textResponse) {
      console.error('Unexpected Gemini response structure:', JSON.stringify(geminiData, null, 2));
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({ message: 'Unexpected response from Gemini AI' });
    }

    // Parse JSON from response
    let parsedData;
    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      const jsonStr = jsonMatch[0];
      parsedData = JSON.parse(jsonStr);
      console.log('Successfully parsed JSON response');

      // Validate required fields and fallbacks
      const fallbackZero = "0";
      if (!parsedData.totalCredits) parsedData.totalCredits = fallbackZero;
      if (!parsedData.totalDebits) parsedData.totalDebits = fallbackZero;
      if (!parsedData.openingBalance) parsedData.openingBalance = fallbackZero;
      if (!parsedData.closingBalance) parsedData.closingBalance = fallbackZero;
      if (!parsedData.bankToBankTransfers) parsedData.bankToBankTransfers = fallbackZero;
      if (!parsedData.cashDeposits) parsedData.cashDeposits = fallbackZero;
      if (!parsedData.chequeDeposits) parsedData.chequeDeposits = fallbackZero;
      if (!parsedData.remittance) parsedData.remittance = fallbackZero;
      if (!parsedData.bankingProfitsAndTax) parsedData.bankingProfitsAndTax = fallbackZero;
      if (!parsedData.summary) parsedData.summary = "Analysis completed but summary not available";
      if (!parsedData.unusualTransactions) parsedData.unusualTransactions = [];

    } catch (parseError) {
      console.error('Failed to parse Gemini JSON:', textResponse);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({
        message: 'AI returned invalid JSON structure',
        raw: textResponse.substring(0, 500)
      });
    }

    // Clean up the uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('File deleted successfully');
    }

    console.log('=== Analysis Complete ===');
    res.json(parsedData);

  } catch (error) {
    console.error('=== AI Analysis Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Clean up file if it exists
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('File cleaned up after error');
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    // Send appropriate error response
    if (error.message.includes('pdf-parse') || error.message.includes('PDF')) {
      res.status(400).json({
        message: 'Failed to parse PDF file. Please ensure it is a valid bank statement.',
        detail: error.message
      });
    } else if (error.message.includes('fetch')) {
      res.status(500).json({
        message: 'Network error while contacting AI service',
        detail: error.message
      });
    } else {
      res.status(500).json({
        message: 'An error occurred during statement analysis',
        detail: error.message,
        errorType: error.name
      });
    }
  }
};

// --- Knowledge Base Methods ---

const getKnowledge = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM knowledge_base ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ message: 'Error fetching knowledge base' });
  }
};

const addKnowledge = async (req, res) => {
  const { topic, content } = req.body;
  if (!topic || !content) {
    return res.status(400).json({ message: 'Topic and content are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO knowledge_base (topic, content) VALUES (?, ?)',
      [topic, content]
    );
    const [newRow] = await db.query('SELECT * FROM knowledge_base WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({ message: 'Error adding knowledge' });
  }
};

const deleteKnowledge = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM knowledge_base WHERE id = ?', [id]);
    res.json({ message: 'Knowledge deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    res.status(500).json({ message: 'Error deleting knowledge' });
  }
};

// --- Evolution API Methods ---

const axios = require('axios');

const getEvolutionStatus = async (req, res) => {
  try {
    const url = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = 'cadre-erp-bot';

    const response = await axios.get(`${url}/instance/connectionState/${instanceName}`, {
      headers: { apikey: apiKey }
    });

    res.json({ state: response.data.instance?.state || 'disconnected' });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Instance doesn't exist yet
      return res.json({ state: 'disconnected' });
    }
    console.error('Error fetching evolution status:', error.message);
    res.status(500).json({ message: 'Error fetching evolution status' });
  }
};

const generateEvolutionQR = async (req, res) => {
  try {
    const url = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = 'cadre-erp-bot';

    // First, try to fetch the existing instance QR
    try {
      const response = await axios.get(`${url}/instance/connect/${instanceName}`, {
        headers: { apikey: apiKey }
      });
      return res.json({ qrCodeBase64: response.data.base64 });
    } catch (err) {
      if (err.response && err.response.status !== 404) {
        throw err;
      }
    }

    // If it doesn't exist (404), create it
    const createResponse = await axios.post(`${url}/instance/create`, {
      instanceName: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    }, {
      headers: { apikey: apiKey }
    });

    res.json({ qrCodeBase64: createResponse.data.qrcode.base64 });
  } catch (error) {
    console.error('Error generating QR:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error generating QR code' });
  }
};

module.exports = { analyzeBankStatement, getKnowledge, addKnowledge, deleteKnowledge, getEvolutionStatus, generateEvolutionQR };