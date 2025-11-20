import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import { WithdrawalModel } from "@/model/Withdrawal";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.userId;

        const history = await WithdrawalModel.find({ userId })
            .sort({ requestedAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            history
        });

    } catch (error) {
        console.error('Fetch withdrawal history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch withdrawal history' },
            { status: 500 }
        );
    }
}