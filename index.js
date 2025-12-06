const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

// ==========================================
// 📝 ZONE DE TEXTE (MODIFIEZ VOS TEXTES ICI)
// ==========================================

const TXT_ACTU = `
🔴 **INFOS DU MOMENT**
- Le bot est réparé !
- Tournoi ce week-end.
`;

const TXT_REGLES = `
📜 **RÈGLEMENT DU SERVEUR**
1. Soyez respectueux.
2. Pas de spam.
3. Pas de publicité sans autorisation.
`;

const TXT_LIENS = `
🔗 **LIENS UTILES**
- Site web : https://mon-site.com
- Chaîne YouTube : https://youtube.com/...
- Twitch : https://twitch.tv/...
`;

const TXT_PLANNING = `
📅 **PLANNING SEMAINE**
- Lundi : Repos
- Mercredi 21h : Soirée Film
- Vendredi 21h : Among Us
`;

const TXT_STAFF = `
👮 **ÉQUIPE DU SERVEUR**
- Fondateur : Toi
- Modérateurs : Cassian (le bot), Mod1, Mod2
`;

const TXT_AIDE = `
❓ **COMMANDES DISPONIBLES**
!ia [question] -> Parler avec l'intelligence artificielle
!actu -> Voir les news
!regles -> Lire le règlement
!liens -> Nos réseaux sociaux
!planning -> L'agenda de la semaine
!staff -> Voir qui gère le serveur
`;

// ==========================================

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
if (geminiKey) geminiKey = geminiKey.trim();

// --- 2. SERVEUR WEB ---
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Cassian est en ligne !');
});
server.listen(3000, () => console.log('Serveur web prêt.'));

// --- 3. CONFIGURATION IA ---
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- 4. BOT DISCORD ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // --- VOS COMMANDES STATIQUES ---
    if (message.content === '!actu')     message.reply(TXT_ACTU);
    if (message.content === '!regles')   message.reply(TXT_REGLES);
    if (message.content === '!liens')    message.reply(TXT_LIENS);
    if (message.content === '!planning') message.reply(TXT_PLANNING);
    if (message.content === '!staff')    message.reply(TXT_STAFF);
    if (message.content === '!aide')     message.reply(TXT_AIDE);
    
    // Petite commande cachée rigolote
    if (message.content === '!ping')     message.reply('Pong 🏓');

    // --- COMMANDE IA ---
    if (message.content.startsWith('!ia ')) {
        const question = message.content.slice(4);
        await message.channel.sendTyping();
        try {
            const result = await model.generateContent(question);
            const text = result.response.text();
            if (text.length > 2000) {
                await message.reply(text.slice(0, 1990) + "...");
            } else {
                await message.reply(text);
            }
        } catch (error) {
            console.error("ERREUR:", error);
            await message.reply("Erreur IA : " + error.message);
        }
    }
});

client.login(token);