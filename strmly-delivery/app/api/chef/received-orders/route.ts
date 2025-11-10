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

    console.log("=== DEBUG INFO ===");
    console.log("Chef ID:", chefId);
    console.log("Target Date:", targetDate);
    console.log("Today Start:", todayStart);
    console.log("Today End:", todayEnd);

    // First, let's check ALL received orders for this chef (without date filter)
    const allReceivedOrders = await OrderModel.find({
      $or: [
        { 
          orderType: "quicksip",
          status: "received",
          "statusInfo.chefId": chefId
        },
        { 
          orderType: "freshplan",
          "planRelated.daySchedule": {
            $elemMatch: {
              status: "received",
              "statusInfo.chefId": chefId
            }
          }
        }
      ]
    }).lean();

    console.log(`Total received orders for chef (no date filter): ${allReceivedOrders.length}`);
    
    // Log details of each order
    allReceivedOrders.forEach(order => {
      console.log(`Order ${order._id}:`, {
        orderType: order.orderType,
        status: order.status,
        createdAt: order.createdAt,
        scheduledDeliveryDate: order.scheduledDeliveryDate,
        hasScheduledDate: !!order.scheduledDeliveryDate
      });
    });

    // Now fetch with date filter
    const orders = await OrderModel.find({
      $or: [
        // QuickSip with scheduledDeliveryDate
        { 
          orderType: "quicksip",
          status: "received",
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
          status: "received",
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
              status: "received",
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

    console.log(`Found ${orders.length} orders with date filter`);

    const receivedItems: any[] = [];

    for (const order of orders) {
      const orderNumber = String(order._id).slice(-6).toUpperCase();

      console.log(`Processing order ${order._id}:`, {
        orderType: order.orderType,
        status: order.status,
        productsCount: order.products?.length || 0
      });

      // === QuickSip Orders ===
      if (order.orderType === "quicksip" && order.status === "received" 
          && order.statusInfo?.chefId?.toString() === chefId) {
        
        // Use scheduledDeliveryDate if it exists, otherwise use createdAt
        const orderDate = order.scheduledDeliveryDate 
          ? new Date(order.scheduledDeliveryDate)
          : new Date(order.createdAt);

        console.log(`QuickSip order ${order._id}:`, {
          orderDate: orderDate.toISOString(),
          todayStart: todayStart.toISOString(),
          todayEnd: todayEnd.toISOString(),
          isInRange: orderDate >= todayStart && orderDate <= todayEnd
        });
        
        if (orderDate >= todayStart && orderDate <= todayEnd) {
          for (const item of order.products) {
            console.log(`Adding QuickSip item:`, {
              product: item.product?._id || item.product,
              quantity: item.quantity
            });
            
            receivedItems.push({
              _id: `${order._id}-${item._id || Math.random()}`,
              product: item.product,
              customization: item.customization,
              quantity: item.quantity,
              timeSlot: order.deliveryTimeSlot || "ASAP",
              status: order.status,
              orderNumber,
              orderType: "quicksip",
              deliveryDate: orderDate.toISOString(),
              orderId: order._id
            });
          }
        }
      }

      // === FreshPlan Orders ===
      if (order.orderType === "freshplan" && order.planRelated?.daySchedule) {
        console.log(`FreshPlan order ${order._id} has ${order.planRelated.daySchedule.length} days`);
        
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);
          
          console.log(`Day ${day._id}:`, {
            date: dayDate.toISOString(),
            status: day.status,
            chefId: day.statusInfo?.chefId?.toString(),
            isInRange: dayDate >= todayStart && dayDate <= todayEnd,
            isReceived: day.status === "received",
            isCorrectChef: day.statusInfo?.chefId?.toString() === chefId
          });
          
          if (day.status === "received" && 
              day.statusInfo?.chefId?.toString() === chefId &&
              dayDate >= todayStart && dayDate <= todayEnd) {
            
            for (const item of day.items || []) {
              console.log(`Adding FreshPlan item:`, {
                product: item.product?._id || item.product,
                quantity: item.quantity
              });
              
              receivedItems.push({
                _id: `${order._id}-${day._id}-${item._id || Math.random()}`,
                product: item.product,
                customization: item.customization,
                quantity: item.quantity,
                timeSlot: item.timeSlot || "ASAP",
                status: day.status,
                dayStatus: day.status,
                orderNumber,
                orderType: "freshplan",
                deliveryDate: dayDate.toISOString(),
                orderId: order._id,
                dayId: day._id
              });
            }
          }
        }
      }
    }

    console.log(`Total received items: ${receivedItems.length}`);

    // Sort by time slot
    const timeSlotOrder = [
      '7-8 AM', '8-9 AM', '9-10 AM', '10-11 AM',
      '3-4 PM', '4-5 PM', '5-6 PM', '6-7 PM', 'ASAP'
    ];

    receivedItems.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return NextResponse.json({
      success: true,
      items: receivedItems,
      debug: {
        totalReceivedOrders: allReceivedOrders.length,
        filteredOrders: orders.length,
        dateRange: {
          start: todayStart.toISOString(),
          end: todayEnd.toISOString()
        }
      }
    });

  } catch (error) {
    console.error("Error fetching received orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch received orders" },
      { status: 500 }
    );
  }
}