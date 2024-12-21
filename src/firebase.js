import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

firebase.initializeApp({
  apiKey: "AIzaSyDPedbVbrxgk_WTJb_gXkAaZ2lae3RMn28",
  authDomain: "superchat-d173c.firebaseapp.com",
  projectId: "superchat-d173c",
  storageBucket: "superchat-d173c.firebasestorage.app",
  messagingSenderId: "818127078641",
  appId: "1:818127078641:web:fed2924c6feecd9eaa9550"
});

const auth = firebase.auth();
const firestore = firebase.firestore();

export { firebase, auth, firestore };
