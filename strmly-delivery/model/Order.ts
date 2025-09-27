import mongoose, {Schema,Document} from "mongoose";


export interface Order extends Document {
    user: mongoose.Types.ObjectId,
    products: {
        product: mongoose.Types.ObjectId,
        quantity: number
    }[],
    totalAmount: number,
    status: 'pending' | 'shipped' | 'delivered' | 'cancelled',
    createdAt: Date,
    updatedAt: Date
}

const orderSchema: Schema= new Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products:[{
        product:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity:{
            type: Number,
            required: true,
            min: 1,
        }
    }],
    totalAmount:{
        type: Number,
        required: true,
    },
    status:{
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
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

orderSchema.on('save', function(this: Order, next) {
    this.updatedAt = new Date();
    next();
})

orderSchema.index({user:1});
orderSchema.index({status:1});
orderSchema.index({createdAt:1});

const OrderModel= mongoose.models.Order || mongoose.model<Order>('Order',orderSchema);

export default OrderModel;

