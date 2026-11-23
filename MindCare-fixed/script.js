// ===================================
// LOGIN
// ===================================
const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");

let currentUser = null;

try {
    currentUser = JSON.parse(sessionStorage.getItem("mindcareUser") || "null");
} catch {
    currentUser = null;
}

function openDashboard(user) {
    currentUser = user;
    sessionStorage.setItem("mindcareUser", JSON.stringify(user));

    loginScreen.style.display = "none";
    appContainer.style.display = "flex";

    document.getElementById("sidebarName").textContent = user.name;
    document.getElementById("topUser").textContent = user.name;
    document.getElementById("welcomeName").textContent = user.name;
    document.getElementById("profileName").value = user.name;
    document.getElementById("profileEmail").value = user.email;
}

if (currentUser) openDashboard(currentUser);

document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!name || !email) return;
    openDashboard({ name, email });
});

document.getElementById("logoutBtn").addEventListener("click", function () {
    sessionStorage.removeItem("mindcareUser");
    currentUser = null;
    conversation = [];
    appContainer.style.display = "none";
    loginScreen.style.display = "flex";
});

// ===================================
// NAVIGASI
// ===================================
const pageInfo = {
    home: { title: "Beranda", description: "Selamat datang di layanan Konseling Sebaya." },
    counselor: { title: "Konselor", description: "Kenali layanan pendampingan MindCare." },
    chat: { title: "Mulai Konseling", description: "Ruang cerita bersama MindCare AI." },
    history: { title: "Riwayat Konseling", description: "Lihat percakapan yang pernah kamu lakukan." },
    profile: { title: "Profil Saya", description: "Informasi akun pengguna." }
};

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));

    const targetPage = document.getElementById(pageId);
    if (!targetPage || !pageInfo[pageId]) return;

    targetPage.classList.add("active");

    const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add("active");

    document.getElementById("pageTitle").textContent = pageInfo[pageId].title;
    document.getElementById("pageDescription").textContent = pageInfo[pageId].description;

    if (pageId === "history") renderHistory();
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        showPage(this.dataset.page);
    });
});

// ===================================
// CHAT AI
// ===================================
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const typingIndicator = document.getElementById("typingIndicator");
const sendBtn = document.getElementById("sendBtn");

let conversation = [];
let chatHistory = [];

try {
    chatHistory = JSON.parse(localStorage.getItem("mindcareHistory") || "[]");
    if (!Array.isArray(chatHistory)) chatHistory = [];
} catch {
    chatHistory = [];
}

function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = sender === "bot" ? "🤖" : "👤";

    const content = document.createElement("div");
    content.className = "message-content";
    // textContent prevents model output from being interpreted as HTML.
    content.textContent = text;

    message.append(avatar, content);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveHistory(userMessage, aiMessage) {
    chatHistory.push({
        user: userMessage,
        ai: aiMessage,
        date: new Date().toLocaleString("id-ID")
    });

    chatHistory = chatHistory.slice(-100);

    try {
        localStorage.setItem("mindcareHistory", JSON.stringify(chatHistory));
    } catch (error) {
        console.warn("Riwayat tidak dapat disimpan di browser:", error);
    }
}

chatForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const message = chatInput.value.trim();
    if (!message || sendBtn.disabled) return;

    addMessage(message, "user");
    chatInput.value = "";

    const previousConversation = [...conversation];
    conversation.push({ role: "user", content: message });

    typingIndicator.style.display = "block";
    sendBtn.disabled = true;
    chatInput.disabled = true;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: conversation.slice(-12) })
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(
                "Server tidak mengirim respons JSON. Pastikan website dibuka dari http://localhost:3000."
            );
        }

        if (!response.ok) {
            throw new Error(data.error || `Permintaan gagal (HTTP ${response.status}).`);
        }

        if (!data.reply || typeof data.reply !== "string") {
            throw new Error("AI mengirim jawaban kosong. Silakan coba lagi.");
        }

        addMessage(data.reply, "bot");
        conversation.push({ role: "assistant", content: data.reply });
        saveHistory(message, data.reply);

    } catch (error) {
        // Keep the conversation consistent if the request fails.
        conversation = previousConversation;

        console.error("Kesalahan chat MindCare:", error);
        addMessage(`Maaf, pesan belum berhasil dikirim. ${error.message}`, "bot");

    } finally {
        typingIndicator.style.display = "none";
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
});

// ===================================
// RIWAYAT KONSELING
// ===================================
function renderHistory() {
    const historyList = document.getElementById("historyList");
    historyList.replaceChildren();

    if (chatHistory.length === 0) {
        historyList.textContent = "Belum ada riwayat percakapan.";
        return;
    }

    [...chatHistory].reverse().forEach(item => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";

        const date = document.createElement("small");
        date.textContent = item.date || "";

        const userText = document.createElement("p");
        userText.textContent = "Kamu: " + (item.user || "");

        const aiText = document.createElement("p");
        aiText.textContent = "MindCare AI: " + (item.ai || "");

        historyItem.append(date, userText, aiText);
        historyList.appendChild(historyItem);
    });
}

document.getElementById("clearHistory").addEventListener("click", function () {
    if (!confirm("Apakah kamu yakin ingin menghapus semua riwayat?")) return;

    chatHistory = [];
    localStorage.removeItem("mindcareHistory");
    renderHistory();
});
