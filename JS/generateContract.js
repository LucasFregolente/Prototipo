import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const proposalList = document.getElementById('proposalList');
    const contractModal = document.getElementById('contractModal');
    const closeButton = document.querySelector('.close-button');
    const contractForm = document.getElementById('contractForm');
    let currentProposalId = "";
    let currentClientId = "";
    let currentProposalData = {};

    // Verifica se o usuário está autenticado e é do tipo 'comercial'
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().userType === "comercial") {
                loadApprovedProposals();
            } else {
                alert("Acesso restrito. Apenas usuários comerciais podem acessar esta página.");
                window.location.href = "../index.html";
            }
        } else {
            window.location.href = "../index.html";
        }
    });

    // Função para carregar propostas aprovadas do Firestore
    async function loadApprovedProposals() {
        try {
            const proposalsRef = collection(db, "requests");
            const q = query(proposalsRef, where("status", "==", "aprovada"));
            const proposalsSnapshot = await getDocs(q);
            proposalsSnapshot.forEach((doc) => {
                const proposal = doc.data();
                createProposalItem(doc.id, proposal);
            });
        } catch (error) {
            console.error("Erro ao carregar propostas aprovadas:", error);
        }
    }

    // Cria um item de proposta e o adiciona à lista
    function createProposalItem(proposalId, proposal) {
        const proposalItem = document.createElement('div');
        proposalItem.classList.add('proposal-item');

        proposalItem.innerHTML = `
            <h3>Proposta: ${proposal.numeroProtocolo || proposalId}</h3>
            <p><strong>Serviço:</strong> ${proposal.nomeServico || proposal.serviceId}</p>
            <button class="view-details-btn" onclick="openContractModal('${proposalId}')">Gerar Contrato</button>
        `;

        proposalList.appendChild(proposalItem);
    }

    // Função para abrir o modal de contrato
    window.openContractModal = async function (requestId) {
        currentProposalId = requestId;

        try {
            const requestDoc = await getDoc(doc(db, "requests", requestId));
            if (requestDoc.exists()) {
                const request = requestDoc.data();
                currentProposalData = request;
                currentClientId = request.clientId || "";

                // Atualiza os campos do modal com os dados da proposta
                document.getElementById('finalValue').value = request.proposalDetails?.totalPrice || 0;
                document.getElementById('paymentConditions').value = request.proposalDetails?.paymentMethods || "";
                document.getElementById('monthlyFee').value = request.proposalDetails?.monthlyFee?.toFixed(2) || 0;
                document.getElementById('installationCost').value = request.proposalDetails?.machinePrice?.toFixed(2) || 0;
                document.getElementById('contractDeadline').value = "";
                document.getElementById('additionalNotes').value = "";

                // Exibe os detalhes da proposta no modal
                const proposalDetailsContainer = document.querySelector('.proposal-details');
                if (proposalDetailsContainer) {
                    proposalDetailsContainer.innerHTML = `
                        <h4>Dados da Proposta</h4>
                        <p><strong>Cliente:</strong> ${request.clientName || "Não informado"}</p>
                        <p><strong>Valor por Máquina:</strong> R$ ${request.proposalDetails?.machinePrice?.toFixed(2) || "0.00"}</p>
                        <p><strong>Mensalidade:</strong> R$ ${request.proposalDetails?.monthlyFee?.toFixed(2) || "0.00"}</p>
                        <p><strong>Custo de Instalação:</strong> R$ ${request.proposalDetails?.machinePrice?.toFixed(2) || "0.00"}</p>
                        <p><strong>Valor Total:</strong> R$ ${request.proposalDetails?.totalPrice?.toFixed(2) || "0.00"}</p>
                        <p><strong>Formas de Pagamento:</strong> ${request.proposalDetails?.paymentMethods || "Não especificado"}</p>
                    `;
                }

                // Adiciona o botão de cancelar contrato abaixo do botão de envio
                let cancelContractBtn = document.getElementById('cancelContractBtn');
                if (!cancelContractBtn) {
                    cancelContractBtn = document.createElement('button');
                    cancelContractBtn.id = 'cancelContractBtn';
                    cancelContractBtn.type = 'button';
                    cancelContractBtn.innerText = 'Cancelar Contrato';
                    cancelContractBtn.classList.add('cancel-button');

                    // Insere o botão abaixo do botão de envio
                    contractForm.appendChild(cancelContractBtn);

                    cancelContractBtn.addEventListener('click', async () => {
                        if (confirm("Você tem certeza que deseja cancelar este contrato?")) {
                            try {
                                await updateDoc(doc(db, "requests", currentProposalId), {
                                    status: "proposta_recusada"
                                });
                                alert("Contrato cancelado com sucesso!");
                                contractModal.style.display = "none";
                                proposalList.innerHTML = ""; // Recarrega a lista
                                loadApprovedProposals();
                            } catch (error) {
                                console.error("Erro ao cancelar contrato:", error);
                                alert("Erro ao cancelar o contrato. Tente novamente.");
                            }
                        }
                    });
                }

                contractModal.style.display = "flex";
            } else {
                alert("Proposta não encontrada.");
            }
        } catch (error) {
            console.error("Erro ao carregar detalhes da proposta:", error);
        }
    };

    // Fecha o modal de contrato
    closeButton.addEventListener('click', () => {
        contractModal.style.display = "none";
        currentProposalId = "";
        currentClientId = "";
        currentProposalData = {};
        contractForm.reset();
    });

    // Envia o contrato para o Firestore
    contractForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const contractData = {
            proposalId: currentProposalId,
            clientId: currentClientId,
            finalValue: parseFloat(document.getElementById('finalValue').value),
            monthlyFee: parseFloat(document.getElementById('monthlyFee').value),
            installationCost: parseFloat(document.getElementById('installationCost').value),
            paymentConditions: document.getElementById('paymentConditions').value,
            contractDeadline: document.getElementById('contractDeadline').value,
            additionalNotes: document.getElementById('additionalNotes').value,
            proposalDetails: currentProposalData.proposalDetails,
            generatedAt: new Date(),
            status: "pendente_validacao"
        };

        try {
            await addDoc(collection(db, "contracts"), contractData);

            await updateDoc(doc(db, "requests", currentProposalId), {
                status: "contrato_gerado"
            });

            alert("Contrato gerado com sucesso!");
            contractModal.style.display = "none";
            contractForm.reset();
            proposalList.innerHTML = "";
            loadApprovedProposals();
        } catch (error) {
            console.error("Erro ao gerar contrato:", error);
            alert("Erro ao gerar contrato. Tente novamente.");
        }
    });
});

// Mapeamento de status para descrições amigáveis
const statusDescriptions = {
    pendente_validacao: "Pendente de Validação",
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
        document.querySelector('#pendingContracts .contract-list').innerHTML = "";
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
            if (contract.status === "pendente_validacao") {
                document.querySelector('#pendingContracts .contract-list').appendChild(contractElement);
            } else if (contract.status === "assinado") {
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
