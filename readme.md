# Discord Email Verification Bot

A powerful Discord bot for email verification with role assignment. Built with Node.js, MongoDB, and designed for serverless deployment on Vercel.

## Features

- **Email Verification**: Users verify their email addresses to get server roles
- **Domain Restrictions**: Admins can restrict verification to specific email domains
- **Automatic Role Assignment**: Verified users automatically receive designated roles  
- **Admin Controls**: Comprehensive admin commands for server management
- **Serverless Architecture**: Runs efficiently on Vercel with webhook-only approach
- **Database Integration**: MongoDB for persistent data storage

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/verification-bot-endpoint.git
cd verification-bot-endpoint
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Required environment variables:
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_PUBLIC_KEY` - Your Discord bot public key  
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `MONGO_URI` - MongoDB connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

### 3. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the token, public key, and client ID to your `.env` file
4. Set the interactions endpoint URL to: `https://your-vercel-app.vercel.app/api/discord`

### 4. Register Commands

```bash
npm run register-commands
```

### 5. Deploy

**For Vercel deployment:**
```bash
npm install -g vercel
vercel --prod
```

**For local development:**
```bash
npm run dev
```

## Usage

### User Commands

- `/verify` - Start the email verification process
- `/verifycode <code>` - Complete verification with the 6-digit code from email
- `/vping` - Check bot response time
- `/vstatus` - Show bot status and server settings
- `/help` - Display help information

### Admin Commands (Require Administrator permission)

- `/enableonjoin` - Enable verification prompt when users join
- `/disableonjoin` - Disable verification on join
- `/domainadd <domain>` - Add allowed email domain (e.g., `gmail.com`)
- `/domainremove <domain>` - Remove allowed email domain
- `/rolechange <rolename>` - Change the name of the verified role

## Email Configuration

### Gmail Setup
1. Enable 2-factor authentication on your Google account
2. Generate an "App Password" in Google Account settings
3. Use the app password in `SMTP_PASS` (not your regular password)

### Other Providers
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Check with your email provider

## How It Works

1. User runs `/verify` in a server channel
2. Bot shows a modal to collect email address
3. Bot validates email domain (if restrictions are set)
4. Bot sends 6-digit verification code to email
5. User runs `/verifycode <code>` to complete verification
6. Bot assigns the verified role automatically

## Architecture

- **Frontend**: Discord slash commands and modals
- **Backend**: Vercel serverless functions
- **Database**: MongoDB for user data and guild settings
- **Email**: SMTP for sending verification codes
- **Authentication**: Discord interaction verification

## Usage

Invite the bot to your Discord server using the invite link and use the following commands to interact with it:

- `.vstatus` - Display the help menu with all available commands.
- `.vping` - check the bot ping.

```bash
.vstatus
```

```bash
Ping: 293ms
User commands:
   .verify -> Sends a DM to the user to verify their email
   .vstatus -> This help message

Admin commands:
 A domain must be added before users can be verified.
 Use .rolechange instead of server settings to change the name of the verified role.
   .enableonjoin -> Enables verifying users on join
   .disableonjoin -> Disables verifying users on join
   .domainadd domain -> Adds an email domain
   .domainremove domain -> Removes an email domain
   .rolechange role -> Changes the name of the verified role

Domains: undefined
Verify when a user joins? (default=False):
Verified role (default=Verified):
```
## Email 

<img src="https://github.com/user-attachments/assets/6a76a1bf-83e8-4f8e-859e-f523e7a0a5de" data-canonical 
src="https://gyazo.com/eb5c5741b6a9a16c692170a41a49c858.png"  />
