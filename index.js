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
    // Si on est sur Render, on prend les variables d'environnement
    token = process.env.DISCORD_TOKEN;
    geminiKey = process.env.GEMINI_KEY; 
}

// --- 2. SERVEUR WEB (Pour que Render garde le bot allumé) ---
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Cassian est vivant !');
});
server.listen(3000, () => {
    console.log('Serveur web prêt.');
});

// --- 3. CONFIGURATION IA ET DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// On configure l'IA avec le modèle standard "gemini-pro"
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
});

// --- 4. ECOUTE DES MESSAGES ---
client.on('messageCreate', async message => {
    // Ne jamais répondre aux autres bots (ou à soi-même)
    if (message.author.bot) return;

    // Commande simple
    if (message.content === '!ping') {
        message.reply('Pong!');
    }

    // Commande IA : Si le message commence par "!ia "
    if (message.content.startsWith('!ia ')) {
        const question = message.content.slice(4); // On enlève le "!ia "
        
        // Petit effet "Cassian écrit..."
        await message.channel.sendTyping();

        try {
            // On envoie la question à Google
            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text();

            // Discord limite à 2000 caractères, on coupe si c'est trop long
            if (text.length > 2000) {
                await message.reply(text.slice(0, 1990) + "...");
            } else {
                await message.reply(text);
            }
        } catch (error) {
            console.error(error);
            await message.reply("Désolé, mon cerveau a surchauffé (Erreur IA).");
        }
    }
});

client.login(token);