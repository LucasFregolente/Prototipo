// approveContracts.js

import { auth, db } from './firebaseConfig.js';
import { EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

let currentContractId = "";

// Verifica autenticação e exibe contratos pendentes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userQuery = query(collection(db, "users"), where("email", "==", user.email));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
                const userType = userSnapshot.docs[0].data().userType;

                if (userType === "administrativo") {
                    loadPendingContracts();
                } else {
                    alert("Acesso restrito. Somente administradores podem aprovar contratos.");
                    window.location.href = "../index.html";
                }
            } else {
                alert("Usuário não encontrado no sistema.");
                window.location.href = "../index.html";
            }
        } catch (error) {
            console.error("Erro ao verificar tipo de usuário:", error);
            alert("Erro ao carregar as permissões do usuário.");
            window.location.href = "../index.html";
        }
    } else {
        window.location.href = "../index.html";
    }
});

// Carrega contratos pendentes
async function loadPendingContracts() {
    try {
        const contractQuery = query(collection(db, "contracts"), where("status", "==", "pendente_validacao"));
        const contractsSnapshot = await getDocs(contractQuery);

        const contractList = document.getElementById("contractList");

        if (contractsSnapshot.empty) {
            contractList.innerHTML = "<p class='contract-list-empty'>Nenhum contrato pendente para validação.</p>";
            return;
        }

        contractsSnapshot.forEach((doc) => {
            const contract = doc.data();
            createContractItem(doc.id, contract);
        });
    } catch (error) {
        console.error("Erro ao carregar contratos:", error);
        alert("Erro ao carregar contratos pendentes.");
    }
}

// Cria um item na lista de contratos
function createContractItem(contractId, contract) {
    const contractList = document.getElementById("contractList");

    const contractItem = document.createElement("div");
    contractItem.classList.add("contract-item");
    contractItem.innerHTML = `
        <h3>Contrato: ${contractId}</h3>
        <p><strong>Cliente:</strong> ${contract.clientName || "N/A"}</p>
        <p><strong>Protocolo:</strong> ${contract.numeroProtocolo || "N/A"}</p>
        <p><strong>Status:</strong> ${contract.status || "N/A"}</p>
        <button onclick="openContractModal('${contractId}')">Ver Detalhes</button>
    `;

    contractList.appendChild(contractItem);
}

// Função formatDate atualizada
function formatDate(timestamp) {
    if (!timestamp) return '';

    let date;

    // Se for um Timestamp do Firestore
    if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    }
    // Se for uma string ou número (timestamp em milissegundos)
    else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
    }
    // Se for um objeto Date
    else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        // Caso contrário, retorna string vazia
        return '';
    }

    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().split('T')[0];
}

// Abre o modal com detalhes do contrato
window.openContractModal = async function (contractId) {
    currentContractId = contractId;

    try {
        const contractDoc = await getDoc(doc(db, "contracts", contractId));

        if (contractDoc.exists()) {
            const contract = contractDoc.data();

            // Log para depuração
            console.log("Dados do contrato:", contract);

            // Preenche os campos do formulário com os dados do contrato
            document.getElementById("finalValue").value = contract.finalValue || "";
            document.getElementById("paymentConditions").value = contract.paymentConditions || "";
            document.getElementById("monthlyFee").value = contract.monthlyFee || "";
            document.getElementById("installationCost").value = contract.installationCost || "";
            document.getElementById("contractDeadline").value = formatDate(contract.contractDeadline);
            document.getElementById("additionalNotes").value = contract.additionalNotes || "";

            document.getElementById("contractModal").style.display = "flex";
        } else {
            alert("Contrato não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao carregar detalhes do contrato:", error);
        alert("Erro ao carregar detalhes do contrato.");
    }
};

// Fecha o modal de detalhes do contrato
window.closeModal = function () {
    document.getElementById("contractModal").style.display = "none";
    currentContractId = "";
};

// Abre o modal de assinatura
window.openSignatureModal = function () {
    // Atualiza os dados do contrato antes de abrir o modal de assinatura
    updateContractData().then(() => {
        document.getElementById("contractModal").style.display = "none";
        document.getElementById("signatureModal").style.display = "flex";
    }).catch((error) => {
        console.error("Erro ao atualizar dados do contrato:", error);
        alert("Erro ao atualizar dados do contrato. Tente novamente.");
    });
};

// Fecha o modal de assinatura
window.closeSignatureModal = function () {
    document.getElementById("signatureModal").style.display = "none";
};

// Atualiza os dados do contrato com os valores do formulário
async function updateContractData() {
    const finalValue = parseFloat(document.getElementById("finalValue").value);
    const paymentConditions = document.getElementById("paymentConditions").value.trim();
    const monthlyFee = parseFloat(document.getElementById("monthlyFee").value);
    const installationCost = parseFloat(document.getElementById("installationCost").value);
    const contractDeadline = document.getElementById("contractDeadline").value;
    const additionalNotes = document.getElementById("additionalNotes").value.trim();

    // Validações simples
    if (isNaN(finalValue) || isNaN(monthlyFee) || isNaN(installationCost)) {
        alert("Por favor, insira valores numéricos válidos.");
        throw new Error("Valores numéricos inválidos.");
    }

    if (!contractDeadline) {
        alert("Por favor, insira uma data válida para o prazo do contrato.");
        throw new Error("Data de prazo do contrato inválida.");
    }

    // Atualiza o contrato no Firestore
    await updateDoc(doc(db, "contracts", currentContractId), {
        finalValue,
        paymentConditions,
        monthlyFee,
        installationCost,
        contractDeadline: new Date(contractDeadline),
        additionalNotes
    });
}

// Submete a assinatura
window.submitSignature = async function () {
    const adminName = document.getElementById("adminName").value.trim();
    const adminCpfCnpj = document.getElementById("adminCpfCnpj").value.trim();
    const adminLogin = document.getElementById("adminLogin").value.trim();
    const adminPassword = document.getElementById("adminPassword").value.trim();

    if (!adminName || !adminCpfCnpj || !adminLogin || !adminPassword) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        // Reautentica o administrador para confirmar a assinatura
        const credential = EmailAuthProvider.credential(adminLogin, adminPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);

        // Obtém o IP do usuário
        const response = await fetch("https://api.ipify.org?format=json");
        const { ip } = await response.json();

        // Atualiza o contrato no Firestore com os dados de assinatura
        await updateDoc(doc(db, "contracts", currentContractId), {
            status: "assinado",
            signedAt: new Date(),
            signedBy: {
                name: adminName,
                cpfCnpj: adminCpfCnpj,
                email: adminLogin,
                ipAddress: ip
            }
        });

        alert("Contrato assinado com sucesso!");
        closeSignatureModal();
        document.getElementById("contractList").innerHTML = "";
        loadPendingContracts();
    } catch (error) {
        console.error("Erro ao assinar o contrato:", error);
        alert("Erro ao assinar o contrato. Verifique suas credenciais e tente novamente.");
    }
};

// Rejeita o contrato
window.rejectContract = async function () {
    if (!currentContractId) return;

    try {
        await updateDoc(doc(db, "contracts", currentContractId), {
            status: "rejeitado",
            rejectedAt: new Date()
        });

        alert("Contrato rejeitado com sucesso!");
        closeModal();
        document.getElementById("contractList").innerHTML = "";
        loadPendingContracts();
    } catch (error) {
        console.error("Erro ao rejeitar contrato:", error);
        alert("Erro ao rejeitar o contrato. Tente novamente.");
    }
};

// Mapeamento de status para descrições amigáveis
const statusDescriptions = {
    assinado: "Assinado pelo Cliente",
    assinado_por_ambos: "Assinado por Ambos",
    rejeitado: "Contrato Rejeitado"
};

// Função para carregar contratos por status
async function loadContractsByStatus() {
    try {
        const contractsRef = collection(db, "contracts");
        const contractsSnapshot = await getDocs(contractsRef);

        // Limpa as listas antes de recarregar
        document.querySelector('#signedContracts .contract-list').innerHTML = "";
        document.querySelector('#bothSignedContracts .contract-list').innerHTML = "";
        document.querySelector('#rejectedContracts .contract-list').innerHTML = "";

        for (const docSnapshot of contractsSnapshot.docs) {
            const contract = docSnapshot.data();
            const contractId = docSnapshot.id;

            // Busca o nome do cliente baseado no clientId
            let clientName = "Não informado";
            if (contract.clientId) {
                try {
                    const clientDoc = await getDoc(doc(db, "users", contract.clientId));
                    if (clientDoc.exists()) {
                        clientName = clientDoc.data().name || "Não informado";
                    }
                } catch (error) {
                    console.error("Erro ao buscar cliente:", error);
                }
            }

            const contractElement = createContractElement(contractId, contract, clientName);

            // Adiciona o contrato à lista correspondente com base no status
            if (contract.status === "assinado") {
                document.querySelector('#signedContracts .contract-list').appendChild(contractElement);
            } else if (contract.status === "assinado_por_ambos") {
                document.querySelector('#bothSignedContracts .contract-list').appendChild(contractElement);
            } else if (contract.status === "rejeitado") {
                document.querySelector('#rejectedContracts .contract-list').appendChild(contractElement);
            }
        }
    } catch (error) {
        console.error("Erro ao carregar contratos por status:", error);
    }
}

// Função para criar um elemento de contrato
function createContractElement(contractId, contract, clientName) {
    const contractElement = document.createElement('div');
    contractElement.classList.add('contract-item');

    contractElement.innerHTML = `
        <p><strong>ID:</strong> ${contractId}</p>
        <p><strong>Valor Final:</strong> R$ ${contract.finalValue?.toFixed(2) || "0.00"}</p>
        <p><strong>Status:</strong> ${statusDescriptions[contract.status] || "Status Desconhecido"}</p>
        <button onclick="viewContractDetails('${contractId}')">Ver Detalhes</button>
    `;

    return contractElement;
}

// Função para exibir detalhes de um contrato
async function viewContractDetails(contractId) {
    try {
        const contractDoc = await getDoc(doc(db, "contracts", contractId));
        if (contractDoc.exists()) {
            const contract = contractDoc.data();
            alert(`
                Detalhes do Contrato:
                ID: ${contractId}
                Valor Final: R$ ${contract.finalValue?.toFixed(2) || "0.00"}
                Status: ${statusDescriptions[contract.status] || "Status Desconhecido"}
                Condições de Pagamento: ${contract.paymentConditions || "Não informado"}
                Notas Adicionais: ${contract.additionalNotes || "Nenhuma"}
            `);
        } else {
            alert("Contrato não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao carregar detalhes do contrato:", error);
        alert("Erro ao carregar detalhes do contrato.");
    }
}

// Torna a função viewContractDetails global
window.viewContractDetails = viewContractDetails;

// Chama a função ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    loadContractsByStatus();
});
