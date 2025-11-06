
export interface TimeSlot {
    id: string;
    range: string;
    type: 'morning' | 'evening';
    }


export const TIME_SLOTS: TimeSlot[] = [
  { id: '1', range: '9-10 AM', type: 'morning' },
  { id: '2', range: '10-11 AM', type: 'morning' },
  { id: '3', range: '11 AM-12 PM', type: 'morning' },  
  { id: '4', range: '12-1 PM', type: 'morning' },
  { id: '5', range: '1-2 PM', type: 'morning' },
  { id: '6', range: '2-3 PM', type: 'morning' },
  { id: '7', range: '3-4 PM', type: 'evening' },
  { id: '8', range: '4-5 PM', type: 'evening' },
  { id: '9', range: '5-6 PM', type: 'evening' },
  { id: '10', range: '6-7 PM', type: 'evening' },
  { id: '11', range: '7-8 PM', type: 'evening' },
];