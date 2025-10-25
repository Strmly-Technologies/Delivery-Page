import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";
import ProductModel from "@/model/Product";
import { addDays, isAfter, isBefore, isEqual } from "date-fns";

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
              const product = await ProductModel.findById(item.product).lean();
              (item as any).product = product;
            }
          }
        }
      }
    }

    const userDateParam = await params.date;
    const userDate = new Date(userDateParam ? userDateParam : new Date());
    userDate.setHours(0, 0, 0, 0);

    let hasPlans = false;

    if (user.freshPlans && user.freshPlans.length > 0) {
      hasPlans = true;

      // Sort ALL plans by start date (most recent first)
      const allPlans = [...user.freshPlans].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      return NextResponse.json({
        success: true,
        plans: allPlans, // Return all plans
        hasPlans,
      });
    }

    // Fallback: single freshPlan (old data model)
    if (user.freshPlan) {
      hasPlans = true;
      return NextResponse.json({
        success: true,
        plans: [user.freshPlan],
        hasPlans,
      });
    }

    // No plans at all
    return NextResponse.json({
      success: true,
      plans: [],
      hasPlans: false,
    });
  } catch (error) {
    console.error("Get FreshPlan error:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}