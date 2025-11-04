import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/model/Product';
import OtherModel from '@/model/Other';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

// Enable ISR with 60 second revalidation
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // Run queries in parallel for better performance
    const [products, uiHeader, cart] = await Promise.all([
      // Products query with lean() for better performance
      ProductModel.find(
        category && (category === 'juices' || category === 'shakes') 
          ? { category } 
          : {}
      )
      .select('name price smallPrice mediumPrice image category stock description regularNutrients largeNutrients')
      .lean()
      .sort({ createdAt: -1 }),
      
      // UI Header query
      OtherModel.findOne()
        .select('dashboard')
        .lean()
        .sort({ updatedAt: -1 }),
      
      // Cart query (if authenticated)
      request.cookies.get('authToken')?.value 
        ? verifyAuth(request)
          .then(decodedToken => UserModel.findById(decodedToken.userId)
            .select('cart')
            .populate({
              path: "cart.product",
              model: "Product",
              select: "name price image category stock"
            })
            .lean())
          .catch(() => null)
        : Promise.resolve(null)
    ]);

    // normalize uiHeader in case the query returns an array-like result
    const headerDoc = Array.isArray(uiHeader) ? uiHeader[0] : uiHeader;

    return NextResponse.json({
      success: true,
      products,
      header: headerDoc ? {
        text: headerDoc.dashboard?.text || 'Welcome to STRMLY Delivery',
        image: headerDoc.dashboard?.image || ''
      } : {
        text: 'Welcome to STRMLY Delivery',
        image: ''
      },
      cart: cart?.cart || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}