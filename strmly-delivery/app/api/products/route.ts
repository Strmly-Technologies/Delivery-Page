import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/model/Product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let query: any = { isActive: true }; // Only fetch active products
    if (category && (category === 'juices' || category === 'shakes')) {
      query.category = category;
    }
    
    const products = await ProductModel.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      products
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
