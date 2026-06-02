import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle, TrendingUp, TrendingDown, Info, Download, Wallet, Landmark, Activity, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const AITools: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Validate file type immediately
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error('Please select a PDF file first');
      return;
    }

    const formData = new FormData();
    formData.append('statement', file);

    setLoading(true);
    try {
      const response = await api.post('/ai/analyze-bank-statement', formData, {
        timeout: 60000 // Increased timeout to 60 seconds
      });
      setResult(response.data);
      toast.success('Analysis complete!');
    } catch (error: any) {
      // Better error handling without changing logic
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please try again.');
      } else if (error.response?.status === 500) {
        const serverMsg = error.response?.data?.message || 'Server error. Please ensure API key is configured correctly.';
        const detail = error.response?.data?.detail || error.response?.data?.raw || '';
        toast.error(`${serverMsg} ${detail}`);
      } else if (error.response?.status === 413) {
        toast.error('File too large. Please upload a smaller file.');
      } else if (!error.response) {
        toast.error('Network error. Please check if the server is running.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to analyze document. Ensure API key is set.');
      }
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    
    const element = document.getElementById('pdf-report-content');
    if (!element) {
      toast.error('Report content not found.');
      return;
    }

    const toastId = toast.loading('Generating perfect PDF layout...');
    
    // Dynamically import to save bundle size
    Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]).then(([{ jsPDF }, { default: html2canvas }]) => {
      // Temporarily modify styles for better PDF capture if needed
      const originalScale = element.style.transform;
      element.style.transform = 'scale(1)';

      html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      }).then((canvas) => {
        // Revert styles
        element.style.transform = originalScale;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if the content is taller than one A4 page
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`bank-statement-analytical-report-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast.success('Report downloaded successfully!', { id: toastId });
      }).catch((err) => {
        console.error('Canvas generation failed', err);
        toast.error('Failed to capture report layout.', { id: toastId });
      });
    }).catch(err => {
      console.error('Failed to load PDF libraries', err);
      toast.error('Failed to generate PDF.', { id: toastId });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 pr-2">AI-Powered</span> Bank Statement Analyzer
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Statement</h3>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
              </div>
            </div>

            {file && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-md flex items-center text-sm text-indigo-700">
                <FileText className="w-4 h-4 mr-2" />
                <span className="truncate">{file.name}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className={`mt-4 w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${(!file || loading) ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? (
                <>Analyzing via Gemini AI...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Analyze Statement</>
              )}
            </button>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This tool securely reads PDFs and uses Google's Gemini 2.5 Flash to extract total flow and flag potentially suspicious transactions that need human review.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="md:col-span-2">
          {result ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Analysis Complete</h3>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Summary
                </button>
              </div>

              {/* BEAUTIFUL REPORT LAYOUT */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200" id="pdf-report-content">
                {/* Header Banner */}
                <div className="bg-[#1a365d] text-white px-8 py-6">
                  <h1 className="text-2xl font-bold tracking-wide uppercase">Bank Statement Analytical Report</h1>
                  <p className="text-blue-200 text-sm mt-1">Prepared for Tax Filing & Income Declaration Purposes</p>
                </div>

                <div className="p-8 space-y-8">
                  {/* ACCOUNT CREDENTIALS */}
                  <section>
                    <h2 className="text-[#1a365d] font-bold text-lg mb-4 flex items-center border-l-4 border-[#1a365d] pl-3 uppercase">
                      Account Credentials
                    </h2>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Client Name:</span>
                        <span className="text-gray-900">{result.accountCredentials?.clientName}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Account Number:</span>
                        <span className="text-gray-900">{result.accountCredentials?.accountNumber}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Bank Name:</span>
                        <span className="text-gray-900">{result.accountCredentials?.bankName}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">IBAN:</span>
                        <span className="text-gray-900">{result.accountCredentials?.iban}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Account Type:</span>
                        <span className="text-gray-900">{result.accountCredentials?.accountType}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Statement Period:</span>
                        <span className="text-gray-900">{result.accountCredentials?.statementPeriod}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Currency:</span>
                        <span className="text-gray-900">{result.accountCredentials?.currency}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="font-semibold text-gray-700">Branch/Location:</span>
                        <span className="text-gray-900">{result.accountCredentials?.branchLocation}</span>
                      </div>
                    </div>
                  </section>

                  {/* FINANCIAL SUMMARY & TURNOVER */}
                  <section>
                    <h2 className="text-[#1a365d] font-bold text-lg mb-4 flex items-center border-l-4 border-blue-500 pl-3 uppercase">
                      1. Financial Summary & Turnover
                    </h2>
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-t border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Financial Metric Description</th>
                          <th className="px-4 py-3 font-semibold text-right">Volume (Count)</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount (PKR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">Opening Balance</td>
                          <td className="px-4 py-3 text-right text-gray-500">-</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.financialSummary?.openingBalance}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50 hover:bg-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">Total Credit Turnover (Inward Transactions)</td>
                          <td className="px-4 py-3 text-right text-gray-500">{result.financialSummary?.creditCount || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">+ {result.financialSummary?.totalCreditTurnover}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">Total Debit Turnover (Outward Transactions)</td>
                          <td className="px-4 py-3 text-right text-gray-500">{result.financialSummary?.debitCount || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">- {result.financialSummary?.totalDebitTurnover}</td>
                        </tr>
                        <tr className="border-b border-gray-200 bg-gray-50 font-bold hover:bg-gray-100">
                          <td className="px-4 py-3 text-gray-900">Closing Balance</td>
                          <td className="px-4 py-3 text-right text-gray-500">-</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.financialSummary?.closingBalance}</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  {/* TRANSACTIONAL BREAKDOWNS */}
                  <section>
                    <h2 className="text-[#1a365d] font-bold text-lg mb-4 flex items-center border-l-4 border-blue-500 pl-3 uppercase">
                      2. Transactional Breakdowns (Categorized)
                    </h2>
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-t border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Transaction Mode / Category</th>
                          <th className="px-4 py-3 font-semibold">Inward / Outward</th>
                          <th className="px-4 py-3 font-semibold text-right">Total Amount (PKR)</th>
                          <th className="px-4 py-3 font-semibold">Tax / Operational Relevance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">Bank-to-Bank Online Transfers</td>
                          <td className="px-4 py-3 text-gray-600">Mixed (IBFT/Raast)</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.transactionalBreakdowns?.bankToBankTransfers?.amount}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{result.transactionalBreakdowns?.bankToBankTransfers?.relevance}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50 hover:bg-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">Cash Deposits</td>
                          <td className="px-4 py-3 text-gray-600">Inward</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.transactionalBreakdowns?.cashDeposits?.amount}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{result.transactionalBreakdowns?.cashDeposits?.relevance}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">Cheque Deposits (Clearing)</td>
                          <td className="px-4 py-3 text-gray-600">Inward</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.transactionalBreakdowns?.chequeDeposits?.amount}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{result.transactionalBreakdowns?.chequeDeposits?.relevance}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50 hover:bg-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">Remittance (Foreign/Inbound)</td>
                          <td className="px-4 py-3 text-gray-600">Inward</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.transactionalBreakdowns?.remittance?.amount}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{result.transactionalBreakdowns?.remittance?.relevance}</td>
                        </tr>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">Banking Profits (Mudarabah)</td>
                          <td className="px-4 py-3 text-gray-600">Inward</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.transactionalBreakdowns?.bankingProfits?.amount}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{result.transactionalBreakdowns?.bankingProfits?.relevance}</td>
                        </tr>
                        <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">Withholding Tax (WHT) / FED</td>
                          <td className="px-4 py-3 text-gray-600">Outward (Charges)</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{result.transactionalBreakdowns?.withholdingTax?.amount}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{result.transactionalBreakdowns?.withholdingTax?.relevance}</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  {/* UNUSUAL ACTIVITY & RISK DIAGNOSTICS */}
                  <section>
                    <h2 className="text-[#1a365d] font-bold text-lg mb-4 flex items-center border-l-4 border-blue-500 pl-3 uppercase">
                      3. Unusual Activity & Risk Diagnostics
                    </h2>
                    <div className="space-y-4">
                      {result.unusualActivity && result.unusualActivity.length > 0 ? (
                        result.unusualActivity.map((activity: any, i: number) => (
                          <div key={i} className="pl-4 border-l-4 border-orange-500 py-1">
                            <h4 className="font-semibold text-orange-600 text-sm">{activity.title}</h4>
                            <p className="text-gray-700 text-sm mt-1">{activity.description}</p>
                          </div>
                        ))
                      ) : (
                        <div className="pl-4 border-l-4 border-green-500 py-1">
                          <h4 className="font-semibold text-green-600 text-sm">No Unusual Activity Detected</h4>
                          <p className="text-gray-700 text-sm mt-1">The transaction pattern appears consistent with standard account usage.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* GENERAL SUMMARY */}
                  <section className="pt-4 border-t border-gray-200">
                    <h2 className="text-[#1a365d] font-bold text-lg mb-4 flex items-center border-l-4 border-blue-500 pl-3 uppercase">
                      4. General Summary & Tax Compliance Notes
                    </h2>
                    <p className="text-gray-700 text-sm text-justify leading-relaxed">
                      {result.generalSummary}
                    </p>
                  </section>
                  
                  {/* FOOTER */}
                  <div className="pt-8 text-center border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                      COMPUTER GENERATED TAX COMPLIANCE FACILITATION SUMMARY — NO SIGNATURE REQUIRED
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full min-h-[400px] flex items-center justify-center p-8 text-center">
              <div>
                <Activity className="mx-auto h-16 w-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Statement Analyzed</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                  Upload a bank statement PDF and click Analyze to generate an advanced AI financial breakdown.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITools;