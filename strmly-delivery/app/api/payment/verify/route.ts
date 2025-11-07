import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAuth } from '@/lib/serverAuth';
import OrderModel from '@/model/Order';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await verifyAuth(request);
    
    // Get payment details from request
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature ,
      orderId
    } = await request.json();
    
    // Verify the payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign)
      .digest("hex");
      
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      const order= await OrderModel.findById(orderId);
      if(order){
        order.paymentStatus = "completed";
        await order.save();
      }
      return NextResponse.json({
        success: true,
        message: "Payment verified successfully"
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Payment verification failed"
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Payment verification failed' 
    }, { status: 500 });
  }
}