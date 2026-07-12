require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
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
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const REGISTERED_RESTORE_VERSION = process.env.REGISTERED_DATA_RESTORE_VERSION || 'registered-data-restore-2026-07-12-v2';
const REGISTERED_RESTORE_MARKER = path.join(DATA_DIR, 'registered-data-restore-marker.json');

installVoidArenaDirectMessageRoutes({ client, storage });

let internalApiServer = null;
let scheduledBackupTimer = null;
let startupMaintenanceStarted = false;

function ensureInternalApiStarted() {
  if (internalApiServer) return internalApiServer;
  internalApiServer = startInternalApi({ client, port: INTERNAL_API_PORT });
  return internalApiServer;
}

function startScheduledBackups() {
  if (scheduledBackupTimer) return scheduledBackupTimer;
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
  scheduledBackupTimer = setInterval(() => run('scheduled-auto-backup'), intervalMs);
  scheduledBackupTimer.unref?.();
  console.log(`Backups automaticos agendados a cada ${minutes} min.`);
  return scheduledBackupTimer;
}

async function readRegisteredRestoreMarker() {
  try {
    const raw = await fs.readFile(REGISTERED_RESTORE_MARKER, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return null;
  }
}

async function writeRegisteredRestoreMarker(recovery = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = {
    version: REGISTERED_RESTORE_VERSION,
    ranAt: new Date().toISOString(),
    restored: Boolean(recovery?.restored),
    reason: recovery?.reason || recovery?.realState?.reason || 'registered_data_restore_checked',
    summary: recovery?.realState?.after || recovery?.realState?.current || null
  };
  await fs.writeFile(REGISTERED_RESTORE_MARKER, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

async function maybeRunRegisteredDataRestore() {
  if (String(process.env.REAL_STATE_RECOVERY_DISABLE || '').toLowerCase() === 'true') {
    return { success: true, skipped: true, reason: 'registered_restore_disabled' };
  }

  const manual = String(process.env.REAL_STATE_RECOVERY_ENABLE || '').toLowerCase() === 'true' && String(process.env.REAL_STATE_RECOVERY_CONFIRM || '').trim() === 'MERGE_BACKUP_HISTORY';
  const marker = await readRegisteredRestoreMarker();
  const shouldRun = manual || !marker || marker.version !== REGISTERED_RESTORE_VERSION;

  if (!shouldRun) {
    console.log(`Recuperacao de dados registrados pulada: ja executada (${marker.version}).`);
    return { success: true, skipped: true, reason: 'registered_restore_already_ran', marker };
  }

  const recovery = await recoverUsersAndTeamsFromBackup(storage);
  if (!recovery?.success) {
    console.error(`Recuperacao de dados registrados nao marcou concluida: ${recovery?.reason || 'falha'}. Proximo boot tenta novamente.`);
    return recovery;
  }

  if (recovery?.restored) {
    const state = recovery.realState || {};
    console.log(`Recuperacao de dados registrados: +${state.addedUsers || 0} jogador(es), +${state.addedTeams || 0} time(s), modificados ${state.modifiedUsers || 0}/${state.modifiedTeams || 0}.`);
  } else {
    console.log(`Recuperacao de dados registrados pulada: ${recovery?.reason || 'sem motivo'}.`);
  }

  await writeRegisteredRestoreMarker(recovery);
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

async function runStartupMaintenance() {
  if (startupMaintenanceStarted) return;
  startupMaintenanceStarted = true;

  try {
    const guard = await runDeployDatabaseGuard(storage);
    console.log('Deploy Guard do banco:', guard?.reason || 'ok');
  } catch (error) {
    console.error('Deploy Guard do banco falhou:', error.message);
  }

  try {
    await maybeRunRegisteredDataRestore();
  } catch (error) {
    console.error('Recuperacao de dados registrados falhou:', error.message);
  }
}

async function boot() {
  ensureInternalApiStarted();

  startDiscordBot(client).catch((error) => {
    console.error('Falha ao iniciar bot Discord:', error.message);
  });

  startScheduledBackups();
  startEventDmSync(client, storage);

  setTimeout(() => {
    runStartupMaintenance().catch((error) => console.error('Manutencao inicial falhou:', error.message));
  }, 0).unref?.();
}

boot();

process.on('unhandledRejection', (error) => console.error('Erro nao tratado no bot:', error));
process.on('uncaughtException', (error) => console.error('Excecao nao tratada:', error));