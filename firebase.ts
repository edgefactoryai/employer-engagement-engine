import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAioAtvg5K46L1Kd_cC0jOSLFDtBiguz9I",
  authDomain: "employer-engagement-engine.firebaseapp.com",
  projectId: "employer-engagement-engine",
  storageBucket: "employer-engagement-engine.firebasestorage.app",
  messagingSenderId: "845864648680",
  appId: "1:845864648680:web:be59f65694fc77a02c6e5d",
  measurementId: "G-TJVH63JQE8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);