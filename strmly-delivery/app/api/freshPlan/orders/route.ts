import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import OrderModel from '@/model/Order';
import { isAfter, startOfDay } from 'date-fns';
import "@/model/Product";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    // Find all freshplan orders for this user
    const orders = await OrderModel.find({
      user: userId,
      orderType: 'freshplan',
      'status': { $nin: ['cancelled', 'refunded'] } // Exclude cancelled/refunded orders
    })
    .populate('planRelated.daySchedule.items.product')
    .sort({ deliveryDate: 1 }) // Sort by delivery date ascending
    .lean();

    console.log("FreshPlan orders fetched:", orders);
    
    if (!orders) {
      return NextResponse.json({
        success: true,
        orders: []
      });
    }
    
    return NextResponse.json({
      success: true,
      orders: orders
    });
    
  } catch (error) {
    console.error("Error fetching FreshPlan orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch FreshPlan orders" },
      { status: 500 }
    );
  }
}