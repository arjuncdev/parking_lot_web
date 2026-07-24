"use client";

import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";

// Every value here is NEXT_PUBLIC_ because it is read in the browser to
// open a direct, read-only connection to Realtime Database. That is safe:
// the database's security rules (not this config) decide who can read or
// write. See /firebase-rules.json and the README for the rules to set.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.databaseURL);
}

export function getParkingDatabase() {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return getDatabase(app);
}
