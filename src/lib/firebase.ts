import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBrsUFs1gmzRoAdUByfIaOX5v8x1CAGaNo",
  authDomain: "g-kentei-app-286c2.firebaseapp.com",
  projectId: "g-kentei-app-286c2",
  storageBucket: "g-kentei-app-286c2.firebasestorage.app",
  messagingSenderId: "1082962505914",
  appId: "1:1082962505914:web:9efd0307c2cfd645989283",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
