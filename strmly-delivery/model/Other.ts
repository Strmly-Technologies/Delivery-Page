import {Schema} from 'mongoose';
import mongoose, { Document } from 'mongoose';

export interface Other extends Document {
  dashboard:{
    image:string;
    text:string
  },
  customisablePricings:[{
    category:string;
    price:Number;
  }]
}

const OtherSchema:Schema=new mongoose.Schema({
    dashboard:{
    image:{type:String,required:true},
    text:{type:String,required:true}
  },
    customisablePricings:[{
        category:{type:String},
        price:{type:Number}
    }],
    updatedAt: { type: Date, default: Date.now }
},
);

const OtherModel=mongoose?.models?.Other || mongoose.model<Other>('Other',OtherSchema);

export default OtherModel;