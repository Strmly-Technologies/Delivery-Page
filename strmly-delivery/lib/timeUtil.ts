import { TimeSlot } from "@/constants/timeSlots";

export function getAvailableTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  console.log("Current time:", currentHour, currentMinutes);

  // No deliveries after 8 PM
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
    
    // Show slots that start at least 1 hour from now
    // Example: At 4:12 PM (16:12), slot 4-5 PM (starts at 16) is NOT available
    // Next available slot is 5-6 PM (starts at 17)
    return slotHour > currentHour;
  });
  
  console.log("Available slots:", available);
  return available;
}

export function formatTimeSlot(slot: string): string {
  return slot;
}