import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { verifyAuth } from '@/lib/serverAuth';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const orderId = params.id;
    
    // Get specific order with detailed information
    const order = await OrderModel.findOne({ 
      _id: orderId,
      user: userId 
    }).populate([
      {
        path: 'products.product',
        select: 'name image category'
      },
      {
        // The path needs to correctly specify the product field in each item
        path: 'planRelated.daySchedule.items.product',
        select: 'name image category'
      }
    ]);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Debug log to see what's being returned
    console.log('Order planRelated:', JSON.stringify(order.planRelated, null, 2));
    
    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}