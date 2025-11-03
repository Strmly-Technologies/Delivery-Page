import mongoose, { Schema, Document } from 'mongoose';

interface ProductCustomization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
  fibre?: boolean;
}

interface OrderProduct {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  customization: ProductCustomization;
  timeSlot?: string;
}

export interface Order extends Document {
  user: mongoose.Types.ObjectId;
  products: OrderProduct[];
  totalAmount: number;
  customerDetails: {
    name: string;
    phone: string;
    address: string;
    additionalAddressInfo?: string;
  };
  status: 'pending' | 'accepted'  | 'delivered' | 'cancelled' | 'received' | 'done' | 'picked';
  statusInfo?: {
    chefId?: mongoose.Types.ObjectId;
    receivedTime?: Date;
    doneTime?: Date;
  };
  deliveryInfo?: {
  deliveryPersonId?: mongoose.Types.ObjectId;
  pickedTime?: Date;
  deliveredTime?: Date;
  notDeliveredTime?: Date;
  notDeliveredReason?: string;
};
  createdAt: Date;
  updatedAt: Date;
  deliveryCharge?: number;
  deliveryTimeSlot?: string;
  customisablePrices?: {
    category: string;
    price: number;
  }[];
  orderType: 'quicksip' | 'freshplan';
  planRelated?: {
    planDayId?: mongoose.Types.ObjectId;
    isCompletePlanCheckout?: boolean;
    daySchedule?: {
      date: Date;
      items: {
        product: mongoose.Types.ObjectId;
        quantity: number;
        price: number;
        customization: ProductCustomization;
        timeSlot: string;
      }[];
      status?: 'pending' | 'received' | 'done' | 'picked' | 'delivered' | 'not-delivered ' | 'pending';
      statusInfo?: {
        chefId?: mongoose.Types.ObjectId;
        receivedTime?: Date;
        doneTime?: Date;
      };
      deliveryInfo?: {
        deliveryPersonId?: mongoose.Types.ObjectId;
        pickedTime?: Date;
        deliveredTime?: Date;
        notDeliveredTime?: Date;
        notDeliveredReason?: string;
      };
    }[];
  };
}

const productCustomizationSchema = new Schema<ProductCustomization>(
  {
    size: { type: String, required: true },
    quantity: { type: String, required: true },
    ice: { type: String },
    sugar: { type: String },
    dilution: { type: String },
    fibre: { type: Boolean },
    finalPrice: { type: Number, required: true }
  },
  { _id: false }
);

const orderProductSchema = new Schema<OrderProduct>(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    customization: { type: productCustomizationSchema, required: true },
    timeSlot: { type: String }
  },
  { _id: false }
);

const orderSchema: Schema<Order> = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [orderProductSchema],
  totalAmount: { type: Number, required: true },
  customerDetails: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    additionalAddressInfo: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'out-for-delivery', 'delivered', 'cancelled','received','done','picked','not-delivered'],
    default: 'pending'
  },
  statusInfo: {
    chefId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedTime: { type: Date },
    doneTime: { type: Date }
  },
  deliveryInfo: {
    deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pickedTime: { type: Date },
    deliveredTime: { type: Date },
    notDeliveredTime: { type: Date },
    notDeliveredReason: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deliveryCharge: { type: Number, default: 0 },
  customisablePrices: [{
    category: { type: String },
    price: { type: Number }
  }],
  deliveryTimeSlot: { type: String },
  orderType: {
    type: String,
    enum: ['quicksip', 'freshplan'],
    default: 'quicksip'
  },
  planRelated: {
    planDayId: {
      type: Schema.Types.ObjectId,
      ref: 'User.freshPlan.schedule'
    },
    isCompletePlanCheckout: {
      type: Boolean,
      default: false
    },
    daySchedule: [{
    date: Date,
    items: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      price: Number,
      customization: {
        size: String,
        quantity: String,
        ice: String,
        sugar: String,
        dilution: String,
        finalPrice: Number,
        fibre: Boolean
      },
      timeSlot: String,
    }],
    status: {
        type: String,
        enum: ['pending', 'received', 'done','picked','delivered','not-delivered','not-delivered'],
        default: 'pending'
    },
    statusInfo:{
      chefId:{type: Schema.Types.ObjectId, ref:'User'},
      receivedTime:{type:Date},
      doneTime:{type:Date}
    },
    deliveryInfo: {
    deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pickedTime: { type: Date },
    deliveredTime: { type: Date },
    notDeliveredTime: { type: Date },
    notDeliveredReason: { type: String }
  },
  }]
  }
});

orderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for faster queries
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const OrderModel = mongoose.models.Order || mongoose.model<Order>('Order', orderSchema);

export default OrderModel;
