import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserModel from '@/model/User';
import dbConnect from '@/lib/dbConnect';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { fullName, email, password, confirmPassword } = await request.json();

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: fullName.toLowerCase().replace(/\s+/g, '') }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        );
      }
    }

    // Create user - password will be hashed automatically by the pre-save hook
    const newUser = new UserModel({
      username: fullName.toLowerCase().replace(/\s+/g, ''), // Create username from full name
      email: email.toLowerCase(),
      password: password // This will be hashed by the pre-save hook
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id.toString(), 
        email: newUser.email,
        username: newUser.username 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Return success response without password
    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        fullName: fullName,
        createdAt: newUser.createdAt
      },
      token
    }, { status: 201 });

  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
