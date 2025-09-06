# CSI Discord BOT

CSI-Discord BOT is a powerful and flexible bot built using Node.js and MongoDB. It is designed to enhance your Discord server with various features and functionalities.

## Features

- **Moderation Tools**: Manage your server with ease using advanced moderation commands.
- **Custom Commands**: Create and manage custom commands for your server.
- **User Management**: Track and manage user activities and roles.
- **Database Integration**: Store and retrieve data using MongoDB.

## Installation

1. Clone the repository:

   ```bash
   git clone https: git@github.com:SudarshanProCoder/CSI-BOT.git
   cd CSI-BOT
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Discord bot token and MongoDB connection string.

   ```env
   DISCORD_TOKEN=your_discord_token
   MONGODB_URI=your_mongodb_connection_string
   MAILGUN_API_KEY=your_api_key
   SENDGRID_API_KEY=your_api_key
   MAILGUN_DOMAIN=your_domain
   EMAIL_USER=your_username
   ```

4. Start the bot:
   ```bash
   npm start
   ```

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
