import React, { useState, useEffect } from 'react';
import { Settings, QrCode, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const AIConfig: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const fetchQRCode = async () => {
    setLoading(true);
    setStatus('connecting');
    try {
      const response = await api.post('/ai/evolution/qr');
      setQrCodeData(response.data.qrCodeBase64);
      toast.success('Generated new QR Code for Evolution API');
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect to Evolution API');
      setStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const response = await api.get('/ai/evolution/status');
        if (response.data.state === 'open') {
          setStatus('connected');
          setQrCodeData(null);
        } else if (response.data.state === 'connecting') {
          setStatus('connecting');
        } else {
          setStatus('disconnected');
        }
      } catch (error) {
        console.error('Status check failed');
      }
    };

    // Check immediately, then poll every 5 seconds
    checkStatus();
    interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center">
          <Settings className="w-8 h-8 mr-3 text-indigo-600" />
          AI Configuration <span className="ml-2 text-sm font-medium bg-blue-100 text-blue-800 py-1 px-2 rounded">Evolution API</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">WhatsApp Integration</h3>
          <p className="text-sm text-gray-600 mb-6">
            Connect your AI agents directly to WhatsApp using the Evolution API. Scan the QR code below using your WhatsApp mobile app to link the session.
          </p>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mb-6">
            {status === 'connected' ? (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900">Successfully Connected</h4>
                <p className="text-sm text-gray-500 mt-1">Your WhatsApp session is active.</p>
              </div>
            ) : qrCodeData ? (
              <div className="text-center">
                <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto mb-4 border p-2 bg-white rounded" />
                <p className="text-sm text-gray-600">Scan this code with WhatsApp</p>
              </div>
            ) : (
              <div className="text-center">
                <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">No active session</p>
              </div>
            )}
          </div>

          <button
            onClick={fetchQRCode}
            disabled={loading || status === 'connected'}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><QrCode className="w-4 h-4 mr-2" /> Generate QR Code</>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">Evolution Service</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">WhatsApp Session</span>
                {status === 'connected' ? (
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                     Active
                   </span>
                ) : (
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                     Disconnected
                   </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Keep your phone connected to the internet. If you log out from your phone, you will need to generate a new QR code here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfig;
