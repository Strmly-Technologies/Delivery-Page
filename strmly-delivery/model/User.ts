import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface User extends Document {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  cart: mongoose.Types.ObjectId[];
  purchaseHistory: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  role?: string;
}

const userSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true, // already creates an index
  },
  email: {
    type: String,
    required: true,
    unique: true, // already creates an index
  },
  password: {
    type: String,
    required: true,
    select: false, // Don't include password in queries by default
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
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  purchaseHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
});

// Update `updatedAt` before save
userSchema.pre("save", function (this: User, next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel =
  mongoose.models.User || mongoose.model<User>("User", userSchema);

export default UserModel;
