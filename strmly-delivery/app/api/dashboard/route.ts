import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/model/Product';
import OtherModel from '@/model/Other';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // Run all queries in parallel
    const [products, uiHeader, cart] = await Promise.all([
      // Products query
      ProductModel.find(
        category && (category === 'juices' || category === 'shakes') 
          ? { category } 
          : {}
      ).sort({ createdAt: -1 }),
      
      // UI Header query
      OtherModel.findOne().sort({ updatedAt: -1 }),
      
      // Cart query (if authenticated)
      request.cookies.get('authToken')?.value 
        ? verifyAuth(request)
          .then(decodedToken => UserModel.findById(decodedToken.userId)
            .populate({
              path: "cart.product",
              model: "Product",
              select: "name price image category stock"
            }))
          .catch(() => null)
        : Promise.resolve(null)
    ]);

    return NextResponse.json({
      success: true,
      products,
      header: uiHeader ? {
        text: uiHeader.dashboard?.text || 'Welcome to STRMLY Delivery',
        image: uiHeader.dashboard?.image || ''
      } : {
        text: 'Welcome to STRMLY Delivery',
        image: ''
      },
      cart: cart?.cart || []
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}