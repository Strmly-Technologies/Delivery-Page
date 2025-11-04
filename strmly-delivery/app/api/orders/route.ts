import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';
import "@/model/Product";

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
      planId,
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
    const planDays = requestBody.planDays || []; // New field for day-wise data
    
    // Validate required fields
    if (!customerDetails || 
        (!cartItems.length && !planItems.length && !planDays.length) || 
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
    let planRelated = {};

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
      if (completeCheckout && planDays.length > 0) {
        // Complete plan checkout with day-wise data
        orderItems = []; // Empty since we're using daySchedule instead
        
        // Format the day schedule data for storage
        const daySchedule = planDays.map((day: any) => ({
          date: new Date(day.date),
          items: day.items.map((item: PlanItem) => {
            // Ensure we have a valid product reference
            let productId;
            
            // Handle different formats of product data that might be passed
            if (typeof item.product === 'string') {
              productId = item.product;
            } else if (item.product._id) {
              productId = item.product._id;
            } else {
              console.error('Invalid product data:', item.product);
              // If we can't get a valid ID, this will cause validation errors
            }
    
    return {
      product: productId, // Make sure we're storing the ID, not the whole object
      quantity: item.quantity,
      price: item.customization.finalPrice,
      customization: { ...item.customization },
      timeSlot: item.timeSlot
    };
  })
}));
        
        planRelated = {
          isCompletePlanCheckout: true,
          daySchedule
        };
      } else {
        // Single day checkout
        orderItems = planItems.map((item: PlanItem) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.customization.finalPrice,
          customization: { ...item.customization },
          timeSlot: item.timeSlot
        }));
        
        planRelated = {
          planDayId,
          isCompletePlanCheckout: false
        };
      }
      
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

    // Combine all items (except for complete FreshPlan checkout which uses daySchedule)
    const finalOrderItems = orderType === 'freshplan' 
      ? [...additionalItems]
      : [...orderItems, ...additionalItems];

    // Create the order
    const order = await OrderModel.create({
      user: userId,
      products: finalOrderItems,
      totalAmount,
      deliveryCharge,
      deliveryTimeSlot: checkoutType === 'quicksip' ? deliveryTimeSlot : null,
      status: 'pending',
      paymentStatus: 'pending',
      customerDetails,
      orderType,
      planRelated
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

      const user= await UserModel.findById(userId);
      const freshplans= user?.freshPlans || [];
      if(freshplans.length>0){
        for(let i=0;i<freshplans.length;i++){
          if(freshplans[i]._id.toString()===planId){
            freshplans[i].paymentComplete=true;
            break;
          }
        }
        await UserModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              freshPlans:freshplans
            }
          }
        );  
      }

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