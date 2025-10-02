import React, { useEffect, useState } from 'react';
import { fetchOrders } from '@/lib/api'; // Adjust the import based on your project structure

const DashboardOverview = () => {
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    revenue: 0
  });

  useEffect(() => {
    const getOrders = async () => {
      try {
        const ordersData = await fetchOrders();
        setOrders(ordersData);

        // Calculate order statistics
        const stats = calculateOrderStats(ordersData);
        setOrderStats(stats);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    getOrders();
  }, []);

  // Correctly calculate order statistics
  const calculateOrderStats = (orders) => {
    const stats = {
      total: orders.length,
      pending: 0,
      accepted: 0,
      outForDelivery: 0,
      delivered: 0,
      cancelled: 0,
      revenue: 0
    };

    orders.forEach(order => {
      // Increment the appropriate status counter
      stats[order.status]++;
      
      // Calculate revenue from completed orders
      if (order.status === 'delivered') {
        stats.revenue += order.total;
      }
    });

    return stats;
  };

  // Update UI to show statistics correctly
  return (
    <div className="dashboard-overview">
      <h2>Dashboard Overview</h2>
      <div className="order-stats">
        <div className="stat-item">
          <h4>Total Orders</h4>
          <p>{orderStats.total}</p>
        </div>
        <div className="stat-item">
          <h4>Pending</h4>
          <p>{orderStats.pending}</p>
        </div>
        <div className="stat-item">
          <h4>Accepted</h4>
          <p>{orderStats.accepted}</p>
        </div>
        <div className="stat-item">
          <h4>Out for Delivery</h4>
          <p>{orderStats.outForDelivery}</p>
        </div>
        <div className="stat-item">
          <h4>Delivered</h4>
          <p>{orderStats.delivered}</p>
        </div>
        <div className="stat-item">
          <h4>Cancelled</h4>
          <p>{orderStats.cancelled}</p>
        </div>
        <div className="stat-item">
          <h4>Total Revenue</h4>
          <p>${orderStats.revenue.toFixed(2)}</p>
        </div>
      </div>
      {/* ...existing code for charts or other statistics... */}
    </div>
  );
};

export default DashboardOverview;