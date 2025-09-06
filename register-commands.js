const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'verify',
    description: 'Start the email verification process',
  },
  {
    name: 'verifycode',
    description: 'Complete verification with your email code',
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
  },
  {
    name: 'vping',
    description: 'Check bot response time',
  },
  {
    name: 'enableonjoin',
    description: 'Enable verification message on member join (Admin only)',
  },
  {
    name: 'disableonjoin',
    description: 'Disable verification message on member join (Admin only)',
  },
  {
    name: 'domainadd',
    description: 'Add an allowed email domain (Admin only)',
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
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
