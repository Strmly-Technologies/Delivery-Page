import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { verifyAuth } from '@/lib/serverAuth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = params;

    const staff = await UserModel.findById(id);
    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    if (!['chef', 'delivery'].includes(staff.role!)) {
      return NextResponse.json(
        { error: 'Can only delete chef or delivery staff' },
        { status: 400 }
      );
    }

    await UserModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    });

  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}