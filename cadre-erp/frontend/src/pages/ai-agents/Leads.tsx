import React, { useState } from 'react';
import { RefreshCw, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../utils/api';

interface Lead {
  Id: string;
  CustomerId?: string;
  PhoneNumber: string;
  Summary: string;
  Score: number;
  IsPaused: boolean;
  LastMessageAt: string;
  Name?: string;
}

const Leads: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  const handleFetchLeads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leads');
      setLeads(response.data);
      toast.success('Leads refreshed successfully!');
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    handleFetchLeads();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Controls matching Screenshot 1 */}
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center">
          Cadre Leads
        </h2>
        <button
          onClick={handleFetchLeads}
          disabled={loading}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Card matching Screenshot 2 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Captured Leads ({leads.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Summary</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Score</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Paused</th>
                <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Last Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-500">
                    <p className="mt-2 text-sm">No captured leads yet.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.Id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {lead.Name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {lead.PhoneNumber || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={lead.Summary}>
                      {lead.Summary || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                      {lead.Score ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${lead.IsPaused ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {lead.IsPaused ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                      {lead.LastMessageAt ? new Date(lead.LastMessageAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leads;
