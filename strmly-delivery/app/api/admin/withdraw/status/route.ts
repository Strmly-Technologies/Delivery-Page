import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { WithdrawalModel } from "@/model/Withdrawal";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest){
    try {
        const decodedToken = await verifyAuth(request);
        if (decodedToken.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            );
        }
        
        const {withdrawalId, status, transferNote} = await request.json();

        if(!withdrawalId || !status){
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        await dbConnect();
        const updatedWithdrawal = await WithdrawalModel.findByIdAndUpdate(
            withdrawalId,
            {
                status,
                processedAt: new Date(),
                transferNote
            },
            { new: true }
        )
        .populate('userId', 'email username');

        if(!updatedWithdrawal){
            return NextResponse.json(
                { error: 'Withdrawal request not found' },
                { status: 404 }
            );
        }

        const userName = updatedWithdrawal.userId?.username || 'Valued Customer';
        const userEmail = updatedWithdrawal.userId?.email;
        const upiId = updatedWithdrawal.upiId || 'Not provided';
        const processedDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if(status === 'approved'){
            // Send approval email
            const approvalEmailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; padding: 30px 0; border-bottom: 3px solid #059669;">
                        <h1 style="color: #059669; margin: 0; font-size: 28px;">STRMLY Delivery</h1>
                        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Withdrawal Confirmation</p>
                    </div>
                    
                    <!-- Main Content -->
                    <div style="padding: 40px 20px;">
                        <h2 style="color: #059669; margin-top: 0; font-size: 24px;">Withdrawal Approved</h2>
                        
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            Dear <strong>${userName}</strong>,
                        </p>
                        
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            We are pleased to inform you that your withdrawal request has been approved and processed successfully.
                        </p>
                        
                        <!-- Success Box -->
                        <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; border-left: 4px solid #059669;">
                            <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Withdrawal Amount</p>
                            <p style="margin: 0; font-size: 42px; font-weight: bold; color: #059669;">₹${updatedWithdrawal.amount}</p>
                        </div>
                        
                        <!-- Transaction Details -->
                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin: 25px 0;">
                            <h3 style="color: #374151; margin-top: 0; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Transaction Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 0; color: #6b7280; font-weight: 500; width: 40%; border-bottom: 1px solid #f3f4f6;">Status:</td>
                                    <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #f3f4f6;">
                                        <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 600;">Approved</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6;">Amount:</td>
                                    <td style="padding: 12px 0; text-align: right; color: #059669; font-weight: 600; font-size: 18px; border-bottom: 1px solid #f3f4f6;">₹${updatedWithdrawal.amount}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6;">Processed On:</td>
                                    <td style="padding: 12px 0; text-align: right; color: #374151; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${processedDate}</td>
                                </tr>
                                ${transferNote ? `
                                <tr>
                                    <td style="padding: 12px 0; color: #6b7280; font-weight: 500;">Transfer Note:</td>
                                    <td style="padding: 12px 0; text-align: right; color: #374151; font-weight: 500;">${transferNote}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        
                        <!-- Important Information -->
                        <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 25px 0;">
                            <h3 style="color: #1e40af; margin-top: 0; font-size: 16px; margin-bottom: 12px;">Important Information</h3>
                            <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.8;">
                                <li>The amount has been transferred to your registered account.</li>
                                <li>Please allow 1-2 business days for the funds to reflect in your account.</li>
                                <li>You will receive a separate bank notification once the transfer is completed.</li>
                                <li>Keep this email for your records.</li>
                            </ul>
                        </div>
                        
                        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 30px;">
                            Thank you for being a valued member of our community. We appreciate your continued trust in STRMLY Delivery.
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/wallet" 
                               style="display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                View Wallet
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p style="margin: 5px 0; font-weight: 600; color: #374151;">STRMLY Delivery</p>
                        <p style="margin: 5px 0;">Fresh Juices, Delivered Daily</p>
                        <p style="margin: 15px 0 5px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #059669; text-decoration: none; margin: 0 10px;">Visit Website</a> | 
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" style="color: #059669; text-decoration: none, margin: 0 10px;">Contact Support</a>
                        </p>
                        <p style="margin: 15px 0 5px 0; color: #9ca3af; font-size: 11px;">
                            This is an automated email. Please do not reply directly to this message.
                        </p>
                        <p style="margin: 5px 0; color: #9ca3af; font-size: 11px;">
                            Transaction ID: ${updatedWithdrawal._id}
                        </p>
                    </div>
                </div>
            `;

            await resend.emails.send({
                from: 'noreply@strmly.com',
                to: userEmail,
                subject: 'Withdrawal Approved - STRMLY Delivery',
                html: approvalEmailContent
            });
        }
        else if(status === 'rejected'){
            // add money back to user's wallet 
            const updatedUser= await UserModel.findByIdAndUpdate(
                updatedWithdrawal.userId._id,
                {
                    $inc: { referralWallet: updatedWithdrawal.amount }
                },
                { new: true }
            );
            if(!updatedUser){
                return NextResponse.json(
                    { error: 'User not found to refund amount' },
                    { status: 404 }
                );
            }
            // Send rejection email
            const rejectionEmailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; padding: 30px 0; border-bottom: 3px solid #dc2626;">
                        <h1 style="color: #dc2626; margin: 0; font-size: 28px;">STRMLY Delivery</h1>
                        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Withdrawal Status Update</p>
                    </div>
                    
                    <!-- Main Content -->
                    <div style="padding: 40px 20px;">
                        <h2 style="color: #dc2626; margin-top: 0; font-size: 24px;">Withdrawal Request Declined</h2>
                        
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            Dear <strong>${userName}</strong>,
                        </p>
                        
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            We regret to inform you that we are unable to process your withdrawal request at this time.
                        </p>
                        
                        <!-- Request Details Box -->
                        <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #dc2626;">
                            <h3 style="color: #991b1b; margin-top: 0; font-size: 16px; margin-bottom: 15px;">Request Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #991b1b; font-weight: 500; width: 40%;">Status:</td>
                                    <td style="padding: 8px 0; text-align: right;">
                                        <span style="background: #fef2f2; color: #991b1b; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 600; border: 1px solid #dc2626;">Declined</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #991b1b; font-weight: 500;">Amount:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #991b1b; font-weight: 600; font-size: 18px;">₹${updatedWithdrawal.amount}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #991b1b; font-weight: 500;">Processed On:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #991b1b; font-weight: 600;">${processedDate}</td>
                                </tr>
                            </table>
                        </div>
                        
                        ${transferNote ? `
                        <!-- Reason Box -->
                        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 25px 0;">
                            <h3 style="color: #92400e; margin-top: 0; font-size: 16px; margin-bottom: 12px;">Reason for Decline</h3>
                            <p style="margin: 0; color: #78350f; line-height: 1.6; font-size: 15px;">
                                ${transferNote}
                            </p>
                        </div>
                        ` : ''}
                        
                        <!-- Next Steps -->
                        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0;">
                            <h3 style="color: #166534; margin-top: 0; font-size: 16px; margin-bottom: 12px;">What You Can Do Next</h3>
                            <ul style="margin: 0; padding-left: 20px; color: #15803d; line-height: 1.8;">
                                <li>Review the reason provided above</li>
                                <li>Ensure your account information is up to date</li>
                                <li>Contact our support team for clarification</li>
                                <li>You may submit a new withdrawal request once the issue is resolved</li>
                            </ul>
                        </div>
                        
                        <!-- Support Information -->
                        <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 25px 0;">
                            <h3 style="color: #1e40af; margin-top: 0; font-size: 16px; margin-bottom: 12px;">Need Help?</h3>
                            <p style="margin: 0 0 15px 0; color: #1e40af; line-height: 1.6;">
                                If you have any questions or believe this was declined in error, our support team is here to help.
                            </p>
                            <div style="text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" 
                                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                                    Contact Support
                                </a>
                            </div>
                        </div>
                        
                        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 30px;">
                            We apologize for any inconvenience this may have caused. Your wallet balance remains unchanged, and you can continue to earn and use your referral rewards.
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/wallet" 
                               style="display: inline-block; background: #6b7280; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                View Wallet
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p style="margin: 5px 0; font-weight: 600; color: #374151;">STRMLY Delivery</p>
                        <p style="margin: 5px 0;">Fresh Juices, Delivered Daily</p>
                        <p style="margin: 15px 0 5px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #dc2626; text-decoration: none; margin: 0 10px;">Visit Website</a> | 
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" style="color: #dc2626; text-decoration: none; margin: 0 10px;">Contact Support</a>
                        </p>
                        <p style="margin: 15px 0 5px 0; color: #9ca3af; font-size: 11px;">
                            This is an automated email. Please do not reply directly to this message.
                        </p>
                        <p style="margin: 5px 0; color: #9ca3af; font-size: 11px;">
                            Reference ID: ${updatedWithdrawal._id}
                        </p>
                    </div>
                </div>
            `;

            await resend.emails.send({
                from: 'noreply@strmly.com',
                to: userEmail,
                subject: 'Withdrawal Request Update - STRMLY Delivery',
                html: rejectionEmailContent
            });
        }
        
        return NextResponse.json({
            success: true,
            message: `Withdrawal request ${status} successfully`,
            withdrawal: updatedWithdrawal
        });
        
    } catch (error) {
        console.error('Admin update withdrawal status error:', error);
        return NextResponse.json(
            { error: 'Failed to update withdrawal status' },
            { status: 500 }
        );
    }
}