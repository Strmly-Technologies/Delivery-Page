import mongoose, { Document, Schema } from "mongoose";

interface Withdrawal extends Document{
    userId: mongoose.Types.ObjectId;
    amount: number;
    requestedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
    processedAt?: Date;
    transferNote?: string;
    upi_id: string;
}

const withdrawalSchema = new Schema<Withdrawal>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    processedAt: {
        type: Date
    },
    transferNote: {
        type: String
    },
    upi_id:{
        type: String,
        required: true
    }
});

export const WithdrawalModel = mongoose.models.Withdrawal || mongoose.model<Withdrawal>('Withdrawal', withdrawalSchema);

