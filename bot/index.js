require('dotenv').config();

if (!process.env.GITHUB_BACKUP_REPO) {
  process.env.GITHUB_BACKUP_REPO = 'brenodasilva0099-png/Void-Arena-BACKUPS';
}
if (!process.env.GITHUB_BACKUP_AUTO_RESTORE) {
  process.env.GITHUB_BACKUP_AUTO_RESTORE = 'true';
}
if (!process.env.GITHUB_BACKUP_RESTORE_LIVE_ON_REGRESSION) {
  process.env.GITHUB_BACKUP_RESTORE_LIVE_ON_REGRESSION = 'true';
}

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
const REGISTERED_RESTORE_VERSION = process.env.REGISTERED_DATA_RESTORE_VERSION || 'registered-data-restore-2026-07-24-v4';
const REGISTERED_RESTORE_MARKER = path.join(DATA_DIR, 'registered-data-restore-marker.json');
const RECOVERY_EXPECTED_USERS = Math.max(1, Number(process.env.RECOVERY_EXPECTED_USERS || 11) || 11);
const RECOVERY_EXPECTED_TEAMS = Math.max(1, Number(process.env.RECOVERY_EXPECTED_TEAMS || 3) || 3);

installVoidArenaDirectMessageRoutes({ client, storage });

let internalApiServer = null;
let scheduledBackupTimer = null;
let startupMaintenanceStarted = false;
let startupMaintenancePromise = null;

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

function recoveryCounts(status = {}) {
  return {
    users: Number(status?.users || 0),
    teams: Number(status?.teams || 0)
  };
}

function meetsRecoveryBaseline(status = {}) {
  const counts = recoveryCounts(status);
  return counts.users >= RECOVERY_EXPECTED_USERS && counts.teams >= RECOVERY_EXPECTED_TEAMS;
}

async function writeRegisteredRestoreMarker(recovery = {}, status = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = {
    version: REGISTERED_RESTORE_VERSION,
    completed: true,
    ranAt: new Date().toISOString(),
    restored: Boolean(recovery?.restored),
    reason: recovery?.reason || recovery?.realState?.reason || 'registered_data_restore_checked',
    expected: {
      users: RECOVERY_EXPECTED_USERS,
      teams: RECOVERY_EXPECTED_TEAMS
    },
    summary: recoveryCounts(status)
  };
  await fs.writeFile(REGISTERED_RESTORE_MARKER, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

async function maybeRunRegisteredDataRestore(options = {}) {
  if (String(process.env.REAL_STATE_RECOVERY_DISABLE || '').toLowerCase() === 'true') {
    return { success: true, skipped: true, reason: 'registered_restore_disabled' };
  }

  const force = Boolean(options.force);
  const manual = String(process.env.REAL_STATE_RECOVERY_ENABLE || '').toLowerCase() === 'true' && String(process.env.REAL_STATE_RECOVERY_CONFIRM || '').trim() === 'MERGE_BACKUP_HISTORY';
  const marker = await readRegisteredRestoreMarker();
  const statusBefore = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));
  const markerCompleted = Boolean(marker?.completed && marker.version === REGISTERED_RESTORE_VERSION);
  const belowBaseline = !statusBefore?.error && !meetsRecoveryBaseline(statusBefore);
  const shouldRun = manual || !markerCompleted || (force && belowBaseline);

  if (!shouldRun) {
    console.log(`Recuperacao de dados registrados pulada: concluida (${marker.version}) com ${marker.summary?.users || 0} jogador(es) e ${marker.summary?.teams || 0} time(s).`);
    return { success: true, skipped: true, reason: 'registered_restore_already_completed', marker, status: statusBefore };
  }

  const backupConfig = githubBackups.getConfig();
  console.log('[Banco/Recovery] Preparando recuperacao.', {
    version: REGISTERED_RESTORE_VERSION,
    force,
    markerCompleted,
    before: recoveryCounts(statusBefore),
    expected: { users: RECOVERY_EXPECTED_USERS, teams: RECOVERY_EXPECTED_TEAMS },
    backupRepo: backupConfig.repo || null,
    backupTokenConfigured: Boolean(backupConfig.token)
  });

  if (!backupConfig.token) {
    const result = {
      success: false,
      skipped: true,
      retryRequired: true,
      reason: 'github_backup_token_missing',
      message: 'GITHUB_BACKUP_TOKEN/GITHUB_TOKEN não está configurado no serviço do BOT. O marcador não será salvo e o próximo boot tentará novamente.',
      before: recoveryCounts(statusBefore)
    };
    console.error('[Banco/Recovery]', result.message);
    return result;
  }

  const recovery = await recoverUsersAndTeamsFromBackup(storage);
  const statusAfter = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));
  const baselineRecovered = !statusAfter?.error && meetsRecoveryBaseline(statusAfter);

  if (!recovery?.success || !baselineRecovered) {
    const result = {
      ...recovery,
      success: false,
      retryRequired: true,
      reason: recovery?.reason || 'registered_restore_incomplete',
      before: recoveryCounts(statusBefore),
      after: recoveryCounts(statusAfter),
      expected: { users: RECOVERY_EXPECTED_USERS, teams: RECOVERY_EXPECTED_TEAMS },
      message: recovery?.message || 'O backup não repôs ainda todos os jogadores e times esperados. O marcador não será salvo e uma nova tentativa será feita.'
    };
    console.error('[Banco/Recovery] Recuperacao incompleta:', result);
    return result;
  }

  if (recovery?.restored) {
    const state = recovery.realState || {};
    console.log(`Recuperacao de dados registrados: +${state.addedUsers || 0} jogador(es), +${state.addedTeams || 0} time(s), modificados ${state.modifiedUsers || 0}/${state.modifiedTeams || 0}.`);
  } else {
    console.log(`Recuperacao de dados registrados validada: ${recovery?.reason || 'dados ja presentes'}.`);
  }

  const markerSaved = await writeRegisteredRestoreMarker(recovery, statusAfter);
  console.log('[Banco/Recovery] Baseline recuperada e confirmada:', markerSaved.summary);
  return { ...recovery, success: true, statusBefore, statusAfter, marker: markerSaved };
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

async function runStartupMaintenance(options = {}) {
  const force = Boolean(options.force);
  if (startupMaintenancePromise) return startupMaintenancePromise;
  if (startupMaintenanceStarted && !force) return null;
  startupMaintenanceStarted = true;

  startupMaintenancePromise = (async () => {
    let guard = null;
    try {
      guard = await runDeployDatabaseGuard(storage);
      console.log('Deploy Guard do banco:', guard?.reason || 'ok');
      if (guard?.restored) {
        console.log('[Banco] Backup vivo restaurado antes de conectar o BOT ao Discord.');
      }
    } catch (error) {
      console.error('Deploy Guard do banco falhou:', error.message);
    }

    let registeredRecovery = null;
    try {
      registeredRecovery = await maybeRunRegisteredDataRestore({ force });
    } catch (error) {
      registeredRecovery = { success: false, retryRequired: true, reason: 'registered_restore_threw', message: error.message };
      console.error('Recuperacao de dados registrados falhou:', error.message);
    }

    const status = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));
    console.log('[Banco] Estado apos manutencao:', status);
    return { guard, registeredRecovery, status };
  })();

  try {
    return await startupMaintenancePromise;
  } finally {
    startupMaintenancePromise = null;
  }
}

async function boot() {
  ensureInternalApiStarted();

  // O banco é verificado/restaurado antes do login no Discord para impedir
  // que um deploy vazio publique mensagens, painéis ou dados incompletos.
  await runStartupMaintenance();

  startDiscordBot(client).catch((error) => {
    console.error('Falha ao iniciar bot Discord:', error.message);
  });

  startScheduledBackups();
  startEventDmSync(client, storage);

  // Segunda verificação contra falha transitória do GitHub no primeiro boot.
  setTimeout(() => {
    runStartupMaintenance({ force: true }).catch((error) => console.error('Segunda verificacao do banco falhou:', error.message));
  }, 30000).unref?.();
}

boot().catch((error) => {
  console.error('Falha fatal ao iniciar o BOT:', error);
  process.exitCode = 1;
});

process.on('unhandledRejection', (error) => console.error('Erro nao tratado no bot:', error));
process.on('uncaughtException', (error) => console.error('Excecao nao tratada:', error));
