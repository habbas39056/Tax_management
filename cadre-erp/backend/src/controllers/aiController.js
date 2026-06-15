const fs = require('fs');
const db = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

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

    const prompt = `You are a professional financial analyst specializing in Pakistani bank statements. I am providing you with a bank statement PDF.

IMPORTANT: Bank statements come in many different formats. Some have clear "Credit" and "Debit" columns, but many do NOT. You must handle ALL formats including:
- Statements with only a single "Amount" column (use Dr/Cr markers, +/- signs, or running balance changes to determine if a transaction is credit or debit)
- Statements with "Withdrawals" and "Deposits" instead of "Debit" and "Credit"
- Statements where credits and debits are in the same column distinguished by positive/negative values
- Statements with "Dr" / "Cr" suffixes on amounts
- Statements that only show a running balance (calculate individual transactions by comparing consecutive balances)
- Statements in any language or layout format
- Scanned or image-based statement PDFs

To determine credits vs debits when headers are missing:
1. If there's a running balance column, compare consecutive rows: if balance increases, it's a credit; if it decreases, it's a debit
2. Look for keywords in descriptions like "deposit", "transfer in", "credit", "received", "salary" (credits) vs "withdrawal", "payment", "debit", "transfer out", "charge" (debits)
3. Look for Dr/Cr notation anywhere in the row
4. If amounts have +/- signs, positive = credit, negative = debit

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

CRITICAL RULES:
- You MUST always return a valid JSON response regardless of the statement format.
- If any specific value cannot be found, output "N/A" for strings or "0.00" for numeric fields.
- If the document format is unusual, do your BEST to extract whatever information is available. Never refuse to analyze.
- Do not hallucinate data. Only report what you can extract or reasonably infer from the document.`;

    // 1. Upload PDF to Gemini File API
    console.log('Uploading PDF to Gemini File Manager...');
    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: "application/pdf",
      displayName: "Bank Statement",
    });
    console.log('Upload successful. File URI:', uploadResult.file.uri);

    // 2. Wait for file to be fully processed (critical for large PDFs 150+ pages)
    let fileState = uploadResult.file.state;
    let fileInfo = uploadResult.file;
    console.log('Initial file state:', fileState);
    
    while (fileState === 'PROCESSING') {
      console.log('File still processing, waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      fileInfo = await fileManager.getFile(uploadResult.file.name);
      fileState = fileInfo.state;
      console.log('File state:', fileState);
    }

    if (fileState === 'FAILED') {
      console.error('File processing failed');
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'Failed to process PDF. The file may be too large or corrupted.' });
    }

    console.log('File is ACTIVE and ready for analysis');

    // 3. Call Gemini SDK
    console.log('Calling Gemini API...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We use gemini-2.5-flash as originally configured
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: fileInfo.mimeType,
                fileUri: fileInfo.uri,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
      },
    });

    console.log('Gemini API response received');
    const textResponse = result.response.text();
    console.log('Gemini response text length:', textResponse?.length || 0);

    if (!textResponse) {
      console.error('Unexpected Gemini response structure');
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
      if (!parsedData.financialSummary) parsedData.financialSummary = {};
      if (!parsedData.financialSummary.totalCreditTurnover) parsedData.financialSummary.totalCreditTurnover = parsedData.totalCredits || fallbackZero;
      if (!parsedData.financialSummary.totalDebitTurnover) parsedData.financialSummary.totalDebitTurnover = parsedData.totalDebits || fallbackZero;
      if (!parsedData.financialSummary.openingBalance) parsedData.financialSummary.openingBalance = parsedData.openingBalance || fallbackZero;
      if (!parsedData.financialSummary.closingBalance) parsedData.financialSummary.closingBalance = parsedData.closingBalance || fallbackZero;

      if (!parsedData.transactionalBreakdowns) parsedData.transactionalBreakdowns = {};

      if (!parsedData.generalSummary) {
        if (parsedData.summary) {
          parsedData.generalSummary = parsedData.summary;
        } else {
          parsedData.generalSummary = "Analysis completed but summary not available.";
        }
      }
      
      if (!parsedData.unusualActivity) {
        if (parsedData.unusualTransactions) {
          parsedData.unusualActivity = parsedData.unusualTransactions;
        } else {
          parsedData.unusualActivity = [];
        }
      }

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