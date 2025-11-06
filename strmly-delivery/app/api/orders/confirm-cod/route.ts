import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Find the order
    const order = await OrderModel.findById(orderId);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Verify order belongs to user
    if (order.user.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Update order status to confirmed with COD payment
    order.paymentStatus = 'cod';
    order.status = 'pending';
    await order.save();
    
    // Update FreshPlan status if applicable
    if (order.orderType === 'freshplan' && order.planRelated?.isCompletePlanCheckout) {
      const planId = order.planRelated.planId;
      
      await UserModel.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            'freshPlan.paymentComplete': true,
            'freshPlan.orderId': order._id 
          } 
        }
      );

      const user = await UserModel.findById(userId);
      const freshplans = user?.freshPlans || [];
      
      if (freshplans.length > 0) {
        for (let i = 0; i < freshplans.length; i++) {
          if (freshplans[i]._id.toString() === planId) {
            freshplans[i].paymentComplete = true;
            break;
          }
        }
        
        await UserModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              freshPlans: freshplans
            }
          }
        );  
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'COD order confirmed successfully',
      orderId: order._id
    });
    
  } catch (error) {
    console.error('Error confirming COD order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm COD order' },
      { status: 500 }
    );
  }
}