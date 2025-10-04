import dbConnect from "@/lib/dbConnect";
import OtherModel from "@/model/Other";
import { NextRequest,NextResponse } from "next/server";


export async function GET(request:NextRequest){
    try {
        await dbConnect();
        const response=await OtherModel.findOne().sort({updatedAt:-1});
        if(!response){
            return NextResponse.json({
                success:true,
                header:{
                    image:'',
                    text:'Welcome to STRMLY Delivery'
                },
                customisablePricings:[]
            });
        }
        console.log('UI header fetched:',response);
        return NextResponse.json({
            success:true,
            header:response.dashboard,
            customisablePricings:response.customisablePricings
        });
        
    } catch (error) {
        console.error('UI header fetch error:',error);
        return NextResponse.json({error:'Failed to fetch UI header'}, {status:500}); 
    }
}