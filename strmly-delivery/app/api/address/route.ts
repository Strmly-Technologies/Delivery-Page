


// route to save address

import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest } from "next/server";

export async function POST(request:NextRequest){
    try {
        const decodedToken=await verifyAuth(request);
        const userId= decodedToken.userId;
        const body=await request.json();
        const {addressName, deliveryAddress, additionalAddressDetails,phoneNumber,fullName}=body;

        // Validate required fields
        if (!addressName || !deliveryAddress || !phoneNumber) {
            return new Response(JSON.stringify({ error: 'Address Name, Phone number and Delivery Address are required.' }), { status: 400 });
        }

        await dbConnect();
        const updatedUser= await UserModel.findByIdAndUpdate(
            userId,
            {
                $push: {
                    savedAddresses: {
                        fullName,
                        addressName,
                        deliveryAddress,
                        additionalAddressDetails,
                        phoneNumber
                    }
                }
            },
            { new: true }
        );
        if(!updatedUser){
            return new Response(JSON.stringify({ error: 'Failed to save address.' }), { status: 500 });
        }
        return new Response(JSON.stringify({ success: true, message: 'Address saved successfully.' }), { status: 200 });
        
    } catch (error) {
        console.error('Save address error:', error);
        return new Response(JSON.stringify({ error: 'Failed to save address.' }), { status: 500 });
        
    }
}


// route to get saved addresses

export async function GET(request:NextRequest){
    try {
        const decodedToken=await verifyAuth(request);
        const userId= decodedToken.userId;

        await dbConnect();
        const user= await UserModel.findById(userId).lean();
        if(!user){
            return new Response(JSON.stringify({ error: 'User not found.' }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true, savedAddresses: user.savedAddresses || [] }), { status: 200 });
        
    } catch (error) {
        console.error('Get saved addresses error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch saved addresses.' }), { status: 500 });
        
    }
}