require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

async function boot() {
  try {
    const restore = await githubBackups.autoRestoreLatestBackup(storage);
    if (restore?.restoredFromGithub) {
      console.log('✅ Banco restaurado automaticamente do GitHub Backup:', restore.result?.summary || restore);
    } else if (restore?.skipped) {
      console.log('ℹ️ Auto-restore GitHub Backup ignorado:', restore.reason);
    }
  } catch (error) {
    console.error('⚠️ Auto-restore GitHub Backup falhou:', error.message);
  }

  startInternalApi({ client, port: INTERNAL_API_PORT });
  startDiscordBot(client);
}

boot();

process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado no bot:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não tratada:', error);
});
