// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_ovDXzbOd7W73iNgbYFRleTHpVkoGBOY",
  authDomain: "medica-issuev2.firebaseapp.com",
  projectId: "medica-issuev2",
  storageBucket: "medica-issuev2.firebasestorage.app",
  messagingSenderId: "586284765062",
  appId: "1:586284765062:web:13a284bb4a2abd2c63e607",
  measurementId: "G-Q7KZ8LYXLZ"
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;

