import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import OrderModel from '@/model/Order';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication and admin role
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get filter parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Build query
    let query = {};
    if (status && ['pending', 'accepted', 'out-for-delivery', 'delivered', 'cancelled'].includes(status)) {
      query = { status };
    }
    
    const orders = await OrderModel.find(query)
      .populate('user', 'username email')
      .populate('products.product', 'name price imageUrl')
      .sort({ createdAt: -1 });

      console.log('Admin get orders:', orders);
    
    return NextResponse.json({
      success: true,
      orders
    });

    
    
  } catch (error) {
    console.error('Admin get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
