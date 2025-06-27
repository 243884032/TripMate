// firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { initializeAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

const firebaseConfig = {
    apiKey: "AIzaSyAmeJGv0SfBPqEWyVyyY2YiTtpShO9y9vI",
    authDomain: "tripmate-9ae0b.firebaseapp.com",
  databaseURL: "https://tripmate-9ae0b-default-rtdb.firebaseio.com",
    projectId: "tripmate-9ae0b",
    storageBucket: "tripmate-9ae0b.appspot.com",
    messagingSenderId: "127082718047",
    appId: "1:127082718047:web:b89e9a61e1123b2d8cccea",
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
    persistence: reactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const rtdb = getDatabase(app);

export { auth, db, rtdb };
