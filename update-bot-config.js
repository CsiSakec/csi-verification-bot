// Check and update Discord bot configuration
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function updateBotSettings() {
  try {
    console.log('🔍 Checking current bot configuration...');
    
    // Get current application info
    const app = await rest.get(Routes.currentApplication());
    console.log('Current bot info:', {
      name: app.name,
      id: app.id,
      interactions_endpoint_url: app.interactions_endpoint_url,
      public: app.bot_public,
      bot_require_code_grant: app.bot_require_code_grant
    });
    
    // Update interactions endpoint URL
    console.log('🔧 Updating interactions endpoint URL...');
    const updatedApp = await rest.patch(Routes.currentApplication(), {
      body: {
        interactions_endpoint_url: 'https://verification-bot-endpoint.vercel.app/'
      }
    });
    
    console.log('✅ Updated interactions endpoint URL:', updatedApp.interactions_endpoint_url);
    console.log('🎯 Bot should now receive DM interactions via webhook');
    
  } catch (error) {
    console.error('❌ Error updating bot configuration:', error);
    if (error.status === 400) {
      console.log('💡 Try setting the endpoint URL manually in Discord Developer Portal');
    }
  }
}

updateBotSettings();
