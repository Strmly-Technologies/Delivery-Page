import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { verifyAuth } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify delivery authentication
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'delivery') {
      return NextResponse.json(
        { error: 'Unauthorized. Delivery access required.' },
        { status: 403 }
      );
    }

    const { orderId, dayId, status, deliveryTime } = await request.json();
    console.log('Received data for updating delivery status:', { orderId, dayId, status });

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    if (!['picked', 'delivered', 'not-delivered'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be picked, delivered, or not-delivered' },
        { status: 400 }
      );
    }

    console.log('Updating delivery status:', { orderId, dayId, status });

    // Find the order
    const order = await OrderModel.findById(orderId);
    console.log('Order fetched for delivery update:', order);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Map delivery statuses to order statuses
    let orderStatus = status;
    if (status === 'picked') {
      orderStatus = 'out-for-delivery';
    } else if (status === 'delivered') {
      orderStatus = 'delivered';
    } else if (status === 'not-delivered') {
      orderStatus = 'cancelled'; // or keep as 'not-delivered' if you add this to your schema
    }

    if (order.orderType === 'freshplan' && order.planRelated?.daySchedule && dayId) {
      let updated = false;

      // Update the specific day's status
      order.planRelated.daySchedule.forEach((day: any) => {
        if (day._id.toString() === dayId) {
          day.status = orderStatus;        
          updated = true;
        }
      });

      if (!updated) {
        return NextResponse.json(
          { error: 'Day not found in order' },
          { status: 404 }
        );
      }
    } else if (order.orderType === 'quicksip') {
      order.status = orderStatus;
    }

    // Update delivery info based on status
    if (status === 'picked') {
      if (order.orderType === 'quicksip') {
        order.deliveryInfo = {
          ...order.deliveryInfo,
          deliveryPersonId: decodedToken.userId,
          pickedTime: deliveryTime ? new Date(deliveryTime) : new Date()
        }
      } else if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
        order.planRelated.daySchedule.forEach((day: any) => {
          if (day._id.toString() === dayId) {
            day.deliveryInfo = {
              ...day.deliveryInfo,
              deliveryPersonId: decodedToken.userId,
              pickedTime: deliveryTime ? new Date(deliveryTime) : new Date()
            }        
          }
        });
      }
    } else if (status === 'delivered') {
      if (order.orderType === 'quicksip') {
        order.deliveryInfo = {
          ...order.deliveryInfo,
          deliveredTime: deliveryTime ? new Date(deliveryTime) : new Date()
        }
      } else if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
        order.planRelated.daySchedule.forEach((day: any) => {
          if (day._id.toString() === dayId) {
            day.deliveryInfo = {
              ...day.deliveryInfo,
              deliveredTime: deliveryTime ? new Date(deliveryTime) : new Date()
            }        
          }
        });
      }
    } else if (status === 'not-delivered') {
      if (order.orderType === 'quicksip') {
        order.deliveryInfo = {
          ...order.deliveryInfo,
          notDeliveredTime: deliveryTime ? new Date(deliveryTime) : new Date(),
          notDeliveredReason: 'Customer not available' // You can make this dynamic
        }
      } else if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
        order.planRelated.daySchedule.forEach((day: any) => {
          if (day._id.toString() === dayId) {
            day.deliveryInfo = {
              ...day.deliveryInfo,
              notDeliveredTime: deliveryTime ? new Date(deliveryTime) : new Date(),
              notDeliveredReason: 'Customer not available'
            }        
          }
        });
      }
    }

    await order.save();

    console.log('Delivery status updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Delivery status updated successfully'
    });

  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery status' },
      { status: 500 }
    );
  }
}