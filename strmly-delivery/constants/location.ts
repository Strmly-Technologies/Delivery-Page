export const SHOP_LOCATION = {
  // lat: 28.681528, 
  // lng: 77.206712,  
  lat: 28.681528, 
  lng: 77.206712,  
  // lat: 12.926,
  // lng: 77.553,
  // lat:23.988714,
  // lng:85.351085,
  //address: "Jayanagar, Bangalore"
};

import dbConnect from '../lib/dbConnect';
import DeliverySettingModel from '@/model/Delivery';

export async function getDeliverySettings() {
  await dbConnect();
  const settings = await DeliverySettingModel.findOne().sort({ updatedAt: -1 });
  
  if (!settings) {
    return {
      MAX_RANGE: 5,
      CHARGES: [
        { range: 2, charge: 10 },
        { range: 3, charge: 25 },
        { range: 5, charge: 35 }
      ]
    };
  }

  return {
    MAX_RANGE: settings.maxRange,
    CHARGES: settings.charges
  };
}