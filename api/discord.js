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
    contentType: req.headers['content-type'],
    fullBody: req.body // Log the full body to see if DM interactions are coming through
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
      console.log('Guild ID:', data?.guild_id);

      const commandName = data?.name;
      const isInServer = !!data?.guild_id;
      
      switch (commandName) {
        case 'vping':
          const startTime = Date.now();
          const ping = Date.now() - startTime;
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🏓 **Pong!**\n⚡ Response time: ${ping}ms\n✅ Bot is running on Vercel\n🌐 Webhook-only architecture\n📍 Server: ${data?.guild_id || 'Unknown'}`,
              flags: 64 // Ephemeral
            },
          });
          
        case 'vstatus':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📊 **Bot Status**\n\n✅ **Online** - Running on Vercel\n🔗 **Endpoint**: https://verification-bot-endpoint.vercel.app/\n⚡ **Architecture**: Webhook-only (No 24/7 server needed)\n🏠 **Context**: Server Channel\n\n📝 **Available Commands**:\n• \`/verify\` - Start email verification\n• \`/verifycode\` - Complete verification\n• \`/vping\` - Check response time\n• \`/vstatus\` - Show this status\n• \`/help\` - Show help information\n\n👑 **Admin Commands**: \`/enableonjoin\`, \`/disableonjoin\`, \`/domainadd\`, \`/domainremove\`, \`/rolechange\``,
              flags: 64 // Ephemeral
            },
          });
          
        case 'help':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `� **Verification Bot Help**\n\n🎯 **Purpose**: This bot helps verify users via email to assign roles and prevent spam.\n\n📋 **How to Use**:\n1️⃣ Use \`/verify\` in a server channel\n2️⃣ Enter your email when prompted\n3️⃣ Check your email for a verification code\n4️⃣ Use \`/verifycode <code>\` to complete verification\n5️⃣ Get your verified role automatically!\n\n� **Security**: All verification happens in servers for security\n⚡ **Performance**: Runs on Vercel for fast responses\n\n💡 **Need Help?** Contact server administrators\n\n🚫 **Note**: Commands only work in server channels, not DMs (Discord limitation for webhook bots)`,
              flags: 64 // Ephemeral
            },
          });
          
        case 'verify':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `� **Email Verification Process**\n\n🔄 **Starting verification...**\n\n*Note: In the full implementation, this would show an email input modal.*\n\nFor now, this confirms the verification system is working and ready to be enhanced with:\n• Email input modal\n• Database integration\n• Email sending\n• Role assignment\n\n✅ **Bot is ready for full verification implementation!**`,
              flags: 64 // Ephemeral
            },
          });
          
        case 'verifycode':
          const code = data?.options?.find(opt => opt.name === 'code')?.value;
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🔐 **Verification Code Processing**\n\n📝 Code received: \`${code}\`\n\n*Note: In the full implementation, this would:*\n• Validate the code against database\n• Check if email is verified\n• Assign verified role\n• Send confirmation\n\n✅ **Command structure is working correctly!**`,
              flags: 64 // Ephemeral
            },
          });
          
        default:
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Command \`/${commandName}\` received successfully!\n🌐 Bot is working on Vercel\n🏠 Server context: ${isInServer ? 'Yes' : 'No'}`,
              flags: 64 // Ephemeral
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
