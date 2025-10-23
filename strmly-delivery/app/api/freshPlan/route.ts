import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";
import "@/model/Product";
import { addDays, isAfter, isBefore, isEqual } from "date-fns";
import mongoose from "mongoose";


export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const decodedToken = await verifyAuth(req);
    const userId = decodedToken.userId;

    const { days, startDate, schedule } = await req.json();
    // add one day to startDate to account for timezone issues
    
    const planStartDate = addDays(new Date(startDate), 1);

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for active or overlapping plans
    if (user.freshPlans&& user?.freshPlans?.length > 0) {
      const activePlans = user?.freshPlans.filter((plan) => {
        const planEndDate = addDays(new Date(plan.startDate), plan.days - 1);
        return isAfter(planEndDate, new Date());
      });

      if (activePlans.length > 0) {
        let latestEndDate = new Date(0);
        activePlans.forEach((plan) => {
          const endDate = addDays(new Date(plan.startDate), plan.days - 1);
          if (isAfter(endDate, latestEndDate)) latestEndDate = endDate;
        });

        const earliestAllowedStartDate = addDays(latestEndDate, 1);
        console.log("Earliest Allowed Start Date:", earliestAllowedStartDate);
        console.log("Requested Plan Start Date:", planStartDate);
        if (isAfter(earliestAllowedStartDate, planStartDate)) {
          return NextResponse.json(
            {
              error: "New plan must start after your existing plan ends",
              earliestStartDate: earliestAllowedStartDate.toISOString(),
            },
            { status: 400 }
          );
        }
      }
    }

    // Create new plan subdocument
    const newPlan = {
      _id: new mongoose.Types.ObjectId(), // Generate a manual ObjectId
      isActive: true,
      days,
      startDate: planStartDate,
      schedule,
      createdAt: new Date(),
      paymentComplete: false,
    };

    // Push plan, then sort freshPlans by startDate
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $push: { freshPlans: newPlan },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to create plan" },
        { status: 400 }
      );
    }

    // Sort the freshPlans array
    if(updatedUser.freshPlans){
        updatedUser?.freshPlans.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
}

    // Keep the sorted array saved
    await updatedUser.save();

    // Find the currently active or next upcoming plan
    const today = new Date();
    let currentPlan = updatedUser.freshPlans && updatedUser?.freshPlans.find((plan) => {
      const endDate = addDays(new Date(plan.startDate), plan.days - 1);
      return !isBefore(endDate, today);
    });

    if (!currentPlan && updatedUser.freshPlans&& updatedUser?.freshPlans.length > 0) {
      currentPlan = updatedUser?.freshPlans[0];
    }

    // Update single-field reference
    if (currentPlan) {
      await UserModel.findByIdAndUpdate(userId, {
        $set: { freshPlan: currentPlan },
      });
    }

    // Return plan ID
    return NextResponse.json({
      success: true,
      message: "FreshPlan created successfully",
      planId: newPlan._id.toString(),
    });
  } catch (error: any) {
    console.error("FreshPlan creation error:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}







export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    
    if (planId) {
      // Delete specific plan
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        {
          $pull: { freshPlans: { _id: planId } }
        },
        { new: true }
      );
      
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Failed to cancel plan' },
          { status: 400 }
        );
      }
      
      // Update freshPlan field with the earliest non-expired plan
      const today = new Date();
      if (updatedUser.freshPlans && updatedUser.freshPlans.length > 0) {
        // Sort plans by start date
        const sortedPlans = updatedUser.freshPlans.sort((a, b) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        
        // Find first non-expired plan
        let firstValidPlan = null;
        for (const plan of sortedPlans) {
          const planEndDate = addDays(new Date(plan.startDate), plan.days - 1);
          if (!isBefore(planEndDate, today)) {
            firstValidPlan = plan;
            break;
          }
        }
        
        if (firstValidPlan) {
          await UserModel.findByIdAndUpdate(
            userId,
            { $set: { freshPlan: firstValidPlan } },
            { new: true }
          );
        } else if (sortedPlans.length > 0) {
          // If all plans have expired, use the most recent one
          await UserModel.findByIdAndUpdate(
            userId,
            { $set: { freshPlan: sortedPlans[0] } },
            { new: true }
          );
        } else {
          // No plans left
          await UserModel.findByIdAndUpdate(
            userId,
            { $set: { freshPlan: null } },
            { new: true }
          );
        }
      } else {
        // No plans left
        await UserModel.findByIdAndUpdate(
          userId,
          { $set: { freshPlan: null } },
          { new: true }
        );
      }
    } else {
      // Clear all plans (legacy behavior)
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            freshPlan: null,
            freshPlans: []
          }
        },
        { new: true }
      );
      
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Failed to cancel plan' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'FreshPlan cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel FreshPlan error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel plan' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const freshPlans = user.freshPlans || [];
    // sort plans by start date
    freshPlans.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    const earliestStartDate = freshPlans.length > 0 ? addDays(freshPlans[freshPlans.length-1].startDate,freshPlans[freshPlans.length-1].days) : null;
    
    return NextResponse.json({
      success: true,
      hasPlans: true,
      earliestStartDate
    });
  }
    catch (error) {
    console.error("Check FreshPlan existence error:", error);
    return NextResponse.json(
      { error: "Failed to check plans" },
      { status: 500 }
    );
  }
}