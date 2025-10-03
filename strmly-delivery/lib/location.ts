import { SHOP_LOCATION, DELIVERY_RANGES } from '@/constants/location';

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(value: number): number {
  return value * Math.PI / 180;
}

export function calculateDeliveryCharge(distance: number): number {
  if (distance > DELIVERY_RANGES.MAX_RANGE) return -1;
  
  for (const { range, charge } of DELIVERY_RANGES.CHARGES) {
    if (distance <= range) return charge;
  }
  return DELIVERY_RANGES.CHARGES[DELIVERY_RANGES.CHARGES.length - 1].charge;
}

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    return data.display_name;
  } catch (error) {
    console.error('Error getting address:', error);
    return '';
  }
}