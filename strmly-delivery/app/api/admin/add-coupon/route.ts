import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";

export  async function POST(request:NextRequest){
    try {
        const decodedToken=await verifyAuth(request);
        if(decodedToken.role !== 'admin'){
            return NextResponse.json({error:'Unauthorized: Admin access required'},{status:403});
        }
        const {code,discountPercentage,userId}=await request.json();
        // Validation
        if(!code || !discountPercentage){
            return NextResponse.json({error:'All fields are required'},{status:400});
        }
        if(typeof discountPercentage !== 'number' || discountPercentage <=0 || discountPercentage >100){
            return NextResponse.json({error:'Discount percentage must be a number between 1 and 100'},{status:400});
        }
        if(!userId){
            return NextResponse.json({error:'User ID is required'},{status:400});
        }

       const user = await UserModel.findById(userId);
         if(!user){
          return NextResponse.json({error:'User not found'},{status:404});
         }
        if(!Array.isArray(user.availableCoupons)){
            user.availableCoupons = [];
        }
        user.availableCoupons.push({code,discountPercentage});
        await user.save();
        console.log('Added coupon to user:', userId, user.availableCoupons);

        return NextResponse.json({success:true,message:'Coupon added to all users successfully'});
        
    } catch (error) {
        console.error('Add coupon error:',error);
        return NextResponse.json({error:'Failed to add coupon'},{status:500});
        
    }
}