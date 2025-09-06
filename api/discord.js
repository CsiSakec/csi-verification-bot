// Simple Discord bot endpoint for Vercel
const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if this is a Discord request (has signature headers)
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  if (signature && timestamp) {
    // This is a real Discord request - use signature verification
    const verifyDiscordRequest = verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY);
    return verifyDiscordRequest(req, res, () => {
      return handleDiscordInteraction(req, res);
    });
  } else {
    // This is a test request without signatures - handle directly
    console.log('Test request without Discord signatures');
    return handleDiscordInteraction(req, res);
  }
}

function handleDiscordInteraction(req, res) {
  try {
    console.log('Discord interaction received:', req.body);
    
    const { type } = req.body;

    // Handle Discord PING for endpoint verification
    if (type === InteractionType.PING) {
      console.log('Responding to Discord PING');
      return res.status(200).json({ 
        type: InteractionResponseType.PONG 
      });
    }

    // Handle slash commands
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { data } = req.body;
      console.log('Command received:', data.name);

      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ Command /${data.name} received! Bot is working on Vercel.`,
        },
      });
    }

    // Default response for unknown interaction types
    return res.status(200).json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Bot received an unknown interaction type.',
      },
    });

  } catch (error) {
    console.error('Discord endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
