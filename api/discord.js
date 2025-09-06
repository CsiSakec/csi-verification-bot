const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

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
const transporter = nodemailer.createTransporter({
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
  } catch (err) {
    console.error("Error sending verification email:", err);
  }
};

// Verify Discord signature middleware
const verifyDiscordRequest = verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY);

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Received request:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  try {
    // Use the verifyKeyMiddleware
    return verifyDiscordRequest(req, res, async () => {
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

      try {
        switch (name) {
          case 'vping':
            return res.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `🏓 Pong! Response time: ~50ms`,
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

              // Get guild data for role name
              const guildData = await Guild.findOne({ guildid: guildId });
              const roleName = guildData?.role || 'Verified';

              // Add role using Discord API
              try {
                const fetch = require('node-fetch');
                
                // Get all roles in the guild to find the verified role ID
                const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                  headers: {
                    'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                  },
                });

                if (guildResponse.ok) {
                  const roles = await guildResponse.json();
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
                      return res.json({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                          content: '✅ Your email has been successfully verified! You have been given the verified role.',
                          flags: 64, // Ephemeral
                        },
                      });
                    }
                  }
                }

                // If role addition failed, still mark as verified
                return res.json({
                  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                  data: {
                    content: '✅ Your email has been successfully verified! Please contact an admin if you don\'t receive the verified role.',
                    flags: 64, // Ephemeral
                  },
                });

              } catch (roleError) {
                console.error('Error adding role:', roleError);
                return res.json({
                  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                  data: {
                    content: '✅ Your email has been successfully verified! Please contact an admin if you don\'t receive the verified role.',
                    flags: 64, // Ephemeral
                  },
                });
              }

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
User commands:
   /verify -> Start email verification process
   /verifycode <code> -> Complete verification with email code
   /vstatus -> This help message
   /vping -> Check bot response time

Admin commands:
 - A domain must be added before users can be verified.
 - Use /rolechange instead of server settings to change the name of the verified role.
   /enableonjoin -> Enables verifying users on join
   /disableonjoin -> Disables verifying users on join
   /domainadd domain -> Adds an email domain
   /domainremove domain -> Removes an email domain
   /rolechange role -> Changes the name of the verified role

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

          await sendVerificationEmail(email, verificationCode);

          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📧 A verification code has been sent to **${email}**.\n\nPlease check your email and use the command: \`/verifycode <your-6-digit-code>\` to complete verification.\n\n⏰ The code will expire in 10 minutes.`,
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
  } catch (error) {
    console.error('Error in Discord handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
