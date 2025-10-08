import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/model/Product';

export async function POST(request: Request) {
  try {
    const { productIds } = await request.json();
    
    await dbConnect();
    const products = await ProductModel.find({
      '_id': { $in: productIds }
    }).select('_id name image price');

    return NextResponse.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}