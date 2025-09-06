// Root endpoint handler for Discord interactions
const { verifyKey, InteractionType, InteractionResponseType } = require('discord-interactions');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  console.log('Root endpoint - Request received:', {
    method: req.method,
    url: req.url,
    hasSignature: !!req.headers['x-signature-ed25519'],
    hasTimestamp: !!req.headers['x-signature-timestamp'],
    bodyType: typeof req.body,
    contentType: req.headers['content-type']
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Discord Bot Root Endpoint',
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get Discord signature headers
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  // For Discord requests, verify signature
  if (signature && timestamp) {
    console.log('Root endpoint - Verifying Discord signature...');

    try {
      // Try with stringified body first
      let rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
      
      if (!isValidRequest) {
        console.log('Root endpoint - Signature verification failed');
        return res.status(401).json({ error: 'Bad request signature' });
      }
      console.log('Root endpoint - Discord signature verified successfully');
    } catch (error) {
      console.error('Root endpoint - Signature verification error:', error);
      return res.status(401).json({ error: 'Bad request signature' });
    }
  } else {
    console.log('Root endpoint - Test request without Discord signatures - allowing through');
  }

  try {
    const { type, data } = req.body;
    console.log('Root endpoint - Processing interaction type:', type);

    // Handle PING for Discord endpoint verification
    if (type === InteractionType.PING) {
      console.log('Root endpoint - Responding to Discord PING');
      return res.status(200).json({
        type: InteractionResponseType.PONG
      });
    }

    // Handle slash commands
    if (type === InteractionType.APPLICATION_COMMAND) {
      console.log('Root endpoint - Command received:', data?.name);

      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ Command /${data?.name} received at root endpoint! Bot is working on Vercel.`,
        },
      });
    }

    // Handle modal submissions
    if (type === InteractionType.MODAL_SUBMIT) {
      console.log('Root endpoint - Modal submission received');
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '✅ Modal submission received at root endpoint!',
          flags: 64 // Ephemeral
        },
      });
    }

    // Default response for unknown interaction types
    console.log('Root endpoint - Unknown interaction type:', type);
    return res.status(200).json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Bot received interaction type: ${type} at root endpoint`,
      },
    });

  } catch (error) {
    console.error('Root endpoint - Discord endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
