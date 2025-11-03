import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import { startOfDay, endOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify chef authentication
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

    console.log("Fetching stats for chef:", chefId, "on date:", targetDate.toDateString());

    const orders = await OrderModel.find({
      status: { $nin: ["cancelled", "refunded"] }
    }).lean();

    let stats = {
      totalOrders: 0,
      pendingOrders: 0,
      receivedOrders: 0,
      doneOrders: 0
    };

    for (const order of orders) {
      // === QuickSip Orders ===
      if (order.orderType === "quicksip") {
        const orderDate = new Date(order.createdAt);

        if (orderDate >= todayStart && orderDate <= todayEnd) {
          // Always count pending orders (regardless of chefId)
          if (order.status === "pending") {
            stats.totalOrders++;
            stats.pendingOrders++;
            continue;
          }

          // For received/done, match chefId
          if (["received", "done"].includes(order.status) &&
              order.statusInfo?.chefId?.toString() === chefId) {
            stats.totalOrders++;

            switch (order.status) {
              case "received":
                stats.receivedOrders++;
                break;
              case "done":
                stats.doneOrders++;
                break;
            }
          }
        }
      }

      // === FreshPlan Orders ===
      else if (order.orderType === "freshplan" && order.planRelated?.daySchedule) {
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);

          if (dayDate >= todayStart && dayDate <= todayEnd) {
            // Pending — count all, no chefId filter
            if (day.status === "pending") {
              stats.totalOrders++;
              stats.pendingOrders++;
              continue;
            }

            // Received/done — require chefId match
            if (["received", "done"].includes(day.status) &&
                day.statusInfo?.chefId?.toString() === chefId) {
              stats.totalOrders++;

              switch (day.status) {
                case "received":
                  stats.receivedOrders++;
                  break;
                case "done":
                  stats.doneOrders++;
                  break;
              }
            }
          }
        }
      }
    }

    console.log(`Stats for chef ${chefId}:`, stats);

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      stats
    });

  } catch (error) {
    console.error("Error fetching chef stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chef statistics" },
      { status: 500 }
    );
  }
}
