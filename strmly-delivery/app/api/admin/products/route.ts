import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import ProductModel from '@/model/Product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication and admin role
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get filter parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // Build query
    let query = {};
    if (category && (category === 'juices' || category === 'shakes')) {
      query = { category };
    }
    
    const products = await ProductModel.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      products
    });
    
  } catch (error) {
    console.error('Admin get products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}