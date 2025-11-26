'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  Filter,
  Search,
  ChevronLeft,
  Send,
  AlertCircle,
  IndianRupee,
  Timer,
  Copy
} from 'lucide-react';

interface WithdrawalRequest {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  transferNote?: string;
  upi_id?: string;
}

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [transferNote, setTransferNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchRequests();
  }, []);

  const checkAdminAndFetchRequests = async () => {
    try {
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      const authResponse = await fetch('/api/admin/auth/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!authResponse.ok) {
        router.push('/admin/login');
        return;
      }

      const authData = await authResponse.json();
      if (!authData.isAdmin) {
        router.push('/admin/login');
        return;
      }

      fetchRequests();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/admin/login');
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/withdraw', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal requests');
      }

      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (request: WithdrawalRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setTransferNote('');
    setShowActionModal(true);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    if (actionType === 'approve' && !transferNote.trim()) {
      alert('Please provide transfer details');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/admin/withdraw/status', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalId: selectedRequest._id,
          status: actionType === 'approve' ? 'approved' : 'rejected',
          transferNote: transferNote.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Withdrawal request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!`);
        setShowActionModal(false);
        setSelectedRequest(null);
        setTransferNote('');
        fetchRequests(); // Refresh list
      } else {
        alert(data.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.userId.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userId.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalAmount: requests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading withdrawal requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
                <p className="text-sm text-gray-500 mt-1">Manage user withdrawal requests</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Timer className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-700 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Approved</p>
                  <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-900">₹{stats.totalAmount}</p>
                </div>
                <IndianRupee className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-black pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <IndianRupee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No withdrawal requests found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Withdrawal requests will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left Section - User Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-orange-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {request.userId.username}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                              : request.status === 'approved'
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{request.userId.email}</p>

                        {request.upi_id && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                              <IndianRupee className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-900 font-mono font-semibold">
                                {request.upi_id}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(request.upi_id!);
                                  alert('UPI ID copied!');
                                }}
                                className="ml-1 p-1 hover:bg-blue-100 rounded"
                              >
                                <Copy className="w-3 h-3 text-blue-600" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Requested: {formatDate(request.requestedAt)}</span>
                          </div>
                          {request.processedAt && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Processed: {formatDate(request.processedAt)}</span>
                            </div>
                          )}
                        </div>

                        {request.transferNote && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                              <strong>Note:</strong> {request.transferNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Amount & Actions */}
                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Amount</p>
                        <p className="text-3xl font-bold text-gray-900">₹{request.amount}</p>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openActionModal(request, 'approve')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => openActionModal(request, 'reject')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className={`p-6 border-b ${
              actionType === 'approve' 
                ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  actionType === 'approve' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {actionType === 'approve' ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <XCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedRequest.userId.username}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-2xl font-bold text-gray-900">₹{selectedRequest.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900">{selectedRequest.userId.email}</span>
                </div>
                {selectedRequest.upi_id && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">UPI ID:</span>
                    <span className="text-sm text-gray-900 font-mono font-semibold">{selectedRequest.upi_id}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-gray-700">
                  {actionType === 'approve' ? 'Transfer Details *' : 'Reason for Rejection (Optional)'}
                </label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder={
                    actionType === 'approve' 
                      ? 'Enter transaction ID, payment method, or other transfer details...'
                      : 'Enter reason for rejection...'
                  }
                  rows={4}
                  className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {actionType === 'approve' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      User will receive an email confirmation with the transfer details you provide.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  disabled={processing}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={processing || (actionType === 'approve' && !transferNote.trim())}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    processing || (actionType === 'approve' && !transferNote.trim())
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : actionType === 'approve'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {actionType === 'approve' ? 'Approve & Send Email' : 'Reject & Notify'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}