const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Player } = require('discord-player');
const http = require('http');

// ==========================================
// 📝 TEXTES
// ==========================================
const TXT_AIDE = `
🎵 **MUSIQUE**
!play [titre]
!stop / !skip / !queue
`;

// --- CONFIG ---
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

// --- SERVEUR WEB ---
const server = http.createServer((req, res) => { res.writeHead(200); res.end('Cassian Music ON'); });
server.listen(3000);

// --- IA ---
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// --- MUSIQUE (Correction ici) ---
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Chargement des extracteurs (YouTube, Spotify...)
// C'est ici que j'avais oublié le "await" !
async function chargerExtracteurs() {
    await player.extractors.loadDefault();
    console.log("✅ Extracteurs audio chargés !");
}

// Gestion des erreurs musique (Pour comprendre si ça plante)
player.events.on('playerError', (queue, error) => {
    console.log(`❌ Erreur Player: ${error.message}`);
});
player.events.on('error', (queue, error) => {
    console.log(`❌ Erreur Queue: ${error.message}`);
});

client.on('ready', () => {
    console.log(`✅ Connecté: ${client.user.tag}`);
    chargerExtracteurs(); // On lance le chargement au démarrage
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!aide') message.reply(TXT_AIDE);

    // --- PLAY ---
    if (message.content.startsWith('!play ')) {
        const query = message.content.slice(6);
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply("❌ Tu dois être en vocal !");

        try {
            await message.channel.sendTyping();
            
            const result = await player.play(voiceChannel, query, {
                nodeOptions: { metadata: message }
            });
            return message.reply(`🎶 **Trouvé :** ${result.track.title}`);
        } catch (e) {
            console.error(e);
            return message.reply(`❌ Erreur : ${e.message}`);
        }
    }

    // --- STOP ---
    if (message.content === '!stop') {
        const queue = player.nodes.get(message.guild);
        if (queue) { queue.delete(); message.reply("🛑 Stop."); }
    }

    // --- IA ---
    if (message.content.startsWith('!ia ')) {
        const question = message.content.slice(4);
        await message.channel.sendTyping();
        try {
            const result = await model.generateContent(question);
            const text = result.response.text();
            if (text.length > 2000) await message.reply(text.slice(0, 1990) + "...");
            else await message.reply(text);
        } catch (e) { message.reply("Erreur IA"); }
    }
});

client.login(token);