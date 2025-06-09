import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "rutas-soporte-ti.firebaseapp.com",
  projectId: "rutas-soporte-ti",
  storageBucket: "rutas-soporte-ti.firebasestorage.app",
  messagingSenderId: "571387968108",
  appId: "1:571387968108:web:1cd279ff67f36e767cb649",
  measurementId: "G-0YREQW14ZM"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
