'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  ArrowDownLeft, 
  TrendingUp, 
  Gift, 
  Calendar,
  User,
  Tag,
  ChevronLeft,
  RefreshCw,
  Copy,
  Check,
  DollarSign,
  X,
  Send,
  History
} from 'lucide-react';
import Link from 'next/link';

interface ReferralTransaction {
  _id: string;
  fromUser: {
    _id: string;
    username: string;
    email: string;
  };
  amount: number;
  couponCode: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
}

interface WalletData {
  currentBalance: number;
  totalEarned: number;
  totalTransactions: number;
  transactions: ReferralTransaction[];
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData>({
    currentBalance: 0,
    totalEarned: 0,
    totalTransactions: 0,
    transactions: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    // Check authentication
    const currentUser = localStorage.getItem('user');
    if (!currentUser) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(currentUser));
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wallet', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }

      const data = await response.json();
      if (data.success) {
        setWalletData(data.wallet);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openWithdrawModal = () => {
    setWithdrawAmount('');
    setUpiId('');
    setShowWithdrawModal(true);
  };

  const handleWithdrawRequest = async () => {
    const amount = Number(withdrawAmount);

    // Validation
    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > walletData.currentBalance) {
      alert(`Insufficient balance. Your current balance is ₹${walletData.currentBalance}`);
      return;
    }

    if(amount < 50){
      alert('Minimum withdrawal amount is ₹50');
      return;
    }

    if(!upiId || upiId.trim() === ''){
      alert('Please enter your UPI ID');
      return;
    }

    setRequesting(true);
    console.log('Submitting withdrawal request:', { amount, upiId: upiId.trim() });

    try {
      const response = await fetch('/api/wallet/email', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, upiId: upiId.trim() })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Withdrawal request for ₹${amount} submitted successfully! We'll process it within 3-5 business days.`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
      } else {
        alert(data.error || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      alert('Failed to submit withdrawal request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setWithdrawAmount(amount.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your wallet...</p>
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
            <Link href="/dashboard">
              <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </Link>
            <h1 className="text-xl font-bold">My Wallet</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

             <Link href="/wallet/history">
            <button 
              disabled={refreshing}
              className=" p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <History className={`w-5 h-5`} />
            </button>
            </Link>
          </div>

          {/* Wallet Balance Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Current Balance</p>
                  <h2 className="text-3xl font-bold">₹{walletData.currentBalance}</h2>
                </div>
              </div>
            </div>

            {/* Withdraw Button */}
            <button
              onClick={openWithdrawModal}
              className="w-full mt-4 bg-white text-orange-600 py-3 px-4 rounded-xl font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Send className="w-5 h-5" />
              Request Withdrawal
            </button>

            

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <p className="text-xs text-white/80">Total Earned</p>
                </div>
                <p className="text-xl font-bold">₹{walletData.totalEarned}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-white/80" />
                  <p className="text-xs text-white/80">Referrals</p>
                </div>
                <p className="text-xl font-bold">{walletData.totalTransactions}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
          <span className="text-sm text-gray-500">
            {walletData.totalTransactions} transaction{walletData.totalTransactions !== 1 ? 's' : ''}
          </span>
        </div>

        {walletData.transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600 mb-6">
              Start sharing your coupons with friends to earn referral rewards!
            </p>
            <Link href="/dashboard">
              <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                Browse Products
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {walletData.transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon */}
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">Referral Reward</p>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          +₹{transaction.amount}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm text-gray-600 truncate">
                          From: <span className="font-medium">{transaction.fromUser.username}</span>
                        </p>
                      </div>

                      {/* Coupon Code */}
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-3.5 h-3.5 text-orange-500" />
                        <button
                          onClick={() => copyToClipboard(transaction.couponCode, transaction._id)}
                          className="flex items-center gap-1 text-sm font-mono font-semibold text-orange-600 hover:text-orange-700"
                        >
                          {transaction.couponCode}
                          {copiedId === transaction._id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Order Number */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Order #{transaction.orderNumber}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(transaction.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount - Desktop */}
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-xl font-bold text-green-600">+₹{transaction.amount}</p>
                    <p className="text-xs text-gray-500 mt-1">Credit</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-2">How does it work?</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">1.</span>
                  <span>Share your coupon code with friends</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">2.</span>
                  <span>They get a discount on their order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">3.</span>
                  <span>You earn 50% of the discount value in your wallet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">4.</span>
                  <span>Request withdrawal when you reach ₹50!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Request Withdrawal</h3>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Current Balance Display */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-orange-600">₹{walletData.currentBalance}</p>
              </div>

              {/* Amount Input */}
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-gray-700">
                  Withdrawal Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0"
                    min="50"
                    max={walletData.currentBalance}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Minimum: ₹50 | Maximum: ₹{walletData.currentBalance}
                </p>
              </div>

              {/* UPI ID Input */}
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-gray-700">
                  UPI ID *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@paytm"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Enter your UPI ID (e.g., 9876543210@paytm, name@oksbi)
                </p>
              </div>

              {/* Balance Warning */}
              {walletData.currentBalance < 50 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-900">
                    <strong>⚠️ Insufficient Balance:</strong> You need at least ₹50 to request a withdrawal. Current balance: ₹{walletData.currentBalance}
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <strong> Processing Time:</strong> Your withdrawal request will be reviewed within 24 hours and processed within 3-5 business days. Amount will be transferred to your UPI ID.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={requesting}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawRequest}
                  disabled={requesting || !withdrawAmount || !upiId.trim() || Number(withdrawAmount) < 50 || Number(withdrawAmount) > walletData.currentBalance}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    requesting || !withdrawAmount || !upiId.trim() || Number(withdrawAmount) < 50 || Number(withdrawAmount) > walletData.currentBalance
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {requesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Request Withdrawal
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