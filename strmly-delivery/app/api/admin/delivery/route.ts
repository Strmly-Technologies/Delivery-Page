import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import DeliverySettingModel from '@/model/Delivery';
import { verifyAuth } from '@/lib/serverAuth';

export async function GET() {
  try {
    await dbConnect();
    const settings = await DeliverySettingModel.findOne().sort({ updatedAt: -1 });
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          MAX_RANGE: 5,
          CHARGES: [
            { range: 2, charge: 10 },
            { range: 3, charge: 25 },
            { range: 5, charge: 35 }
          ]
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        MAX_RANGE: settings.maxRange,
        CHARGES: settings.charges
      },
      settin:settings
    });
  } catch (error) {
    console.error('Error fetching delivery settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery settings' });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    await verifyAuth(request);
    
    const data = await request.json();
    
    // Sort charges by range
    data.charges.sort((a: any, b: any) => a.range - b.range);
    
    // Update or create settings
    const settings = await DeliverySettingModel.findOneAndUpdate(
      {},
      { ...data, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    await verifyAuth(request);
    
    const { rangeId, charge } = await request.json();
    
    const settings = await DeliverySettingModel.findOne().sort({ updatedAt: -1 });
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }
    
    const chargeIndex = settings.charges.findIndex(
      (c: any) => c._id.toString() === rangeId
    );
    
    if (chargeIndex === -1) {
      return NextResponse.json({ error: 'Range not found' }, { status: 404 });
    }
    
    settings.charges[chargeIndex].charge = charge;
    settings.updatedAt = new Date();
    await settings.save();
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update range' }, { status: 500 });
  }
}