require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const { startEventDmSync } = require('./eventDmSync');
const { installVoidArenaDirectMessageRoutes } = require('./patch-voidarena-direct-messages');
const { installAutoMutationBackup } = require('./autoMutationBackup');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const { runDeployDatabaseGuard } = require('../server/deployDatabaseGuard');
const { installTeamDeletionGuard } = require('../server/teamDeletionGuard');
const { recoverUsersAndTeamsFromBackup } = require('../server/usersTeamsBackupRecovery');

installTeamDeletionGuard(storage);
installAutoMutationBackup(storage, githubBackups);

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

installVoidArenaDirectMessageRoutes({ client, storage });

function startScheduledBackups() {
  const enabled = String(process.env.GITHUB_BACKUP_SCHEDULED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Backups automaticos agendados: desativados.');
    return null;
  }

  const minutes = Math.max(5, Number(process.env.GITHUB_BACKUP_INTERVAL_MINUTES || 15) || 15);
  const intervalMs = minutes * 60 * 1000;

  async function run(reason = 'scheduled-auto-backup') {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, { reason });
      if (manifest?.skipped) console.log(`Backup automatico pulado: ${manifest.reason || manifest.message || 'sem motivo'}`);
      else console.log(`Backup automatico salvo: ${manifest.backupPath || manifest.savedAt || 'ok'}`);
    } catch (error) {
      console.error('Backup automatico falhou:', error.message);
    }
  }

  setTimeout(() => run('post-boot-auto-backup'), 90 * 1000).unref?.();
  const timer = setInterval(() => run('scheduled-auto-backup'), intervalMs);
  timer.unref?.();
  console.log(`Backups automaticos agendados a cada ${minutes} min.`);
  return timer;
}

async function maybeRunHistoricalRecovery() {
  const enabled = String(process.env.REAL_STATE_RECOVERY_ENABLE || '').toLowerCase() === 'true';
  const confirm = String(process.env.REAL_STATE_RECOVERY_CONFIRM || '').trim();

  if (!enabled || confirm !== 'MERGE_BACKUP_HISTORY') {
    console.log('Recuperacao historica pulada: fluxo normal preserva apenas banco atual + latest vivo.');
    return { success: true, skipped: true, reason: 'historical_recovery_disabled' };
  }

  const recovery = await recoverUsersAndTeamsFromBackup(storage);
  if (recovery?.restored) console.log(`Recuperacao historica: dados adicionados ao banco atual.`);
  else console.log(`Recuperacao historica pulada: ${recovery?.reason || 'sem motivo'}.`);
  return recovery;
}

async function gracefulShutdown(signal) {
  console.log(`[Backup] ${signal} recebido. Salvando snapshot atual antes de encerrar...`);
  try {
    if (typeof storage.flushBackupAfterMutation === 'function') {
      await storage.flushBackupAfterMutation(`shutdown-${signal}`);
    } else {
      await githubBackups.saveBackupToGitHub(storage, { reason: `shutdown-${signal}` });
    }
  } catch (error) {
    console.error(`[Backup] Falha ao salvar snapshot no ${signal}:`, error.message);
  } finally {
    process.exit(0);
  }
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

async function boot() {
  try {
    const guard = await runDeployDatabaseGuard(storage);
    console.log('Deploy Guard do banco:', guard?.reason || 'ok');
  } catch (error) {
    console.error('Deploy Guard do banco falhou:', error.message);
  }

  try {
    await maybeRunHistoricalRecovery();
  } catch (error) {
    console.error('Recuperacao historica falhou:', error.message);
  }

  startInternalApi({ client, port: INTERNAL_API_PORT });
  startDiscordBot(client);
  startScheduledBackups();
  startEventDmSync(client, storage);
}

boot();

process.on('unhandledRejection', (error) => console.error('Erro nao tratado no bot:', error));
process.on('uncaughtException', (error) => console.error('Excecao nao tratada:', error));