import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyAuth } from '@/lib/serverAuth';
import ProductModel from '@/model/Product';

// Get a specific product
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
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
    const product = await ProductModel.findById(params.id);
    console.log('Fetched product:', product);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      product
    });
    
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// Update a product
// ...existing code...

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    console.log('Update product request body:', body);

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only add fields that are actually provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.smallPrice !== undefined) updateData.smallPrice = body.smallPrice;
    if (body.mediumPrice !== undefined) updateData.mediumPrice = body.mediumPrice;
    if (body.regularNutrients !== undefined) updateData.regularNutrients = body.regularNutrients;
    if (body.largeNutrients !== undefined) updateData.largeNutrients = body.largeNutrients;
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;

    console.log('Update data:', updateData);

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData }, // Use $set explicitly
      { new: true, runValidators: true }
    );

    console.log('Updated product after save:', updatedProduct);

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify the update actually worked
    const verifyProduct = await ProductModel.findById(id);
    console.log('Verified product from DB:', verifyProduct);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}



// Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const deletedProduct = await ProductModel.findByIdAndDelete(params.id);
    
    if (!deletedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}