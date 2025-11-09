import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import { startOfDay, endOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import "@/model/Product";
import dbConnect from "@/lib/dbConnect";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== "chef") {
      return NextResponse.json(
        { error: "Unauthorized. Chef access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const todayStart = startOfDay(targetDate);
    const todayEnd = endOfDay(targetDate);

    console.log("Fetching all pending orders for date:", targetDate.toDateString());

    // Find ALL pending orders (no chef filter)
    const orders = await OrderModel.find({
      $or: [
        { 
          orderType: "quicksip",
          status: "pending",
         $or: [
            { scheduledDeliveryDate: { $gte: todayStart, $lte: todayEnd } },
            { 
              scheduledDeliveryDate: { $exists: false },
              createdAt: { $gte: todayStart, $lte: todayEnd }
            }
          ]
        },
        { 
          orderType: "freshplan",
          "planRelated.daySchedule": {
            $elemMatch: {
              status: "pending",
              date: { $gte: todayStart, $lte: todayEnd }
            }
          }
        }
      ]
    })
      .populate("products.product")
      .populate("planRelated.daySchedule.items.product")
      .lean();

    const pendingItems: any[] = [];

    for (const order of orders) {
      const orderNumber = String(order._id).slice(-6).toUpperCase();

      // === QuickSip Orders ===
      if (order.orderType === "quicksip" && order.status === "pending") {
       const orderDate = order.scheduledDeliveryDate 
          ? new Date(order.scheduledDeliveryDate)
          : new Date(order.createdAt);
        
        if (orderDate >= todayStart && orderDate <= todayEnd) {
          for (const item of order.products) {
            pendingItems.push({
              _id: `${order._id}-${item._id || Math.random()}`,
              product: item.product,
              customization: item.customization,
              quantity: item.quantity,
              timeSlot: order.deliveryTimeSlot || 'ASAP',
              status: order.status,
              orderNumber,
              orderType: 'quicksip',
              deliveryDate: orderDate.toISOString(),
              orderId: order._id,
            });
          }
        }
      }

      // === FreshPlan Orders ===
      if (order.orderType === "freshplan" && order.planRelated?.daySchedule) {
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);
          
          // Show all pending days regardless of chef assignment
          if (dayDate >= todayStart && dayDate <= todayEnd && day.status === "pending") {
            for (const item of day.items || []) {
              pendingItems.push({
                _id: `${order._id}-${day._id}-${item._id || Math.random()}`,
                product: item.product,
                customization: item.customization,
                quantity: item.quantity,
                timeSlot: item.timeSlot || day.timeSlot || '7-8 AM',
                dayStatus: day.status,
                status: day.status,
                orderNumber,
                orderType: 'freshplan',
                deliveryDate: dayDate.toISOString(),
                orderId: order._id,
                dayId: day._id,
              });
            }
          }
        }
      }
    }

    // Sort by time slot order
    const timeSlotOrder = [
      '7-8 AM',
      '8-9 AM',
      '9-10 AM',
      '10-11 AM',
      '3-4 PM',
      '4-5 PM',
      '5-6 PM',
      '6-7 PM',
      'ASAP',
    ];

    pendingItems.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    console.log(`Found ${pendingItems.length} pending items for ${targetDate.toDateString()}`);

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      items: pendingItems
    });

  } catch (error) {
    console.error("Error fetching pending orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending orders" },
      { status: 500 }
    );
  }
}