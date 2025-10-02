import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import ProductModel from '@/model/Product';
import { verifyAuth } from '@/lib/serverAuth';



export async function GET(request: NextRequest) {
  try {
    await dbConnect();
     const decodedToken = await verifyAuth(request);
     const userId = decodedToken.userId;
    
    const orders = await OrderModel.find({ user: userId })
      .populate('products.product')
      .sort({ createdAt: -1 });
    
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    const { productIds, quantities, customerDetails, paymentMethod } = await request.json();
    
    // Validation
    if (!productIds || !quantities || !customerDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address) {
      return NextResponse.json(
        { error: 'Customer details are incomplete' },
        { status: 400 }
      );
    }
    
    // Get products and calculate total
    const products = await ProductModel.find({ _id: { $in: productIds } });
    console.log('Products fetched for order:', products);
    let totalAmount = 0;
    const orderProducts = [];
    
    for (let i = 0; i < productIds.length; i++) {
      const product = products.find(p => p._id.toString() === productIds[i]);
      if (product) {
        totalAmount += product.price * quantities[i];
        orderProducts.push({
          product: product._id,
          quantity: quantities[i],
          price: product.price
        });
      }
    }
    
    // Create order
    const order = await OrderModel.create({
      user: userId,
      products: orderProducts,
      totalAmount,
      customerDetails,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'not_applicable',
      status: 'pending'
    });
    
    return NextResponse.json({
      success: true,
      orderId: order._id,
      totalAmount
    });
    
  } catch (error:any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: error.message },
      { status: 500 }
    );
  }
}
