import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, getDocs, getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

const requestList = document.getElementById('requestList');
const requestModal = document.getElementById('requestModal');
const closeButton = document.querySelector('.close-button');
const requestDetails = document.getElementById('requestDetails');
const proposalForm = document.getElementById('proposalForm');
let currentRequestId = "";

// Verifica se o usuário está autenticado e é do tipo 'comercial'
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().userType === "comercial") {
            loadRequests(); // Carrega as solicitações pendentes
        } else {
            alert("Acesso restrito. Somente usuários comerciais podem acessar esta página.");
            window.location.href = "../index.html";
        }
    } else {
        window.location.href = "../index.html";
    }
});

// Função para carregar solicitações pendentes do Firestore
async function loadRequests() {
    try {
        const requestsSnapshot = await getDocs(collection(db, "requests"));
        requestsSnapshot.forEach((doc) => {
            const request = doc.data();
            if (request.status === "pendente") {
                createRequestItem(doc.id, request);
            }
        });
    } catch (error) {
        console.error("Erro ao carregar as solicitações:", error);
    }
}

// Cria um item de solicitação e o adiciona à lista
function createRequestItem(requestId, request) {
    const requestItem = document.createElement('div');
    requestItem.classList.add('request-item');

    requestItem.innerHTML = `
        <h3>Protocolo: ${request.numeroProtocolo || requestId}</h3>
        <p><strong>Cliente:</strong> ${request.clientName}</p>
        <p><strong>Serviço:</strong> ${request.nomeServico || request.serviceId}</p>
        <button class="view-details-btn" onclick="openRequestModal('${requestId}')">Ver Detalhes</button>
    `;

    requestList.appendChild(requestItem);
}

// Função para abrir o modal com os detalhes da solicitação
window.openRequestModal = async function(requestId) {
    currentRequestId = requestId; // Armazena o ID da solicitação atual

    try {
        const requestDoc = await getDoc(doc(db, "requests", requestId));
        if (requestDoc.exists()) {
            const request = requestDoc.data();
            requestDetails.innerHTML = `
                <p><strong>Cliente:</strong> ${request.clientName}</p>
                <p><strong>CPF/CNPJ:</strong> ${request.cpfCnpj}</p>
                <p><strong>Contato:</strong> ${request.contact}</p>
                <p><strong>Endereço:</strong> ${request.street}, ${request.number} - ${request.neighborhood}, ${request.city} - ${request.state}</p>
                <p><strong>CEP:</strong> ${request.cep}</p>
                <p><strong>Informações Adicionais:</strong> ${request.additionalInfo || "N/A"}</p>
            `;

            requestModal.style.display = "flex";
        }
    } catch (error) {
        console.error("Erro ao carregar detalhes da solicitação:", error);
    }
};

// Fecha o modal de solicitação
closeButton.addEventListener('click', () => {
    requestModal.style.display = "none";
    proposalForm.reset();
});

// Envia a proposta para o Firestore
proposalForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Verifica se os elementos estão presentes antes de acessar seus valores
    const machinePriceElement = document.getElementById('machinePrice');
    const monthlyFeeElement = document.getElementById('monthlyFee');
    const totalPriceElement = document.getElementById('totalPrice');
    const paymentMethodsElement = document.getElementById('paymentMethods');

    if (!machinePriceElement || !monthlyFeeElement || !totalPriceElement || !paymentMethodsElement) {
        console.error("Um ou mais elementos de entrada de proposta não foram encontrados no DOM.");
        alert("Erro ao carregar os campos da proposta. Por favor, recarregue a página e tente novamente.");
        return;
    }

    const proposalDetails = {
        machinePrice: parseFloat(machinePriceElement.value),
        monthlyFee: parseFloat(monthlyFeeElement.value),
        totalPrice: parseFloat(totalPriceElement.value),
        paymentMethods: paymentMethodsElement.value
    };

    if (!proposalDetails.totalPrice || proposalDetails.totalPrice < 0) {
        alert("Por favor, insira um valor de preço total válido.");
        return;
    }

    try {
        // Atualiza a solicitação com os detalhes da proposta
        await updateDoc(doc(db, "requests", currentRequestId), {
            proposalDetails,
            status: "proposta_enviada",
            proposalSentAt: new Date()
        });

        alert("Proposta enviada com sucesso!");
        requestModal.style.display = "none";
        proposalForm.reset();
        requestList.innerHTML = ""; // Limpa a lista para recarregar os dados atualizados
        loadRequests(); // Recarrega as solicitações pendentes
    } catch (error) {
        console.error("Erro ao enviar a proposta:", error);
        alert("Erro ao enviar a proposta. Tente novamente.");
    }
});

// Botão para recusar proposta
const rejectProposalBtn = document.getElementById('rejectProposalBtn');

// Função para recusar proposta
rejectProposalBtn.addEventListener('click', async () => {
    if (!currentRequestId) {
        alert("Nenhuma solicitação selecionada.");
        return;
    }

    const confirmReject = confirm("Tem certeza que deseja recusar esta proposta?");
    if (!confirmReject) return;

    try {
        // Atualiza a solicitação com o status de recusada
        await updateDoc(doc(db, "requests", currentRequestId), {
            status: "proposta_recusada",
            proposalRejectedAt: new Date()
        });

        alert("Proposta recusada com sucesso!");
        requestModal.style.display = "none";
        requestList.innerHTML = ""; // Limpa a lista para recarregar os dados atualizados
        loadRequests(); // Recarrega as solicitações pendentes
    } catch (error) {
        console.error("Erro ao recusar a proposta:", error);
        alert("Erro ao recusar a proposta. Tente novamente.");
    }
});
