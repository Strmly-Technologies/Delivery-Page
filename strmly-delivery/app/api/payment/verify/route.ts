import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAuth } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await verifyAuth(request);
    
    // Get payment details from request
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await request.json();
    
    // Verify the payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign)
      .digest("hex");
      
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
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