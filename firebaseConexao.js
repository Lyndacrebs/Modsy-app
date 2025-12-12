// firebaseConexao.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; 
import { getDatabase } from 'firebase/database';


// Sua configuração do Firebase (copiada do console)
const firebaseConfig = {
  apiKey: "AIzaSyBiS7a-8ml-H2ZHjHOzwu_6MSZZ75nrX1w",
  authDomain: "modsy-fa88a.firebaseapp.com",
  projectId: "modsy-fa88a",
  storageBucket: "modsy-fa88a.firebasestorage.app",
  messagingSenderId: "8371765847",
  appId: "1:8371765847:web:470d2ee32793bf39d35912",
  measurementId: "G-XZ58NYGHZN"
};

// Inicializa o app Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

// Inicializa o Realtime Database
const rtdb = getDatabase(app); 

export { db, rtdb };