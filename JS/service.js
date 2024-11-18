import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

// Verifica se o usuário está autenticado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário autenticado, exibe a página
        console.log("Usuário autenticado:", user.uid);
    } else {
        // Redireciona para a página de login se não estiver autenticado
        window.location.href = "../index.html";
    }
});

// Função para salvar o serviço no Firestore
document.getElementById('serviceForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const serviceName = document.getElementById('serviceName').value;
    const serviceDescription = document.getElementById('serviceDescription').value;
    const servicePrice = parseFloat(document.getElementById('servicePrice').value);
    const serviceAvailability = document.getElementById('serviceAvailability').value;

    try {
        // Adiciona o novo serviço à coleção "services"
        await addDoc(collection(db, "services"), {
            name: serviceName,
            description: serviceDescription,
            price: servicePrice,
            availability: serviceAvailability,
            createdBy: auth.currentUser.uid,
            createdAt: new Date()
        });
        alert("Serviço cadastrado com sucesso!");
        document.getElementById('serviceForm').reset();
    } catch (error) {
        console.error("Erro ao cadastrar o serviço:", error);
        alert("Erro ao cadastrar o serviço. Por favor, tente novamente.");
    }
});
