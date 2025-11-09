import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { startOfDay, endOfDay } from 'date-fns';
import { verifyAuth } from '@/lib/serverAuth';
import "@/model/Product";
import Product from '@/model/Product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify chef authentication
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'chef') {
      return NextResponse.json(
        { error: 'Unauthorized. Chef access required.' },
        { status: 403 }
      );
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Fetch all active orders (not cancelled/refunded)
    const orders = await OrderModel.find({})
      .populate('products.product')
      .populate('planRelated.daySchedule.items.product')
      .lean();

    const todaysItems: any[] = [];

    for (const order of orders) {
      const orderNumber = String(order._id).slice(-6).toUpperCase();

      // === QUICK SIP ORDERS ===
      if (order.orderType === 'quicksip') {
        // Use scheduledDeliveryDate if it exists, otherwise use createdAt
        const orderDate = order.scheduledDeliveryDate 
          ? new Date(order.scheduledDeliveryDate)
          : new Date(order.createdAt);
        
        if (orderDate >= todayStart && orderDate <= todayEnd) {
          console.log("Today's QuickSip order found:", order._id);
          for (const item of order.products) {
            todaysItems.push({
              _id: `${order._id}-${item._id || Math.random()}`,
              product: item.product,
              customization: item.customization,
              quantity: item.quantity,
              timeSlot: order.deliveryTimeSlot || 'ASAP',
              status: order.status || 'pending',
              orderNumber,
              orderType: 'quicksip',
              deliveryDate: orderDate.toISOString(),
              orderId: order._id,
            });
          }
        }
      }

      // === FRESH PLAN ORDERS ===
      if (order.orderType === 'freshplan' && Array.isArray(order.planRelated?.daySchedule)) {
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);

          if (dayDate >= todayStart && dayDate <= todayEnd) {
            for (const item of day.items || []) {
              todaysItems.push({
                _id: `${order._id}-${day._id}-${item._id || Math.random()}`,
                product: item.product || null,
                customization: item.customization,
                quantity: item.quantity,
                timeSlot: item.timeSlot || order.deliveryTimeSlot || 'ASAP',
                dayStatus: day.status || 'pending',
                status: day.status || 'pending',  
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

    // === TIME SLOT SORTING ===
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

    todaysItems.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return NextResponse.json({
      success: true,
      items: todaysItems,
      date: today.toISOString(),
    });

  } catch (error) {
    console.error('Error fetching todays order', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
