//src/util/firestore.ts
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Message } from '../types.js'; // Adjust import path as needed

// Message Converter
export const messageConverter = {
  toFirestore: (message: Omit<Message, 'id'>): DocumentData => {
    return {
      text: message.text,
      timestamp: message.timestamp,
      senderId: message.senderId
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot): Message => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      text: data.text,
      timestamp: data.timestamp?.toDate() || new Date(),
      senderId: data.senderId
    };
  }
};

// Alternative Mapper Function
export const mapDocToMessage = (doc: QueryDocumentSnapshot): Message => {
  const data = doc.data();
  return {
    id: doc.id,
    text: data.text,
    timestamp: data.timestamp?.toDate() || new Date(),
    senderId: data.senderId
  };
};