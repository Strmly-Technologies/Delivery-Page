import React from 'react';

const OrderCard = ({ order, isAdmin = false, onStatusChange }) => {
  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch('/api/orders/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          status: newStatus
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      
      const data = await response.json();
      if (onStatusChange && data.success) {
        onStatusChange(order.id, newStatus);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Show an error notification to the user
    }
  };

  // Get the appropriate status label and color
  const getStatusDisplay = () => {
    const statusMap = {
      pending: { label: 'Pending', color: 'bg-yellow-500' },
      accepted: { label: 'Accepted', color: 'bg-blue-500' },
      outForDelivery: { label: 'Out For Delivery', color: 'bg-purple-500' },
      delivered: { label: 'Delivered', color: 'bg-green-500' },
      cancelled: { label: 'Cancelled', color: 'bg-red-500' }
    };
    
    return statusMap[order.status] || { label: order.status, color: 'bg-gray-500' };
  };

  const { label, color } = getStatusDisplay();

  return (
    <div className="order-card">
      {/* ...existing code... */}
      <div className="order-status">
        <span className={`status-badge ${color}`}>{label}</span>
      </div>
      
      {isAdmin && (
        <div className="status-actions">
          <button onClick={() => handleStatusChange('accepted')}>Accept</button>
          <button onClick={() => handleStatusChange('outForDelivery')}>Out for Delivery</button>
          <button onClick={() => handleStatusChange('delivered')}>Delivered</button>
          <button onClick={() => handleStatusChange('cancelled')}>Cancel</button>
        </div>
      )}
      {/* ...existing code... */}
    </div>
  );
};

export default OrderCard;