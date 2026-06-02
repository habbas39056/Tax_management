import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Commissions: React.FC = () => {
  const [commissions, setCommissions] = useState<any[]>([]);

  const fetchCommissions = async () => {
    try {
      const res = await api.get('/finance/commissions');
      setCommissions(res.data);
    } catch (error) {
      toast.error('Failed to load commissions');
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Sales Commissions
        </h2>
      </div>

      <div className="flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Sales Agent</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Client</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Invoice</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commissionable Base</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rate</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commission Earned</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No commissions generated yet.
                      </td>
                    </tr>
                  ) : (
                    commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-gray-50">
                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                          <div className="flex items-center">
                            <DollarSign className="text-green-500 w-4 h-4 mr-1" />
                            {comm.sales_name}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{comm.client_name}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">Rs. {comm.total_amount}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">Rs. {comm.base_amount}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{comm.commission_rate}%</td>
                        <td className="px-3 py-4 text-sm font-bold text-green-600 whitespace-nowrap">Rs. {comm.commission_amount}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${comm.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Commissions;
