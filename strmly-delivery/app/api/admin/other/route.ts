import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import OtherModel from '@/model/Other';
import { verifyAuth } from '@/lib/serverAuth';

export async function GET() {
  try {
    await dbConnect();
    const settings = await OtherModel.findOne().sort({ updatedAt: -1 });
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          dashboard: {
            image: '',
            text: ''
          },
          customisablePricings: []
        }
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    await verifyAuth(request);
    
    const data = await request.json();
    console.log('Received data for other settings update:', data);

    const settings = await OtherModel.findOneAndUpdate(
      {},
      {
        ...data,
        updatedAt: new Date()
      },
      {
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update settings' 
    }, { 
      status: 500 
    });
  }
}