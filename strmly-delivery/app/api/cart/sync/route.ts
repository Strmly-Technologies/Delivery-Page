import { NextRequest, NextResponse } from 'next/server';
import UserModel, { CartItem } from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';
import dbConnect from '@/lib/dbConnect';

const JUICE_X_PRODUCT_ID = process.env.PRODUCT_ID || '';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const authData = await verifyAuth(request);
    if (!authData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await request.json();
    console.log('Received cart items:', items);

    // Check if JuiceX is in the items
    const hasJuiceXInItems = items.some((item: any) => 
      (item.product?._id || item.productId) === JUICE_X_PRODUCT_ID
    );

    const formattedItems = items.map((item: any) => ({
      product: item.product?._id || item.productId,
      customization: {
        size: item.customization.size,
        quantity: item.customization.quantity,
        ice: item.customization.ice || null,
        sugar: item.customization.sugar || null,
        dilution: item.customization.dilution || null,
        finalPrice: Number(item.customization.finalPrice)
      },
      price: Number(item.price),
      quantity: Number(item.quantity),
      addedAt: new Date(item.addedAt)
    }));

    console.log("userId for cart sync:", authData.userId);

    const user = await UserModel.findById(authData.userId);
    if (!user) {
      console.warn('User not found for ID:', authData.userId);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const result = await UserModel.updateOne(
      { _id: authData.userId },
      { 
        $set: { 
          cart: formattedItems,
          hasJuiceXInCart: hasJuiceXInItems
        } 
      }
    );

    console.log('Cart update result:', result);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync cart' });
  }
}
