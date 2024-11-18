// clientContracts.js

import { auth, db } from './firebaseConfig.js';
import {
    onAuthStateChanged,
    signOut,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

let currentContractId = "";

// Verifica se o usuário está autenticado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadClientContracts(user.uid);
    } else {
        // Se o usuário não estiver autenticado, redireciona para a página de login
        window.location.href = "login.html";
    }
});

// Carrega os contratos do cliente
async function loadClientContracts(userId) {
    try {
        console.log("Carregando contratos para o usuário:", userId);

        // Consulta os contratos onde clientId é igual ao userId
        const contractsRef = collection(db, "contracts");
        const contractsQuery = query(contractsRef, where("clientId", "==", userId));
        const contractsSnapshot = await getDocs(contractsQuery);

        const contractList = document.getElementById("contractList");

        if (contractsSnapshot.empty) {
            contractList.innerHTML = "<p class='contract-list-empty'>Nenhum contrato disponível.</p>";
            return;
        }

        contractList.innerHTML = ""; // Limpa a lista antes de carregar

        contractsSnapshot.forEach((doc) => {
            const contract = doc.data();
            console.log("Contrato carregado:", doc.id, contract);
            createContractItem(doc.id, contract);
        });
    } catch (error) {
        console.error("Erro ao carregar contratos:", error);
        alert("Erro ao carregar seus contratos. Por favor, tente novamente.\nDetalhes: " + error.message);
    }
}

// Cria um item de contrato na lista
function createContractItem(contractId, contract) {
    const contractList = document.getElementById("contractList");

    // Verifica o status do contrato
    let statusText = "";
    switch (contract.status) {
        case "assinado":
            statusText = "Pendente de sua assinatura";
            break;
        case "assinado_por_ambos":
            statusText = "Assinado por ambas as partes";
            break;
        case "rejeitado":
            statusText = "Contrato rejeitado";
            break;
        default:
            statusText = "Em andamento";
    }

    const contractItem = document.createElement("div");
    contractItem.classList.add("contract-item");

    contractItem.innerHTML = `
        <h3>Contrato: ${contractId}</h3>
        <p><strong>Valor Final:</strong> R$ ${contract.finalValue ? contract.finalValue.toFixed(2) : "0.00"}</p>
        <p><strong>Prazo:</strong> ${contract.contractDeadline || "N/A"} dias</p>
        <p><strong>Status:</strong> ${statusText}</p>
        <button onclick="openContractModal('${contractId}')">Ver Detalhes</button>
    `;

    contractList.appendChild(contractItem);
}

// Abre o modal com detalhes do contrato
window.openContractModal = async function (contractId) {
    currentContractId = contractId;

    try {
        const contractDoc = await getDoc(doc(db, "contracts", contractId));

        if (contractDoc.exists()) {
            const contract = contractDoc.data();

            displayContractDetails(contractId, contract);

            document.getElementById("contractModal").style.display = "flex";
        } else {
            alert("Contrato não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao carregar detalhes do contrato:", error);
        alert("Erro ao carregar detalhes do contrato.");
    }
};

// Exibe os detalhes do contrato na página
function displayContractDetails(contractId, contract) {
    console.log("Status do contrato:", contract.status);
    document.getElementById("contractId").textContent = contractId;
    document.getElementById("additionalNotes").textContent = contract.additionalNotes || "Sem notas";
    document.getElementById("paymentConditions").textContent = contract.paymentConditions || "N/A";
    document.getElementById("contractDeadline").textContent = contract.contractDeadline || "N/A";
    document.getElementById("finalValue").textContent = contract.finalValue ? contract.finalValue.toFixed(2) : "0.00";
    document.getElementById("generatedAt").textContent = contract.generatedAt
        ? new Date(contract.generatedAt.seconds * 1000).toLocaleString("pt-BR")
        : "N/A";

    // Verifica se a primeira parte assinou
    document.getElementById("companySignedAt").textContent = contract.signedAt
        ? new Date(contract.signedAt.seconds * 1000).toLocaleString("pt-BR")
        : "N/A";
    document.getElementById("companySignedBy").textContent = contract.signedBy && contract.signedBy.name
        ? contract.signedBy.name
        : "N/A";

    // Verifica se o cliente assinou
    document.getElementById("clientSignedAt").textContent = contract.clientSignedAt
        ? new Date(contract.clientSignedAt.seconds * 1000).toLocaleString("pt-BR")
        : "N/A";
    document.getElementById("clientSignedBy").textContent = contract.clientSignedBy && contract.clientSignedBy.name
        ? contract.clientSignedBy.name
        : "N/A";

    const printButton = document.getElementById("printContractButton");

    if (!printButton) {
        console.error("O botão de imprimir não foi encontrado no DOM.");
        return;
    }

    // Resetar estilos para evitar conflitos anteriores
    printButton.style.display = "none";
    document.getElementById("clientSignatureSection").style.display = "none";
    document.getElementById("contractStatusMessage").innerHTML = "";

    // Verifica o status do contrato para exibir ou ocultar botões e mensagens
    if (contract.status === "assinado_por_ambos") {
        // Mostrar o botão de imprimir
        printButton.style.display = "block";
        document.getElementById("contractStatusMessage").innerHTML = "<p><strong>Status do contrato:</strong> Assinado por ambas as partes</p>";
    } else if (contract.clientSignedAt) {
        // Ocultar o botão de imprimir
        printButton.style.display = "none";
        document.getElementById("contractStatusMessage").innerHTML = "<p><strong>Você já assinou este contrato em:</strong> " +
            new Date(contract.clientSignedAt.seconds * 1000).toLocaleString("pt-BR") + "</p>";
    } else if (contract.status === "assinado") {
        // Ocultar o botão de imprimir
        printButton.style.display = "none";
        document.getElementById("clientSignatureSection").style.display = "block";
        document.getElementById("contractStatusMessage").innerHTML = "";
    } else {
        // Ocultar o botão de imprimir
        printButton.style.display = "none";
        document.getElementById("contractStatusMessage").innerHTML = "<p><strong>Status do contrato:</strong> " + contract.status + "</p>";
    }
}

// Fecha o modal de detalhes do contrato
window.closeModal = function () {
    document.getElementById("contractModal").style.display = "none";
    currentContractId = "";
};

// Abre o modal de assinatura
window.openSignatureModal = function () {
    document.getElementById("contractModal").style.display = "none";
    document.getElementById("signatureModal").style.display = "flex";
};

// Fecha o modal de assinatura
window.closeSignatureModal = function () {
    document.getElementById("signatureModal").style.display = "none";
};

// Submete a assinatura
window.submitSignature = async function () {
    const clientName = document.getElementById("clientName").value.trim();
    const clientCpfCnpj = document.getElementById("clientCpfCnpj").value.trim();
    const clientEmail = document.getElementById("clientEmail").value.trim();
    const clientPassword = document.getElementById("clientPassword").value;

    if (!clientName || !clientCpfCnpj || !clientEmail || !clientPassword) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        // Reautentica o usuário para verificar a senha
        const userReauthenticated = await reauthenticateUser(clientEmail, clientPassword);

        if (userReauthenticated) {
            // Obtém o IP do cliente
            const response = await fetch("https://api.ipify.org?format=json");
            const { ip } = await response.json();

            // Atualiza o contrato no Firestore
            await updateDoc(doc(db, "contracts", currentContractId), {
                status: "assinado_por_ambos",
                clientSignedAt: Timestamp.now(),
                clientSignedBy: {
                    name: clientName,
                    cpfCnpj: clientCpfCnpj,
                    email: clientEmail,
                    ipAddress: ip
                }
            });

            alert("Contrato assinado com sucesso!");
            closeSignatureModal();

            // Atualiza a exibição dos detalhes do contrato
            const contractDoc = await getDoc(doc(db, "contracts", currentContractId));
            if (contractDoc.exists()) {
                const contract = contractDoc.data();
                displayContractDetails(contractDoc.id, contract);
            }

            // Atualiza a lista de contratos
            document.getElementById("contractList").innerHTML = "";
            loadClientContracts(auth.currentUser.uid);

            // Reabre o modal de detalhes do contrato
            document.getElementById("contractModal").style.display = "flex";
        } else {
            alert("Erro na autenticação. Verifique suas credenciais e tente novamente.");
        }

    } catch (error) {
        console.error("Erro ao assinar o contrato:", error);
        alert("Erro ao assinar o contrato. Tente novamente.");
    }
};

// Função para reautenticar o usuário
async function reauthenticateUser(email, password) {
    const credential = EmailAuthProvider.credential(email, password);
    try {
        await reauthenticateWithCredential(auth.currentUser, credential);
        return true;
    } catch (error) {
        console.error("Erro na reautenticação:", error);
        return false;
    }
}

// Função para imprimir o contrato em PDF
window.printContract = function () {
    // Seleciona o modal inteiro para incluir todos os detalhes e cláusulas
    const contractContent = document.querySelector(".modal-content");

    // Configurações para o PDF
    const options = {
        margin:       [10, 10, 10, 10],
        filename:     `Contrato_${currentContractId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Gera o PDF
    html2pdf().set(options).from(contractContent).save();
};
