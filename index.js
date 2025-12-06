const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

// --- 1. CONFIGURATION ---
let token, geminiKey;
try {
    const config = require('./config.json');
    token = config.token;
    geminiKey = config.geminiKey;
} catch (error) {
    token = process.env.DISCORD_TOKEN;
    geminiKey = process.env.GEMINI_KEY; 
}
// Sécurité : on nettoie la clé
if (geminiKey) geminiKey = geminiKey.trim();

// --- 2. SERVEUR WEB (Pour Render) ---
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Cassian est en ligne !');
});
server.listen(3000, () => console.log('Serveur web prêt.'));

// --- 3. CONFIGURATION IA (Le coeur du problème résolu) ---
const genAI = new GoogleGenerativeAI(geminiKey);

// ON UTILISE LE MODÈLE QUE LE SCANNER A VALIDÉ :
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- 4. CONFIGURATION DISCORD ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Commande simple
    if (message.content === '!ping') message.reply('Pong!');

    // Commande IA
    if (message.content.startsWith('!ia ')) {
        const question = message.content.slice(4);
        await message.channel.sendTyping();

        try {
            const result = await model.generateContent(question);
            const response = await result.response;
            const text = response.text();

            if (text.length > 2000) {
                await message.reply(text.slice(0, 1990) + "...");
            } else {
                await message.reply(text);
            }
        } catch (error) {
            console.error("ERREUR:", error);
            await message.reply("Oups, erreur : " + error.message);
        }
    }
});

client.login(token);