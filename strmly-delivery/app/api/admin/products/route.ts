import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import ProductModel from '@/model/Product';
import prisma from '@/lib/prismadb';

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

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { name, description, price, category, imageUrl, isAvailable = true } = data;

    // Validate required fields
    if (!name || !description || price === undefined || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate price is a positive number
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Check if the category exists or create it
    let categoryRecord = await prisma.category.findFirst({
      where: { name: category }
    });

    if (!categoryRecord) {
      categoryRecord = await prisma.category.create({
        data: { name: category }
      });
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl, // Store the S3 image URL
        isAvailable,
        categoryId: categoryRecord.id
      }
    });

    return NextResponse.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
