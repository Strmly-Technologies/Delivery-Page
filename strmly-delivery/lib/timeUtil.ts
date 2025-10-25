
import { TimeSlot } from "@/constants/timeSlots";

export function getAvailableTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  const now = new Date();
  const currentHour = now.getHours(); // testing
  const currentMinutes = now.getMinutes();
  console.log("Current time:", currentHour, currentMinutes);
  
  if (currentHour >= 18) return [];
  
  const available = slots.filter(slot => {
    // Extract both parts and meridiem
    const [start, endWithMeridiem] = slot.range.split('-');
    const meridiem = endWithMeridiem.trim().split(' ')[1]; // "AM" or "PM"
    let slotHour = parseInt(start.trim(), 10);
    
    // Convert to 24-hour format
    if (meridiem === 'PM' && slotHour !== 12) slotHour += 12;
    if (meridiem === 'AM' && slotHour === 12) slotHour = 0;
    
    // If slot is in the current hour, only show if more than 15 mins remaining
    if (slotHour === currentHour && currentMinutes > 15) return false;
    
    // Show slots that are 1+ hour away, or exactly 1 hour away if 15 mins or less have passed
    return slotHour >= currentHour + 1 || (slotHour > currentHour && currentMinutes <= 15);
  });
  
  console.log("Available slots:", available);
  return available;
}



export function formatTimeSlot(slot: string): string {
  return slot;
}