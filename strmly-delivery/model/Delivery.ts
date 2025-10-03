import mongoose, { Schema, Document } from 'mongoose';

export interface DeliveryCharge {
  range: number;
  charge: number;
}

export interface DeliverySetting extends Document {
  maxRange: number;
  charges: DeliveryCharge[];
  updatedAt: Date;
}

const deliverySettingSchema = new Schema({
  maxRange: { type: Number, required: true },
  charges: [{
    range: { type: Number, required: true },
    charge: { type: Number, required: true }
  }],
  updatedAt: { type: Date, default: Date.now }
});

const DeliverySettingModel = mongoose?.models?.DeliverySetting || 
  mongoose.model<DeliverySetting>('DeliverySetting', deliverySettingSchema);

export default DeliverySettingModel;