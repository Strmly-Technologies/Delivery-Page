import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import { endOfDay, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest){
    try {
        const decodedToken=await verifyAuth(request);
        if(decodedToken.role!=='chef'){
            return new Response(JSON.stringify({error:'Unauthorized. Chef access required.'}),{status:403});
        }
        const chefId=decodedToken.userId;
        const today=new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStart = startOfDay(tomorrow);
        const tomorrowEnd = endOfDay(tomorrow)

         const orders = await OrderModel.find({
            status: { $nin: ['cancelled', 'refunded'] }
            })
            .populate('products.product')
            .populate('planRelated.daySchedule.items.product')
            .lean();
        const tomorrowsItems:any[]=[];
        for(const order of orders){
            const orderNumber=String(order._id).toString().slice(-6).toUpperCase();
            if (order.orderType === 'quicksip') {
                    const orderDate = new Date(order.createdAt);
                    
                    // Check if order was placed today
                    if (orderDate >= tomorrowStart && orderDate <= tomorrowEnd) {
                      order.products.forEach((item: any) => {
                        tomorrowsItems.push({
                          _id: `${order._id}-${item._id || Math.random()}`,
                          product: item.product,
                          customization: item.customization,
                          quantity: item.quantity,
                          timeSlot: order.deliveryTimeSlot || 'ASAP',
                          status: order.status || 'pending',
                          orderNumber,
                          orderType: 'quicksip',
                          deliveryDate: orderDate.toISOString(),
                          orderId: order._id
                        });
                      });
                    }
                  }
            
                  // Handle FreshPlan orders
                  if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
                    for (const day of order.planRelated.daySchedule) {
                      const dayDate = new Date(day.date);
                      
                      // Check if this day is today
                      if (dayDate >= tomorrowStart && dayDate <= tomorrowEnd) {
                        day.items.forEach((item: any) => {
                          tomorrowsItems.push({
                            _id: `${order._id}-${day._id}-${item._id || Math.random()}`,
                            product: item.product,
                            customization: item.customization,
                            quantity: item.quantity,
                            timeSlot: item.timeSlot || day.timeSlot || 'Not Set',
                            status: item.status || 'pending',
                            dayStatus: day.status || 'pending', // Day-level status
                            orderNumber,
                            orderType: 'freshplan',
                            deliveryDate: dayDate.toISOString(),
                            orderId: order._id,
                            dayId: day._id
                          });
                        });
                      }
                    }
                  }
                }
            
                console.log(`Returning ${tomorrowsItems.length} items for today`);
            
                // Sort by time slot
                const timeSlotOrder = [
                  'Morning (7 AM - 9 AM)',
                  'Mid Morning (9 AM - 11 AM)', 
                  'Lunch (12 PM - 2 PM)',
                  'Evening (5 PM - 7 PM)',
                  'Night (7 PM - 9 PM)',
                  'ASAP'
                ];
            
                tomorrowsItems.sort((a, b) => {
                  const indexA = timeSlotOrder.indexOf(a.timeSlot);
                  const indexB = timeSlotOrder.indexOf(b.timeSlot);
                  return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                });
            
                return NextResponse.json({
                  success: true,
                  items: tomorrowsItems,
                  date: today.toISOString()
                });
            
              } catch (error) {
                console.error('Error fetching today\'s orders:', error);
                return NextResponse.json(
                  { error: 'Failed to fetch orders' },
                  { status: 500 }
                );
              }
            }