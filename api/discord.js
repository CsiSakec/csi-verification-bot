const { verifyKey, InteractionType, InteractionResponseType } = require('discord-interactions');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
require('dotenv').config();

// Connect to MongoDB
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error(err));
}

// Schemas
const UserSchema = new mongoose.Schema({
  userid: String,
  guildid: String,
  email: String,
  code: String,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 minutes expiry
});

const GuildSchema = new mongoose.Schema({
  guildid: String,
  domains: [String],
  onjoin: { type: Boolean, default: false },
  role: { type: String, default: "Verified" },
});

const User = mongoose.model("User", UserSchema);
const Guild = mongoose.model("Guild", GuildSchema);

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email verification function
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    await transporter.sendMail({
      from: `"CSI Verification" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Discord Account Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #5865F2;">SAKEC Discord Verification</h2>
          <p>Hello, <b>${email}</b></p>
          <p>To complete your SAKEC Discord server verification, please use this code:</p>
          <p style="font-size:24px; font-weight:bold; color:#5865F2; background:#f0f0f0; padding:15px; border-radius:8px; margin: 20px 0;">${verificationCode}</p>
          <p>This code will expire in <b>10 minutes</b>. Please do not share it with anyone.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color:#666; font-size: 14px;">🏫 SAKEC Discord Community<br>
          🔒 Secure verification system</p>
        </div>`,
    });
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Error sending verification email:", err);
    return false;
  }
};

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
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      
      const commandName = data?.name;
      const guildId = req.body.guild_id || data?.guild_id;
      const isInServer = !!guildId;
      
      console.log('Guild ID detected:', guildId);
      console.log('Is in server:', isInServer);
      
      switch (commandName) {
        case 'vping':
          const startTime = Date.now();
          const ping = Date.now() - startTime;
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🏓 **Pong!**\n⚡ Response time: ${ping}ms\n✅ Bot is running on Vercel\n🌐 Webhook-only architecture\n📍 Server: ${guildId || 'Unknown'}`,
              flags: 64 // Ephemeral
            },
          });
          
        case 'vstatus':
          try {
            let guildInfo = '';
            
            if (guildId) {
              const guildData = await Guild.findOne({ guildid: guildId });
              
              // Default to sakec.ac.in if no domains are configured
              let domains = 'sakec.ac.in (default)';
              if (guildData && guildData.domains && guildData.domains.length > 0) {
                domains = guildData.domains.join(', ');
              }
              
              const onJoin = guildData?.onjoin ? 'Enabled' : 'Disabled';
              const verifiedRole = guildData?.role || 'Verified';
              
              guildInfo = `\n\n**🔧 Current Server Settings:**\n• **Allowed Domains:** ${domains}\n• **Verify on Join:** ${onJoin}\n• **Verified Role:** ${verifiedRole}`;
            }

            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `📊 **Bot Status**\n\n✅ **Online** - Running on Vercel\n🔗 **Endpoint**: https://verification-bot-endpoint.vercel.app/\n⚡ **Architecture**: Webhook-only (No 24/7 server needed)\n🏠 **Context**: ${guildId ? 'Server Channel' : 'Direct Message'}\n\n📝 **Available Commands**:\n• \`/verify\` - Start email verification\n• \`/verifycode\` - Complete verification\n• \`/vping\` - Check response time\n• \`/vstatus\` - Show this status\n• \`/help\` - Show help information\n\n👑 **Admin Commands**: \`/enableonjoin\`, \`/disableonjoin\`, \`/domainadd\`, \`/domainremove\`, \`/rolechange\`${guildInfo}`,
                flags: 64 // Ephemeral
              },
            });
          } catch (error) {
            console.error('Error fetching guild data:', error);
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `📊 **Bot Status**\n\n✅ **Online** - Running on Vercel\n🔗 **Endpoint**: https://verification-bot-endpoint.vercel.app/\n⚡ **Architecture**: Webhook-only (No 24/7 server needed)\n\n📝 **Available Commands**:\n• \`/verify\` - Start email verification\n• \`/verifycode\` - Complete verification\n• \`/vping\` - Check response time\n• \`/vstatus\` - Show this status\n• \`/help\` - Show help information\n\n👑 **Admin Commands**: \`/enableonjoin\`, \`/disableonjoin\`, \`/domainadd\`, \`/domainremove\`, \`/rolechange\``,
                flags: 64 // Ephemeral
              },
            });
          }
          
        case 'help':
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `� **Verification Bot Help**\n\n🎯 **Purpose**: This bot helps verify users via email to assign roles and prevent spam.\n\n📋 **How to Use**:\n1️⃣ Use \`/verify\` in a server channel\n2️⃣ Enter your email when prompted\n3️⃣ Check your email for a verification code\n4️⃣ Use \`/verifycode <code>\` to complete verification\n5️⃣ Get your verified role automatically!\n\n� **Security**: All verification happens in servers for security\n⚡ **Performance**: Runs on Vercel for fast responses\n\n💡 **Need Help?** Contact server administrators\n\n🚫 **Note**: Commands only work in server channels, not DMs (Discord limitation for webhook bots)`,
              flags: 64 // Ephemeral
            },
          });
          
        case 'verify':
          // Check if user is in a server
          if (!guildId) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `❌ **Email verification must be done in a server channel, not in DMs.**\n\nPlease use this command in a server where the bot is present.`,
                flags: 64 // Ephemeral
              },
            });
          }

          // Show email input modal
          return res.status(200).json({
            type: InteractionResponseType.MODAL,
            data: {
              custom_id: 'email_verification_modal',
              title: 'Email Verification',
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 4, // Text Input
                      custom_id: 'email_input',
                      label: 'Enter your email address',
                      style: 1, // Short
                      placeholder: 'example@domain.com',
                      required: true,
                      max_length: 254
                    }
                  ]
                }
              ]
            }
          });
          
        case 'verifycode':
          const code = data?.options?.find(opt => opt.name === 'code')?.value;
          const userId = req.body.member?.user?.id || req.body.user?.id;

          if (!code) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ Please provide a verification code.',
                flags: 64 // Ephemeral
              },
            });
          }

          if (!guildId) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ This command must be used in a server channel.',
                flags: 64 // Ephemeral
              },
            });
          }

          try {
            // Find verification record
            const verificationRecord = await User.findOne({
              userid: userId,
              guildid: guildId,
              code: code,
              verified: false
            });

            if (!verificationRecord) {
              return res.status(200).json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '❌ Invalid or expired verification code. Please try verifying again with `/verify`.',
                  flags: 64 // Ephemeral
                },
              });
            }

            // Mark as verified
            verificationRecord.verified = true;
            await verificationRecord.save();

            // Get guild data for role name
            const guildData = await Guild.findOne({ guildid: guildId });
            const roleName = guildData?.role || 'Verified';

            // Add role using Discord API
            try {
              // Get all roles in the guild
              const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                headers: {
                  'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                },
              });

              if (rolesResponse.ok) {
                const roles = await rolesResponse.json();
                const verifiedRole = roles.find(role => role.name === roleName);

                if (verifiedRole) {
                  const addRoleResponse = await fetch(
                    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${verifiedRole.id}`,
                    {
                      method: 'PUT',
                      headers: {
                        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  if (addRoleResponse.ok) {
                    return res.status(200).json({
                      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                      data: {
                        content: `✅ **Email verification successful!**\n\n🎉 You have been verified and assigned the \`${roleName}\` role.\n📧 Email: \`${verificationRecord.email}\``,
                        flags: 64 // Ephemeral
                      },
                    });
                  } else {
                    console.error('Failed to add role:', await addRoleResponse.text());
                  }
                } else {
                  return res.status(200).json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                      content: `✅ **Email verification successful!**\n\n⚠️ The \`${roleName}\` role was not found. Please contact an administrator to create the role and assign it manually.`,
                      flags: 64 // Ephemeral
                    },
                  });
                }
              }

              // If role assignment failed, still mark as verified
              return res.status(200).json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '✅ **Email verification successful!**\n\n⚠️ Could not automatically assign the verified role. Please contact an administrator.',
                  flags: 64 // Ephemeral
                },
              });

            } catch (roleError) {
              console.error('Error adding role:', roleError);
              return res.status(200).json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: '✅ **Email verification successful!**\n\n⚠️ Could not automatically assign the verified role. Please contact an administrator.',
                  flags: 64 // Ephemeral
                },
              });
            }

          } catch (error) {
            console.error('Code verification error:', error);
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ An error occurred during code verification. Please try again.',
                flags: 64 // Ephemeral
              },
            });
          }

        case 'enableonjoin':
          // Check if user has admin permissions
          const memberPerms = req.body.member?.permissions;
          if (!memberPerms || !(parseInt(memberPerms) & 0x8)) { // Administrator permission
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ You need Administrator permissions to use this command.',
                flags: 64 // Ephemeral
              },
            });
          }

          await Guild.updateOne(
            { guildid: guildId },
            { onjoin: true },
            { upsert: true }
          );
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '✅ Verification on member join has been **enabled**.',
              flags: 64 // Ephemeral
            },
          });

        case 'disableonjoin':
          // Check if user has admin permissions
          const memberPerms2 = req.body.member?.permissions;
          if (!memberPerms2 || !(parseInt(memberPerms2) & 0x8)) { // Administrator permission
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ You need Administrator permissions to use this command.',
                flags: 64 // Ephemeral
              },
            });
          }

          await Guild.updateOne(
            { guildid: guildId },
            { onjoin: false },
            { upsert: true }
          );
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '✅ Verification on member join has been **disabled**.',
              flags: 64 // Ephemeral
            },
          });

        case 'domainadd':
          const domainToAdd = data?.options?.find(opt => opt.name === 'domain')?.value;
          // Check if user has admin permissions
          const memberPerms3 = req.body.member?.permissions;
          if (!memberPerms3 || !(parseInt(memberPerms3) & 0x8)) { // Administrator permission
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ You need Administrator permissions to use this command.',
                flags: 64 // Ephemeral
              },
            });
          }

          if (!domainToAdd) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ Please provide a domain to add.',
                flags: 64 // Ephemeral
              },
            });
          }

          await Guild.updateOne(
            { guildid: guildId },
            { $addToSet: { domains: domainToAdd.toLowerCase() } },
            { upsert: true }
          );
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Domain \`${domainToAdd}\` has been added to the allowed list.`,
              flags: 64 // Ephemeral
            },
          });

        case 'domainremove':
          const domainToRemove = data?.options?.find(opt => opt.name === 'domain')?.value;
          // Check if user has admin permissions
          const memberPerms4 = req.body.member?.permissions;
          if (!memberPerms4 || !(parseInt(memberPerms4) & 0x8)) { // Administrator permission
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ You need Administrator permissions to use this command.',
                flags: 64 // Ephemeral
              },
            });
          }

          if (!domainToRemove) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ Please provide a domain to remove.',
                flags: 64 // Ephemeral
              },
            });
          }

          await Guild.updateOne(
            { guildid: guildId },
            { $pull: { domains: domainToRemove.toLowerCase() } }
          );
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Domain \`${domainToRemove}\` has been removed from the allowed list.`,
              flags: 64 // Ephemeral
            },
          });

        case 'rolechange':
          const newRoleName = data?.options?.find(opt => opt.name === 'rolename')?.value;
          // Check if user has admin permissions
          const memberPerms5 = req.body.member?.permissions;
          if (!memberPerms5 || !(parseInt(memberPerms5) & 0x8)) { // Administrator permission
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ You need Administrator permissions to use this command.',
                flags: 64 // Ephemeral
              },
            });
          }

          if (!newRoleName) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ Please provide a new role name.',
                flags: 64 // Ephemeral
              },
            });
          }

          await Guild.updateOne(
            { guildid: guildId },
            { role: newRoleName },
            { upsert: true }
          );
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Verified role name has been changed to \`${newRoleName}\`.`,
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
      const customId = data?.custom_id;
      const userId = req.body.member?.user?.id || req.body.user?.id;
      const guildId = req.body.guild_id;

      if (customId === 'email_verification_modal') {
        const emailInput = data?.components?.[0]?.components?.[0]?.value;
        
        if (!emailInput) {
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ No email provided. Please try again.',
              flags: 64 // Ephemeral
            },
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput)) {
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Invalid email format. Please enter a valid email address.',
              flags: 64 // Ephemeral
            },
          });
        }

        try {
          // Check if user already has a pending verification
          const existingUser = await User.findOne({
            userid: userId,
            guildid: guildId,
            verified: false
          });

          if (existingUser) {
            await User.deleteOne({ _id: existingUser._id });
          }

          // Check if user is already verified
          const verifiedUser = await User.findOne({
            userid: userId,
            guildid: guildId,
            verified: true
          });

          if (verifiedUser) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '✅ You are already verified in this server!',
                flags: 64 // Ephemeral
              },
            });
          }

          // Check allowed domains
          const guildData = await Guild.findOne({ guildid: guildId });
          
          // Default to sakec.ac.in if no domains are configured
          let allowedDomains = ['sakec.ac.in'];
          if (guildData && guildData.domains && guildData.domains.length > 0) {
            allowedDomains = guildData.domains.map(d => d.toLowerCase());
          }
          
          const emailDomain = emailInput.split('@')[1].toLowerCase();
          
          if (!allowedDomains.includes(emailDomain)) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `❌ **Email domain \`${emailDomain}\` is not allowed.**\n\n✅ **Allowed domains:** ${allowedDomains.join(', ')}\n\n💡 Only SAKEC students and staff can verify using their official email addresses.`,
                flags: 64 // Ephemeral
              },
            });
          }

          // Generate verification code
          const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

          // Save to database
          const newUser = new User({
            userid: userId,
            guildid: guildId,
            email: emailInput.toLowerCase(),
            code: verificationCode,
            verified: false
          });

          await newUser.save();

          // Send verification email
          const emailSent = await sendVerificationEmail(emailInput, verificationCode);

          if (emailSent) {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `📧 **Verification email sent to** \`${emailInput}\`\n\n✅ Please check your email for a 6-digit verification code.\n🔐 Use \`/verifycode <code>\` to complete verification.\n⏰ Code expires in 10 minutes.`,
                flags: 64 // Ephemeral
              },
            });
          } else {
            return res.status(200).json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '❌ Failed to send verification email. Please try again or contact an administrator.',
                flags: 64 // Ephemeral
              },
            });
          }

        } catch (error) {
          console.error('Email verification error:', error);
          return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ An error occurred during verification. Please try again.',
              flags: 64 // Ephemeral
            },
          });
        }
      }

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
