import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { verifyAuth } from '@/lib/serverAuth'
import '@/model/Product'
;

export async function POST(request: NextRequest) {
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

    const { itemId, status } = await request.json();

    if (!itemId || !status) {
      return NextResponse.json(
        { error: 'Item ID and status are required' },
        { status: 400 }
      );
    }

    if (!['received', 'done'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be received or done' },
        { status: 400 }
      );
    }

    // Parse the composite ID
    const idParts = itemId.split('-');
    const orderId = idParts[0];
    console.log(orderId)

    console.log('Updating item status:', { itemId, orderId, status });

    // Find the order
    const order = await OrderModel.findById(orderId);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    let updated = false;

    // Update QuickSip item
    if (order.orderType === 'quicksip') {
        order.status = status;
        updated = true;
    }

    // Update FreshPlan item
    if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
      const dayId = idParts[1];
      
      order.planRelated.daySchedule.forEach((day: any) => {
        if (day._id.toString() === dayId) {
          day.items.forEach((item: any) => {
            const compositeId = `${orderId}-${dayId}-${item._id}`;
            if (compositeId === itemId || itemId.includes(item._id?.toString())) {
              item.status = status;
              updated = true;
            }
          });
        }
      });
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Item not found in order' },
        { status: 404 }
      );
    }

    await order.save();

    console.log('Item status updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Item status updated successfully'
    });

  } catch (error) {
    console.error('Error updating item status:', error);
    return NextResponse.json(
      { error: 'Failed to update item status' },
      { status: 500 }
    );
  }
}