import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const pendingProposals = document.getElementById('pendingProposals'); // Seção de propostas pendentes
    const approvedProposals = document.getElementById('approvedProposals'); // Seção de propostas aprovadas
    const rejectedProposals = document.getElementById('rejectedProposals'); // Seção de propostas recusadas
    const proposalModal = document.getElementById('proposalModal');
    const closeButton = document.querySelector('.close-button');
    const proposalDetails = document.getElementById('proposalDetails');
    let currentProposalId = "";

    // Verifica autenticação e carrega propostas para o cliente autenticado
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadProposals(user.uid);
        } else {
            window.location.href = "../index.html";
        }
    });

    // Carrega propostas do Firestore com diferentes status para o cliente atual
    async function loadProposals(userId) {
        try {
            // Consulta para propostas pendentes (proposta_enviada)
            const pendingQuery = query(
                collection(db, "requests"),
                where("clientId", "==", userId),
                where("status", "==", "proposta_enviada")
            );
            const pendingSnapshot = await getDocs(pendingQuery);
            pendingSnapshot.forEach((doc) => {
                const proposalData = doc.data();
                createProposalItem(doc.id, proposalData, pendingProposals);
            });

            // Consulta para propostas aprovadas
            const approvedQuery = query(
                collection(db, "requests"),
                where("clientId", "==", userId),
                where("status", "==", "aprovada")
            );
            const approvedSnapshot = await getDocs(approvedQuery);
            approvedSnapshot.forEach((doc) => {
                const proposalData = doc.data();
                createProposalItem(doc.id, proposalData, approvedProposals);
            });

            // Consulta para propostas recusadas
            const rejectedQuery = query(
                collection(db, "requests"),
                where("clientId", "==", userId),
                where("status", "==", "proposta_recusada")
            );
            const rejectedSnapshot = await getDocs(rejectedQuery);
            rejectedSnapshot.forEach((doc) => {
                const proposalData = doc.data();
                createProposalItem(doc.id, proposalData, rejectedProposals);
            });
        } catch (error) {
            console.error("Erro ao carregar propostas:", error);
        }
    }

    // Cria um item de proposta e o adiciona à seção apropriada
    function createProposalItem(proposalId, proposal, targetSection) {
        const proposalItem = document.createElement('div');
        proposalItem.classList.add('proposal-item');

        proposalItem.innerHTML = `
            <h3>Proposta: ${proposal.numeroProtocolo || proposalId}</h3>
            <p><strong>Serviço:</strong> ${proposal.nomeServico || proposal.serviceId}</p>
            <button class="view-details-btn" onclick="openProposalModal('${proposalId}')">Ver Detalhes</button>
        `;

        targetSection.appendChild(proposalItem);
    }

    window.openProposalModal = async function (requestId) {
        currentProposalId = requestId;
    
        try {
            const requestDoc = await getDoc(doc(db, "requests", requestId));
            if (requestDoc.exists()) {
                const requestData = requestDoc.data();
                const proposalPrice = requestData.proposalDetails?.totalPrice || 0;
    
                // Preenche os detalhes no modal
                proposalDetails.innerHTML = `
                    <p><strong>Cliente:</strong> ${requestData.clientName}</p>
                    <p><strong>Valor por Máquina:</strong> R$ ${requestData.proposalDetails?.machinePrice?.toFixed(2) || "N/A"}</p>
                    <p><strong>Mensalidade:</strong> R$ ${requestData.proposalDetails?.monthlyFee?.toFixed(2) || "N/A"}</p>
                    <p><strong>Valor Total:</strong> R$ ${proposalPrice.toFixed(2)}</p>
                    <p><strong>Formas de Pagamento:</strong> ${requestData.proposalDetails?.paymentMethods || "N/A"}</p>
                `;
    
                // Botões do modal
                const approveProposalBtn = document.getElementById('approveProposalBtn');
                const existingReEvaluateBtn = document.getElementById('reEvaluateProposalBtn');
    
                // Remove o botão de reavaliação existente (se houver)
                if (existingReEvaluateBtn) {
                    existingReEvaluateBtn.remove();
                }
    
                // Lógica de exibição dos botões
                if (requestData.status === "proposta_enviada") {
                    approveProposalBtn.style.display = "block"; // Mostra o botão de aprovação
    
                    // Adiciona o botão de reavaliação
                    const reEvaluateBtn = document.createElement('button');
                    reEvaluateBtn.id = 'reEvaluateProposalBtn';
                    reEvaluateBtn.innerText = 'Reavaliação';
                    proposalDetails.appendChild(reEvaluateBtn);
    
                    // Evento do botão de reavaliação
                    reEvaluateBtn.addEventListener('click', async () => {
                        try {
                            await updateDoc(doc(db, "requests", currentProposalId), {
                                status: "pendente",
                                updatedAt: new Date()
                            });
                            alert("Proposta marcada como pendente para reavaliação!");
                            proposalModal.style.display = "none"; // Fecha o modal
                            pendingProposals.innerHTML = ""; // Recarrega as listas
                            approvedProposals.innerHTML = "";
                            rejectedProposals.innerHTML = "";
                            await loadProposals(auth.currentUser.uid); // Recarrega as propostas
                        } catch (error) {
                            console.error("Erro ao marcar proposta como pendente:", error);
                            alert("Erro ao reavaliar a proposta. Tente novamente.");
                        }
                    });
                } else if (requestData.status === "proposta_recusada") {
                    approveProposalBtn.style.display = "none"; // Oculta o botão de aprovação
    
                    // Adiciona o botão de reavaliação
                    const reEvaluateBtn = document.createElement('button');
                    reEvaluateBtn.id = 'reEvaluateProposalBtn';
                    reEvaluateBtn.innerText = 'Reavaliação';
                    proposalDetails.appendChild(reEvaluateBtn);
    
                    // Evento do botão de reavaliação
                    reEvaluateBtn.addEventListener('click', async () => {
                        try {
                            await updateDoc(doc(db, "requests", currentProposalId), {
                                status: "pendente",
                                updatedAt: new Date()
                            });
                            alert("Proposta marcada como pendente para reavaliação!");
                            proposalModal.style.display = "none"; // Fecha o modal
                            pendingProposals.innerHTML = ""; // Recarrega as listas
                            approvedProposals.innerHTML = "";
                            rejectedProposals.innerHTML = "";
                            await loadProposals(auth.currentUser.uid); // Recarrega as propostas
                        } catch (error) {
                            console.error("Erro ao marcar proposta como pendente:", error);
                            alert("Erro ao reavaliar a proposta. Tente novamente.");
                        }
                    });
                } else if (requestData.status === "aprovada") {
                    approveProposalBtn.style.display = "none"; // Oculta o botão de aprovação
                }
    
                // Adiciona o evento de aprovação se não estiver registrado
                if (!approveProposalBtn.dataset.listener) {
                    approveProposalBtn.addEventListener('click', async () => {
                        if (currentProposalId) {
                            try {
                                await updateDoc(doc(db, "requests", currentProposalId), {
                                    status: "aprovada",
                                    approvedAt: new Date()
                                });
    
                                alert("Proposta aprovada com sucesso!");
                                proposalModal.style.display = "none"; // Fecha o modal
                                pendingProposals.innerHTML = ""; // Limpa as listas para recarregar
                                approvedProposals.innerHTML = "";
                                rejectedProposals.innerHTML = "";
                                await loadProposals(auth.currentUser.uid); // Recarrega as propostas
                            } catch (error) {
                                console.error("Erro ao aprovar a proposta:", error);
                                alert("Erro ao aprovar a proposta. Tente novamente.");
                            }
                        } else {
                            alert("Nenhuma proposta selecionada.");
                        }
                    });
                    approveProposalBtn.dataset.listener = "true"; // Marca o evento como registrado
                }
    
                proposalModal.style.display = "flex"; // Abre o modal
            } else {
                alert("Proposta não encontrada.");
            }
        } catch (error) {
            console.error("Erro ao carregar detalhes da proposta:", error);
            alert("Erro ao carregar detalhes da proposta.");
        }
    };
    
    

    // Fecha o modal e limpa os detalhes da proposta
    closeButton.addEventListener('click', () => {
        proposalModal.style.display = "none";
        currentProposalId = "";
        proposalDetails.innerHTML = "";
    });
});
