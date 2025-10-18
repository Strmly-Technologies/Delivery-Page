import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

// Define interfaces for type safety
interface CartItem {
  product: {
    _id: string;
    name: string;
    image: string;
  };
  customization: {
    size: string;
    quantity: string;
    ice?: string;
    sugar?: string;
    dilution?: string;
    finalPrice: number;
    orderQuantity?: number;
  };
  price: number;
  quantity: number;
}

interface PlanItem {
  product: {
    _id: string;
    name: string;
    image: string;
    description?: string;
    price: number;
    category: string;
  };
  customization: {
    size: string;
    quantity: string;
    ice?: string;
    sugar?: string;
    dilution?: string;
    finalPrice: number;
  };
  quantity: number;
  timeSlot: string;
  _id: string;
}

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  additionalAddressInfo?: string;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    // Parse request body
    const requestBody = await request.json();
    const { 
      customerDetails, 
      totalAmount, 
      deliveryCharge,
      deliveryTimeSlot,
      checkoutType = 'quicksip',
      completeCheckout = false
    } = requestBody;

    // Extract items based on checkout type
    const cartItems = requestBody.cartItems || [];
    const planItems = requestBody.planItems || [];
    const customisablePrices = requestBody.customisablePrices || [];
    const planDayId = requestBody.planDayId;
    
    // Validate required fields
    if (!customerDetails || 
        (!cartItems.length && !planItems.length) || 
        !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`Processing ${checkoutType} order with ${cartItems.length || planItems.length} items`);

    // Create order items based on checkout type
    let orderItems;
    let orderType;

    if (checkoutType === 'quicksip') {
      // Process QuickSip order (cart-based)
      orderItems = cartItems.map((item: CartItem) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.customization.finalPrice,
        customization: { ...item.customization }
      }));
      orderType = 'quicksip';
    } else {
      // Process FreshPlan order
      planItems.forEach((item: PlanItem) => {
        console.log("plan item", item.timeSlot);
      });
      
      orderItems = planItems.map((item: PlanItem) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.customization.finalPrice,
        customization: { ...item.customization },
        timeSlot: item.timeSlot
      }));
      orderType = 'freshplan';
    }

    // Add additional customizable items if present
    const additionalItems = customisablePrices.map((item: any) => ({
      product: null, // No product reference for customizable items
      quantity: 1,
      price: item.price,
      customization: {
        category: item.category,
        finalPrice: item.price
      }
    }));

    // Create the order
    const order = await OrderModel.create({
      user: userId,
      products: [...orderItems, ...additionalItems],
      totalAmount,
      deliveryCharge,
      deliveryTimeSlot: checkoutType === 'quicksip' ? deliveryTimeSlot : null,
      status: 'pending',
      paymentStatus: 'pending',
      customerDetails,
      orderType,
      planRelated: checkoutType === 'freshplan' ? {
        planDayId,
        isCompletePlanCheckout: completeCheckout
      } : undefined
    });

    // Update FreshPlan status if this is a complete checkout
    if (checkoutType === 'freshplan' && completeCheckout) {
      await UserModel.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            'freshPlan.paymentComplete': true,
            'freshPlan.orderId': order._id 
          } 
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      orderId: order._id,
      totalAmount
    });
  } catch (error) {
    console.error('Order creation error:', error);
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