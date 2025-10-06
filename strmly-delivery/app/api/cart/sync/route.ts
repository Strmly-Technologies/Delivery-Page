import { NextRequest, NextResponse } from 'next/server';
import UserModel, { CartItem } from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';
import dbConnect from '@/lib/dbConnect';

export async function POST(request: NextRequest) {
  try {
    const authData = await verifyAuth(request);
    console.log('Authenticated userId:', authData);
    if (!authData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await request.json();
    console.log('Received cart items:', items);
    const formattedItems = items.map((item:CartItem) => ({
      product: (item.product._id),
      customization: {
        size: item.customization.size,
        quantity: item.customization.quantity,
        ice: item.customization.ice,
        sugar: item.customization.sugar,
        dilution: item.customization.dilution,
        finalPrice: item.customization.finalPrice
      },
      price: item.price,
      quantity: item.quantity,
      addedAt: new Date(item.addedAt)
    }));
    
    await dbConnect();

    const user=await UserModel.findById(authData.userId);
    if(!user){
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    console.log('User found:', user.email);
    
    const result=await UserModel.updateOne(
      { _id: authData.userId },
      { $set: { cart: formattedItems } }
    );
    console.log('Update result:', result);


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to sync cart' });
  }
}