import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyAuth } from '@/lib/serverAuth';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const { to, subject, html } = await request.json();

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and html content are required' },
        { status: 400 }
      );
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'noreply@strmly.com',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data
    });
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}