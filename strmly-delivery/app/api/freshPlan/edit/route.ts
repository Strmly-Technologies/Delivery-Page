import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const decodedToken = await verifyAuth(req);
    const userId = decodedToken.userId;

    const { days, startDate, schedule } = await req.json();
    
    // Find user first to validate they have a plan
    const user = await UserModel.findById(userId);
    
    if (!user || !user.freshPlan || !user.freshPlan.isActive) {
      return NextResponse.json(
        { error: 'No active plan found' },
        { status: 404 }
      );
    }
    
    // Don't allow editing if payment is complete
    if (user.freshPlan.paymentComplete) {
      return NextResponse.json(
        { error: 'Cannot edit plan after payment is complete' },
        { status: 400 }
      );
    }
    
    // Update the plan
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'freshPlan.schedule': schedule
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update plan' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FreshPlan updated successfully'
    });
  } catch (error) {
    console.error('FreshPlan update error:', error);
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}