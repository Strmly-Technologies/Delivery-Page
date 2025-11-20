import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/model/Product';
import OtherModel from '@/model/Other';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

// Enable ISR with 60 second revalidation
export const revalidate = 60;
const JUICE_X_PRODUCT_ID = process.env.PRODUCT_ID || '';

export async function GET(request: NextRequest) {
  try {
     await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // Check if user is authenticated and has purchased JuiceX
    let hasPurchasedJuiceX = false;
    let userId = null;
    
    try {
      const decodedToken = await verifyAuth(request);
      userId = decodedToken.userId;
      
      const user = await UserModel.findById(userId).select('hasPurchasedProductJuiceX hasJuiceXInCart');
      hasPurchasedJuiceX = user?.hasPurchasedProductJuiceX || false;
    } catch (error) {
      // User not authenticated, continue without filtering
    }

    // Build product query - exclude JuiceX if user has purchased it AND only active products
    let productQuery: any = { isActive: true }; // Only fetch active products
    
    if (category && (category === 'juices' || category === 'shakes')) {
      productQuery.category = category;
    }
    
    if (hasPurchasedJuiceX) {
      productQuery._id = { $ne: JUICE_X_PRODUCT_ID };
    }

    // Run queries in parallel for better performance
    const [products, uiHeader, cart] = await Promise.all([
      // Products query with exclusion for purchased JuiceX
      ProductModel.find(productQuery)
        .select('name price smallPrice mediumPrice image category stock description regularNutrients largeNutrients')
        .lean()
        .sort({ createdAt: -1 }),
      
      // UI Header query
      OtherModel.findOne()
        .select('dashboard')
        .lean()
        .sort({ updatedAt: -1 }),
      
      // Cart query (if authenticated)
      userId
        ? UserModel.findById(userId)
            .select('cart')
            .populate({
              path: "cart.product",
            })
            .lean()
            .then(user => user?.cart || [])
      
        : Promise.resolve([])
    ]);
    // normalize uiHeader in case the query returns an array-like result
    const headerDoc = Array.isArray(uiHeader) ? uiHeader[0] : uiHeader;

    let userReferralWallet;

    if (userId) {
      const user = await UserModel.findById(userId).select('referralWallet');
      userReferralWallet = user?.referralWallet || 0;
    } else {
      userReferralWallet = 0;
    }

    // console.log("Referral Wallet:", userReferralWallet);

    return NextResponse.json({
      success: true,
      userReferralWallet,
      products,
      header: headerDoc ? {
        text: headerDoc.dashboard?.text || 'Welcome to STRMLY Delivery',
        image: headerDoc.dashboard?.image || ''
      } : {
        text: 'Welcome to STRMLY Delivery',
        image: ''
      },
      hasPurchasedJuiceX,
      cart: cart || []
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