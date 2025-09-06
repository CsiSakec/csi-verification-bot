const { verifyKey, InteractionType, InteractionResponseType } = require('discord-interactions');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  console.log('Request received:', {
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
      message: 'Discord Bot Endpoint', 
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
    console.log('Verifying Discord signature...');
    
    try {
      // Try with stringified body first
      let rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
      if (!isValidRequest) {
        console.log('Signature verification failed');
        return res.status(401).json({ error: 'Bad request signature' });
      }
      console.log('Discord signature verified successfully');
    } catch (error) {
      console.error('Signature verification error:', error);
      return res.status(401).json({ error: 'Bad request signature' });
    }
  } else {
    console.log('Test request without Discord signatures - allowing through');
  }

  try {
    const { type, data } = req.body;
    console.log('Processing interaction type:', type);

    // Handle PING for Discord endpoint verification
    if (type === InteractionType.PING) {
      console.log('Responding to Discord PING');
      return res.status(200).json({ 
        type: InteractionResponseType.PONG 
      });
    }

    // Handle slash commands
    if (type === InteractionType.APPLICATION_COMMAND) {
      console.log('Command received:', data?.name);

      const commandName = data?.name;
      
      switch (commandName) {
        case 'vping':
          const startTime = Date.now();
          const ping = Date.now() - startTime;
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🏓 Pong! Response time: ${ping}ms\n✅ Bot is running on Vercel`,
            },
          });
          
        case 'vstatus':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📊 **Bot Status**\n✅ Online and running on Vercel\n🔗 Endpoint: https://verification-bot-endpoint.vercel.app/\n📝 Available commands: /verify, /verifycode, /vping, /vstatus`,
            },
          });
          
        case 'verify':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📧 **Email Verification**\n\nTo verify your email and get access to the server, please:\n1. Use the /verify command in a server channel (not DM)\n2. Enter your email address when prompted\n3. Check your email for a verification code\n4. Use /verifycode to complete verification\n\n*Note: This command works in server channels only.*`,
              flags: 64 // Ephemeral
            },
          });
          
        default:
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Command /${commandName} received! Bot is working on Vercel.`,
            },
          });
      }
    }

    // Handle modal submissions
    if (type === InteractionType.MODAL_SUBMIT) {
      console.log('Modal submission received');
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '✅ Modal submission received!',
          flags: 64 // Ephemeral
        },
      });
    }

    // Default response for unknown interaction types
    console.log('Unknown interaction type:', type);
    return res.status(200).json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Bot received interaction type: ${type}`,
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
