const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Player, QueryType } = require('discord-player'); // Ajout de QueryType
const { DefaultExtractors } = require('@discord-player/extractor'); 
const http = require('http');

// ==========================================
// 📝 TEXTES
// ==========================================
const TXT_AIDE = `
🎵 **MUSIQUE**
!play [titre ou lien]
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
        highWaterMark: 1 << 25, // Augmente la mémoire tampon pour éviter les coupures
        filter: 'audioonly'
    }
});

player.events.on('playerError', (queue, error) => console.log(`❌ PlayerError: ${error.message}`));
player.events.on('error', (queue, error) => console.log(`❌ Error: ${error.message}`));

client.on('ready', async () => {
    console.log(`✅ Connecté: ${client.user.tag}`);
    try {
        await player.extractors.loadMulti(DefaultExtractors);
        console.log("✅ Extracteurs chargés !");
    } catch (e) {
        console.log("❌ Erreur chargement extracteurs :", e);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content === '!aide') message.reply(TXT_AIDE);

    // --- PLAY (CORRIGÉ POUR LES LIENS) ---
    if (message.content.startsWith('!play ')) {
        const query = message.content.slice(6);
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply("❌ Tu dois être en vocal !");

        try {
            await message.channel.sendTyping();
            
            // On utilise "QueryType.AUTO" pour qu'il devine si c'est un lien ou un titre
            const result = await player.play(voiceChannel, query, {
                nodeOptions: { metadata: message },
                searchEngine: QueryType.AUTO 
            });
            return message.reply(`🎶 **En piste :** ${result.track.title}`);
        } catch (e) {
            console.error(e);
            return message.reply(`❌ Erreur : Impossible de lire ce titre/lien (Blocage YouTube probable).`);
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