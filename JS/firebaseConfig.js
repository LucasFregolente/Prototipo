// Importa as funções necessárias dos SDKs do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";


// Configurações do Firebase para o projeto
const firebaseConfig = {
    apiKey: "AIzaSyDEidoJ7LQiHDGP4FxonjVQHFb9YSsrCCM",
    authDomain: "crmteste-2cfcd.firebaseapp.com",
    projectId: "crmteste-2cfcd",
    storageBucket: "crmteste-2cfcd.appspot.com",
    messagingSenderId: "468478971208",
    appId: "1:468478971208:web:f6ecc88caf9eb75409f77d",
    measurementId: "G-S7YLVDGR40"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Auth e o Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Exporta o Auth e o Firestore para serem usados em outros arquivos
export { auth, db };