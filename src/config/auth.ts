// src/config/auth.ts
import { auth, db } from './firebaseConfig'; // ✅ already initialized
import {
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
  query
} from 'firebase/firestore';

// ✅ Updated Logout handler
export const handleLogout = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    // Get all userTopic documents for the current user
    const userTopicsRef = collection(db, 'userTopics', userId, 'joinedTopics');
    const snapshot = await getDocs(userTopicsRef);

    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
      const topicId = docSnap.id;
      const presenceRef = doc(db, 'topics', topicId, 'onlineUsers', userId);
      batch.delete(presenceRef); // remove from onlineUsers
      batch.delete(docSnap.ref); // remove from userTopics
    });

    await batch.commit();
    await signOut(auth);
  } catch (error) {
    console.error('Logout Error:', error);
    throw error;
  }
};

// Sign in
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    let message = 'Login failed. Please try again.';
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'Please enter a valid email address';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection';
        break;
    }
    throw new Error(message);
  }
};

// Sign up
export const signUp = async (
  name: string,
  age: string,
  gender: string,
  bio: string,
  email: string,
  password: string
) => {
  try {
    if (!name || !email || !password) {
      throw new Error('Name, email and password are required');
    }
    if (password.length < 6) {
      throw new Error('Password should be at least 6 characters');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      age,
      gender,
      bio,
      email,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    });

    return userCredential;
  } catch (error: any) {
    let message = 'Registration failed. Please try again.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Email already in use';
        break;
      case 'auth/invalid-email':
        message = 'Please enter a valid email address';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection';
        break;
    }
    throw new Error(message);
  }
};

export { auth };
