// Backend MindCare: jalankan dengan `node server.js`
require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error("OPENAI_API_KEY belum diatur. Buat file .env dan isi API Key di sana.");
    process.exit(1);
}

const client = new OpenAI({ apiKey: API_KEY });

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "Server MindCare aktif." });
});

app.post("/api/chat", async (req, res) => {
    try {
        const messages = req.body?.messages;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Pesan tidak boleh kosong." });
        }

        const validMessages = messages
            .slice(-12)
            .filter(item =>
                item &&
                ["user", "assistant"].includes(item.role) &&
                typeof item.content === "string" &&
                item.content.trim().length > 0
            )
            .map(item => ({
                role: item.role,
                content: item.content.trim().slice(0, 2000)
            }));

        if (
            validMessages.length === 0 ||
            validMessages[validMessages.length - 1].role !== "user"
        ) {
            return res.status(400).json({ error: "Format percakapan tidak valid." });
        }

        const response = await client.responses.create({
            // Model ini didukung pada contoh resmi SDK OpenAI saat ini.
            model: process.env.OPENAI_MODEL || "gpt-5.5",
            instructions: `
Kamu adalah MindCare AI, asisten pendukung untuk website konseling sebaya.
Gunakan bahasa Indonesia yang hangat, sederhana, sopan, dan tidak menghakimi.
Dengarkan cerita pengguna dan tanggapi dengan empati.
Ajukan satu pertanyaan lanjutan yang relevan bila memang membantu.
Berikan saran umum yang aman dan realistis, bukan diagnosis atau terapi.
Jangan mengaku sebagai psikolog, konselor profesional, atau manusia.
Jangan meminta alamat, kata sandi, nomor identitas, atau data pribadi sensitif.
Jangan mendorong pengguna merahasiakan masalah serius dari orang tepercaya.
Jika pengguna menghadapi bahaya langsung atau merasa tidak aman, sarankan
agar segera mendekati orang dewasa tepercaya dan menghubungi layanan darurat
setempat. Jangan memberikan instruksi yang membahayakan.
Ingatkan dengan wajar bahwa AI bukan pengganti bantuan profesional.
            `,
            input: validMessages
        });

        const reply = response.output_text;

        if (!reply) {
            return res.status(502).json({ error: "AI tidak menghasilkan jawaban. Coba lagi." });
        }

        return res.json({ reply });

    } catch (error) {
        console.error("OpenAI API error:", {
            message: error.message,
            status: error.status,
            code: error.code
        });

        if (error.status === 401) {
            return res.status(502).json({
                error: "API Key ditolak. Periksa kembali OPENAI_API_KEY di file .env."
            });
        }

        if (error.status === 429) {
            return res.status(429).json({
                error: "Kuota atau batas penggunaan API tercapai. Periksa billing dan usage akun API."
            });
        }

        if (error.status === 404) {
            return res.status(502).json({
                error: "Model tidak tersedia untuk akun API ini. Periksa OPENAI_MODEL."
            });
        }

        return res.status(500).json({
            error: "Server gagal menghubungi AI. Periksa terminal VS Code untuk detail kesalahan."
        });
    }
});

app.listen(PORT, () => {
    console.log(`MindCare berjalan di http://localhost:${PORT}`);
    console.log("Tes server: http://localhost:" + PORT + "/api/health");
});
