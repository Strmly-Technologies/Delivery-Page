import mongoose,{Schema,Document} from "mongoose";

export interface Product extends Document{
    name: string,
    description: string,
    price: number,
    category: string,
    stock: number,
    createdAt: Date,
    updatedAt: Date
}

const productSchema: Schema= new Schema({
    name:{
        type: String,
        required: true,
        unique: true,
    },
    description:{
        type: String,
        required: true,
    },
    price:{
        type: Number,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    stock:{
        type: Number,
        required: true,
        default: 0,
    },
    createdAt:{
        type: Date,
        default: Date.now,
    },
    updatedAt:{
        type: Date,
        default: Date.now,
    }
})

productSchema.on('save', function(this: Product, next) {
    this.updatedAt = new Date();
    next();
})

productSchema.index({name:1});
productSchema.index({category:1});

const ProductModel= mongoose.models.Product || mongoose.model<Product>('Product',productSchema);

export default ProductModel;