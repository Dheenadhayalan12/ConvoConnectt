import { Timestamp } from 'firebase/firestore';

export type Message = {
  id: string;
  text: string;
  timestamp: Date;
  senderId: string;
  // Add other fields as needed
};