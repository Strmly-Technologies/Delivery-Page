import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import ProductModel from '@/model/Product';
import { verifyAuth } from '@/lib/serverAuth';
import mongoose from 'mongoose';

const JUICE_X_PRODUCT_ID = process.env.PRODUCT_ID || '';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Verify authentication
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;
    
    const user = await UserModel.findById(userId).populate({
    path: "cart.product", // path inside the subdocument array
    model: "Product",     // explicitly set model name (optional if ref is defined)
    select: "name price image category stock isActive" // select only needed fields
  });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      cart: user.cart
    });
    
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { error: 'Failed to get cart' },
      { status: 401 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;

    const { productId, customization, finalPrice } = await request.json();

    if (!productId || !customization || !finalPrice) {
      return NextResponse.json(
        { error: 'Product ID, customization, and final price are required' },
        { status: 400 }
      );
    }

    // Validate customization structure
    if (!customization.size || !customization.quantity || !customization.finalPrice) {
      return NextResponse.json(
        { error: 'Invalid customization data' },
        { status: 400 }
      );
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Current cart items:', user.cart);
    console.log(":product ID", productId);
    console.log(":hasJuiceXInCart", user.hasJuiceXInCart);

    // Check if user has already purchased JuiceX
    if (productId === JUICE_X_PRODUCT_ID && user.hasPurchasedProductJuiceX) {
      return NextResponse.json(
        { 
          error: 'You have already purchased this special product. It can only be ordered once per customer.',
          isOneTimePurchase: true,
          productId: JUICE_X_PRODUCT_ID
        },
        { status: 400 }
      );
    }

    // Check if JuiceX is already in cart
    if (productId.toString() === JUICE_X_PRODUCT_ID.toString() && user.hasJuiceXInCart) {
      return NextResponse.json(
        { 
          error: 'This special product is already in your cart. You can only add it once.',
          isOneTimePurchase: true,
          productId: JUICE_X_PRODUCT_ID
        },
        { status: 400 }
      );
    }

    // Create cart item that matches the schema
    const cartItem = {
      product: new mongoose.Types.ObjectId(productId),
      customization: {
        size: customization.size,
        quantity: customization.quantity,
        ice: customization.ice || undefined,
        sugar: customization.sugar || undefined,
        dilution: customization.dilution || undefined,
        fibre: customization.fibre?true:false,
        finalPrice: customization.finalPrice
      },
      price: finalPrice,
      quantity: customization.orderQuantity, 
      addedAt: new Date()
    };

    // Update user document using findByIdAndUpdate
    const updateData: any = { $push: { cart: cartItem } };
    
    // If adding JuiceX, mark it as in cart
    console.log("Current product ID:", productId);
    console.log("JUICE_X_PRODUCT_ID:", JUICE_X_PRODUCT_ID);
    console.log("Comparing:", productId.toString() === JUICE_X_PRODUCT_ID.toString());
    if (productId.toString() === JUICE_X_PRODUCT_ID.toString()) {
      console.log("Setting hasJuiceXInCart to true");
      updateData.$set = { hasJuiceXInCart: true };
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );


    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update cart' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product added to cart successfully',
      cartItemsCount: updatedUser.cart.length
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;

    const { productId, price, customization } = await request.json();
    if (!productId || !price || !customization) {
      return NextResponse.json(
        { error: 'Product ID, price and customization are required' },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Initial cart items:', user.cart);

    // Filter out the cart item by matching product ID, price and customization
    user.cart = user.cart.filter((item) => {
      const isProductMatch = item.product.toString() === productId;
      const isPriceMatch = item.price === price;
      
      const isCustomizationMatch = 
        item.customization.size === customization.size &&
        item.customization.quantity === customization.quantity &&
        item.customization.finalPrice === customization.finalPrice &&
        item.customization.ice === customization.ice &&
        item.customization.sugar === customization.sugar &&
        item.customization.dilution === customization.dilution &&
        item.customization.fibre === customization.fibre;

      return !(isProductMatch && isPriceMatch && isCustomizationMatch);
    });

    // If removing JuiceX, mark it as not in cart
    if (productId === JUICE_X_PRODUCT_ID) {
      user.hasJuiceXInCart = false;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Product removed from cart',
      cart: user.cart
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from cart' },
      { status: 500 }
    );
  }
}