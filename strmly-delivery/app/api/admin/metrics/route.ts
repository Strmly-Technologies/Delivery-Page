import dbConnect from "@/lib/dbConnect";
import { verifyAuth } from "@/lib/serverAuth";
import OrderModel from "@/model/Order";
import UserModel from "@/model/User";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

interface PerformanceMetrics {
  userId: string;
  userName: string;
  role: 'chef' | 'delivery';
  totalOrders: number;
  averageTime: number; // in minutes
  fastestTime: number;
  slowestTime: number;
  ordersToday: number;
  averageTimeToday: number;
}

interface PerformanceSummary {
  totalChefs: number;
  totalDeliveryPersonnel: number;
  averageChefTime: number;
  averageDeliveryTime: number;
}


export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    await dbConnect();

    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    const typeParam = url.searchParams.get('type') || 'all';

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    let dateFilter = {};
    if (dateParam) {
      const selectedDate = new Date(dateParam);
      const startOfDate = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDate = new Date(selectedDate.setHours(23, 59, 59, 999));
    }

    // Debug: Check what orders exist with chef data
    const debugOrders = await OrderModel.find({
      ...dateFilter,
      $or: [
        { 'statusInfo.chefId': { $exists: true } },
        { status: { $in: ['received', 'done'] } }
      ]
    }).select('statusInfo status createdAt orderNumber').limit(5).lean();
    
    console.log('Debug - Sample orders with chef data:', debugOrders);

    // Also check for FreshPlan orders
    const debugFreshPlanOrders = await OrderModel.find({
      ...dateFilter,
      orderType: 'freshplan',
      'planRelated.daySchedule': { $exists: true }
    }).select('planRelated.daySchedule status orderNumber').limit(3).lean();
    
    console.log('Debug - Sample FreshPlan orders:', debugFreshPlanOrders);

    // Aggregate chef performance - Include both regular orders and FreshPlan
    const chefPerformance = await OrderModel.aggregate([
      {
        $match: {
          ...dateFilter,
          $or: [
            // Regular orders
            {
              'statusInfo.chefId': { $exists: true },
              'statusInfo.receivedTime': { $exists: true },
              'statusInfo.doneTime': { $exists: true }
            },
            // FreshPlan orders
            {
              orderType: 'freshplan',
              'planRelated.daySchedule': { $exists: true }
            }
          ]
        }
      },
      {
        $addFields: {
          // Handle both regular orders and FreshPlan orders
          chefData: {
            $cond: {
              if: { $eq: ['$orderType', 'freshplan'] },
              then: {
                $map: {
                  input: '$planRelated.daySchedule',
                  as: 'day',
                  in: {
                    chefId: '$$day.statusInfo.chefId',
                    receivedTime: '$$day.statusInfo.receivedTime',
                    doneTime: '$$day.statusInfo.doneTime',
                    chefTime: {
                      $cond: {
                        if: {
                          $and: [
                            { $ne: ['$$day.statusInfo.receivedTime', null] },
                            { $ne: ['$$day.statusInfo.doneTime', null] }
                          ]
                        },
                        then: {
                          $divide: [
                            { $subtract: ['$$day.statusInfo.doneTime', '$$day.statusInfo.receivedTime'] },
                            1000 * 60
                          ]
                        },
                        else: null
                      }
                    }
                  }
                }
              },
              else: [{
                chefId: '$statusInfo.chefId',
                receivedTime: '$statusInfo.receivedTime',
                doneTime: '$statusInfo.doneTime',
                chefTime: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$statusInfo.receivedTime', null] },
                        { $ne: ['$statusInfo.doneTime', null] }
                      ]
                    },
                    then: {
                      $divide: [
                        { $subtract: ['$statusInfo.doneTime', '$statusInfo.receivedTime'] },
                        1000 * 60
                      ]
                    },
                    else: null
                  }
                }
              }]
            }
          }
        }
      },
      {
        $unwind: '$chefData'
      },
      {
        $match: {
          'chefData.chefId': { $exists: true, $ne: null },
          'chefData.chefTime': { $ne: null, $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$chefData.chefId',
          totalOrders: { $sum: 1 },
          averageTime: { $avg: '$chefData.chefTime' },
          fastestTime: { $min: '$chefData.chefTime' },
          slowestTime: { $max: '$chefData.chefTime' },
          times: { $push: '$chefData.chefTime' }
        }
      }
    ]).exec();

    console.log('Debug - Chef performance results:', chefPerformance);

    // Aggregate delivery performance (your existing code)
    const deliveryPerformance = await OrderModel.aggregate([
      {
        $match: {
          ...dateFilter,
          'deliveryInfo.deliveryPersonId': { $exists: true },
          'deliveryInfo.pickedTime': { $exists: true },
          'deliveryInfo.deliveredTime': { $exists: true }
        }
      },
      {
        $addFields: {
          deliveryTime: {
            $divide: [
              { $subtract: ['$deliveryInfo.deliveredTime', '$deliveryInfo.pickedTime'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: '$deliveryInfo.deliveryPersonId',
          totalOrders: { $sum: 1 },
          averageTime: { $avg: '$deliveryTime' },
          fastestTime: { $min: '$deliveryTime' },
          slowestTime: { $max: '$deliveryTime' },
          times: { $push: '$deliveryTime' }
        }
      }
    ]).exec();

    // ...rest of your existing code...
    const chefIds = chefPerformance.map(p => new ObjectId(p._id));
    const deliveryIds = deliveryPerformance.map(p => new ObjectId(p._id));
    
    const users = await UserModel.find({
      _id: { $in: [...chefIds, ...deliveryIds] }
    }).lean();

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as any);

    // Process chef metrics
    const chefMetrics: PerformanceMetrics[] = chefPerformance.map(perf => {
      const user = userMap[perf._id.toString()];
      return {
        userId: perf._id.toString(),
        userName: user?.username || user?.name || 'Unknown Chef',
        role: 'chef' as const,
        totalOrders: perf.totalOrders,
        averageTime: Math.round(perf.averageTime * 100) / 100,
        fastestTime: Math.round(perf.fastestTime * 100) / 100,
        slowestTime: Math.round(perf.slowestTime * 100) / 100,
        ordersToday: 0,
        averageTimeToday: 0
      };
    });

    // Process delivery metrics (your existing code)
    const deliveryMetrics: PerformanceMetrics[] = deliveryPerformance.map(perf => {
      const user = userMap[perf._id.toString()];
      return {
        userId: perf._id.toString(),
        userName: user?.username || user?.name || 'Unknown Delivery Person',
        role: 'delivery' as const,
        totalOrders: perf.totalOrders,
        averageTime: Math.round(perf.averageTime * 100) / 100,
        fastestTime: Math.round(perf.fastestTime * 100) / 100,
        slowestTime: Math.round(perf.slowestTime * 100) / 100,
        ordersToday: 0,
        averageTimeToday: 0
      };
    });

    // Calculate today's metrics with the same improved logic
    if (!dateParam || dateParam !== new Date().toISOString().split('T')[0]) {
      const todayChefPerf = await OrderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lte: endOfToday },
            $or: [
              {
                'statusInfo.chefId': { $exists: true },
                'statusInfo.receivedTime': { $exists: true },
                'statusInfo.doneTime': { $exists: true }
              },
              {
                orderType: 'freshplan',
                'planRelated.daySchedule': { $exists: true }
              }
            ]
          }
        },
        {
          $addFields: {
            chefData: {
              $cond: {
                if: { $eq: ['$orderType', 'freshplan'] },
                then: {
                  $map: {
                    input: '$planRelated.daySchedule',
                    as: 'day',
                    in: {
                      chefId: '$$day.statusInfo.chefId',
                      chefTime: {
                        $cond: {
                          if: {
                            $and: [
                              { $ne: ['$$day.statusInfo.receivedTime', null] },
                              { $ne: ['$$day.statusInfo.doneTime', null] }
                            ]
                          },
                          then: {
                            $divide: [
                              { $subtract: ['$$day.statusInfo.doneTime', '$$day.statusInfo.receivedTime'] },
                              1000 * 60
                            ]
                          },
                          else: null
                        }
                      }
                    }
                  }
                },
                else: [{
                  chefId: '$statusInfo.chefId',
                  chefTime: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ['$statusInfo.receivedTime', null] },
                          { $ne: ['$statusInfo.doneTime', null] }
                        ]
                      },
                      then: {
                        $divide: [
                          { $subtract: ['$statusInfo.doneTime', '$statusInfo.receivedTime'] },
                          1000 * 60
                        ]
                      },
                      else: null
                    }
                  }
                }]
              }
            }
          }
        },
        {
          $unwind: '$chefData'
        },
        {
          $match: {
            'chefData.chefId': { $exists: true, $ne: null },
            'chefData.chefTime': { $ne: null, $gt: 0 }
          }
        },
        {
          $group: {
            _id: '$chefData.chefId',
            ordersToday: { $sum: 1 },
            averageTimeToday: { $avg: '$chefData.chefTime' }
          }
        }
      ]).exec();

      // Update metrics with today's data
      chefMetrics.forEach(metric => {
        const todayData = todayChefPerf.find(t => t._id.toString() === metric.userId);
        if (todayData) {
          metric.ordersToday = todayData.ordersToday;
          metric.averageTimeToday = Math.round(todayData.averageTimeToday * 100) / 100;
        }
      });

      // Your existing delivery today calculation...
      const todayDeliveryPerf = await OrderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lte: endOfToday },
            'deliveryInfo.deliveryPersonId': { $exists: true },
            'deliveryInfo.pickedTime': { $exists: true },
            'deliveryInfo.deliveredTime': { $exists: true }
          }
        },
        {
          $addFields: {
            deliveryTime: {
              $divide: [
                { $subtract: ['$deliveryInfo.deliveredTime', '$deliveryInfo.pickedTime'] },
                1000 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: '$deliveryInfo.deliveryPersonId',
            ordersToday: { $sum: 1 },
            averageTimeToday: { $avg: '$deliveryTime' }
          }
        }
      ]).exec();

      deliveryMetrics.forEach(metric => {
        const todayData = todayDeliveryPerf.find(t => t._id.toString() === metric.userId);
        if (todayData) {
          metric.ordersToday = todayData.ordersToday;
          metric.averageTimeToday = Math.round(todayData.averageTimeToday * 100) / 100;
        }
      });
    } else {
      chefMetrics.forEach(metric => {
        metric.ordersToday = metric.totalOrders;
        metric.averageTimeToday = metric.averageTime;
      });

      deliveryMetrics.forEach(metric => {
        metric.ordersToday = metric.totalOrders;
        metric.averageTimeToday = metric.averageTime;
      });
    }

    // Filter by type if specified
    let filteredMetrics = [...chefMetrics, ...deliveryMetrics];
    if (typeParam === 'chef') {
      filteredMetrics = chefMetrics;
    } else if (typeParam === 'delivery') {
      filteredMetrics = deliveryMetrics;
    }

    // Calculate summary statistics
    const summary: PerformanceSummary = {
      totalChefs: chefMetrics.length,
      totalDeliveryPersonnel: deliveryMetrics.length,
      averageChefTime: chefMetrics.length > 0 
        ? Math.round((chefMetrics.reduce((sum, m) => sum + m.averageTime, 0) / chefMetrics.length) * 100) / 100
        : 0,
      averageDeliveryTime: deliveryMetrics.length > 0
        ? Math.round((deliveryMetrics.reduce((sum, m) => sum + m.averageTime, 0) / deliveryMetrics.length) * 100) / 100
        : 0
    };

    return NextResponse.json({
      success: true,
      metrics: filteredMetrics,
      summary
    });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}