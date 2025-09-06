// Minimal Discord bot for DM support - deploy to Railway/Render/Heroku
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.DirectMessages]
});

client.once('ready', () => {
  console.log(`✅ Minimal bot online as ${client.user.tag}`);
  console.log('📱 DM interactions enabled');
  console.log('🌐 Server interactions handled by Vercel');
});

// Handle ALL interactions and forward to Vercel
client.on('interactionCreate', async (interaction) => {
  console.log(`Interaction: ${interaction.commandName} from ${interaction.user.tag}`);
  
  try {
    // For DM interactions, handle them here
    if (!interaction.guild) {
      switch (interaction.commandName) {
        case 'vping':
          await interaction.reply({
            content: `🏓 Pong! Bot is online\n📍 Location: DM\n⚡ Powered by Railway/Render + Vercel`,
            ephemeral: true
          });
          break;
          
        case 'vstatus':
          await interaction.reply({
            content: `📊 **Bot Status**\n✅ Online (Minimal Gateway + Vercel)\n📱 DM Commands: Supported\n🏠 Server Commands: Handled by Vercel\n🔗 Endpoint: https://verification-bot-endpoint.vercel.app/`,
            ephemeral: true
          });
          break;
          
        case 'verify':
          await interaction.reply({
            content: `📧 **Email Verification**\n\n⚠️ **DM Limitation**: Email verification must be done in a server.\n\nTo verify:\n1. Go to a server with this bot\n2. Use /verify in a channel\n3. Complete the verification process`,
            ephemeral: true
          });
          break;
          
        default:
          await interaction.reply({
            content: `✅ Command /${interaction.commandName} received in DM!\n⚠️ Some features require server context.`,
            ephemeral: true
          });
      }
    } else {
      // For server interactions, let them be handled by Vercel webhook
      // Just acknowledge but don't respond (Vercel will handle it)
      console.log('Server interaction detected - letting Vercel handle it');
    }
  } catch (error) {
    console.error('Interaction error:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);

// Keep the process alive
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Health check endpoint for deployment services
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    bot: client.user?.tag || 'connecting...',
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});
