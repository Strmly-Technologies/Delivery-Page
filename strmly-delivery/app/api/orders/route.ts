import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OrderModel from '@/model/Order';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';
import ProductModel from '@/model/Product';


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
      completeCheckout = false,
      scheduledDeliveryDate,
      couponCode,
      discountAmount
    } = requestBody;

    // Extract items based on checkout type
    const cartItems = requestBody.cartItems || [];
    const planItems = requestBody.planItems || [];
    const customisablePrices = requestBody.customisablePrices || [];
    const planDayId = requestBody.planDayId;
    const planDays = requestBody.planDays || [];
    let couponOwner = null;
    let referralCreditAmount = 0;

    // Get unique product IDs from order
    const productIds: string[] = [];
    
    if (checkoutType === 'quicksip') {
      productIds.push(...cartItems.map((item: CartItem) => item.product._id));
    } else if (checkoutType === 'freshplan') {
      if (completeCheckout && planDays.length > 0) {
        planDays.forEach((day: any) => {
          productIds.push(...day.items.map((item: PlanItem) => 
            typeof item.product === 'string' ? item.product : item.product._id
          ));
        });
      } else {
        productIds.push(...planItems.map((item: PlanItem) => item.product._id));
      }
    }

    const uniqueProductIds = [...new Set(productIds)];

    // Check if all products are active
    const products = await ProductModel.find({ _id: { $in: uniqueProductIds } })
      .select('_id isActive name maxOrderCount')
      .lean();
    const typedProducts = products as Array<{ _id: any; isActive?: boolean; name?: string; maxOrderCount?: number | null }>;
    const inactiveProducts = typedProducts.filter(p => !p.isActive);
    
    if (inactiveProducts.length > 0) {
      const productNames = inactiveProducts.map(p => p.name).join(', ');
      return NextResponse.json(
        { 
          error: `Cannot place order. The following product(s) are no longer available: ${productNames}`,
          inactiveProducts: inactiveProducts.map(p => ({ id: p._id, name: p.name }))
        },
        { status: 400 }
      );
    }

    // Check max order count limits
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const productOrderCounts = user.productOrderCounts || new Map();
    
    for (const product of typedProducts) {
      if (product.maxOrderCount !== null && product.maxOrderCount !== undefined) {
        const currentOrderCount = productOrderCounts.get(product._id.toString()) || 0;
        
        if (currentOrderCount >= product.maxOrderCount) {
          return NextResponse.json(
            { 
              error: `You have reached the maximum order limit for ${product.name}. Maximum ${product.maxOrderCount} orders allowed.`,
              productName: product.name,
              maxOrderCount: product.maxOrderCount,
              currentOrderCount
            },
            { status: 400 }
          );
        }
      }
    }
    
    // Check if any item is the one-time free product "Juice X"
    const JUICE_X_PRODUCT_ID = process.env.PRODUCT_ID || '';
    let hasOrderedJuiceX = false;
    
    if (checkoutType === 'quicksip') {
      hasOrderedJuiceX = cartItems.some((item: CartItem) => item.product._id === JUICE_X_PRODUCT_ID);
    } else if (checkoutType === 'freshplan') {
      if (completeCheckout) {
        hasOrderedJuiceX = planDays.some((day: any) => 
          day.items.some((item: PlanItem) => item.product._id === JUICE_X_PRODUCT_ID)
        );
      } else {
        hasOrderedJuiceX = planItems.some((item: PlanItem) => item.product._id === JUICE_X_PRODUCT_ID);
      }
    }

    // Validate required fields
    if (!customerDetails || 
        (!cartItems.length && !planItems.length && !planDays.length) || 
        !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle coupon logic
    if (couponCode && discountAmount) {
      // Find the user who owns this coupon
      couponOwner = await UserModel.findOne({
        'availableCoupons.code': couponCode
      });

      if (!couponOwner) {
        return NextResponse.json(
          { error: 'Invalid coupon code' },
          { status: 400 }
        );
      }

      // Get coupon details
      const coupon = couponOwner.availableCoupons?.find(
        c => c.code === couponCode
      );

      if (!coupon) {
        return NextResponse.json(
          { error: 'Coupon not found' },
          { status: 400 }
        );
      }

      // Check if user is using their own coupon (should get full discount)
      referralCreditAmount = discountAmount;

      // increase number of people used the coupon and credit referral wallet
     
        await UserModel.updateOne(
          { 
            _id: couponOwner._id,
            'availableCoupons.code': couponCode 
          },
          {
            $inc: { 'availableCoupons.$.numberOfUses': 1 }
          }
        );
       
      // Credit referral wallet if this is a friend's purchase
      if (referralCreditAmount > 0) {
        await UserModel.findByIdAndUpdate(
          couponOwner._id,
          {
            $inc: { referralWallet: referralCreditAmount }
          }
        );
    }
  }
    
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
        orderItems = []; 
        
        // Format the day schedule data for storage
        const daySchedule = planDays.map((day: any) => ({
          date: new Date(day.date),
          items: day.items.map((item: PlanItem) => {
            let productId;
            
            // Handle different formats of product data that might be passed
            if (typeof item.product === 'string') {
              productId = item.product;
            } else if (item.product._id) {
              productId = item.product._id;
            } else {
              console.error('Invalid product data:', item.product);
            }
    
    return {
      product: productId, 
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

    // Combine all items (except for complete FreshPlan checkout which uses daySchedule)
    const finalOrderItems = orderType === 'freshplan' 
      ? []
      : [...orderItems, ];

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
      planRelated,
       ...(couponCode && couponOwner && {
        appliedCoupon: {
          code: couponCode,
          discountAmount: discountAmount,
          referralCredit: referralCreditAmount,
          couponOwnerId: couponOwner._id
        }
      }),
      ...(scheduledDeliveryDate && {
          scheduledDeliveryDate: new Date(scheduledDeliveryDate)
        })
    });

    // Update product order counts for user
    const updateData: any = {};
    
    // Increment order counts for each unique product
    for (const productId of uniqueProductIds) {
      const productIdStr = productId.toString();
      const currentCount = productOrderCounts.get(productIdStr) || 0;
      productOrderCounts.set(productIdStr, currentCount + 1);
    }
    
    // Convert Map to plain object for MongoDB
    updateData.productOrderCounts = Object.fromEntries(productOrderCounts);

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
              freshPlans:freshplans,
              productOrderCounts: updateData.productOrderCounts,
              ...(hasOrderedJuiceX && { 
                hasPurchasedProductJuiceX: true,
                hasJuiceXInCart: false 
              })
            }
          }
        );  
      }
    } else if (checkoutType === 'quicksip') {
      await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            productOrderCounts: updateData.productOrderCounts,
            ...(hasOrderedJuiceX && {
              hasPurchasedProductJuiceX: true,
              hasJuiceXInCart: false
            })
          }
        }
      );
    } else {
      // For other cases, still update product order counts
      await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            productOrderCounts: updateData.productOrderCounts
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
