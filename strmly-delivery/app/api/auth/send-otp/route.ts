import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from 'redis';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';

const resend = new Resend(process.env.RESEND_API_KEY);

// Create Redis client (normal Redis, not Upstash)
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
    const { email } = await request.json();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await dbConnect();
    try {
        const existingUser=await UserModel.findOne({email:email});
        if(!existingUser){
            const username=email.split('@')[0];
            const password=Math.random().toString(36).slice(-8); // Generate a random password
            const newUser=new UserModel({
                username,
                email,
                password,
                otpVerified:false,
            }
            );
            await newUser.save();
        }        
    } catch (error) {
        console.error('Error creating user:', error);
    }

    // Store OTP with 5-minute expiry
    await redis.setEx(`otp:${email}`, 300, otp);
    console.log(`Stored OTP for ${email}: ${otp}`);

    const res=await resend.emails.send({
      from: 'noreply@strmly.com',
      to: email,
      subject: 'Your OTP for STRMLY Delivery',
      html: `Your OTP is: <strong>${otp}</strong>. It will expire in 5 minutes.`,
    });

    // console.log('OTP email sent:', res);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' });
  }
}
