import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import jwt from 'jsonwebtoken';

// Initialize Redis client
const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST, 
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on('error', (err) => console.error('Redis Client Error:', err));

// Connect once globally (avoid reconnecting on every request)
if (!redis.isOpen) {
  redis.connect();
}

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    const storedOtp = await redis.get(`otp:${email}`);

    if (storedOtp === otp) {
      const user = await createOrGetUser(email);

      const token = await createToken(user._id);

      const response = NextResponse.json({ 
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username
      }
    });

    // Set cookie with strict settings
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid OTP' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Verification failed' });
  }
}

async function createOrGetUser(email: string) {
  await dbConnect();
  try {
    const existingUser=await UserModel.findOne({email:email});
    if(existingUser){
        return existingUser;
    }else{
        const username=email.split('@')[0];
        const password=Math.random().toString(36).slice(-8); // Generate a random password
        const newUser=new UserModel({
            username,
            email,
            password,
            otpVerified:true,
        }
        );
        await newUser.save();
        return newUser;
    }
    
  } catch (error) {
    throw new Error('Error creating or fetching user');
  }
}

async function createToken(user:any) {
  const token = jwt.sign(
        { 
          userId: (user._id as any).toString(), 
          email: user.email,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
    return token;
}
