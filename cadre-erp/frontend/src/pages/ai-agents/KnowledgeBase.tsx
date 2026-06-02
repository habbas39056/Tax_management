import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface KnowledgeItem {
  id: number;
  topic: string;
  content: string;
}

const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');

  const fetchKnowledge = async () => {
    try {
      const response = await api.get('/ai/knowledge');
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch knowledge base');
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newContent.trim()) {
      toast.error('Please fill in both fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ai/knowledge', {
        topic: newTopic,
        content: newContent
      });
      setItems([response.data, ...items]);
      setNewTopic('');
      setNewContent('');
      setIsModalOpen(false);
      toast.success('Added to knowledge base');
    } catch (error) {
      toast.error('Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await api.delete(`/ai/knowledge/${id}`);
      setItems(items.filter(item => item.id !== id));
      toast.success('Entry deleted');
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header section matching screenshot */}
      <div className="flex flex-col space-y-2">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Knowledge Base</h1>
        <p className="text-gray-500 text-sm">Manage bot knowledge and custom mappings.</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Knowledge Base</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-8 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider w-1/3">
                  Topic / Question
                </th>
                <th className="px-8 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Content Mapping
                </th>
                <th className="px-8 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-center w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-gray-500">
                    No entries found. Click the + button to add knowledge.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 align-top font-bold text-gray-800">
                      {item.topic}
                    </td>
                    <td className="px-8 py-5 align-top text-gray-600">
                      {item.content}
                    </td>
                    <td className="px-8 py-5 align-top text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Add Knowledge Entry</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Topic / Question</label>
                <input
                  type="text"
                  required
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. Company Profile charges"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Content Mapping</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. Rs 500 per page"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Adding...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
