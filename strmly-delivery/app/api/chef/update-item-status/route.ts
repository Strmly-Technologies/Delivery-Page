import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { verifyAuth } from '@/lib/serverAuth';
import { stat } from 'fs';

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

    const { orderId, dayId, status,chefTime} = await request.json();
    console.log('Received data for updating day status:', { orderId, dayId, status });

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID, Day ID, and status are required' },
        { status: 400 }
      );
    }

    if (!['received', 'done'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be received or done' },
        { status: 400 }
      );
    }

    console.log('Updating day status:', { orderId, dayId, status });

    // Find the order
    const order = await OrderModel.findById(orderId);
    console.log('Order fetched for update:', order);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }


    if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
    let updated = false;

    // Update the specific day's status
    order.planRelated.daySchedule.forEach((day: any) => {
      if (day._id.toString() === dayId) {
        day.status = status;        
        updated = true;
      }
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Day not found in order' },
        { status: 404 }
      );
    }
  }
  else if(order.orderType==='quicksip'){
    order.status=status;
  }

    if(status==='received'){
      if(order.orderType==='quicksip'){
        order.statusInfo={
          chefId: decodedToken.userId,
          receivedTime: chefTime ? new Date(chefTime) : new Date()
        }
      }
      else if(order.orderType==='freshplan' && order.planRelated?.daySchedule){
        order.planRelated.daySchedule.forEach((day: any) => {
          if (day._id.toString() === dayId) {
            day.statusInfo={
              chefId: decodedToken.userId,
              receivedTime: chefTime ? new Date(chefTime) : new Date()
            }        
          }
        });
      }
    }
    else if(status==='done'){
      if(order.orderType==='quicksip'){
        order.statusInfo={
          ...order.statusInfo,
          doneTime: chefTime ? new Date(chefTime) : new Date()
        }
      }
      else if(order.orderType==='freshplan' && order.planRelated?.daySchedule){
        order.planRelated.daySchedule.forEach((day: any) => {
          if (day._id.toString() === dayId) {
            day.statusInfo={
              ...day.statusInfo,
              doneTime: chefTime ? new Date(chefTime) : new Date()
            }        
          }
        });
      }
    }

    await order.save();

    console.log('Day status updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Day status updated successfully'
    });

  } catch (error) {
    console.error('Error updating day status:', error);
    return NextResponse.json(
      { error: 'Failed to update day status' },
      { status: 500 }
    );
  }
}