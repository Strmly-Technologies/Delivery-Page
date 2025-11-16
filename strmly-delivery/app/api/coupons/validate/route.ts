import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/serverAuth';
import UserModel from '@/model/User';
import dbConnect from '@/lib/dbConnect';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;

    // Get coupon code from query params
    const searchParams = request.nextUrl.searchParams;
    const couponCode = searchParams.get('code');

    if (!couponCode) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    // Find user with this coupon code
    const couponOwner = await UserModel.findOne({
      'availableCoupons.code': couponCode.toUpperCase()
    });

    if (!couponOwner) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    // Get the specific coupon
    const coupon = couponOwner.availableCoupons?.find(
      c => c.code === couponCode.toUpperCase()
    );

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        numberOfUses: coupon.numberOfUses
      }
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}