import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import OrderModel from '@/model/Order';
import { addDays, isAfter } from 'date-fns';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    // Parse request body
    const { orderId, timeSlot, clientTime , dayId} = await request.json();
    
    if (!orderId || !timeSlot) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Find the order
    const order = await OrderModel.findOne({
      _id: orderId,
      user: userId,
      orderType: 'freshplan',
      status: { $nin: ['delivered', 'cancelled', 'refunded'] }
    });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found or cannot be modified" },
        { status: 404 }
      );
    }
   console.log("order",order.planRelated.daySchedule);
   // update only that days time slot of all items
    const daySchedule = order.planRelated?.daySchedule || [];
    const dayToUpdate = daySchedule.find((day:any) => day._id.toString() === dayId);
    if (!dayToUpdate) {
      return NextResponse.json(
        { success: false, error: "Day schedule not found" },
        { status: 404 }
      );
    }
    dayToUpdate.items.forEach((item:any) => {
        item.timeSlot = timeSlot;
        }
    );
    await order.save();
    
    return NextResponse.json({
      success: true,
      message: "Delivery time updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating delivery time:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update delivery time" },
      { status: 500 }
    );
  }
}