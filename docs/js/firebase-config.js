// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD2YVJCui6MycwktJf4yu8iC8UeIL1ml70",
  authDomain: "world-tour-arirang.firebaseapp.com",
  projectId: "world-tour-arirang",
  storageBucket: "world-tour-arirang.firebasestorage.app",
  messagingSenderId: "336157639280",
  appId: "1:336157639280:web:ff679fcd54d096db822ab5",
  measurementId: "G-JGW4YXJHL1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);