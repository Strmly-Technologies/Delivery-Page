import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";
import "@/model/Product";
import { addDays, isAfter, isBefore, isEqual } from "date-fns";
import mongoose from "mongoose";

export async function GET(request: NextRequest,
  { params }: { params: { date: string } }) {
  try {
    await dbConnect();

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    const user = await UserModel.findById(userId).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Manual populate for freshPlans products
    if (user.freshPlans?.length) {
      for (const plan of user.freshPlans) {
        if (plan.schedule) {
          for (const day of plan.schedule) {
            for (const item of day.items) {
              const product = await mongoose.model("Product").findById(item.product).lean();
              (item as any).product = product;
            }
          }
        }
      }
    }

    const userDateParam = await params.date;
    const userDate = new Date(userDateParam ? userDateParam : new Date());
    userDate.setHours(0, 0, 0, 0);

    let currentPlan = null;
    const upcomingPlans: any[] = [];
    let hasPlans = false;

    if (user.freshPlans && user.freshPlans.length > 0) {
      hasPlans = true;

      // Sort plans by start date
      const sortedPlans = [...user.freshPlans].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      for (const plan of sortedPlans) {
        const start = new Date(plan.startDate);
        start.setHours(0, 0, 0, 0);
        const end = addDays(start, plan.days - 1);
        end.setHours(0, 0, 0, 0);

        // Find the plan whose date range includes the user date
        if ((isBefore(start, userDate) || isEqual(start, userDate)) &&
            (isAfter(end, userDate) || isEqual(end, userDate))) {
          currentPlan = plan;
        }

        // Collect all plans that start *after* user-sent date
        if (isAfter(start, userDate)) {
          upcomingPlans.push(plan);
        }
      }

      return NextResponse.json({
        success: true,
        currentPlan,
        upcomingPlans,
        hasPlans,
      });
    }

    // Fallback: single freshPlan (old data model)
    if (user.freshPlan) {
      hasPlans = true;
      const plan = user.freshPlan;
      const start = new Date(plan.startDate);
      const end = addDays(start, plan.days - 1);

      if ((isBefore(start, userDate) || isEqual(start, userDate)) &&
          (isAfter(end, userDate) || isEqual(end, userDate))) {
        currentPlan = plan;
      }

      return NextResponse.json({
        success: true,
        currentPlan,
        upcomingPlans: [],
        hasPlans,
      });
    }

    // No plans at all
    return NextResponse.json({
      success: true,
      currentPlan: null,
      upcomingPlans: [],
      hasPlans: false,
    });
  } catch (error) {
    console.error("Get FreshPlan error:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}