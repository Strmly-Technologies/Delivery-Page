import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import OrderModel from '@/model/Order';
import ProductModel from '@/model/Product';

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
    
    // Fetch statistics
    const [
      products,
      orders,
      pendingOrders,
      acceptedOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders
    ] = await Promise.all([
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ status: 'pending' }),
      OrderModel.countDocuments({ status: 'accepted' }),
      OrderModel.countDocuments({ status: 'out-for-delivery' }),
      OrderModel.countDocuments({ status: 'delivered' }),
      OrderModel.countDocuments({ status: 'cancelled' })
    ]);
    
    return NextResponse.json({
      success: true,
      stats: {
        products,
        orders,
        pendingOrders,
        acceptedOrders,
        outForDeliveryOrders,
        deliveredOrders,
        cancelledOrders
      }
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
