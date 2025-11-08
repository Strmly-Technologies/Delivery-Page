import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import { endOfDay, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'chef') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Chef access required.' }), { status: 403 });
    }
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const orders = await OrderModel.find({
      status: { $nin: ['cancelled', 'refunded'] }
    })
      .populate('products.product')
      .populate('planRelated.daySchedule.items.product')
      .lean();
    
    const tomorrowsItems: any[] = [];
    
    for (const order of orders) {
      const orderNumber = String(order._id).toString().slice(-6).toUpperCase();
      
      // Handle QuickSip orders
      if (order.orderType === 'quicksip') {
        // Use scheduledDeliveryDate if it exists, otherwise use createdAt
        const orderDate = order.scheduledDeliveryDate 
          ? new Date(order.scheduledDeliveryDate)
          : new Date(order.createdAt);
        
        // Check if order is scheduled for tomorrow
        if (orderDate >= tomorrowStart && orderDate <= tomorrowEnd) {
          order.products.forEach((item: any) => {
            tomorrowsItems.push({
              _id: `${order._id}-${item._id || Math.random()}`,
              product: item.product,
              customization: item.customization,
              quantity: item.quantity,
              timeSlot: order.deliveryTimeSlot || 'ASAP',
              status: order.status || 'pending',
              orderNumber,
              orderType: 'quicksip',
              deliveryDate: orderDate.toISOString(),
              orderId: order._id
            });
          });
        }
      }
      
      // Handle FreshPlan orders
      if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);
          
          // Check if this day is tomorrow
          if (dayDate >= tomorrowStart && dayDate <= tomorrowEnd) {
            day.items.forEach((item: any) => {
              tomorrowsItems.push({
                _id: `${order._id}-${day._id}-${item._id || Math.random()}`,
                product: item.product,
                customization: item.customization,
                quantity: item.quantity,
                timeSlot: item.timeSlot || day.timeSlot || 'Not Set',
                status: item.status || 'pending',
                dayStatus: day.status || 'pending',
                orderNumber,
                orderType: 'freshplan',
                deliveryDate: dayDate.toISOString(),
                orderId: order._id,
                dayId: day._id
              });
            });
          }
        }
      }
    }

    console.log(`Returning ${tomorrowsItems.length} items for tomorrow`);

    // Sort by time slot
    const timeSlotOrder = [
      '7-8 AM',
      '8-9 AM',
      '9-10 AM',
      '10-11 AM',
      '3-4 PM',
      '4-5 PM',
      '5-6 PM',
      '6-7 PM',
      'ASAP'
    ];

    tomorrowsItems.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return NextResponse.json({
      success: true,
      items: tomorrowsItems,
      date: tomorrow.toISOString()
    });

  } catch (error) {
    console.error('Error fetching tomorrow\'s orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}