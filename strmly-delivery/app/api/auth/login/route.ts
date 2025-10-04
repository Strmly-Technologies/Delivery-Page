import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    await dbConnect();
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await UserModel.findOne({ 
      email: email.toLowerCase() 
    }).select('+password'); // Explicitly select password field

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password using the method defined in the User model
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: (user._id as any).toString(), 
        email: user.email,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create response with user data
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        fullName: user.username,
        createdAt: user.createdAt,
        role: user.role
      },
      token // Still return token for localStorage if needed
    });

    // Set cookie with the JWT token
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true, // Prevents client-side JS from accessing the cookie (security)
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'lax', // Protects against CSRF attacks
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/', // Cookie available across entire site
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}