
export interface TimeSlot {
    id: string;
    range: string;
    type: 'morning' | 'evening';
    }



export const TIME_SLOTS: TimeSlot[] = [
  { id: '1', range: '7-8 AM', type: 'morning' },
  { id: '2', range: '8-9 AM', type: 'morning' },
  { id: '3', range: '9-10 AM', type: 'morning' },
  { id: '4', range: '10-11 AM', type: 'morning' },
  { id: '5', range: '3-4 PM', type: 'evening' },
  { id: '6', range: '4-5 PM', type: 'evening' },
  { id: '7', range: '5-6 PM', type: 'evening' },
  { id: '8', range: '6-7 PM', type: 'evening' },
];