import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from 'redis';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';

const resend = new Resend(process.env.RESEND_API_KEY);

// Create Redis client
const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,  
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on('error', (err) => console.error('Redis Client Error', err));

await redis.connect();

export async function POST(request: Request) {
  try {
    const { email, phone } = await request.json();
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid email address' 
      }, { status: 400 });
    }

    // Validate phone number (10 digits)
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid phone number. Must be 10 digits.' 
      }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await dbConnect();
    
    try {
      const existingUser = await UserModel.findOne({ email: email });
      
      if (!existingUser) {
        // Check if phone number is already taken
        const existingPhone = await UserModel.findOne({ phone: phone });
        if (existingPhone) {
          return NextResponse.json({ 
            success: false, 
            error: 'Phone number already registered with another account' 
          }, { status: 400 });
        }

        const username = email.split('@')[0];
        const password = Math.random().toString(36).slice(-8);
        const newUser = new UserModel({
          username,
          email,
          phone, // Save phone number
          password,
          otpVerified: false,
        });
        await newUser.save();
      } else {
        // Update phone number if user exists and phone is different
        if (existingUser.phone !== phone) {
          // Check if new phone number is already taken by another user
          const phoneExists = await UserModel.findOne({ 
            phone: phone,
            _id: { $ne: existingUser._id }
          });
          
          if (phoneExists) {
            return NextResponse.json({ 
              success: false, 
              error: 'Phone number already registered with another account' 
            }, { status: 400 });
          }

          existingUser.phone = phone;
          await existingUser.save();
        }
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to process user data' 
      }, { status: 500 });
    }

    // Store OTP with 5-minute expiry
    await redis.setEx(`otp:${email}`, 300, otp);
    console.log(`Stored OTP for ${email}: ${otp}`);

    const res = await resend.emails.send({
      from: 'noreply@strmly.com',
      to: email,
      subject: 'Your OTP for Juice Rani',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316;">Juice Rani - Verification Code</h2>
          <p>Your OTP verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #f97316; font-size: 36px; margin: 0; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send OTP' 
    }, { status: 500 });
  }
}