// @ts-nocheck

import mongoose, { Schema, Document, Model } from 'mongoose';

interface SizeOption {
  name: 'Small' | 'Medium' | 'Large';
  quantity: string;
  priceAdjustment?: number;
}

interface Customization {
  sizeOptions: SizeOption[];
  iceOptions: string[];
  sugarOptions: string[];
  dilutionOptions: string[];
}

export interface ProductDocument extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  isAvailable: boolean;
  customization: Customization;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  smallPrice?: number;
  mediumPrice?: number;
}

const customizationSchema = new Schema<Customization>({
  sizeOptions: [
    {
      name: {
        type: String,
        enum: ['Small', 'Medium', 'Large'],
        required: true
      },
      quantity: {
        type: String,
        required: true
      },
      priceAdjustment: {
        type: Number,
        default: 0
      }
    }
  ],
 
  iceOptions: {
    type: [Schema.Types.String],
    default: function (this: ProductDocument) {
      const category = this.category?.toLowerCase();
      return category === 'juices' || category === 'shakes'
        ? ['No Ice', 'Less Ice', 'Normal Ice', 'More Ice']
        : [];
    }
  },
  sugarOptions: {
    type: [Schema.Types.String],
    default: function (this: ProductDocument) {
      return this.category?.toLowerCase() === 'shakes'
        ? ['No Sugar', 'Less Sugar', 'Normal Sugar']
        : [];
    }
  },
  dilutionOptions: {
    type: [Schema.Types.String],
    default: function (this: ProductDocument) {
      return this.category?.toLowerCase() === 'shakes'
        ? ['Normal', 'Concentrated', 'Diluted']
        : [];
    }
  }
});

const productSchema = new Schema<ProductDocument>({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a product price']
  },
  category: {
    type: String,
    required: [true, 'Please provide a product category']
  },
  image: {
    type: String,
    required: [true, 'Please provide a product image']
  },
  stock: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  customization: {
    type: customizationSchema,
    default: function (this: ProductDocument) {
      const sizeOptions: SizeOption[] = [
        { name: 'Small', quantity: '250mL', priceAdjustment: 0 },
        { name: 'Medium', quantity: '350mL', priceAdjustment: 15 },
        { name: 'Large', quantity: '500mL', priceAdjustment: 30 }
      ];
      return { sizeOptions };
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  smallPrice: { type: Number },
  mediumPrice: { type: Number },
});

const Product: Model<ProductDocument> =
  mongoose.models.Product || mongoose.model<ProductDocument>('Product', productSchema);

export default Product;
