import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.userId;

    const { productId, customization, action } = await request.json();

    if (!['increment', 'decrement'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the exact cart item with matching customization
    const cartItemIndex = user.cart.findIndex((item: any) => {
      const itemProductId = item.product.toString();
      const sameProduct = itemProductId === productId;
      const sameSize = item.customization.size === customization.size;
      const sameQuantity = item.customization.quantity === customization.quantity;
      const sameIce = item.customization.ice === customization.ice;
      const sameSugar = item.customization.sugar === customization.sugar;
      const sameDilution = item.customization.dilution === customization.dilution;
      const sameFibre = item.customization.fibre === customization.fibre;
      
      return sameProduct && sameSize && sameQuantity && sameIce && sameSugar && sameDilution && sameFibre;
    });

    if (cartItemIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Item not found in cart' },
        { status: 404 }
      );
    }

    // Update quantity based on action
    if (action === 'increment') {
        // also increase the price accordingly
      user.cart[cartItemIndex].quantity += 1;
      user.cart[cartItemIndex].price += user.cart[cartItemIndex].customization.finalPrice;
    } else if (action === 'decrement') {
      if (user.cart[cartItemIndex].quantity > 1) {
        user.cart[cartItemIndex].quantity -= 1;
        user.cart[cartItemIndex].price -= user.cart[cartItemIndex].customization.finalPrice;
      } else {
        // Remove item if quantity becomes 0
        user.cart.splice(cartItemIndex, 1);
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      cart: user.cart,
      message: `Item quantity ${action}ed successfully`
    });

  } catch (error) {
    console.error('Update quantity error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}