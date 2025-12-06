// Importation des classes nécessaires
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const config = require('./config.json');

// 1. DÉFINITION DES COMMANDES SLASH
const commands = [
    {
        name: 'ping',
        description: 'Répond avec Pong! et la latence du bot.'
    },
    {
        name: 'radar', 
        description: 'Affiche la carte radar des précipitations (Source Météox).' // Description mise à jour
    },
];

// 2. INITIALISATION DU CLIENT
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds
    ] 
});

// 3. ÉVÉNEMENT "READY" (Bot connecté)
client.on('ready', async () => {
    console.log(`✅ Le bot est connecté en tant que ${client.user.tag} !`);

    // Enregistrement des commandes slash
    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log('Enregistrement des commandes slash...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Commandes slash enregistrées avec succès.');
    } catch (error) {
        console.error("Erreur lors de l'enregistrement des commandes :", error);
    }
});

// 4. GESTION DES COMMANDES (Logique de réponse)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply({ 
            content: `Pong! Latence : ${client.ws.ping}ms`,
            ephemeral: true
        });
    } else if (commandName === 'radar') {
        // --- BLOC RADAR AVEC SOURCE MÉTÉOX STABLE ---
        // Cette URL est connue pour être stable et ne pas bloquer l'affichage externe.
        const stableRadarURL = "https://www.meteox.com/images.aspx?jaar=-30&soort=webmaster";

        await interaction.reply({
            content: `📡 Carte Radar Précipitations (Source Météox) :\n${stableRadarURL}`
        });
        // ------------------------------------------------------------------
    }
});


// 5. CONNEXION DU BOT
client.login(config.token).catch(e => {
    console.error("Échec de la connexion. Vérifiez votre TOKEN et vos Intents.");
    console.error(e);
});