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

    const chefId = decodedToken.userId;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const todayStart = startOfDay(targetDate);
    const todayEnd = endOfDay(targetDate);

    console.log("Fetching done orders for chef:", chefId);

    const orders = await OrderModel.find({
          $or: [
            // QuickSip with scheduledDeliveryDate
            { 
              orderType: "quicksip",
              status: "done",
              "statusInfo.chefId": chefId,
              scheduledDeliveryDate: { 
                $exists: true,
                $ne: null,
                $gte: todayStart, 
                $lte: todayEnd 
              }
            },
            // QuickSip without scheduledDeliveryDate (use createdAt)
            { 
              orderType: "quicksip",
              status: "done",
              "statusInfo.chefId": chefId,
              $or: [
                { scheduledDeliveryDate: { $exists: false } },
                { scheduledDeliveryDate: null }
              ],
              createdAt: { $gte: todayStart, $lte: todayEnd }
            },
            // FreshPlan orders
            { 
              orderType: "freshplan",
              "planRelated.daySchedule": {
                $elemMatch: {
                  status: "done",
                  "statusInfo.chefId": chefId,
                  date: { $gte: todayStart, $lte: todayEnd }
                }
              }
            }
          ]
        })
          .populate("products.product")
          .populate("planRelated.daySchedule.items.product")
          .lean();


    const doneItems: any[] = [];

    for (const order of orders) {
      const orderNumber = String(order._id).slice(-6).toUpperCase();

      // === QuickSip Orders ===
      if (order.orderType === "quicksip" && order.status === "done" 
          && order.statusInfo?.chefId?.toString() === chefId) {
        const orderDate = order.scheduledDeliveryDate
            ? new Date(order.scheduledDeliveryDate)
            : new Date(order.createdAt);
        
        if (orderDate >= todayStart && orderDate <= todayEnd) {
          // Push each product as individual item
          for (const item of order.products) {
            doneItems.push({
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
          
          if (dayDate >= todayStart && dayDate <= todayEnd 
              && day.status === "done"
              && day.statusInfo?.chefId?.toString() === chefId) {
            
            // Push each item in the day schedule
            for (const item of day.items || []) {
              doneItems.push({
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

    doneItems.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });


    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      items: doneItems  // ✅ Changed from 'orders' to 'items'
    });

  } catch (error) {
    console.error("Error fetching done orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch done orders" },
      { status: 500 }
    );
  }
}