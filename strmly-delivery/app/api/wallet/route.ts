import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/serverAuth';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import OrderModel from '@/model/Order';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;

    // Get user's current wallet balance
    const user = await UserModel.findById(userId)
      .select('referralWallet availableCoupons')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find all orders where this user was the coupon owner and received referral credits
    const referralOrders = await OrderModel.find({
      'appliedCoupon.couponOwnerId': userId,
      'appliedCoupon.referralCredit': { $gt: 0 }
    })
      .populate('user', 'username email')
      .select('_id user appliedCoupon createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Transform orders into transaction history
    const transactions = referralOrders.map((order: any) => {
      const orderNumber = String(order._id).slice(-6).toUpperCase();
      
      return {
        _id: order._id.toString(),
        fromUser: {
          _id: order.user._id.toString(),
          username: order.user.username,
          email: order.user.email
        },
        amount: order.appliedCoupon.referralCredit,
        couponCode: order.appliedCoupon.code,
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        createdAt: order.createdAt
      };
    });

    // Calculate total earned (sum of all referral credits)
    const totalEarned = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    return NextResponse.json({
      success: true,
      wallet: {
        currentBalance: user.referralWallet || 0,
        totalEarned: totalEarned,
        totalTransactions: transactions.length,
        transactions: transactions
      }
    });

  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}