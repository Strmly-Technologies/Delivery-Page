import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { startOfDay, endOfDay } from 'date-fns';
import { verifyAuth } from '@/lib/serverAuth';
import "@/model/Product";

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

    console.log('Fetching orders for today:', todayStart, 'to', todayEnd);

    // Fetch all orders
    const orders = await OrderModel.find({
      status: { $nin: ['cancelled', 'refunded'] }
    })
    .populate('products.product')
    .populate('planRelated.daySchedule.items.product')
    .lean();

    console.log(`Found ${orders.length} total orders`);

    const todaysItems: any[] = [];

    for (const order of orders) {
      const orderNumber = String(order._id).toString().slice(-6).toUpperCase();

      // Handle QuickSip orders
      if (order.orderType === 'quicksip') {
        const orderDate = new Date(order.createdAt);
        
        // Check if order was placed today
        if (orderDate >= todayStart && orderDate <= todayEnd) {
          order.products.forEach((item: any) => {
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
              orderId: order._id
            });
          });
        }
      }

      // Handle FreshPlan orders
      if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
        for (const day of order.planRelated.daySchedule) {
          const dayDate = new Date(day.date);
          
          // Check if this day is today
          if (dayDate >= todayStart && dayDate <= todayEnd) {
            day.items.forEach((item: any) => {
              todaysItems.push({
                _id: `${order._id}-${day._id}-${item._id || Math.random()}`,
                product: item.product,
                customization: item.customization,
                quantity: item.quantity,
                timeSlot: item.timeSlot || day.timeSlot || 'Not Set',
                status: item.status || 'pending',
                dayStatus: day.status || 'pending', // Day-level status
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

    console.log(`Returning ${todaysItems.length} items for today`);

    // Sort by time slot
    const timeSlotOrder = [
      'Morning (7 AM - 9 AM)',
      'Mid Morning (9 AM - 11 AM)', 
      'Lunch (12 PM - 2 PM)',
      'Evening (5 PM - 7 PM)',
      'Night (7 PM - 9 PM)',
      'ASAP'
    ];

    todaysItems.sort((a, b) => {
      const indexA = timeSlotOrder.indexOf(a.timeSlot);
      const indexB = timeSlotOrder.indexOf(b.timeSlot);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return NextResponse.json({
      success: true,
      items: todaysItems,
      date: today.toISOString()
    });

  } catch (error) {
    console.error('Error fetching today\'s orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}