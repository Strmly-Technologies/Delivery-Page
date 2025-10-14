import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import { verifyAuth } from '@/lib/serverAuth';
import mongoose from 'mongoose';
import UserModel, { CartItem } from '@/model/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const { customerDetails, cartItems, totalAmount, deliveryCharge, customisablePrices, deliveryTimeSlot } = await request.json();
    console.log('Order data:', { customerDetails, cartItems, totalAmount, deliveryCharge, customisablePrices });

    // Validate required fields
    if (!customerDetails || !cartItems || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order items with customization details
        const orderItems = cartItems.map((item: CartItem) => ({
      product: item.product._id, // make sure product is populated or _id exists
      quantity: item.quantity,
      price: item.customization.finalPrice,
      customization: { ...item.customization }
    }));

    const order = await OrderModel.create({
      user: userId,
      products: orderItems,
      totalAmount,
      customerDetails: {
        name: customerDetails.name,
        phone: customerDetails.phone,
        address: customerDetails.address,
        additionalAddressInfo: customerDetails.additionalAddressInfo || ''
      },
      status: 'pending',
      paymentStatus: 'pending',
      deliveryCharge,
      customisablePrices,
      deliveryTimeSlot
    });
    console.log('Created order:', order);

    // clear user's cart after order creation
    await UserModel.findByIdAndUpdate(userId, { $set: { cart: [] } });
    return NextResponse.json({
      success: true,
      orderId: order._id,
      totalAmount
    });
    

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    // Get all orders for the user
    const orders = await OrderModel.find({ user: userId })
      .populate({
        path: 'products.product',
        select: 'name image category'
      })
      .sort({ createdAt: -1 });
      console.log("orders",orders);
    
    return NextResponse.json({
      success: true,
      orders
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}