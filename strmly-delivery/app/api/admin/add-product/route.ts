import { NextRequest,NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import ProductModel from "@/model/Product";

export async function POST(request:NextRequest){
    try {
        await dbConnect();
        const decodedToken=await verifyAuth(request);
        if(decodedToken.role!=='admin'){
            return NextResponse.json({error:'Unauthorized: Admin access required'},{status:403});
        }
        const userId=decodedToken.userId;
        const {name,description,price,category,imageUrl='/dummy',stock}=await request.json();
        console.log(name,description,price,category,imageUrl,stock);
        if(!name || !description || !price || !category || !imageUrl || !stock){
            return NextResponse.json({error:'All fields are required'},{status:400});
        }
        const newProduct=new ProductModel({
            name,
            description,
            price,
            category,
            image:imageUrl,
            stock,
            createdBy:userId
        });
        await newProduct.save();
        return NextResponse.json({success:true,product:newProduct});
    }
    catch (error) {
        console.error('Add product error:', error);
        return NextResponse.json({error:'Failed to add product'},{status:500});
    }

}