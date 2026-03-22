import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQ8K3dP5_j749SovnebOn-MGh9NBpGtxM",
  authDomain: "finance-app-83c48.firebaseapp.com",
  projectId: "finance-app-83c48",
  storageBucket: "finance-app-83c48.firebasestorage.app",
  messagingSenderId: "1003793119267",
  appId: "1:1003793119267:web:b28b7c167a1a3a64dbd996",
  measurementId: "G-EHEP9F4YJ8"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
