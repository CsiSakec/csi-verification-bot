const express = require('express');
const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for raw body (required for Discord signature verification)
app.use('/api/discord', express.raw({ type: 'application/json' }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    await transporter.sendMail({
      from: `"CSI Verification" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;"> 
            <img src="https://i.postimg.cc/05K5XRLK/CSI-logo.png" alt="CSI Logo" width="150">
            <h2>CSI-SAKEC Account Verification</h2>
            <p>Hello, <b>${email}</b></p>
            <p>To continue setting up your CSI Discord account, please verify your account with the code below:</p>
            <p class="code" style="font-size:20px; font-weight:bold;">${verificationCode}</p>
            <p>This code will expire in 10 minutes. Please do not share it with anyone.</p>
            <p>If you did not make this request, please ignore this email.</p>
            <hr>
            <p>© 2025 CSI-SAKEC. All Rights Reserved.</p>
        </div>`,
    });
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Error sending verification email:", err);
    return false;
  }
};

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CSI Discord Bot - Local Development Server',
    status: 'running',
    endpoints: {
      discord: '/api/discord',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Discord interactions endpoint with proper verification
app.post('/api/discord', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
  console.log('Received verified interaction:', JSON.stringify(req.body, null, 2));
  
  const { type, data, member, guild_id } = req.body;

  // Handle ping
  if (type === InteractionType.PING) {
    return res.json({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;
    const userId = member?.user?.id || req.body.user?.id;
    const guildId = guild_id;

    console.log(`Processing command: ${name} from user: ${userId} in guild: ${guildId}`);

    try {
      switch (name) {
        case 'vping':
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🏓 Pong! Local development server is running!`,
            },
          });

        case 'verify':
          // Show modal for email input
          return res.json({
            type: InteractionResponseType.MODAL,
            data: {
              title: 'Email Verification',
              custom_id: 'email_verification_modal',
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 4, // Text Input
                      custom_id: 'email_input',
                      label: 'Your Email Address',
                      style: 1, // Short
                      placeholder: 'example@domain.com',
                      required: true,
                    },
                  ],
                },
              ],
            },
          });

        case 'verifycode':
          const code = options?.find(opt => opt.name === 'code')?.value;
          
          if (!code) {
            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'Please provide a verification code.',
                flags: 64, // Ephemeral
              },
            });
          }

          try {
            const verificationRecord = await User.findOne({
              userid: userId,
              guildid: guildId,
              code: code,
              verified: false,
            });

            if (!verificationRecord) {
              return res.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: 'The verification code is incorrect or has expired. Please try again.',
                  flags: 64, // Ephemeral
                },
              });
            }

            // Mark as verified
            verificationRecord.verified = true;
            await verificationRecord.save();

            console.log(`User ${userId} verified successfully with email: ${verificationRecord.email}`);

            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: '✅ Your email has been successfully verified! (Local test - role assignment would happen in production)',
                flags: 64, // Ephemeral
              },
            });

          } catch (error) {
            console.error('Error in code verification:', error);
            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'An error occurred while verifying your code.',
                flags: 64, // Ephemeral
              },
            });
          }

        case 'vstatus':
          const guildData = await Guild.findOne({ guildid: guildId });
          const domains = guildData?.domains?.join(', ') || 'None';
          const onJoin = guildData?.onjoin || false;
          const verifiedRole = guildData?.role || 'Verified';

          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `\`\`\`
🔧 LOCAL DEVELOPMENT MODE

User commands:
   /verify -> Start email verification process
   /verifycode <code> -> Complete verification with email code
   /vstatus -> This help message
   /vping -> Check bot response time

Admin commands:
   /enableonjoin -> Enables verifying users on join
   /disableonjoin -> Disables verifying users on join
   /domainadd domain -> Adds an email domain
   /domainremove domain -> Removes an email domain
   /rolechange role -> Changes the name of the verified role

Current Settings:
Domains: ${domains}
Verify when a user joins? ${onJoin}
Verified role: ${verifiedRole}
\`\`\``,
            },
          });

        case 'enableonjoin':
          await Guild.updateOne(
            { guildid: guildId },
            { onjoin: true },
            { upsert: true }
          );
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Verification on join has been enabled.',
            },
          });

        case 'disableonjoin':
          await Guild.updateOne(
            { guildid: guildId },
            { onjoin: false },
            { upsert: true }
          );
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Verification on join has been disabled.',
            },
          });

        case 'domainadd':
          const domainToAdd = options?.find(opt => opt.name === 'domain')?.value;
          if (!domainToAdd) {
            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'Please provide a domain to add.',
                flags: 64, // Ephemeral
              },
            });
          }
          await Guild.updateOne(
            { guildid: guildId },
            { $addToSet: { domains: domainToAdd } },
            { upsert: true }
          );
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Domain ${domainToAdd} has been added.`,
            },
          });

        case 'domainremove':
          const domainToRemove = options?.find(opt => opt.name === 'domain')?.value;
          if (!domainToRemove) {
            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'Please provide a domain to remove.',
                flags: 64, // Ephemeral
              },
            });
          }
          await Guild.updateOne(
            { guildid: guildId },
            { $pull: { domains: domainToRemove } }
          );
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Domain ${domainToRemove} has been removed.`,
            },
          });

        case 'rolechange':
          const newRole = options?.find(opt => opt.name === 'rolename')?.value;
          if (!newRole) {
            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: 'Please provide the name of the new verified role.',
                flags: 64, // Ephemeral
              },
            });
          }
          await Guild.updateOne(
            { guildid: guildId },
            { role: newRole },
            { upsert: true }
          );
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Verified role has been changed to ${newRole}.`,
            },
          });

        default:
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unknown command.',
              flags: 64, // Ephemeral
            },
          });
      }
    } catch (error) {
      console.error('Error handling command:', error);
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'An error occurred while processing your request.',
          flags: 64, // Ephemeral
        },
      });
    }
  }

  // Handle modal submissions
  if (type === InteractionType.MODAL_SUBMIT) {
    const { custom_id, components } = data;
    const userId = member?.user?.id || req.body.user?.id;
    const guildId = guild_id;

    if (custom_id === 'email_verification_modal') {
      const email = components[0].components[0].value;

      try {
        const guildData = await Guild.findOne({ guildid: guildId });
        if (!guildData || !guildData.domains.includes(email.split("@")[1])) {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'The provided email domain is not allowed.',
              flags: 64, // Ephemeral
            },
          });
        }

        // Check if user already has a pending verification
        await User.deleteMany({ userid: userId, guildid: guildId });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await User.create({
          userid: userId,
          guildid: guildId,
          email,
          code: verificationCode,
        });

        console.log(`Generated verification code for ${email}: ${verificationCode}`);

        const emailSent = await sendVerificationEmail(email, verificationCode);

        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `📧 A verification code has been sent to **${email}**.\n\nPlease check your email and use the command: \`/verifycode ${verificationCode}\` to complete verification.\n\n⏰ The code will expire in 10 minutes.\n\n${emailSent ? '✅ Email sent successfully!' : '❌ Email sending failed - check logs'}`,
            flags: 64, // Ephemeral
          },
        });
      } catch (error) {
        console.error('Error in email verification:', error);
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'An error occurred while sending the verification email.',
            flags: 64, // Ephemeral
          },
        });
      }
    }
  }

  return res.status(400).json({ error: 'Unknown interaction type' });
});

// Test email endpoint
app.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const testCode = '123456';
  const emailSent = await sendVerificationEmail(email, testCode);
  
  res.json({ 
    success: emailSent,
    message: emailSent ? 'Test email sent successfully!' : 'Failed to send test email',
    code: testCode
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📧 Discord webhook endpoint: http://localhost:${PORT}/api/discord`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📮 Test email: POST http://localhost:${PORT}/test-email`);
});

module.exports = app;
