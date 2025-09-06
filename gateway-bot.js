// Minimal gateway bot for DM support - runs alongside Vercel webhook
const { Client, GatewayIntentBits, InteractionType } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
  ],
});

client.once('ready', () => {
  console.log(`✅ Gateway bot is online as ${client.user.tag}`);
  console.log('🔗 DM slash commands are now supported');
  console.log('📡 Server interactions still handled by Vercel webhook');
});

// Handle DM interactions (server interactions are handled by Vercel)
client.on('interactionCreate', async (interaction) => {
  // Only handle DM interactions - let Vercel handle server interactions
  if (!interaction.channel || interaction.channel.type !== 1) { // 1 = DM
    return; // Ignore server interactions (handled by Vercel)
  }

  console.log(`DM interaction received: ${interaction.commandName} from ${interaction.user.tag}`);

  if (!interaction.isCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'vping':
        const startTime = Date.now();
        await interaction.reply({
          content: `🏓 Pong! Response time: ${Date.now() - startTime}ms\n✅ Bot is online (Gateway + Vercel)`,
          ephemeral: true
        });
        break;

      case 'vstatus':
        await interaction.reply({
          content: `📊 **Bot Status**\n✅ Online and running (Gateway + Vercel)\n🔗 Webhook: https://verification-bot-endpoint.vercel.app/\n📝 Available commands: /verify, /verifycode, /vping, /vstatus\n💬 DM commands: Supported\n🏠 Server commands: Supported`,
          ephemeral: true
        });
        break;

      case 'verify':
        await interaction.reply({
          content: `📧 **Email Verification**\n\n⚠️ **DM Limitation**: Email verification must be done in a server channel, not in DMs.\n\nTo verify your email:\n1. Go to a server where this bot is present\n2. Use /verify in a channel\n3. Follow the verification process\n\n*DM commands like /vping and /vstatus work here, but verification requires server context.*`,
          ephemeral: true
        });
        break;

      default:
        await interaction.reply({
          content: `✅ Command /${interaction.commandName} received in DM!\n\n⚠️ Some commands may only work in server channels.`,
          ephemeral: true
        });
    }
  } catch (error) {
    console.error('DM interaction error:', error);
    
    try {
      const errorMessage = '❌ An error occurred while processing your command.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('Gateway bot error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('🚀 Gateway bot starting...');
  })
  .catch(error => {
    console.error('Failed to login gateway bot:', error);
  });
