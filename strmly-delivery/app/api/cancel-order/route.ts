import { verifyAuth } from "@/lib/serverAuth"
import OrderModel from "@/model/Order";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
    try { 
        const decodedToken = await verifyAuth(request);
        const userId = decodedToken.userId;
        const { orderId, cancelledBy, reason, dayId } = await request.json();
        console.log('Cancel order request:', { orderId, cancelledBy, reason, userId, dayId });
        
        const user = await UserModel.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        if (user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized: Only chefs and admins can cancel orders' }, { status: 403 });
        }
        
        const order = await OrderModel.findById(orderId).populate('user', 'email username');
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        if (order.status === 'cancelled') {
            return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
        }

        // Handle FreshPlan day-specific cancellation
        if (dayId && order.orderType === 'freshplan') {
            const daySchedule = order.planRelated?.daySchedule?.find(
                (day: any) => day._id.toString() === dayId
            );
            
            if (!daySchedule) {
                return NextResponse.json({ error: 'Day not found in order' }, { status: 404 });
            }
            
            if (daySchedule.status === 'cancelled') {
                return NextResponse.json({ error: 'This day is already cancelled' }, { status: 400 });
            }
            
            // Update specific day status
            daySchedule.status = 'cancelled';
            daySchedule.cancellationDetails = {
                cancelledBy,
                cancelledAt: new Date(),
                reason,
                cancelledById: user._id
            };
        } else {
            // Cancel entire order
            order.status = 'cancelled';
            order.cancellationDetails = {
                cancelledBy,
                cancelledAt: new Date(),
                reason,
                cancelledById: user._id
            };
        }
        
        await order.save();

        // Prepare order details for email
        const orderNumber = String(order._id).slice(-6).toUpperCase();
        const customerEmail = order.user.email;
        const customerName = order.user.username || 'Valued Customer';
        const cancelledByRole = cancelledBy === 'admin' ? 'Administrator' : 'Kitchen Staff';
        
        // Get order items for display
        let orderItemsHtml = '';
        if (order.orderType === 'quicksip') {
            orderItemsHtml = order.products.map((item: any) => `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <div>
                        <strong>${item.product?.name || 'Product'}</strong>
                        <div style="font-size: 12px; color: #6b7280;">
                            Qty: ${item.quantity} | Size: ${item.customization?.size || 'N/A'}
                        </div>
                    </div>
                    <div style="font-weight: bold;">₹${item.price}</div>
                </div>
            `).join('');
        } else if (order.orderType === 'freshplan' && dayId) {
            const daySchedule = order.planRelated?.daySchedule?.find(
                (day: any) => day._id.toString() === dayId
            );
            if (daySchedule) {
                orderItemsHtml = daySchedule.items.map((item: any) => `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <div>
                            <strong>${item.product?.name || 'Product'}</strong>
                            <div style="font-size: 12px; color: #6b7280;">
                                Qty: ${item.quantity} | Time: ${item.timeSlot || 'N/A'}
                            </div>
                        </div>
                        <div style="font-weight: bold;">₹${item.price}</div>
                    </div>
                `).join('');
            }
        }

        // Send cancellation email to customer
        const res = await resend.emails.send({
            from: 'noreply@strmly.com',
            to: customerEmail,
            subject: `Order #${orderNumber} Cancelled - Juice Rani`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #f97316;">
                        <h1 style="color: #f97316; margin: 0; font-size: 28px;">Juice Rani</h1>
                    </div>
                    
                    <!-- Main Content -->
                    <div style="padding: 30px 0;">
                        <h2 style="color: #dc2626; margin-top: 0;">Order Cancelled</h2>
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            Dear ${customerName},
                        </p>
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            We regret to inform you that your order has been cancelled.
                        </p>
                        
                        <!-- Order Number Box -->
                        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border-left: 4px solid #dc2626;">
                            <div style="color: #991b1b; font-size: 14px; margin-bottom: 5px;">Order Number</div>
                            <h1 style="color: #dc2626; font-size: 32px; margin: 0; letter-spacing: 2px;">#${orderNumber}</h1>
                        </div>
                        
                        <!-- Cancellation Details -->
                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #374151; margin-top: 0; font-size: 16px;">Cancellation Details</h3>
                            <div style="border-left: 3px solid #f97316; padding-left: 15px; margin: 15px 0;">
                                <div style="margin-bottom: 10px;">
                                    <strong style="color: #6b7280;">Cancelled By:</strong> 
                                    <span style="color: #374151;">${cancelledByRole}</span>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <strong style="color: #6b7280;">Reason:</strong> 
                                    <span style="color: #374151;">${reason}</span>
                                </div>
                                <div>
                                    <strong style="color: #6b7280;">Date & Time:</strong> 
                                    <span style="color: #374151;">${new Date().toLocaleString('en-IN', { 
                                        dateStyle: 'medium', 
                                        timeStyle: 'short',
                                        timeZone: 'Asia/Kolkata'
                                    })}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Order Items -->
                       
                        
                        <!-- Refund Information -->
                        ${order.paymentStatus === 'completed' ? `
                        <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <strong style="color: #1e40af; font-size: 14px;">💳 Refund Information</strong>
                            <p style="color: #1e3a8a; font-size: 14px; margin: 10px 0 0 0;">
                                Your payment of <strong>₹${order.totalAmount}</strong> will be refunded within 5-7 business days.
                            </p>
                        </div>
                        ` : ''}
                        
                        <!-- Apology Message -->
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            We sincerely apologize for any inconvenience this may have caused. We value your patronage and hope to serve you better in the future.
                        </p>
                        
                        <!-- Contact Support -->
                        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0;">
                            <strong style="color: #92400e; font-size: 14px;">Need Help?</strong>
                            <p style="color: #78350f; font-size: 14px; margin: 10px 0 0 0;">
                                If you have any questions or concerns, please contact our support team or place a new order.
                            </p>
                        </div>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://juicerani.com'}" 
                               style="display: inline-block; background: #f97316; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                Order Again
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                        <p style="margin: 5px 0;">Juice Rani - Fresh Juices, Delivered Daily</p>
                        <p style="margin: 5px 0;">This is an automated email. Please do not reply.</p>
                        <p style="margin: 15px 0 5px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://juicerani.com'}" style="color: #f97316; text-decoration: none;">Visit Website</a> | 
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" style="color: #f97316; text-decoration: none;">Contact Support</a>
                        </p>
                    </div>
                </div>
            `,
        });

        console.log('Cancellation email sent:', res);
        console.log('Order cancelled successfully:', orderId);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Order cancelled successfully and customer notified' 
        });
        
    } catch (error) {
        console.error('Cancel order error:', error);
        return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
    }
}