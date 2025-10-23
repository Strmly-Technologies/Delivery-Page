
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import UserModel from '@/model/User';
import { addDays, isBefore } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const user = await UserModel.findById(userId)
      .populate('freshPlans.schedule.items.product');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const today = new Date();
    let completedPlans:any = [];
    
    if (user.freshPlans && user.freshPlans.length > 0) {
      // Find plans that have ended
      completedPlans = user.freshPlans
        .filter(plan => {
          const planEndDate = addDays(new Date(plan.startDate), plan.days - 1);
          return isBefore(planEndDate, today);
        })
        .sort((a, b) => 
          // Sort by end date, most recent first
          addDays(new Date(b.startDate), b.days - 1).getTime() - 
          addDays(new Date(a.startDate), a.days - 1).getTime()
        );
    }
    
    return NextResponse.json({
      success: true,
      plans: completedPlans
    });
  } catch (error) {
    console.error('Get completed FreshPlans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed plans' },
      { status: 500 }
    );
  }
}