// ✅ Only use firebase/auth, not /react-native
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth'; // ✅ use getAuth here
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import Constants from 'expo-constants';


export const firebaseConfig = {
  apiKey: 'AIzaSyBM_LLmsyjUyFUaWw5fK1MGh02mam_uWGU',
  authDomain: 'convoconnect1.firebase.com',
  projectId: Constants.expoConfig?.extra?.firebase?.projectId || 'convoconnect1',
  storageBucket: 'convoconnect1.appspot.com',
  messagingSenderId: '261632754846',
  appId: '1:261632754846:android:1f5c43d18a29c4922be78f',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let dbRT: Database;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app); // ✅ getAuth, no persistence
  db = getFirestore(app);
  dbRT = getDatabase(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase services');
}

export { app, auth, db, dbRT };
