import { verifyAuth } from "@/lib/serverAuth";
import UserModel from "@/model/User";
import { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request:NextRequest){
    try {
        const decodedToken =await verifyAuth(request);
        const userId = decodedToken.userId;
        const {type, orderId}=await request.json();
        const user=await UserModel.findById(userId).select('email name');
        if(!user){
            return new Response(JSON.stringify({error:'User not found'}),{status:404});
        }
        const emailBody=`
        <div>
          <p>Dear Customer,</p>
          <p>Thank you for your ${type} order! Your order ID is <strong>${orderId.toString().slice(-6).toUpperCase()}</strong>.</p>
          <p>We are processing your order.</p>
          <p> You can view the details of your order in your order history on our website.</p>
          <br/>
          <p>Best regards,</p>
          <p>JuiceRani Team</p>
        </div>
        `;
        const res=await resend.emails.send({
        from: 'noreply@strmly.com',
        to: user.email!,
        subject: 'Your JuiceRani Order Confirmation',
        html: `${emailBody}`,
    });
    return new Response(JSON.stringify({success:true}),{status:200});
    } catch (error) {
        console.error('Order confirmation email error:', error);
        return new Response(JSON.stringify({error:'Failed to send order confirmation email'}),{status:500});
    }

}

