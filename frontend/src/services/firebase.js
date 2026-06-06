// REPLACE THESE VALUES WITH YOUR FIREBASE CONFIG
// Go to console.firebase.google.com → Project Settings → Your Apps → Web App
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getMessaging } from 'firebase/messaging';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBI8nMgHtPuUpaXxlShk43V94uHBQNca94",
  authDomain: "ecstatic-maxim-477619-k6.firebaseapp.com",
  projectId: "ecstatic-maxim-477619-k6",
  storageBucket: "ecstatic-maxim-477619-k6.firebasestorage.app",
  messagingSenderId: "20156525147",
  appId: "1:20156525147:web:ac3430ad0f268ce9612d7e",
  measurementId: "G-Y3LF2SZ451"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-south1'); // Use user's region
export const messaging = getMessaging(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = getAnalytics(app);
export default app;
