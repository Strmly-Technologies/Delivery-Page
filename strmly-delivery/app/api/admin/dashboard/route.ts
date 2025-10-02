import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import OrderModel from '@/model/Order';
import ProductModel from '@/model/Product';
import UserModel from '@/model/User';

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
    
    // Get total counts
    const [totalOrders, totalProducts, totalUsers, pendingOrders, orders] = await Promise.all([
      OrderModel.countDocuments(),
      ProductModel.countDocuments(),
      UserModel.countDocuments(),
      OrderModel.countDocuments({ status: 'pending' }),
      OrderModel.find() // For revenue calculation
    ]);
    
    // Calculate total revenue
    const revenue = orders.reduce((total, order) => {
      return total + (order.totalAmount || 0);
    }, 0);
    
    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        totalProducts,
        totalUsers,
        pendingOrders,
        revenue
      }
    });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}