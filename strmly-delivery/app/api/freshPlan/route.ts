import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { error } from "console";
import { NextRequest,NextResponse } from "next/server";



export async function POST(req:NextRequest,res:NextResponse){
    try {
        await dbConnect();
        const decodedToken=await verifyAuth(req);
        const userId=decodedToken.userId;

        const {days, startDate,schedule}=await req.json();
        const updatedUser=await UserModel.findByIdAndUpdate(
            userId,
            {
                $set:{
                    freshPlan:{
                        isActive:true,
                        days,
                        startDate,
                        schedule,
                        createdAt:new Date()
                    }
                }
            },
            {new:true}
        );
        if(!updatedUser){
            return NextResponse.json(
                {error:'Failed to create plan'},
                {status:400}
            )
        }
    return NextResponse.json({
      success: true,
      message: 'FreshPlan created successfully'
    });

  } catch (error) {
    console.error('FreshPlan creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const user = await UserModel.findById(userId)
    .populate('freshPlan.schedule.items.product')
    ;
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }console.log("user plan",user.freshPlan);

    return NextResponse.json({
      success: true,
      plan: user.freshPlan || null
    });

  } catch (error) {
    console.error('Get FreshPlan error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}