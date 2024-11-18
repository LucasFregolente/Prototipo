import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('userName').textContent = user.displayName || "Usuário";
        document.getElementById('userEmail').textContent = user.email;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userType = userDoc.data().userType;
            const data = userDoc.data();

            // Preenche o formulário com dados do Firestore, se existirem
            document.getElementById('fullName').value = data.fullName || "";
            document.getElementById('cpfCnpj').value = data.cpfCnpj || "";
            document.getElementById('phone').value = data.phone || "";
            document.getElementById('cep').value = data.cep || "";
            document.getElementById('street').value = data.street || "";
            document.getElementById('number').value = data.number || "";
            document.getElementById('neighborhood').value = data.neighborhood || "";
            document.getElementById('city').value = data.city || "";
            document.getElementById('state').value = data.state || "";

            // Configurações de visibilidade com base no tipo de usuário
            if (userType === "cliente") {
                document.getElementById("userFormSection").style.display = "block";
                document.getElementById("clientControls").style.display = "block";
                document.body.classList.add("client-mode");
                checkPendingRequests('cliente', user.uid); 
            } 
            else if (userType === "comercial") {
                document.getElementById("commercialControls").style.display = "block";
                document.body.classList.add("commercial-mode");
                checkPendingRequests('comercial'); 
            } 
            else if (userType === "administrativo") {
                document.getElementById("adminControls").style.display = "block";
                document.body.classList.add("admin-mode");
                checkPendingRequests('administrativo'); // Adicionada a chamada aqui
            }
        } else {
            console.error("Nenhum documento encontrado para o usuário.");
        }
    } else {
        window.location.href = "../index.html";
    }
});

// Função para salvar dados no Firestore
document.getElementById('userForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (user) {
        const userData = {
            fullName: document.getElementById('fullName').value,
            cpfCnpj: document.getElementById('cpfCnpj').value,
            phone: document.getElementById('phone').value,
            cep: document.getElementById('cep').value,
            street: document.getElementById('street').value,
            number: document.getElementById('number').value,
            neighborhood: document.getElementById('neighborhood').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value
        };

        try {
            await setDoc(doc(db, "users", user.uid), userData, { merge: true });
            alert("Dados atualizados com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar dados:", error);
            alert("Erro ao atualizar dados.");
        }
    }
});

/// Função para verificar status específicos e exibir notificações visuais
async function checkPendingRequests(userType, userId = null) {
    try {
        if (userType === "comercial") {
            // Verifica status "pendente" para propostas
            const pendingProposalsQuery = query(collection(db, "requests"), where("status", "==", "pendente"));
            const pendingProposalsSnapshot = await getDocs(pendingProposalsQuery);
            console.log("Propostas pendentes:", pendingProposalsSnapshot.size);
            if (!pendingProposalsSnapshot.empty) {
                document.getElementById('btnPendingProposals').classList.add('notify');
            }

            // Verifica status "aprovada" para contratos
            const approvedContractsQuery = query(collection(db, "requests"), where("status", "==", "aprovada"));
            const approvedContractsSnapshot = await getDocs(approvedContractsQuery);
            console.log("Contratos aprovados:", approvedContractsSnapshot.size);
            if (!approvedContractsSnapshot.empty) {
                document.getElementById('btnPendingContracts').classList.add('notify');
            }
        }

        if (userType === "cliente" && userId) {
            // Verifica status "proposta_enviada" para aprovação de propostas do cliente
            const awaitingApprovalQuery = query(
                collection(db, "requests"),
                where("status", "==", "proposta_enviada"),
                where("clientId", "==", userId)
            );
            const awaitingApprovalSnapshot = await getDocs(awaitingApprovalQuery);
            console.log("Propostas enviadas para aprovação:", awaitingApprovalSnapshot.size);
            if (!awaitingApprovalSnapshot.empty) {
                document.getElementById('btnApprovedProposals').classList.add('notify');
            }

            const awaitingSignatureQuery = query(
                collection(db, "contracts"),
                where("status", "==", "assinado"),
                where("clientId", "==", userId)
            );
            const awaitingSignatureSnapshot = await getDocs(awaitingSignatureQuery);
            console.log("Contratos para assinar:", awaitingSignatureSnapshot.size);
            if (!awaitingSignatureSnapshot.empty) {
                document.getElementById('btnContractsClientes')?.classList.add('notify');
            }
        }

        if (userType === "administrativo") {
            const pendingContractAdminQuery = query(
                collection(db, "contracts"),
                where("status", "==", "pendente_validacao")
            );
            const pendingContractsSnapshot = await getDocs(pendingContractAdminQuery);

            console.log("Contratos pendentes para validação:", pendingContractsSnapshot.size);

            if (!pendingContractsSnapshot.empty) {
                document.getElementById('btnContracts').classList.add('notify');
            }
        }

    } catch (error) {
        console.error("Erro ao verificar status específicos:", error);
    }
}

