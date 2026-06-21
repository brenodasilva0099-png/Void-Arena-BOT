require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

startInternalApi({ client, port: INTERNAL_API_PORT });
startDiscordBot(client);

process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado no bot:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não tratada no bot:', error);
});
