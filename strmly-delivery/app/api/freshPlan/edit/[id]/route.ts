import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const planId = params.id;

        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.userId;
        const user= await UserModel.findById(userId).lean();
        
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const plan = user.freshPlans?.find((p) => p._id.toString() === planId);
        
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }
        if(plan.paymentComplete){
            return NextResponse.json({ error: "Cannot edit a plan with completed payment" }, { status: 400 });
        }
        // Manual populate for plan products
        if (plan.schedule) {
            for (const day of plan.schedule) {
                for (const item of day.items) {
                    const product = await mongoose.model("Product").findById(item.product).lean();
                    (item as any).product = product;
                }
            }
        }
        return NextResponse.json({
            success: true,
            plan
        });        
    } catch (error) {
        console.error("Get plan by ID error:", error);
        return NextResponse.json(
            { error: "Failed to fetch plan" },
            { status: 500 }
        );
        
    }
}