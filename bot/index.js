require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const storage = require('../server/storage');
const { runDeployDatabaseGuard } = require('../server/deployDatabaseGuard');

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

async function boot() {
  try {
    const guard = await runDeployDatabaseGuard(storage);
    console.log('Deploy Guard do banco:', guard?.reason || 'ok');
  } catch (error) {
    console.error('Deploy Guard do banco falhou:', error.message);
  }

  startInternalApi({ client, port: INTERNAL_API_PORT });
  startDiscordBot(client);
}

boot();

process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado no bot:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exceção não tratada:', error);
});
