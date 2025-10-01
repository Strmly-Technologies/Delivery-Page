import mongoose, { Schema, Document } from "mongoose";

export interface Product extends Document {
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  stock: number;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    // Remove index: true if using schema.index() later
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['juices', 'shakes'],
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  image: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

productSchema.pre('save', function(this: Product, next) {
  this.updatedAt = new Date();
  next();
});

// Only declare indexes here, not in the schema fields above
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

const ProductModel = mongoose.models.Product || mongoose.model<Product>('Product', productSchema);

export default ProductModel;