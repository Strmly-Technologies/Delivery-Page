import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const isAdmin = decodedToken.role === 'admin';
    
    return NextResponse.json({
      success: true,
      isAdmin
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      isAdmin: false
    });
  }
}
