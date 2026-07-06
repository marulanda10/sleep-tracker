import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDYWLj76th9kxYEJa3n9493xQgLiJ2DUI",
  authDomain: "sleep-tracker-ad82d.firebaseapp.com",
  projectId: "sleep-tracker-ad82d",
  storageBucket: "sleep-tracker-ad82d.firebasestorage.app",
  messagingSenderId: "768089909943",
  appId: "1:768089909943:web:a8c5eba5cea8ff26a07b32"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);