const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

// --- 1. RECUPERATION DES MOTS DE PASSE (PC ou RENDER) ---
let token;
let geminiKey;
try {
    const config = require('./config.json');
    token = config.token;
    geminiKey = config.geminiKey;
} catch (error) {
    // Sur Render, on utilise les variables d'environnement
    token = process.env.DISCORD_TOKEN;
    geminiKey = process.env.GEMINI_KEY; 
}

// --- 2. SERVEUR WEB (Pour garder le bot allumé sur Render) ---
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Cassian est en ligne !');
});
server.listen(3000, () => {
    console.log('Serveur web prêt.');
});

// --- 3. CONFIGURATION DU BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuration de l'IA avec le modèle Flash (le plus rapide)
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
});

// --- 4. ECOUTE DES MESSAGES ---
client.on('messageCreate', async message => {
    // Ignorer les messages des autres bots
    if (message.author.bot) return;

    // Commande de test basique
    if (message.content === '!ping') {
        message.reply('Pong!');
    }

    // Commande pour parler à l'IA
    if (message.content.startsWith('!ia ')) {
        const question = message.content.slice(4); // On enlève le "!ia "
        
        // Indique que le bot écrit...
        await message.channel.sendTyping();

        try {
            // Envoi de la question à Google Gemini
            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text();

            // Discord limite les messages à 2000 caractères
            if (text.length > 2000) {
                await message.reply(text.slice(0, 1990) + "...");
            } else {
                await message.reply(text);
            }
        } catch (error) {
            console.error("ERREUR IA :", error); // Affiche l'erreur dans les logs
            await message.reply("Désolé, j'ai eu un problème pour contacter mon cerveau (Erreur Google).");
        }
    }
});

client.login(token);