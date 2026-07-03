require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const { runDeployDatabaseGuard } = require('../server/deployDatabaseGuard');

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

function startScheduledBackups() {
  const enabled = String(process.env.GITHUB_BACKUP_SCHEDULED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Backups automáticos agendados: desativados.');
    return null;
  }

  const minutes = Math.max(5, Number(process.env.GITHUB_BACKUP_INTERVAL_MINUTES || 15) || 15);
  const intervalMs = minutes * 60 * 1000;

  async function run(reason = 'scheduled-auto-backup') {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, { reason });
      if (manifest?.skipped) {
        console.log(`Backup automático pulado: ${manifest.reason || manifest.message || 'sem motivo'}`);
      } else {
        console.log(`Backup automático salvo: ${manifest.backupPath || manifest.savedAt || 'ok'}`);
      }
    } catch (error) {
      console.error('Backup automático falhou:', error.message);
    }
  }

  setTimeout(() => run('post-boot-auto-backup'), 90 * 1000).unref?.();
  const timer = setInterval(() => run('scheduled-auto-backup'), intervalMs);
  timer.unref?.();

  console.log(`Backups automáticos agendados a cada ${minutes} min.`);
  return timer;
}

async function boot() {
  try {
    const guard = await runDeployDatabaseGuard(storage);
    console.log('Deploy Guard do banco:', guard?.reason || 'ok');
  } catch (error) {
    console.error('Deploy Guard do banco falhou:', error.message);
  }

  startInternalApi({ client, port: INTERNAL_API_PORT });
  startDiscordBot(client);
  startScheduledBackups();
}

boot();

process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado no bot:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exceção não tratada:', error);
});
