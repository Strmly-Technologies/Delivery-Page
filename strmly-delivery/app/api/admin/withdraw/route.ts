import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import { WithdrawalModel } from "@/model/Withdrawal";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        
        const decodedToken = await verifyAuth(request);
        if (decodedToken.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }

        const requests = await WithdrawalModel.find()
            .populate('userId', 'username email')
            .sort({ requestedAt: -1 });

        return NextResponse.json({
            success: true,
            requests
        });

    } catch (error) {
        console.error('Fetch withdrawal requests error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch withdrawal requests' },
            { status: 500 }
        );
    }
}