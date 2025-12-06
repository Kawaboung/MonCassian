// --- FIX OVH (FORCE IPV4) ---
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
// ----------------------------

const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Player, QueryType } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor'); 
const http = require('http');

// ==========================================
// 📝 TEXTES
// ==========================================
const TXT_AIDE = `
🎵 **MUSIQUE**
!play [titre/lien]
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

// --- MUSIQUE ---
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Logs simplifiés
player.events.on('error', (queue, error) => console.log(`Error: ${error.message}`));
player.events.on('playerError', (queue, error) => console.log(`PlayerError: ${error.message}`));

client.on('ready', async () => {
    console.log(`✅ Connecté: ${client.user.tag}`);
    // On charge les extracteurs
    await player.extractors.loadMulti(DefaultExtractors);
    console.log("✅ Moteur audio prêt.");
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content === '!aide') message.reply(TXT_AIDE);

    // --- PLAY ---
    if (message.content.startsWith('!play ')) {
        const query = message.content.slice(6);
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply("❌ Vocal requis !");

        try {
            await message.channel.sendTyping();
            
            // On laisse le système gérer (le fix IPv4 devrait aider YouTube et SC)
            const result = await player.play(voiceChannel, query, {
                nodeOptions: { metadata: message },
                searchEngine: QueryType.AUTO
            });
            
            return message.reply(`🎵 **En lecture :** ${result.track.title}`);
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
    // --- SKIP ---
    if (message.content === '!skip') {
        const queue = player.nodes.get(message.guild);
        if (queue && queue.isPlaying()) { queue.node.skip(); message.reply("⏭️ Suivant"); }
    }
    // --- QUEUE ---
    if (message.content === '!queue') {
        const queue = player.nodes.get(message.guild);
        if (!queue || queue.tracks.size === 0) return message.reply("📭 Vide.");
        const list = queue.tracks.map((t, i) => `${i+1}. ${t.title}`).slice(0, 5).join('\n');
        message.reply(`📜 **File d'attente :**\n${list}`);
    }

    // --- IA ---
    if (message.content.startsWith('!ia ')) {
        const question = message.content.slice(4);
        // Pas de réponse typing pour l'IA pour éviter les doublons visuels
        try {
            const result = await model.generateContent(question);
            const text = result.response.text();
            if (text.length > 2000) await message.reply(text.slice(0, 1990) + "...");
            else await message.reply(text);
        } catch (e) { message.reply("Erreur IA"); }
    }
});

client.login(token);