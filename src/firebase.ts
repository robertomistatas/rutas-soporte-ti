import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRXX1wtd42GN3wkhTvaHqhU2JjUux2Gag",
  authDomain: "rutas-soporte-ti.firebaseapp.com",
  projectId: "rutas-soporte-ti",
  storageBucket: "rutas-soporte-ti.appspot.com",
  messagingSenderId: "571387968108",
  appId: "1:571387968108:web:1cd279ff67f36e767cb649"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
