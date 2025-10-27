import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface CartItem {
  product: mongoose.Types.ObjectId;
  customization: {
    size: string;
    quantity: string;
    ice?: string;
    sugar?: string;
    dilution?: string;
    finalPrice: number;
  };
  price: number;
  quantity: number;
  addedAt: Date;
}


export interface User extends Document {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  cart: CartItem[];
  purchaseHistory: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  role?: string;
  otpVerified?: boolean;
  freshPlan: any
  freshPlans?:Array<{
    _id: any;
    isActive:boolean;
    days:number;
    startDate:Date;
    schedule:Array<{
      _id: any;
      date:Date;
      items:Array<{
        _id: any;
        product:mongoose.Types.ObjectId;
        customization: any;
        quantity:number;
        timeSlot:string;
      }>;
    }>;
    createdAt:Date;
    paymentComplete:boolean;
  }>
  savedAddresses?: Array<{
    addressName: string;
    deliveryAddress: string;
    additionalAddressDetails?: string;
    phoneNumber?: string;
  }>;
}

const freshPlanItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",  // Make sure this reference is correct
    required: true
  },
  customization: {
    size: { type: String, required: true },
    quantity: { type: String, required: true },
    ice: { type: String },
    sugar: { type: String },
    dilution: { type: String },
    finalPrice: { type: Number, required: true },
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  timeSlot: {
    type: String,
    required: true,
  }
});

// Define freshPlanDaySchema
const freshPlanDaySchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  items: [freshPlanItemSchema]
});

// Define freshPlanSchema
const freshPlanSchema = new Schema({
  isActive: {
    type: Boolean,
    default: false,
  },
  days: {
    type: Number,
    min: 3,
    max: 50,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
  },
  schedule: [freshPlanDaySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  paymentComplete: {
    type: Boolean,
    default: false,
  }
});

const cartItemSchema = new Schema<CartItem>({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  customization: {
    size: { type: String, required: true },
    quantity: { type: String, required: true },
    ice: { type: String },
    sugar: { type: String },
    dilution: { type: String },
    finalPrice: { type: Number, required: true },
  },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now },
});

const userSchema = new Schema<User>({
  username: {
    type: String,
    required: true,
    unique: true, // already creates index
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ["customer", "admin"],
    default: "customer",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  cart: [cartItemSchema], // now allows full objects
  purchaseHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  otpVerified: { type: Boolean, default: false },
  freshPlan:{
    type:freshPlanSchema,
    default:null
  },
  freshPlans:[freshPlanSchema],
  savedAddresses: [
    {
      addressName: { type: String, required: true },
      deliveryAddress:{type: String, required: true },
      additionalAddressDetails: { type: String },
      phoneNumber: { type: String }
    }
  ]
});

// Update `updatedAt` before save
userSchema.pre<User>("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before save
userSchema.pre<User>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel =
  (mongoose.models?.User as mongoose.Model<User>) ||
  mongoose.model<User>("User", userSchema);


export default UserModel;
