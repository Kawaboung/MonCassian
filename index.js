const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

// Récupération configuration
let token, geminiKey;
try {
    const config = require('./config.json');
    token = config.token;
    geminiKey = config.geminiKey;
} catch (error) {
    token = process.env.DISCORD_TOKEN;
    geminiKey = process.env.GEMINI_KEY; 
}
if (geminiKey) geminiKey = geminiKey.trim();

// Serveur Render
const server = http.createServer((req, res) => { res.writeHead(200); res.end('Alive'); });
server.listen(3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
});

// Connexion Google
const genAI = new GoogleGenerativeAI(geminiKey);

client.on('ready', async () => {
    console.log(`Connecté: ${client.user.tag}`);
    
    // --- LE TEST DE VÉRITÉ ---
    console.log("--- VÉRIFICATION DES MODÈLES DISPONIBLES ---");
    try {
        // On demande à Google : "Qu'est-ce que je peux utiliser ?"
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; // Juste pour init
        // On liste les modèles via une astuce de la lib (ou on teste un par un si list échoue)
        // Note: La méthode officielle pour lister est complexe sans setup, 
        // on va tester une génération simple sur le modèle le plus basique.
        
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        try {
            await modelFlash.generateContent("Test");
            console.log("✅ gemini-1.5-flash : FONCTIONNE");
        } catch (e) { console.log("❌ gemini-1.5-flash : " + e.message); }

        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        try {
            await modelPro.generateContent("Test");
            console.log("✅ gemini-pro : FONCTIONNE");
        } catch (e) { console.log("❌ gemini-pro : " + e.message); }

    } catch (error) {
        console.log("ERREUR GLOBALE : ", error);
    }
    console.log("--- FIN VÉRIFICATION ---");
});

client.login(token);