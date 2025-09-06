// Final Vercel-only solution - server-focused with DM guidance
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'verify',
    description: 'Start the email verification process (Server only)',
    dm_permission: false, // Prevent DM usage - verification needs server context
  },
  {
    name: 'verifycode', 
    description: 'Complete verification with your email code (Server only)',
    dm_permission: false, // Prevent DM usage
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
    dm_permission: false, // Server only for consistency
  },
  {
    name: 'vping',
    description: 'Check bot response time', 
    dm_permission: false, // Server only for consistency
  },
  {
    name: 'help',
    description: 'Show help and setup instructions',
    dm_permission: true, // Allow in DMs to help users
  },
  // Admin commands
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
  {
    name: 'domainadd',
    description: 'Add an allowed email domain (Admin only)',
    dm_permission: false,
    options: [
      {
        name: 'domain',
        type: 3,
        description: 'The email domain to add (e.g., example.com)',
        required: true,
      },
    ],
  },
  {
    name: 'domainremove',
    description: 'Remove an allowed email domain (Admin only)',
    dm_permission: false,
    options: [
      {
        name: 'domain',
        type: 3,
        description: 'The email domain to remove',
        required: true,
      },
    ],
  },
  {
    name: 'rolechange',
    description: 'Change the verified role name (Admin only)',
    dm_permission: false,
    options: [
      {
        name: 'rolename',
        type: 3,
        description: 'The new name for the verified role',
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔧 Registering commands for Vercel-only server-focused bot...');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('✅ Commands registered successfully!');
    console.log('🏠 All verification commands work in servers');
    console.log('📱 DM limitation: Commands disabled in DMs (Discord webhook limitation)');
    console.log('💡 Users will be guided to use commands in servers');
    console.log('🎯 This is the standard approach for verification bots');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
