import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const decodedToken = await verifyAuth(req);
    const userId = decodedToken.userId;

    const { planId, days, startDate, schedule } = await req.json();
    
    if (!planId) {
      return NextResponse.json({ error: 'No plan ID provided' }, { status: 400 });
    }
    
    // Find user first to validate
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if plan exists and payment is not complete
    const planIndex = user.freshPlans?.findIndex(p => p._id.toString() === planId);
    let existingPlan;
    
    if (planIndex !== undefined && planIndex >= 0) {
      existingPlan = user.freshPlans && user?.freshPlans[planIndex];
    } else if (user.freshPlan && user.freshPlan._id.toString() === planId) {
      existingPlan = user.freshPlan;
    }
    
    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    if (existingPlan.paymentComplete) {
      return NextResponse.json(
        { error: 'Cannot edit a plan with completed payment' }, 
        { status: 400 }
      );
    }
    
    // Update the plan in freshPlans array if it exists there
    if (planIndex !== undefined && planIndex >= 0) {
      const updateQuery = {
        [`freshPlans.${planIndex}.schedule`]: schedule
      };
      
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateQuery },
        { new: true }
      );
      
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Failed to update plan' },
          { status: 400 }
        );
      }
      
      // If this is also the freshPlan (for backward compatibility), update that too
      if (user.freshPlan && user.freshPlan._id.toString() === planId) {
        await UserModel.findByIdAndUpdate(
          userId,
          { $set: { 'freshPlan.schedule': schedule } },
          { new: true }
        );
      }
    } 
    // If not in freshPlans array but is the freshPlan (old model)
    else if (user.freshPlan && user.freshPlan._id.toString() === planId) {
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { 'freshPlan.schedule': schedule } },
        { new: true }
      );
      
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Failed to update plan' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
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