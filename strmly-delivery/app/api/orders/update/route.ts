import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/serverAuth';
import prisma from '@/lib/prismadb';

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication (admin or merchant)
    const decodedToken = await verifyAuth(request);
    if (!['admin', 'merchant'].includes(decodedToken.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or merchant access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, status } = body;
    
    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status values
    const validStatuses = ['pending', 'accepted', 'outForDelivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update the order status in the database
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });
    
    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
