import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.log("Fetching staff members");

    const staff = await UserModel.find({
      role: { $in: ['chef', 'delivery'] }
    }).select('-password');

    return NextResponse.json({
      success: true,
      staff
    });

  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { username, password, role } = await request.json();
    console.log('Creating staff member:', username, role);

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Username, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['chef', 'delivery'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be chef or delivery' },
        { status: 400 }
      );
    }
    console.log('Role validation passed');

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }
    console.log('Existing user check passed');


    const newStaff = new UserModel({
      username,
      email: `${username}@strmly.internal`,
      password: password,
      role
    });

    await newStaff.save();
    console.log('Staff member created with ID:', newStaff._id);

    return NextResponse.json({
      success: true,
      message: 'Staff member created successfully',
      staff: {
        id: newStaff._id,
        username: newStaff.username,
        role: newStaff.role
      }
    });

  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}