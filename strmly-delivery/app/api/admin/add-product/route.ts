// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import ProductModel from "@/model/Product";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    const userId = decodedToken.userId;
    const { name, description, price, category, imageUrl, isAvailable, smallPrice,mediumPrice,regularNutrients,largeNutrients } = await request.json();
    
    console.log('Product data:', { name, description, price, category, imageUrl, isAvailable , smallPrice, mediumPrice,regularNutrients,largeNutrients});
    
    // Validation
    if (!name || !description || !price || !category || !imageUrl ) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

  

    // Create new product
    const newProduct = new ProductModel({
      name,
      description,
      price,
      category,
      image: imageUrl,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isActive: true,
      createdBy: userId,
        smallPrice:Number(smallPrice) || 0,
        mediumPrice:Number(mediumPrice) || 0,
        regularNutrients: regularNutrients || [],
        largeNutrients: largeNutrients || []
    });
    
    await newProduct.save();
    
    return NextResponse.json({
      success: true,
      product: newProduct,
      message: 'Product created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Add product error:', error);
    return NextResponse.json(
      { error: 'Failed to add product' },
      { status: 500 }
    );
  }
}