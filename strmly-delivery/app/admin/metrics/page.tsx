'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, RefreshCw, Clock, TrendingUp, TrendingDown, 
  ChefHat, Truck, Calendar, Filter, BarChart3, Users,
  Timer, Award, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface PerformanceMetrics {
  userId: string;
  userName: string;
  role: 'chef' | 'delivery';
  totalOrders: number;
  averageTime: number;
  fastestTime: number;
  slowestTime: number;
  ordersToday: number;
  averageTimeToday: number;
}

interface PerformanceSummary {
  totalChefs: number;
  totalDeliveryPersonnel: number;
  averageChefTime: number;
  averageDeliveryTime: number;
}

interface PerformanceResponse {
  success: boolean;
  metrics: PerformanceMetrics[];
  summary: PerformanceSummary;
  error?: string;
}

export default function AdminPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'chef' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState<'averageTime' | 'totalOrders' | 'name'>('averageTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const router = useRouter();

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedDate, typeFilter]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/admin/metrics?${params}`, {
        credentials: 'include'
      });

      const data: PerformanceResponse = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch performance data');
      }

      if (data.success) {
        setMetrics(data.metrics);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.userName.toLowerCase();
        bValue = b.userName.toLowerCase();
        break;
      case 'totalOrders':
        aValue = a.totalOrders;
        bValue = b.totalOrders;
        break;
      case 'averageTime':
      default:
        aValue = a.averageTime;
        bValue = b.averageTime;
        break;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getPerformanceColor = (time: number, role: 'chef' | 'delivery') => {
    // Chef: Good < 15min, Average 15-25min, Slow > 25min
    // Delivery: Good < 30min, Average 30-45min, Slow > 45min
    const thresholds = role === 'chef' ? [15, 25] : [30, 45];
    
    if (time <= thresholds[0]) return 'text-green-600 bg-green-50';
    if (time <= thresholds[1]) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPerformanceIcon = (time: number, role: 'chef' | 'delivery') => {
    const thresholds = role === 'chef' ? [15, 25] : [30, 45];
    
    if (time <= thresholds[0]) return <TrendingUp className="w-4 h-4" />;
    if (time <= thresholds[1]) return <Timer className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Link 
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg mr-3 transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Performance Analytics</h1>
                <p className="text-sm text-gray-500">Track chef and delivery performance</p>
              </div>
            </div>
            <button
              onClick={fetchPerformanceData}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'chef' | 'delivery')}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="all">All Roles</option>
                <option value="chef">Chefs Only</option>
                <option value="delivery">Delivery Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'averageTime' | 'totalOrders' | 'name')}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="averageTime">Average Time</option>
                <option value="totalOrders">Total Orders</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Chefs</p>
                    <p className="text-lg font-bold text-blue-700">{summary.totalChefs}</p>
                  </div>
                  <ChefHat className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Avg Chef Time</p>
                    <p className="text-lg font-bold text-green-700">{formatTime(summary.averageChefTime)}</p>
                  </div>
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Delivery Staff</p>
                    <p className="text-lg font-bold text-purple-700">{summary.totalDeliveryPersonnel}</p>
                  </div>
                  <Truck className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600 font-medium">Avg Delivery Time</p>
                    <p className="text-lg font-bold text-orange-700">{formatTime(summary.averageDeliveryTime)}</p>
                  </div>
                  <Timer className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance data...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Unable to Load Data</h3>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <button
              onClick={fetchPerformanceData}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        ) : sortedMetrics.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Performance Data</h3>
            <p className="text-gray-500 text-sm">
              No performance metrics found for {format(new Date(selectedDate), 'MMM d, yyyy')}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMetrics.map((metric) => (
              <div key={metric.userId} className="bg-white rounded-2xl shadow-md overflow-hidden">
                {/* Header */}
                <div className={`px-4 py-3 ${
                  metric.role === 'chef' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                    : 'bg-gradient-to-r from-purple-500 to-purple-600'
                }`}>
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      {metric.role === 'chef' ? (
                        <ChefHat className="w-6 h-6 mr-3" />
                      ) : (
                        <Truck className="w-6 h-6 mr-3" />
                      )}
                      <div>
                        <h3 className="font-bold text-lg">{metric.userName}</h3>
                        <p className="text-sm opacity-90 capitalize">{metric.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        getPerformanceColor(metric.averageTime, metric.role)
                      }`}>
                        {getPerformanceIcon(metric.averageTime, metric.role)}
                        <span className="ml-1">{formatTime(metric.averageTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-700">{metric.totalOrders}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 font-medium">Fastest Time</p>
                      <p className="text-2xl font-bold text-green-700">{formatTime(metric.fastestTime)}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 font-medium">Slowest Time</p>
                      <p className="text-2xl font-bold text-red-700">{formatTime(metric.slowestTime)}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Orders Today</p>
                      <p className="text-2xl font-bold text-blue-700">{metric.ordersToday}</p>
                      {metric.averageTimeToday > 0 && (
                        <p className="text-xs text-blue-500">Avg: {formatTime(metric.averageTimeToday)}</p>
                      )}
                    </div>
                  </div>

                  {/* Performance Insights */}
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}