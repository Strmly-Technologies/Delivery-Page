'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  DollarSign,
  RefreshCw,
  FileText
} from 'lucide-react';
import Link from 'next/link';

interface WithdrawalHistory {
  _id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  transferNote?: string;
}

export default function WithdrawalHistoryPage() {
  const [history, setHistory] = useState<WithdrawalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/');
      return;
    }
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wallet/history', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal history');
      }

      const data = await response.json();
      if (data.success) {
        console.log('Fetched withdrawal history:', data);
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
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

  const stats = {
    total: history.length,
    pending: history.filter(h => h.status === 'pending').length,
    approved: history.filter(h => h.status === 'approved').length,
    rejected: history.filter(h => h.status === 'rejected').length,
    totalWithdrawn: history
      .filter(h => h.status === 'approved')
      .reduce((sum, h) => sum + h.amount, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading withdrawal history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/wallet">
              <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </Link>
            <h1 className="text-xl font-bold">Withdrawal History</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-xs text-white/80 mb-1">Total Requests</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-xs text-white/80 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-200">{stats.pending}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-xs text-white/80 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-200">{stats.approved}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-xs text-white/80 mb-1">Withdrawn</p>
              <p className="text-2xl font-bold">₹{stats.totalWithdrawn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No withdrawal history</h3>
            <p className="text-gray-600 mb-6">
              You haven't made any withdrawal requests yet
            </p>
            <Link href="/wallet">
              <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                Back to Wallet
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.status === 'pending'
                          ? 'bg-yellow-100'
                          : item.status === 'approved'
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}>
                        {item.status === 'pending' ? (
                          <Clock className="w-6 h-6 text-yellow-600" />
                        ) : item.status === 'approved' ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">
                            Withdrawal Request
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : item.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Requested: {formatDate(item.requestedAt)}</span>
                          </div>
                          
                          {item.processedAt && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Processed: {formatDate(item.processedAt)}</span>
                            </div>
                          )}
                        </div>

                        {item.transferNote && (
                          <div className={`mt-3 p-3 rounded-lg border ${
                            item.status === 'approved'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <p className={`text-sm font-medium mb-1 ${
                              item.status === 'approved' ? 'text-green-900' : 'text-yellow-900'
                            }`}>
                              {item.status === 'approved' ? 'Transfer Details' : 'Note'}
                            </p>
                            <p className={`text-sm ${
                              item.status === 'approved' ? 'text-green-800' : 'text-yellow-800'
                            }`}>
                              {item.transferNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500 mb-1">Amount</p>
                      <p className="text-2xl font-bold text-gray-900">₹{item.amount}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}