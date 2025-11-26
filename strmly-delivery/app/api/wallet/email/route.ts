import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { WithdrawalModel } from "@/model/Withdrawal";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest){
    try {
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.userId;

        const { amount, upiId } = await request.json();
        console.log('Received withdrawal request data:', { amount, upiId });
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        if (!upiId || !upiId.trim()) {
            return NextResponse.json({ error: 'UPI ID is required' }, { status: 400 });
        }

        // Check if amount is greater than user referral wallet
        const user = await UserModel.findById(userId).select('email referralWallet username');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (Number(amount) > Number(user.referralWallet)) {
            return NextResponse.json({ error: 'Insufficient referral wallet balance' }, { status: 400 });
        }

        user.referralWallet = Number(user.referralWallet) - Number(amount);
        
        await user.save();

        const userName = user.username || 'Valued Customer';
        const requestDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // update withdrawal model
        const withdraw=await new WithdrawalModel({
            userId: user._id,
            amount: Number(amount),
            upi_id: upiId.trim(),
            requestedAt: new Date(),
            status: 'pending'
        }).save();
        if(withdraw){
        console.log("Withdrawal request saved:", withdraw._id);
        }else{
        console.error("Failed to save withdrawal request");
        }
        // Send email to user
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <!-- Header -->
                <div style="text-align: center; padding: 30px 0; border-bottom: 3px solid #f97316;">
                    <h1 style="color: #f97316; margin: 0; font-size: 28px;"> STRMLY Delivery</h1>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Wallet Withdrawal Request</p>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 40px 20px;">
                    <h2 style="color: #059669; margin-top: 0; font-size: 24px;"> Request Received!</h2>
                    
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        Dear <strong>${userName}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        We have successfully received your withdrawal request from your referral wallet. Our team is already working on processing it!
                    </p>
                    
                    <!-- Withdrawal Details Box -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #f97316;">
                        <h3 style="color: #92400e; margin-top: 0; font-size: 16px; margin-bottom: 15px;">Withdrawal Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Amount Requested:</td>
                                <td style="padding: 8px 0; text-align: right;">
                                    <span style="font-size: 24px; font-weight: bold; color: #059669;">₹${amount}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Request Date:</td>
                                <td style="padding: 8px 0; text-align: right; color: #92400e; font-weight: 600;">
                                    ${requestDate}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Current Balance:</td>
                                <td style="padding: 8px 0; text-align: right; color: #92400e; font-weight: 600;">
                                    ₹${user.referralWallet}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: 500;">UPI ID:</td>
                                <td style="padding: 8px 0; text-align: right; color: #92400e; font-weight: 600; font-family: monospace;">
                                    ${upiId}
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Timeline Section -->
                    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0;">
                        <h3 style="color: #166534; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
                            ⏱ What Happens Next?
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #15803d;">
                            <li style="margin-bottom: 10px; line-height: 1.5;">
                                <strong>Review:</strong> Our team will verify your request (usually within 24 hours)
                            </li>
                            <li style="margin-bottom: 10px; line-height: 1.5;">
                                <strong>Processing:</strong> Once approved, we'll initiate the transfer
                            </li>
                            <li style="margin-bottom: 10px; line-height: 1.5;">
                                <strong>Completion:</strong> You'll receive a confirmation email with transfer details
                            </li>
                        </ol>
                    </div>
                    
                    <!-- Info Box -->
                    <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 12px; padding: 15px; margin: 25px 0;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                            <strong> Note:</strong> Processing time is typically 3-5 business days. You'll receive another email once your withdrawal is complete.
                        </p>
                    </div>
                    
                    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 30px;">
                        Thank you for being a valued member of our community and for sharing the love with your friends! 🎉
                    </p>
                    
                </div>
                
                <!-- Footer -->
                <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 5px 0; font-weight: 600; color: #374151;">STRMLY Delivery</p>
                    <p style="margin: 5px 0;">Fresh Juices, Delivered Daily</p>
                   
                    <p style="margin: 15px 0 5px 0; color: #9ca3af; font-size: 11px;">
                        This is an automated email. Please do not reply directly to this message.
                    </p>
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@strmly.com',
            to: user.email,
            subject: 'Withdrawal Request Received - STRMLY Delivery',
            html: emailContent
        });

        // Send email to admin
        const emailContentAdmin = `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 26px;"> New Withdrawal Request</h1>
                    <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 14px;">Action Required</p>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; border-bottom: 2px solid #fee2e2; padding-bottom: 12px;">
                            Pending Withdrawal Request
                        </h2>
                        
                        <p style="font-size: 15px; color: #374151; line-height: 1.6;">
                            A user has requested to withdraw funds from their referral wallet. Please review and process this request.
                        </p>
                        
                        <!-- User & Request Details -->
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;"> User Information</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #78350f; font-weight: 500; width: 40%;">User ID:</td>
                                    <td style="padding: 8px 0; color: #92400e; font-family: monospace;">${userId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Username:</td>
                                    <td style="padding: 8px 0; color: #92400e; font-weight: 600;">${userName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #78350f; font-weight: 500;">Email:</td>
                                    <td style="padding: 8px 0; color: #92400e;">
                                        <a href="mailto:${user.email}" style="color: #f97316; text-decoration: none;">${user.email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #78350f; font-weight: 500;">UPI ID:</td>
                                    <td style="padding: 8px 0; color: #92400e; font-family: monospace; font-weight: 600;">
                                        ${upiId}
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Amount Box -->
                        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #059669;">
                            <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 500;">WITHDRAWAL AMOUNT</p>
                            <p style="margin: 0; font-size: 42px; font-weight: bold; color: #059669;">₹${amount}</p>
                        </div>
                        
                        <!-- Wallet Details -->
                        <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">Wallet Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #1e40af; font-weight: 500;">Current Balance:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #1e3a8a; font-weight: 600; font-size: 18px;">₹${Number(user.referralWallet)+Number(amount)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #1e40af; font-weight: 500;">After Withdrawal:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #1e3a8a; font-weight: 600; font-size: 18px;">₹${Number(user.referralWallet)}</td>
                                </tr>
                                <tr style="border-top: 1px solid #bfdbfe;">
                                    <td style="padding: 12px 0 0 0; color: #1e40af; font-weight: 500;">Request Date:</td>
                                    <td style="padding: 12px 0 0 0; text-align: right; color: #1e3a8a; font-weight: 600;">${requestDate}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Action Required -->
                        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 18px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                                <strong>⚡ Action Required:</strong> Please process this withdrawal request at your earliest convenience. The user has been notified and is awaiting confirmation.
                            </p>
                        </div>
                        
                        <!-- Quick Actions -->
                       
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                    <p style="margin: 5px 0;">STRMLY Delivery Admin System</p>
                    <p style="margin: 5px 0; color: #9ca3af;">This is an automated notification. Please do not reply to this email.</p>
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@strmly.com',
            to: 'rohithbn27@gmail.com',
            subject: `New Withdrawal Request: ₹${amount} - ${userName}`,
            html: emailContentAdmin
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Withdrawal request email sent successfully' 
        });
    } catch (error) {
        console.error('Referral wallet withdrawal request error:', error);
        return NextResponse.json({ 
            error: 'Failed to process withdrawal request' 
        }, { status: 500 });
    }
}