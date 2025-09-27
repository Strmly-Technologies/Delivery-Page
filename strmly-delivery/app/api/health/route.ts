import dbConnect from "@/lib/dbConnect";
import { NextRequest,NextResponse } from "next/server";

export async function GET(request: NextRequest){
    await dbConnect();
    return NextResponse.json({message:"API is healthy and connected to database"})
}