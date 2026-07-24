require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const { startEventDmSync } = require('./eventDmSync');
const { installVoidArenaDirectMessageRoutes } = require('./patch-voidarena-direct-messages');
const { installAutoMutationBackup } = require('./autoMutationBackup');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const { installTeamDeletionGuard } = require('../server/teamDeletionGuard');

installTeamDeletionGuard(storage);
installAutoMutationBackup(storage, githubBackups);

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

installVoidArenaDirectMessageRoutes({ client, storage });

let internalApiServer = null;
let scheduledBackupTimer = null;

function ensureInternalApiStarted() {
  if (internalApiServer) return internalApiServer;
  internalApiServer = startInternalApi({ client, port: INTERNAL_API_PORT });
  return internalApiServer;
}

function startScheduledBackups() {
  if (scheduledBackupTimer) return scheduledBackupTimer;
  const enabled = String(process.env.GITHUB_BACKUP_SCHEDULED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[Backup] Backups automáticos agendados desativados.');
    return null;
  }

  const minutes = Math.max(5, Number(process.env.GITHUB_BACKUP_INTERVAL_MINUTES || 15) || 15);
  const intervalMs = minutes * 60 * 1000;

  async function run(reason = 'scheduled-auto-backup') {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, { reason });
      if (manifest?.skipped) {
        console.log(`[Backup] Snapshot não publicado: ${manifest.reason || manifest.message || 'proteção contra regressão'}`);
      } else {
        console.log(`[Backup] Snapshot salvo: ${manifest.backupPath || manifest.savedAt || 'ok'}`);
      }
    } catch (error) {
      console.error('[Backup] Falha ao salvar snapshot:', error.message);
    }
  }

  // Não há backup imediato de boot. Um deploy de código nunca deve transformar
  // um estado recém-inicializado/incompleto na cópia principal dos dados.
  scheduledBackupTimer = setInterval(() => run('scheduled-auto-backup'), intervalMs);
  scheduledBackupTimer.unref?.();
  console.log(`[Backup] Agendado a cada ${minutes} min, com proteção contra regressão.`);
  return scheduledBackupTimer;
}

async function gracefulShutdown(signal) {
  console.log(`[BOT] ${signal} recebido. Encerrando sem importar, fundir ou reescrever registros.`);
  try {
    if (typeof storage.flushBackupAfterMutation === 'function') {
      await storage.flushBackupAfterMutation(`shutdown-${signal}`);
    }
  } catch (error) {
    console.error('[Backup] Falha ao concluir backup pendente no encerramento:', error.message);
  } finally {
    process.exit(0);
  }
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

async function boot() {
  ensureInternalApiStarted();

  const status = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));
  console.log('[Banco] Boot somente leitura; nenhuma restauração, merge ou remapeamento automático foi executado.', status);

  startDiscordBot(client).catch((error) => {
    console.error('Falha ao iniciar bot Discord:', error.message);
  });

  startScheduledBackups();
  startEventDmSync(client, storage);
}

boot().catch((error) => {
  console.error('Falha fatal ao iniciar o BOT:', error);
  process.exitCode = 1;
});

process.on('unhandledRejection', (error) => console.error('Erro não tratado no bot:', error));
process.on('uncaughtException', (error) => console.error('Exceção não tratada:', error));
