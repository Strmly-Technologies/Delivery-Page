import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import UserModel from "@/model/User";
import { endOfDay, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import "@/model/Product";
import dbConnect from "@/lib/dbConnect";
import { TIME_SLOTS } from "@/constants/timeSlots";

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        
        const decodedToken = await verifyAuth(request);
        if (decodedToken.role !== 'delivery') {
            return NextResponse.json(
                { error: 'Unauthorized. Delivery access required.' },
                { status: 403 }
            );
        }
        const userId = decodedToken.userId;

        const user = await UserModel.findById(userId).lean();
        if (!user) {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            );
        }

        let { hour, minutes } = await request.json();
        console.log('Current time received for fetching orders:', { hour, minutes });
        hour=17
        minutes=28
        
        // Find the target time slot based on current time + 30 min rule
        let targetTimeSlot = '';
        let targetHour = hour;
        
        if (minutes >= 30) {
            targetHour = hour + 1;
        }

        console.log("here 1")
        
        // Convert hour to your time slot format using the constants
        targetTimeSlot = getTimeSlotFromHour(targetHour);

        console.log("here 2", targetTimeSlot)
        
        if (targetTimeSlot === '') {
            return NextResponse.json(
                { error: 'No delivery slot available for this time.' },
                { status: 400 }
            );
        }

        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        const userTimeSlots = user.deliveryActiveInfo?.timeSlots || [];
        
        // Check if user is active for this time slot
        if (!userTimeSlots.includes(targetTimeSlot)) {
            return NextResponse.json(
                { 
                    error: 'You are not active for this time slot.',
                    targetTimeSlot,
                    yourActiveSlots: userTimeSlots,
                    availableSlots: TIME_SLOTS.map(slot => slot.range)
                },
                { status: 403 }
            );
        }

        // Fetch orders for today only
        const orders = await OrderModel.find({})
        .populate('user', 'username phone')
        .populate('products.product')
        .populate('planRelated.daySchedule.items.product')
        .lean();

        let finalOrders: any[] = [];
        
        for (const order of orders) {
            if (order.orderType === 'quicksip' && order.createdAt>=todayStart) {
                const orderTimeSlot = order.deliveryTimeSlot || 'ASAP';
                
                // Match exact time slot or ASAP
                if (orderTimeSlot === targetTimeSlot || orderTimeSlot === 'ASAP') {
                    console.log("order matched",order)
                    finalOrders.push({
                        _id: order._id,
                        orderNumber: String(order._id).slice(-6).toUpperCase(),
                        orderType: 'quicksip',
                        customer: {
                            name: order.customerDetails?.name || order.user?.username,
                            phone: order.customerDetails?.phone || order.user?.phone,
                            address: order.customerDetails?.address,
                            additionalInfo: order.customerDetails?.additionalAddressInfo
                        },
                        items: order.products.map((item: any) => ({
                            product: item.product,
                            customization: item.customization,
                            quantity: item.quantity
                        })),
                        totalAmount: order.totalAmount,
                        deliveryCharge: order.deliveryCharge,
                        deliveryTimeSlot: orderTimeSlot,
                        status: order.status,
                        createdAt: order.createdAt
                    });
                }
            }
            else if (order.orderType === 'freshplan' && order.planRelated?.daySchedule) {
                for (const day of order.planRelated.daySchedule) {
                    const dayDate = new Date(day.date);
                    
                    // Check if this day is today
                    if (dayDate >= todayStart && dayDate <= todayEnd) {
                        // Get time slot from day level or first item
                        const dayTimeSlot = day.timeSlot || day.items[0]?.timeSlot || '7-8 AM';
                        
                        if (dayTimeSlot === targetTimeSlot) {
                            finalOrders.push({
                                _id: `${order._id}-${day._id}`,
                                orderNumber: String(order._id).slice(-6).toUpperCase(),
                                orderType: 'freshplan',
                                dayId: day._id,
                                customer: {
                                    name: order.customerDetails?.name || order.user?.username,
                                    phone: order.customerDetails?.phone || order.user?.phone,
                                    address: order.customerDetails?.address,
                                    additionalInfo: order.customerDetails?.additionalAddressInfo
                                },
                                items: day.items.map((item: any) => ({
                                    product: item.product,
                                    customization: item.customization,
                                    quantity: item.quantity
                                })),
                                totalAmount: calculateDayTotal(day.items),
                                deliveryCharge: order.deliveryCharge,
                                deliveryTimeSlot: dayTimeSlot,
                                status: day.status || 'pending',
                                createdAt: order.createdAt,
                                dayDate: dayDate.toISOString()
                            });
                        }
                    }
                }
            }
        }

        // Sort by time slot order
        finalOrders.sort((a, b) => {
            const indexA = TIME_SLOTS.findIndex(slot => slot.range === a.deliveryTimeSlot);
            const indexB = TIME_SLOTS.findIndex(slot => slot.range === b.deliveryTimeSlot);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return NextResponse.json({
            success: true,
            orders: finalOrders,
            targetTimeSlot,
            currentTime: {
                hour: minutes,
                minutes: minutes,
                formatted: `${hour}:${minutes.toString().padStart(2, '0')}`
            },
            message: `Found ${finalOrders.length} orders for ${targetTimeSlot}`,
            timeSlotInfo: {
                current: `${hour}:${minutes.toString().padStart(2, '0')}`,
                showingFrom: targetTimeSlot,
                rule: minutes >= 30 ? 'Next hour (≥30 mins)' : 'Current hour (<30 mins)'
            }
        });
        
    } catch (error) {
        console.error('Error fetching active delivery orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch active delivery orders.' },
            { status: 500 }
        );
    }
}

// Helper function to convert hour to your time slot format
function getTimeSlotFromHour(hour: number): string {
    // Convert 24-hour to 12-hour format for PM times
    let displayHour = hour;
    let period = 'AM';
    
    if (hour >= 12) {
        period = 'PM';
        if (hour > 12) {
            displayHour = hour - 12;
        }
    }
    
    // Find matching time slot from your constants
    const timeSlot = TIME_SLOTS.find(slot => {
        const range = slot.range;
        const startHour = parseInt(range.split('-')[0]);
        const slotPeriod = range.includes('PM') ? 'PM' : 'AM';
        
        // Convert slot start hour to 24-hour format for comparison
        let slotHour24 = startHour;
        if (slotPeriod === 'PM' && startHour !== 12) {
            slotHour24 = startHour + 12;
        } else if (slotPeriod === 'AM' && startHour === 12) {
            slotHour24 = 0;
        }
        
        return slotHour24 === hour;
    });
    //if no time slot found, log and return empty string
    if(!timeSlot) {
        console.log("No time slot found for hour:", hour);
        return '';
    }

    console.log("Time slot->", timeSlot?.range)
    
    return timeSlot ? timeSlot.range : '';
}

// Helper function to calculate day total for FreshPlan
function calculateDayTotal(items: any[]): number {
    return items.reduce((total, item) => {
        return total + (item.customization?.finalPrice || 0) * (item.quantity || 1);
    }, 0);
}

// Add GET method for testing with current time
export async function GET(request: NextRequest) {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        return NextResponse.json({
            message: 'Use POST method with currentHour and currentMinutes in body',
            currentTime: {
                hour: currentHour,
                minutes: currentMinutes,
                formatted: `${currentHour}:${currentMinutes.toString().padStart(2, '0')}`
            },
            availableTimeSlots: TIME_SLOTS,
            example: {
                method: 'POST',
                body: {
                    currentHour: currentHour,
                    currentMinutes: currentMinutes
                }
            }
        });
        
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to process request.' },
            { status: 500 }
        );
    }
}