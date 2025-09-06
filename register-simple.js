// Simple fix: Make commands work where they're supposed to
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'verify',
    description: 'Start the email verification process',
    dm_permission: false, // Server only - where verification makes sense
  },
  {
    name: 'verifycode', 
    description: 'Complete verification with your email code',
    dm_permission: false, // Server only
    options: [
      {
        name: 'code',
        type: 3,
        description: 'The 6-digit verification code from your email',
        required: true,
      },
    ],
  },
  {
    name: 'vstatus',
    description: 'Show bot status and available commands',
    // Allow in both DMs and servers
  },
  {
    name: 'vping',
    description: 'Check bot response time',
    // Allow in both DMs and servers
  },
  // Admin commands - server only
  {
    name: 'enableonjoin',
    description: 'Enable verification message on member join (Admin only)',
    dm_permission: false,
  },
  {
    name: 'disableonjoin',
    description: 'Disable verification message on member join (Admin only)',
    dm_permission: false,
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔧 Registering commands with appropriate permissions...');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('✅ Commands registered!');
    console.log('📱 DM Commands: /vping, /vstatus (if Discord supports webhook DMs)');
    console.log('🏠 Server Commands: All commands available');
    console.log('💡 If DM commands still don\'t work, Discord may require a gateway connection for DMs');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
