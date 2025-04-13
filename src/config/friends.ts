// src/config/friends.ts
import { auth, db } from './firebaseConfig';
import {
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  getDoc,
  updateDoc,
  writeBatch,
  runTransaction
} from 'firebase/firestore';

interface FriendRequest {
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'declined';
  topic?: string;
}

export const sendFriendRequest = async (toUserId: string, topic?: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  try {
    const requestId = `${userId}_${toUserId}`;
    const requestRef = doc(db, 'friendRequests', requestId);
    
    await runTransaction(db, async (transaction) => {
      const requestDoc = await transaction.get(requestRef);
      
      if (requestDoc.exists()) {
        throw new Error('Friend request already exists');
      }
      
      const requestData: FriendRequest = {
        from: userId,
        to: toUserId,
        status: 'pending',
        ...(topic && { topic })
      };
      
      transaction.set(requestRef, {
        ...requestData,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw new Error('Failed to send friend request');
  }
};

export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestDoc = await transaction.get(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }
      
      const requestData = requestDoc.data() as FriendRequest;
      if (requestData.to !== userId) {
        throw new Error('Unauthorized to accept this request');
      }
      
      const fromUserId = requestData.from;
      const chatId = [userId, fromUserId].sort().join('_');
      
      // Update request status
      transaction.update(requestRef, {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      
      // Add to both users' friend lists
      transaction.set(
        doc(db, 'friends', userId, 'friendList', fromUserId),
        { since: serverTimestamp(), topic: requestData.topic || null }
      );
      
      transaction.set(
        doc(db, 'friends', fromUserId, 'friendList', userId),
        { since: serverTimestamp(), topic: requestData.topic || null }
      );
      
      // Create chat document
      transaction.set(doc(db, 'chats', chatId), {
        users: [userId, fromUserId],
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw new Error('Failed to accept friend request');
  }
};

export const removeFriend = async (friendId: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  try {
    const batch = writeBatch(db);
    
    batch.delete(doc(db, 'friends', userId, 'friendList', friendId));
    batch.delete(doc(db, 'friends', friendId, 'friendList', userId));
    
    await batch.commit();
  } catch (error) {
    console.error('Error removing friend:', error);
    throw new Error('Failed to remove friend');
  }
};