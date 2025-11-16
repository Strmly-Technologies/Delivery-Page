import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";

export async function  POST(request:NextRequest){
    try {
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.userId;
        const {code,discountedMoney}=await request.json();
        
        if(!code){
            return NextResponse.json({error:'Coupon code is required'},{status:400});
        }
        // find the user with the coupon
        const user=await UserModel.findOne({
            'availableCoupons.code':code
        })
        console.log('User found for coupon application:', user);
        if(!user){
            return NextResponse.json({error:'User not found'},{status:404});
        }
        if(!Array.isArray(user.availableCoupons)){
            user.availableCoupons = [];
        }
        const couponIndex = user.availableCoupons.findIndex(
            (coupon) => coupon.code === code
        );
        if(couponIndex === -1){
            return NextResponse.json({error:'Invalid coupon code'},{status:400});
        }
        // Increment numberOfUses
        user.availableCoupons[couponIndex].numberOfUses = 
            (Number(user.availableCoupons[couponIndex].numberOfUses) || 0) + 1;
        user.referralWallet = (Number(user.referralWallet) || 0) + Number(discountedMoney);
        await user.save();
        console.log('Applied coupon for user:', code);
        return NextResponse.json({success:true,message:'Coupon applied successfully'});
        
    } catch (error) {
        console.error('Apply coupon error:',error);
        return NextResponse.json({error:'Failed to apply coupon'},{status:500});
        
    }
}