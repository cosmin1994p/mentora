import { useState, useEffect } from 'react';
import { Building2, Check, X, Edit2, Shield, Search } from 'lucide-react';
import apiService from '../utils/api';

export function AdminCompanyRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    industry: '',
    expectedSeats: '',
    website: ''
  });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await apiService.companies.getRequests();
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to load company requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiService.companies.approveRequest(id);
      loadRequests();
    } catch (err) {
      console.error('Failed to approve request:', err);
      alert('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiService.companies.rejectRequest(id, 'Rejected by admin');
      loadRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
      alert('Failed to reject request');
    }
  };

  const startEdit = (req: any) => {
    setEditingId(req._id);
    setEditForm({
      name: req.companyDetails.name || '',
      industry: req.companyDetails.industry || '',
      expectedSeats: req.companyDetails.expectedSeats || '',
      website: req.companyDetails.website || ''
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await apiService.companies.updateRequest(id, editForm);
      setEditingId(null);
      loadRequests();
    } catch (err) {
      console.error('Failed to update request:', err);
      alert('Failed to save changes');
    }
  };

  if (loading) return <div className="text-gray-400 p-8 text-center">Loading requests...</div>;
  if (error) return <div className="text-red-400 p-8 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#FF5530]" />
          Company Profile Requests
        </h2>
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No company requests found.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {requests.map(req => (
              <div key={req._id} className="p-6 transition-colors hover:bg-white/5">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  
                  {/* Left: Requester Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#FF5530]/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#FF5530]" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium truncate">
                          {req.requester?.fullName || req.requester?.username} 
                          <span className="text-gray-500 text-sm font-normal ml-2">({req.requester?.email})</span>
                        </h3>
                        <p className="text-sm text-gray-400">
                          Requested on {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <span className={`ml-auto px-2.5 py-1 text-xs rounded-full font-medium ${
                        req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>

                    {/* Company Details Block */}
                    <div className="ml-13 bg-black/20 rounded-xl p-4 mt-4 border border-white/5">
                      {editingId === req._id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Company Name</label>
                            <input 
                              type="text" 
                              value={editForm.name} 
                              onChange={e => setEditForm({...editForm, name: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Industry</label>
                            <input 
                              type="text" 
                              value={editForm.industry} 
                              onChange={e => setEditForm({...editForm, industry: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Expected Seats</label>
                            <input 
                              type="text" 
                              value={editForm.expectedSeats} 
                              onChange={e => setEditForm({...editForm, expectedSeats: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Website</label>
                            <input 
                              type="text" 
                              value={editForm.website} 
                              onChange={e => setEditForm({...editForm, website: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Company Name</span>
                            <span className="text-sm text-gray-200 font-medium">{req.companyDetails.name}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Industry</span>
                            <span className="text-sm text-gray-300">{req.companyDetails.industry || '-'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Seats</span>
                            <span className="text-sm text-gray-300">{req.companyDetails.expectedSeats || '-'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Website</span>
                            <span className="text-sm text-blue-400 truncate block">
                              {req.companyDetails.website || '-'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 md:pt-0">
                      {editingId === req._id ? (
                        <>
                          <button 
                            onClick={() => saveEdit(req._id)}
                            className="px-4 py-2 bg-[#FF5530] text-white text-sm font-medium rounded-lg hover:bg-[#FF5530]/90 transition-colors"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEdit(req)}
                            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                            title="Edit details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(req._id)}
                            className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                            title="Reject request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleApprove(req._id)}
                            className="p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20"
                            title="Approve request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
