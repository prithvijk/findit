const firebaseConfig = {
    apiKey: "AIzaSyBtHrI_bP2HMcOXCIOpNc-V4F6PBM053jc",
    authDomain: "findit-ab909.firebaseapp.com",
    projectId: "findit-ab909",
    storageBucket: "findit-ab909.firebasestorage.app",
    messagingSenderId: "630526620525",
    appId: "findit-ab909"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase connected successfully!");
