import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, getDocs, getDoc, addDoc, doc } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

const serviceList = document.getElementById('serviceList');
const requestModal = document.getElementById('requestModal');
const closeButton = document.querySelector('.close-button');
const serviceIdInput = document.getElementById('serviceId');
const requestForm = document.getElementById('requestForm');

// Verifica se o usuário está autenticado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadServices();          // Carrega serviços disponíveis
        loadClientData(user.uid); // Carrega dados do cliente
    } else {
        window.location.href = "../index.html";
    }
});

// Função para carregar os serviços do Firestore
async function loadServices() {
    try {
        const servicesSnapshot = await getDocs(collection(db, "services"));
        servicesSnapshot.forEach((doc) => {
            const service = doc.data();
            createServiceItem(doc.id, service);
        });
    } catch (error) {
        console.error("Erro ao carregar os serviços:", error);
    }
}

// Cria um elemento de serviço e o adiciona à lista
function createServiceItem(serviceId, service) {
    const serviceItem = document.createElement('div');
    serviceItem.classList.add('service-item');

    serviceItem.innerHTML = `
        <h3>${service.name}</h3>
        <p>${service.description}</p>
        <p><strong>Preço:</strong> R$${service.price.toFixed(2)}</p>
        <button class="solicitar-btn" onclick="openRequestModal('${serviceId}', '${service.name}')">Solicitar Serviço</button>
    `;

    serviceList.appendChild(serviceItem);
}

// Função para carregar dados do cliente
async function loadClientData(userId) {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById('clientName').value = data.fullName || "";
            document.getElementById('cpfCnpj').value = data.cpfCnpj || "";
            document.getElementById('contact').value = data.phone || "";
            document.getElementById('cep').value = data.cep || "";
            document.getElementById('street').value = data.street || "";
            document.getElementById('number').value = data.number || "";
            document.getElementById('neighborhood').value = data.neighborhood || "";
            document.getElementById('city').value = data.city || "";
            document.getElementById('state').value = data.state || "";
        }
    } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
    }
}

// Abre o modal de solicitação e define o nome do serviço
window.openRequestModal = function(serviceId, serviceName) {
    serviceIdInput.value = serviceId; // Armazena o ID do serviço para a solicitação
    serviceIdInput.setAttribute('data-service-name', serviceName); // Armazena o nome do serviço
    requestModal.style.display = "flex";
};

// Fecha o modal de solicitação
closeButton.addEventListener('click', () => {
    requestModal.style.display = "none";
});

// Função para enviar a solicitação ao Firestore
requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const clientId = auth.currentUser.uid;
    const serviceId = serviceIdInput.value;
    const serviceName = serviceIdInput.getAttribute('data-service-name'); // Obtém o nome do serviço do atributo
    const clientName = document.getElementById('clientName').value;
    const cpfCnpj = document.getElementById('cpfCnpj').value;
    const contact = document.getElementById('contact').value;
    const cep = document.getElementById('cep').value;
    const street = document.getElementById('street').value;
    const number = document.getElementById('number').value;
    const neighborhood = document.getElementById('neighborhood').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const additionalInfo = document.getElementById('additionalInfo').value;
    const numeroProtocolo = `PRT-${Math.floor(Math.random() * 100000)}`; // Gera um número de protocolo legível

    try {
        await addDoc(collection(db, "requests"), {
            clientId,
            serviceId,
            nomeServico: serviceName, // Inclui o nome do serviço
            clientName,
            cpfCnpj,
            contact,
            cep,
            street,
            number,
            neighborhood,
            city,
            state,
            additionalInfo,
            numeroProtocolo, // Inclui o número de protocolo gerado
            status: "pendente",
            requestedAt: new Date()
        });

        alert("Solicitação de serviço enviada com sucesso!");
        requestModal.style.display = "none";
        requestForm.reset();
    } catch (error) {
        console.error("Erro ao enviar a solicitação:", error);
        alert("Erro ao enviar a solicitação. Por favor, tente novamente.");
    }
});
