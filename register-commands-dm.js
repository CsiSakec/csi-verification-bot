// Update slash commands to be server-only
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'verify',
    description: 'Start the email verification process',
    dm_permission: false, // Server only
  },
  {
    name: 'verifycode', 
    description: 'Complete verification with your email code',
    dm_permission: false, // Server only
    options: [
      {
        name: 'code',
        type: 3, // STRING
        description: 'The 6-digit verification code from your email',
        required: true,
      },
    ],
  },
  {
    name: 'vstatus',
    description: 'Show bot status and available commands',
    dm_permission: true, // Allow in DMs
  },
  {
    name: 'vping',
    description: 'Check bot response time', 
    dm_permission: true, // Allow in DMs
  },
  {
    name: 'enableonjoin',
    description: 'Enable verification message on member join (Admin only)',
    dm_permission: false, // Server only
  },
  {
    name: 'disableonjoin',
    description: 'Disable verification message on member join (Admin only)',
    dm_permission: false, // Server only
  },
  {
    name: 'domainadd',
    description: 'Add an allowed email domain (Admin only)',
    dm_permission: false, // Server only
    options: [
      {
        name: 'domain',
        type: 3, // STRING
        description: 'The email domain to add (e.g., example.com)',
        required: true,
      },
    ],
  },
  {
    name: 'domainremove',
    description: 'Remove an allowed email domain (Admin only)',
    dm_permission: false, // Server only
    options: [
      {
        name: 'domain',
        type: 3, // STRING
        description: 'The email domain to remove',
        required: true,
      },
    ],
  },
  {
    name: 'rolechange',
    description: 'Change the verified role name (Admin only)',
    dm_permission: false, // Server only
    options: [
      {
        name: 'rolename',
        type: 3, // STRING
        description: 'The new name for the verified role',
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands with DM permissions...');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands with DM permissions.');
    console.log('Commands with DM permission: vping, vstatus');
    console.log('Server-only commands: verify, verifycode, enableonjoin, disableonjoin, domainadd, domainremove, rolechange');
  } catch (error) {
    console.error(error);
  }
})();
