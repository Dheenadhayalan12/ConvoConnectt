// src/config/initializeFirestore.ts

import { db } from "./firebaseConfig.js";
import { enableIndexedDbPersistence } from "firebase/firestore";

export const initializeFirestore = () => {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Offline persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support offline persistence.");
    }
  });
};