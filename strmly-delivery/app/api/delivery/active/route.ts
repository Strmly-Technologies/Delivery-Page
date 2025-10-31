import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";
import { TIME_SLOTS } from "@/constants/timeSlots";
import dbConnect from "@/lib/dbConnect";

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        
        const decodedToken = await verifyAuth(request);
        if (decodedToken.role !== 'delivery') {
            return NextResponse.json(
                { error: 'Unauthorized. Delivery access required.' },
                { status: 403 }
            );
        }
        
        const userId = decodedToken.userId;
        const { isActive, timeSlots } = await request.json();
        
        console.log('Received data for updating delivery active status:', { userId, isActive, timeSlots });
        
        if (!Array.isArray(timeSlots)) {
            return NextResponse.json(
                { error: 'Invalid timeSlots format. Must be an array.' },
                { status: 400 }
            );
        }

        // Validate time slots against your constants
        const validTimeSlots = TIME_SLOTS.map(slot => slot.range);
        const invalidSlots = timeSlots.filter(slot => !validTimeSlots.includes(slot));
        
        if (invalidSlots.length > 0) {
            return NextResponse.json(
                { 
                    error: `Invalid time slots: ${invalidSlots.join(', ')}`,
                    validTimeSlots: validTimeSlots
                },
                { status: 400 }
            );
        }
        
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            {
                deliveryActiveInfo: {
                    isActive,
                    timeSlots,
                    lastUpdated: new Date()
                }
            },
            { new: true }
        );
        
        if (!updatedUser) {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            );
        }
        
        return NextResponse.json({
            success: true,
            deliveryActiveInfo: updatedUser.deliveryActiveInfo,
            availableTimeSlots: TIME_SLOTS
        });
        
    } catch (error) {
        console.error('Error updating delivery active status:', error);
        return NextResponse.json(
            { error: 'Failed to update delivery active status.' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        
        const decodedToken = await verifyAuth(request);
        if (decodedToken.role !== 'delivery') {
            return NextResponse.json(
                { error: 'Unauthorized. Delivery access required.' },
                { status: 403 }
            );
        }
        
        const userId = decodedToken.userId;
        const user = await UserModel.findById(userId).select('deliveryActiveInfo');
        
        if (!user) {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            );
        }
        
        return NextResponse.json({
            success: true,
            deliveryActiveInfo: user.deliveryActiveInfo || {
                isActive: false,
                timeSlots: []
            },
            availableTimeSlots: TIME_SLOTS
        });
        
    } catch (error) {
        console.error('Error fetching delivery active status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch delivery active status.' },
            { status: 500 }
        );
    }
}