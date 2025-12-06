const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// 1. Mini-serveur pour que Render garde le bot allumé (Ping)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Le bot est en ligne !');
});
server.listen(3000, () => {
  console.log('Serveur web prêt pour Render.');
});

// 2. Configuration du Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Le code de votre bot
client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
});

client.on('messageCreate', message => {
    if (message.content === '!ping') {
        message.reply('Pong!');
    }
});

// 4. Connexion sécurisée via les Variables d'Environnement (Render)
// Si on est sur le PC, on utilise le config.json, sinon on utilise la variable Render
let token;
try {
    const config = require('./config.json');
    token = config.token;
} catch (error) {
    token = process.env.DISCORD_TOKEN; // C'est ici que Render donnera le mot de passe
}

client.login(token);