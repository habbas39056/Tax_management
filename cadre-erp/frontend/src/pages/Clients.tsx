import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Copy, Pencil, Eye, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

interface Client {
  id: string;
  full_name: string;
  cnic: string;
  whatsapp_number: string;
  email?: string;
  pin?: string;
  portal_username: string;
  sales_user_id?: string;
  customer_type?: string;
  portal_password_plain?: string;
}

const Clients: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showCustomType, setShowCustomType] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    cnic: '',
    whatsapp_number: '',
    email: '',
    pin: '',
    portal_username: '',
    portal_password: '',
    sales_user_id: '',
    customer_type: ''
  });
  
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [agents, setAgents] = useState<any[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    const fd = new FormData();
    fd.append('file', importFile);

    try {
      const res = await api.post('/clients/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Clients imported successfully!');
      setImportResult(res.data.summary);
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to import clients');
    } finally {
      setImporting(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
      
      const staffRes = await api.get('/users/staff');
      setAgents(staffRes.data.filter((u: any) => u.role_name === 'Sales'));
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Authentication required to view clients.');
      } else {
        toast.error('Failed to fetch data from server.');
      }
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingClient) {
        // Password is often optional on update, so we don't send it if it's empty
        const payload: any = { ...formData };
        if (!payload.portal_password) delete payload.portal_password;
        await api.put(`/clients/${editingClient.id}`, payload);
        toast.success('Client updated successfully!');
      } else {
        await api.post('/clients', formData);
        toast.success('Client created successfully!');
      }

      setIsModalOpen(false);
      setEditingClient(null);
      setShowCustomType(false);
      setFormData({ full_name: '', cnic: '', whatsapp_number: '', email: '', pin: '', portal_username: '', portal_password: '', sales_user_id: '', customer_type: '' });
      fetchClients();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({ full_name: '', cnic: '', whatsapp_number: '', email: '', pin: '', portal_username: '', portal_password: '', sales_user_id: '', customer_type: '' });
    setShowCustomType(false);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      cnic: client.cnic,
      whatsapp_number: client.whatsapp_number,
      email: client.email || '',
      pin: client.pin || '',
      portal_username: client.portal_username,
      portal_password: '', // Don't pre-fill password for security/UX
      sales_user_id: client.sales_user_id || '',
      customer_type: client.customer_type || ''
    });
    setShowCustomType(client.customer_type ? !['Salaried', 'Business', 'NRP', 'FTR', 'Pension', 'PVT', 'SMC'].includes(client.customer_type) : false);
    setIsModalOpen(true);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cnic?.includes(searchQuery) ||
      c.whatsapp_number?.includes(searchQuery);
    const matchesAgent = !selectedAgent || c.sales_user_id === selectedAgent;
    return matchesSearch && matchesAgent;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAgent]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Client Management
        </h2>
        <div className="flex mt-4 sm:ml-4 sm:mt-0 gap-3">
          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Upload className="w-4 h-4 mr-2 text-gray-500" />
            Import Excel
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors duration-200 bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name, CNIC, or WhatsApp..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        {user?.role === 'Super Admin' && (
          <div className="w-full md:w-64">
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="">All Sales Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col pb-24">
        <div className="-mx-4 -my-2 overflow-visible sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-visible shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">CNIC</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">WhatsApp</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Portal Credentials</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Edit</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500 font-medium">No clients found</td>
                    </tr>
                  ) : (
                    paginatedClients.map((client) => (
                      <tr key={client.id} className="transition-colors hover:bg-gray-50">
                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                          <Link to={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                            {client.full_name}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {client.customer_type ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {client.customer_type}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">None</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{client.cnic}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{client.whatsapp_number}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{client.email || <span className="text-gray-400 italic text-xs">None</span>}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs">User: <strong className="text-gray-900">{client.portal_username}</strong></span>
                            {client.portal_password_plain && <span className="text-xs">Pass: <strong className="text-gray-900">{client.portal_password_plain}</strong></span>}
                            {client.pin && <span className="text-xs">PIN: <strong className="text-gray-900">{client.pin}</strong></span>}
                          </div>
                        </td>
                        <td className="relative py-4 pl-3 pr-4 text-sm font-medium text-right whitespace-nowrap sm:pr-6">
                          <Menu as="div" className="relative inline-block text-left">
                            <div>
                              <Menu.Button className="flex items-center text-gray-400 hover:text-indigo-600 focus:outline-none">
                                <span className="sr-only">Open options</span>
                                <MoreVertical className="w-5 h-5" aria-hidden="true" />
                              </Menu.Button>
                            </div>

                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="absolute right-0 z-10 w-48 mt-2 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg outline-none">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <Link
                                        to={`/clients/${client.id}`}
                                        className={`${
                                          active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                                        } group flex items-center px-4 py-2 text-sm`}
                                      >
                                        <Eye className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                        View Details
                                      </Link>
                                    )}
                                  </Menu.Item>
                                  {(user?.role === 'Super Admin' || user?.role === 'Sales') && (
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          onClick={() => openEditModal(client)}
                                          className={`${
                                            active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                                          } group flex items-center w-full px-4 py-2 text-sm`}
                                        >
                                          <Pencil className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                          Edit Client
                                        </button>
                                      )}
                                    </Menu.Item>
                                  )}
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredClients.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">{editingClient ? 'Edit Client' : 'Register New Client'}</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input required type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                <select 
                  value={showCustomType ? 'Custom' : formData.customer_type}
                  onChange={(e) => {
                    if (e.target.value === 'Custom') {
                      setShowCustomType(true);
                      setFormData({ ...formData, customer_type: '' });
                    } else {
                      setShowCustomType(false);
                      setFormData({ ...formData, customer_type: e.target.value });
                    }
                  }}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Type</option>
                  <option value="Salaried">Salaried</option>
                  <option value="Business">Business</option>
                  <option value="NRP">NRP</option>
                  <option value="FTR">FTR</option>
                  <option value="Pension">Pension</option>
                  <option value="PVT">PVT</option>
                  <option value="SMC">SMC</option>
                  <option value="Custom">Custom...</option>
                </select>
                {showCustomType && (
                  <input 
                    type="text" 
                    value={formData.customer_type} 
                    onChange={e => setFormData({ ...formData, customer_type: e.target.value })} 
                    className="block w-full px-3 py-2 mt-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" 
                    placeholder="Enter custom type..." 
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CNIC Number</label>
                <input required type="text" name="cnic" value={formData.cnic} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="12345-1234567-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                  <input required type="text" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="+923001234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="client@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Sales Agent</label>
                <select name="sales_user_id" value={formData.sales_user_id} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                  <option value="">No Agent (Admin Managed)</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.username})</option>)}
                </select>
              </div>
              
              <div className="pt-4 mt-2 border-t border-gray-200">
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Portal Credentials</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Portal Username</label>
                      <input required type="text" name="portal_username" value={formData.portal_username} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="clientusername" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Portal PIN</label>
                      <input type="text" name="pin" value={formData.pin} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder="1234" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Portal Password {editingClient && <span className="text-xs text-gray-400 font-normal">(Leave blank)</span>}</label>
                    <input required={!editingClient} type="text" name="portal_password" value={formData.portal_password} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" placeholder={editingClient ? 'Leave blank' : 'CustomPassword123!'} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Cancel</button>
                <button type="submit" disabled={loading} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  {loading ? 'Saving...' : (editingClient ? 'Save Changes' : 'Create Client')}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Import Clients Modal */}
      <Dialog open={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">Import Clients from Excel</Dialog.Title>
            <p className="text-xs text-gray-500 mb-4 font-medium">
              Supported columns: <strong className="text-gray-700 font-semibold">Full Name</strong> (Required), <strong className="text-gray-700 font-semibold">CNIC</strong>, <strong className="text-gray-700 font-semibold">WhatsApp</strong>, <strong className="text-gray-700 font-semibold">Email</strong>, <strong className="text-gray-700 font-semibold">Customer Type</strong>, <strong className="text-gray-700 font-semibold">Portal Username</strong>, <strong className="text-gray-700 font-semibold">Portal Password</strong>, <strong className="text-gray-700 font-semibold">Portal PIN</strong>.
            </p>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-750">Select File (.xlsx, .xls, .csv)</label>
                <input 
                  required 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)} 
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm font-semibold text-gray-900"
                />
              </div>

              {importResult && (
                <div className="p-3 bg-gray-55 rounded-lg text-xs space-y-1 max-h-48 overflow-y-auto border border-gray-200">
                  <h5 className="font-semibold text-gray-900">Result Summary:</h5>
                  <p className="text-green-600 font-semibold">Successfully Imported: {importResult.successCount}</p>
                  <p className="text-yellow-600 font-semibold">Skipped/Errors: {importResult.skipCount}</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-red-500 space-y-0.5 font-medium">
                      {importResult.errors.map((err: string, i: number) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2 space-x-3">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Cancel</button>
                <button type="submit" disabled={importing || !importFile} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  {importing ? 'Importing...' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Clients;
