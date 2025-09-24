// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage"; // ✅ add this

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0IF65yjxbd3rm9rPAmP-_WVicJ-dniTQ",
  authDomain: "machine-schedule-97ce7.firebaseapp.com",
  projectId: "machine-schedule-97ce7",
  storageBucket: "machine-schedule-97ce7.firebasestorage.app",
 // gs:"machine-schedule-97ce7.firebasestorage.app",
  messagingSenderId: "627224259008",
  appId: "1:627224259008:web:334a9cafa696b9774f8025",
  measurementId: "G-5FTML4Y3GS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };

export const storage = getStorage(app); // ✅ export storage

console.log('Firebase initialized');

