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
      console.log('Channel type:', data?.channel_type);
      console.log('Guild ID:', data?.guild_id);

      const commandName = data?.name;
      const isInDM = !data?.guild_id; // If no guild_id, it's a DM
      
      switch (commandName) {
        case 'vping':
          const startTime = Date.now();
          const ping = Date.now() - startTime;
          const location = isInDM ? 'DM' : 'Server';
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🏓 Pong! Response time: ${ping}ms\n✅ Bot is running on Vercel\n📍 Location: ${location}`,
              flags: isInDM ? 64 : 0 // Ephemeral in DMs
            },
          });
          
        case 'vstatus':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📊 **Bot Status**\n✅ Online and running on Vercel (Webhook-only)\n🔗 Endpoint: https://verification-bot-endpoint.vercel.app/\n📝 Available commands: /verify, /verifycode, /vping, /vstatus\n📍 Context: ${isInDM ? 'Direct Message' : 'Server Channel'}`,
              flags: isInDM ? 64 : 0 // Ephemeral in DMs
            },
          });
          
        case 'verify':
          if (isInDM) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `📧 **Email Verification**\n\n⚠️ **DM Limitation**: Email verification must be done in a server channel for security reasons.\n\nTo verify your email:\n1. Go to a server where this bot is present\n2. Use /verify in a channel\n3. Follow the verification process\n\n*Commands like /vping and /vstatus work in DMs, but verification requires server context for role assignment.*`,
                flags: 64 // Ephemeral
              },
            });
          }
          
          // Handle server verification (implement full verification flow here)
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📧 **Email Verification Started**\n\nPlease check your DMs for further instructions, or use this channel for verification.\n\n*Note: This is where the email verification modal would appear in the full implementation.*`,
              flags: 64 // Ephemeral
            },
          });
          
        case 'verifycode':
          if (isInDM) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `🔐 **Verification Code**\n\n⚠️ **DM Limitation**: Code verification must be done in the server where you want to get verified.\n\nPlease use this command in the server channel where you started verification.`,
                flags: 64 // Ephemeral
              },
            });
          }
          
          const code = data?.options?.find(opt => opt.name === 'code')?.value;
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🔐 **Verification Code Received**: \`${code}\`\n\n*Note: This is where the code verification logic would run in the full implementation.*`,
              flags: 64 // Ephemeral
            },
          });
          
        default:
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Command /${commandName} received! Bot is working on Vercel.\n📍 Location: ${isInDM ? 'DM' : 'Server'}`,
              flags: isInDM ? 64 : 0
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
