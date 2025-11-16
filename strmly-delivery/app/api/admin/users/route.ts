import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import UserModel from '@/model/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin authentication
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Fetch all users with selected fields
    const users = await UserModel.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        phone: user.phone || null,
        role: user.role || 'customer',
        savedAddresses: user.savedAddresses || [],
        createdAt: user.createdAt,
        availableCoupons: user.availableCoupons || [],
        referralWallet: user.referralWallet || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}