const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Player } = require('discord-player');
const http = require('http');

// ==========================================
// 📝 ZONE ACTUALITÉ ET INFOS
// ==========================================
const TXT_ACTU = `🔴 **INFOS** : Le bot fait maintenant DJ ! Tape !play pour tester.`;
const TXT_AIDE = `
🎵 **COMMANDES MUSIQUE**
!play [titre] -> Lancer une musique
!stop -> Arrêter et vider la liste
!skip -> Passer à la suivante
!queue -> Voir la liste d'attente

🤖 **AUTRES**
!ia [question] -> Parler à l'IA
!actu -> Les nouvelles
`;

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

// --- 2. SERVEUR WEB (Pour garder le VPS content) ---
const server = http.createServer((req, res) => { res.writeHead(200); res.end('Cassian Music is ON'); });
server.listen(3000);

// --- 3. CONFIGURATION IA ---
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- 4. CONFIGURATION DISCORD + MUSIQUE ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // OBLIGATOIRE pour la musique
    ]
});

// Création du lecteur musique
const player = new Player(client);

// On charge les "extracteurs" (pour lire YouTube, Spotify, etc.)
player.extractors.loadDefault();

client.on('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}!`);
});

// --- GESTION DES MESSAGES ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // --- COMMANDES TEXTE ---
    if (message.content === '!actu') message.reply(TXT_ACTU);
    if (message.content === '!aide') message.reply(TXT_AIDE);
    if (message.content === '!ping') message.reply('Pong 🏓');

    // --- COMMANDES MUSIQUE ---
    
    // 1. JOUER (!play titre)
    if (message.content.startsWith('!play ')) {
        const query = message.content.slice(6);
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) return message.reply("❌ Tu dois être dans un salon vocal !");

        try {
            await message.channel.sendTyping();
            
            // Recherche et lecture
            const result = await player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: message // On garde le message pour répondre plus tard
                }
            });

            return message.reply(`🎶 **En piste !** J'ai ajouté : **${result.track.title}**`);
        } catch (e) {
            console.error(e);
            return message.reply(`❌ Erreur : Je n'ai pas trouvé ou je ne peux pas jouer ce titre.`);
        }
    }

    // 2. STOP (!stop)
    if (message.content === '!stop') {
        const queue = player.nodes.get(message.guild);
        if (!queue) return message.reply("❌ Rien n'est en cours de lecture.");
        queue.delete();
        return message.reply("🛑 Musique arrêtée, à plus !");
    }

    // 3. SKIP (!skip)
    if (message.content === '!skip') {
        const queue = player.nodes.get(message.guild);
        if (!queue || !queue.isPlaying()) return message.reply("❌ Rien à passer.");
        queue.node.skip();
        return message.reply("⏭️ Piste suivante !");
    }

    // 4. QUEUE (!queue)
    if (message.content === '!queue') {
        const queue = player.nodes.get(message.guild);
        if (!queue || !queue.tracks.size === 0) return message.reply("📭 La liste est vide.");
        
        const tracks = queue.tracks.map((t, i) => `${i + 1} - ${t.title}`).slice(0, 5).join('\n');
        return message.reply(`📜 **Liste d'attente :**\n${tracks}`);
    }


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
            await message.reply("Erreur IA : " + error.message);
        }
    }
});

client.login(token);