import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { verifyAuth } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication and ensure user is delivery person
    const decodedToken = await verifyAuth(request);
    const deliveryPersonId = decodedToken.userId;
    
    const { orderId, dayId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    const order = await OrderModel.findById(orderId);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    console.log("Confirming payment for order:", orderId, "by delivery person:", deliveryPersonId);
    console.log("Order payment status:", order.paymentStatus);
    
    // Check if order is COD and already delivered
    if (order.paymentStatus !== 'cod') {
      return NextResponse.json(
        { success: false, error: 'This order is not a COD order' },
        { status: 400 }
      );
    }

    if (order.paymentStatus === 'completed') {
        return NextResponse.json(
          { success: false, error: 'Payment has already been confirmed' },
          { status: 400 }
        );
      }
    
    // Update payment status based on order type
    if (order.orderType === 'freshplan' && order.planRelated?.isCompletePlanCheckout && dayId) {
      // For FreshPlan orders - find the specific day
      const daySchedule = order.planRelated.daySchedule?.find(
        (day: any) => day._id.toString() === dayId
      );
      
      if (!daySchedule) {
        return NextResponse.json(
          { success: false, error: 'Day schedule not found' },
          { status: 404 }
        );
      }
      
      if (daySchedule.status !== 'delivered') {
        return NextResponse.json(
          { success: false, error: 'Order must be delivered before confirming payment' },
          { status: 400 }
        );
      }
      
      // Check if this is the first day (by date order)
      const sortedDays = [...order.planRelated.daySchedule].sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const isFirstDay = sortedDays[0]._id.toString() === dayId;
      
      if (!isFirstDay) {
        return NextResponse.json(
          { success: false, error: 'Payment can only be collected on the first delivery day' },
          { status: 400 }
        );
      }
            
      
      // Mark payment as completed on first day delivery
      order.paymentStatus = 'completed';
      
    } else {
      // For QuickSip orders - check if delivered
      if (order.status !== 'delivered') {
        return NextResponse.json(
          { success: false, error: 'Order must be delivered before confirming payment' },
          { status: 400 }
        );
      }
      
      order.paymentStatus = 'completed';
    }
    
    await order.save();
    
    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully'
    });
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}