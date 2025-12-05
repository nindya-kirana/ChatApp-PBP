import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  CollectionReference,
  DocumentData,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  initializeAuth, 
  getReactNativePersistence, 
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage"; 

const firebaseConfig = {
  apiKey: " ",
  authDomain: " ",
  projectId: " ",
  storageBucket: " ",
  messagingSenderId: " ",
  appId: " ",
};
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage) 
});
export const db = getFirestore(app);
export const messagesCollection = collection(db, "messages") as CollectionReference<DocumentData>;
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc, 
  getDoc, 
  getDocs,
};
