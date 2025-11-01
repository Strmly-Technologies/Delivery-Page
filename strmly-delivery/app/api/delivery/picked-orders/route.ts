import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import { startOfDay, endOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import "@/model/Product";
import { TIME_SLOTS } from "@/constants/timeSlots";
import dbConnect from "@/lib/dbConnect";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify delivery authentication
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== "delivery") {
      return NextResponse.json(
        { error: "Unauthorized. Delivery access required." },
        { status: 403 }
      );
    }

    const deliveryPersonId = decodedToken.userId;

    // Extract and validate date and timeSlot
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const timeSlotParam = searchParams.get("timeSlot");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const todayStart = startOfDay(targetDate);
    const todayEnd = endOfDay(targetDate);

    console.log("Fetching picked orders for delivery person:", deliveryPersonId);

    // Fetch orders picked by this delivery person
    const orders = await OrderModel.find({
      $or: [
        { 
          status: "picked",
          "deliveryInfo.deliveryPersonId": deliveryPersonId,
          createdAt: { $gte: todayStart, $lte: todayEnd }
        },
        { 
          "planRelated.daySchedule": {
            $elemMatch: {
              status: "picked",
              "deliveryInfo.deliveryPersonId": deliveryPersonId,
              date: { $gte: todayStart, $lte: todayEnd }
            }
          }
        }
      ]
    })
      .populate("products.product")
      .populate("planRelated.daySchedule.items.product")
      .lean();

    const pickedOrders: any[] = [];

    for (const order of orders) {
      const orderNumber = String(order._id).slice(-6).toUpperCase();

      // === QuickSip Orders ===
      if (order.orderType === "quicksip" && order.status === "picked" 
          && order.deliveryInfo?.deliveryPersonId?.toString() === deliveryPersonId) {
        const orderTimeSlot = order.deliveryTimeSlot || "ASAP";
        
        if (!timeSlotParam || orderTimeSlot === timeSlotParam) {
          pickedOrders.push({
            _id: order._id,
            orderNumber,
            orderType: "quicksip",
            customer: {
              name: order.customerDetails?.name,
              phone: order.customerDetails?.phone,
              address: order.customerDetails?.address,
              additionalInfo: order.customerDetails?.additionalAddressInfo
            },
            items: order.products.map((item: any) => ({
              product: item.product,
              customization: item.customization,
              quantity: item.quantity
            })),
            totalAmount: order.totalAmount,
            deliveryCharge: order.deliveryCharge || 0,
            timeSlot: orderTimeSlot,
            status: order.status,
            deliveryDate: order.createdAt,
            pickedTime: order.deliveryInfo?.pickedTime,
            orderId: order._id,
          });
        }
      }

      // === FreshPlan Orders ===
      if (order.orderType === "freshplan" && order.planRelated?.daySchedule) {
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);
          
          if (dayDate >= todayStart && dayDate <= todayEnd 
              && day.status === "picked"
              && day.deliveryInfo?.deliveryPersonId?.toString() === deliveryPersonId) {
            const dayTimeSlot = day.timeSlot || day.items?.[0]?.timeSlot || "7-8 AM";
            
            if (!timeSlotParam || dayTimeSlot === timeSlotParam) {
              pickedOrders.push({
                _id: `${order._id}-${day._id}`,
                orderNumber,
                orderType: "freshplan",
                dayId: day._id,
                customer: {
                  name: order.customerDetails?.name,
                  phone: order.customerDetails?.phone,
                  address: order.customerDetails?.address,
                  additionalInfo: order.customerDetails?.additionalAddressInfo
                },
                items: day.items.map((item: any) => ({
                  product: item.product,
                  customization: item.customization,
                  quantity: item.quantity
                })),
                totalAmount: calculateDayTotal(day.items),
                deliveryCharge: order.deliveryCharge || 0,
                timeSlot: dayTimeSlot,
                status: day.status,
                deliveryDate: dayDate,
                pickedTime: day.deliveryInfo?.pickedTime,
                orderId: order._id,
              });
            }
          }
        }
      }
    }

    // Sort by time slot order
    const timeSlotOrder = TIME_SLOTS.map(slot => slot.range);
    pickedOrders.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      count: pickedOrders.length,
      orders: pickedOrders
    });

  } catch (error) {
    console.error("Error fetching picked orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch picked orders" },
      { status: 500 }
    );
  }
}

function calculateDayTotal(items: any[]): number {
  return items.reduce((total, item) => {
    return total + (item.customization?.finalPrice || 0) * (item.quantity || 1);
  }, 0);
}