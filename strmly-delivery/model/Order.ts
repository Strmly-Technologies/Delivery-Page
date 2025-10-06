import mongoose, { Schema, Document } from 'mongoose';

interface ProductCustomization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  finalPrice: number;
}

interface OrderProduct {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  customization: ProductCustomization;
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
  status: 'pending' | 'accepted' | 'out-for-delivery' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  deliveryCharge?: number;
  customisablePrices?: {
    category: string;
    price: number;
  }[];
}

const productCustomizationSchema = new Schema<ProductCustomization>(
  {
    size: { type: String, required: true },
    quantity: { type: String, required: true },
    ice: { type: String },
    sugar: { type: String },
    dilution: { type: String },
    finalPrice: { type: Number, required: true }
  },
  { _id: false }
);

const orderProductSchema = new Schema<OrderProduct>(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    customization: { type: productCustomizationSchema, required: true }
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
    enum: ['pending', 'accepted', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deliveryCharge: { type: Number, default: 0 },
  customisablePrices: [{
    category: { type: String },
    price: { type: Number }
  }]
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
