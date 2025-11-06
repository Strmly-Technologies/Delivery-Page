
import { TimeSlot } from "@/constants/timeSlots";

export function getAvailableTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  console.log("Current time:", currentHour, currentMinutes);

  if (currentHour >= 20) return [];
  
  const available = slots.filter(slot => {
    // Extract start time with its meridiem
    const [startPart, endPart] = slot.range.split('-');
    const startTrimmed = startPart.trim();
    const endTrimmed = endPart.trim();
    
    // Check if start has its own meridiem
    const startHasMeridiem = startTrimmed.includes('AM') || startTrimmed.includes('PM');
    
    let slotHour: number;
    
    if (startHasMeridiem) {
      // Start has its own meridiem (e.g., "11 AM-12 PM")
      const startMeridiem = startTrimmed.includes('AM') ? 'AM' : 'PM';
      slotHour = parseInt(startTrimmed.replace(/[^\d]/g, ''), 10);
      
      if (startMeridiem === 'PM' && slotHour !== 12) slotHour += 12;
      if (startMeridiem === 'AM' && slotHour === 12) slotHour = 0;
    } else {
      // Start inherits meridiem from end (e.g., "11-12 PM")
      const endMeridiem = endTrimmed.includes('AM') ? 'AM' : 'PM';
      slotHour = parseInt(startTrimmed, 10);
      
      if (endMeridiem === 'PM' && slotHour !== 12) slotHour += 12;
      if (endMeridiem === 'AM' && slotHour === 12) slotHour = 0;
    }
    
    // If slot is in the current hour, only show if 15 mins or less have passed
    if (slotHour === currentHour) {
      return currentMinutes <= 15;
    }
    
    // Show slots that are in the future
    return slotHour > currentHour;
  });
  
  console.log("Available slots:", available);
  return available;
}



export function formatTimeSlot(slot: string): string {
  return slot;
}