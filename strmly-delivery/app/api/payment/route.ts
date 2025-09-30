import { verifyAuth } from "@/lib/serverAuth";
import { NextResponse,NextRequest } from "next/server";
import Razorpay from "razorpay";


const razorpay=new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID!,
    key_secret:process.env.RAZORPAY_KEY_SECRET!
});


export async function POST(request:NextRequest){
    try {
        const decodedToken=await verifyAuth(request);
        const userId=decodedToken.userId;

        const {amount,orderId,receipt}=await request.json();
        if (!amount || amount < 1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid amount' 
      }, { status: 400 });
    }
    const options={
        amount:amount*100,
        currency:"INR",
        receipt:receipt,
        notes:{
            userId:userId,
            orderId:orderId
        }
    }
    const razorpayOrder=await razorpay.orders.create(options);
    return NextResponse.json({success:true,order:razorpayOrder});
        
    } catch (error) {
   console.error('Error creating payment order:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create payment order' 
    }, { status: 500 });
  }
}