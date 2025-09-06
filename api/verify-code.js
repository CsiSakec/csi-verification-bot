const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');
const mongoose = require('mongoose');
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

// Verify Discord signature middleware
const verifyDiscordRequest = verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY);

export default async function handler(req, res) {
  await verifyDiscordRequest(req, res, async () => {
    const { type, data, member, guild_id } = req.body;

    if (type === InteractionType.PING) {
      return res.json({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = data;
      const userId = member?.user?.id || req.body.user?.id;
      const guildId = guild_id;

      if (name === 'verifycode') {
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
            const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles`, {
              method: 'GET',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
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
      }
    }

    return res.status(400).json({ error: 'Unknown interaction type' });
  });
}
