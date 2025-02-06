// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDp19NeteEO_5CCk56KYiibkGX9m1AkQoo",
  authDomain: "noteteddapp.firebaseapp.com",
  projectId: "noteteddapp",
  storageBucket: "noteteddapp.firebasestorage.app",
  messagingSenderId: "439102305625",
  appId: "1:439102305625:web:6a01ae085db5659d2bc848",
  measurementId: "G-219T1PV0HG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };