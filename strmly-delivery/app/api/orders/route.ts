import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import UserModel from '@/model/User';
import ProductModel from '@/model/Product';

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  return decoded.userId;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const userId = await getUserFromToken(request);
    
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
    const userId = await getUserFromToken(request);
    const { productIds, quantities, customerDetails } = await request.json();
    
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
    let totalAmount = 0;
    const orderProducts = [];
    
    for (let i = 0; i < productIds.length; i++) {
      const product = products.find(p => p._id.toString() === productIds[i]);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productIds[i]}` },
          { status: 404 }
        );
      }
      
      const quantity = quantities[i];
      const price = product.price;
      totalAmount += price * quantity;
      
      orderProducts.push({
        product: productIds[i],
        quantity,
        price
      });
    }
    
    // Create order
    const order = new OrderModel({
      user: userId,
      products: orderProducts,
      totalAmount,
      customerDetails
    });
    
    await order.save();
    
    // Clear user's cart
    const user = await UserModel.findById(userId);
    if (user) {
      user.cart = [];
      await user.save();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      orderId: order._id,
      totalAmount
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
