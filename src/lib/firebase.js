import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCkuDm-4m2L_26GaSwDhekrI0QauXt1IHA",
  authDomain: "checador-sor-juana.firebaseapp.com",
  projectId: "checador-sor-juana",
  storageBucket: "checador-sor-juana.firebasestorage.app",
  messagingSenderId: "327480542594",
  appId: "1:327480542594:web:44d832ca4e6ebcb5353b9b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

