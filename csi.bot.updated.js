const { Client, GatewayIntentBits } = require("discord.js");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const express = require("express");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

const UserSchema = new mongoose.Schema({
  userid: String,
  guildid: String,
  email: String,
  code: String,
  verified: { type: Boolean, default: false },
});

const GuildSchema = new mongoose.Schema({
  guildid: String,
  domains: [String],
  onjoin: { type: Boolean, default: false },
  role: { type: String, default: "Verified" },
});

const User = mongoose.model("User", UserSchema);
const Guild = mongoose.model("Guild", GuildSchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

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
  } catch (err) {
    console.error("Error sending verification email:", err);
  }
};

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const [command, ...args] = message.content.split(" ");

  switch (command) {
    case ".verify":
      try {
        const emailPrompt = await message.author.send(
          "Please provide your email address for verification."
        );
        const filter = (response) => response.author.id === message.author.id;
        const collected = await emailPrompt.channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const email = collected.first().content;

        const guildData = await Guild.findOne({ guildid: message.guild.id });
        if (!guildData || !guildData.domains.includes(email.split("@")[1])) {
          return message.author.send(
            "The provided email domain is not allowed."
          );
        }

        const verificationCode = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        await User.create({
          userid: message.author.id,
          guildid: message.guild.id,
          email,
          code: verificationCode,
        });

        await sendVerificationEmail(email, verificationCode);
        message.author.send(
          "A verification code has been sent to your email. Please reply with the code to complete verification."
        );

        const codeCollected = await emailPrompt.channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
        });
        const userCode = codeCollected.first().content;

        const verificationRecord = await User.findOne({
          userid: message.author.id,
          guildid: message.guild.id,
          code: userCode,
        });
        if (verificationRecord) {
          verificationRecord.verified = true;
          await verificationRecord.save();

          const verifiedRole = message.guild.roles.cache.find(
            (role) => role.name === guildData.role
          );
          if (verifiedRole) {
            const guildMember = message.guild.members.cache.get(
              message.author.id
            );
            await guildMember.roles.add(verifiedRole);
          }
          message.author.send("Your email has been successfully verified!");
        } else {
          message.author.send(
            "The verification code is incorrect or has expired. Please try again."
          );
        }
      } catch (err) {
        console.error(err);
        message.reply(
          "I could not send you a DM. Please check your privacy settings."
        );
      }
      break;

    case ".enableonjoin":
      await Guild.updateOne(
        { guildid: message.guild.id },
        { onjoin: true },
        { upsert: true }
      );
      message.reply("Verification on join has been enabled.");
      break;

    case ".disableonjoin":
      await Guild.updateOne(
        { guildid: message.guild.id },
        { onjoin: false },
        { upsert: true }
      );
      message.reply("Verification on join has been disabled.");
      break;

    case ".domainadd":
      if (!args[0]) return message.reply("Please provide a domain to add.");
      await Guild.updateOne(
        { guildid: message.guild.id },
        { $addToSet: { domains: args[0] } },
        { upsert: true }
      );
      message.reply(`Domain ${args[0]} has been added.`);
      break;

    case ".domainremove":
      if (!args[0]) return message.reply("Please provide a domain to remove.");
      await Guild.updateOne(
        { guildid: message.guild.id },
        { $pull: { domains: args[0] } }
      );
      message.reply(`Domain ${args[0]} has been removed.`);
      break;

    case ".rolechange":
      if (!args[0])
        return message.reply(
          "Please provide the name of the new verified role."
        );
      await Guild.updateOne(
        { guildid: message.guild.id },
        { role: args[0] },
        { upsert: true }
      );
      message.reply(`Verified role has been changed to ${args[0]}.`);
      break;
    case ".vstatus":
      await message.channel.send(
        "```" +
          `Ping: ${Math.round(client.ws.ping)}ms\n` +
          "User commands:\n" +
          "   .verify -> Sends a DM to the user to verify their email\n" +
          "   .vstatus -> This help message\n\n" +
          "Admin commands:\n" +
          " - A domain must be added before users can be verified.\n" +
          " - Use .rolechange instead of server settings to change the name of the verified role.\n" +
          "   .enableonjoin -> Enables verifying users on join\n" +
          "   .disableonjoin -> Disables verifying users on join\n" +
          "   .domainadd domain -> Adds an email domain\n" +
          "   .domainremove domain -> Removes an email domain\n" +
          "   .rolechange role -> Changes the name of the verified role\n\n" +
          `Domains: ${args[0]}\n` +
          `Verify when a user joins? (default=False): \n` +
          `Verified role (default=Verified): \`\`\``
      );

      break;
  }
});

client.on("guildMemberAdd", async (member) => {
  const guildData = await Guild.findOne({ guildid: member.guild.id });
  if (guildData?.onjoin) {
    try {
      await member.send(
        "Welcome! Please verify your email address by using the `.verify` command."
      );
    } catch (err) {
      console.error(`Could not send DM to ${member.user.tag}`);
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(".vping")) {
    await message.channel.send(`${Math.round(client.ws.ping)}ms`);
  }
});

client.login(process.env.DISCORD_TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

module.exports = app; 
