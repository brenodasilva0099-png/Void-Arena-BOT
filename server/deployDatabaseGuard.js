const githubBackups = require('./githubBackups');

const BASELINE_PATH = process.env.GITHUB_BACKUP_BASELINE_PATH || '';

function countData(status = {}) {
  return {
    users: Number(status.users || 0),
    teams: Number(status.teams || 0),
    events: Number(status.events || 0),
    messages: Number(status.messages || 0),
    messageArchives: Number(status.messageArchives || 0),
    teamChats: Number(status.teamChats || 0),
    trainingSubmissions: Number(status.trainingSubmissions || 0),
    playerApplications: Number(status.playerApplications || 0),
    bracketSlots: Number(status.bracketSlots || 0)
  };
}

function totalDataWeight(status = {}) {
  const count = countData(status);
  return Object.values(count).reduce((sum, value) => sum + value, 0);
}

function isEffectivelyEmpty(status = {}) {
  return totalDataWeight(status) === 0;
}

function bootBackupReason(options = {}) {
  if (options.reason) return String(options.reason);
  if (process.env.RENDER_GIT_COMMIT) return `boot-${process.env.RENDER_GIT_COMMIT}`;
  return 'boot-healthy-database';
}

async function restoreBestBackup(storage) {
  if (BASELINE_PATH) {
    return githubBackups.restoreBackupFromGitHubPath(storage, BASELINE_PATH);
  }

  return githubBackups.restoreLatestBackupFromGitHub(storage);
}

async function backupHealthyDatabase(storage, status, options = {}) {
  const autoBackup = String(process.env.GITHUB_BACKUP_AUTO_EXPORT || process.env.GITHUB_BACKUP_ON_BOOT || 'true').toLowerCase() !== 'false';
  if (!autoBackup) {
    return { success: true, skipped: true, reason: 'auto_export_disabled' };
  }

  return githubBackups.saveBackupToGitHub(storage, {
    reason: bootBackupReason(options)
  });
}

async function runDeployDatabaseGuard(storage, options = {}) {
  const enabled = String(process.env.GITHUB_BACKUP_AUTO_RESTORE || '').toLowerCase() === 'true';

  if (!enabled) {
    return { success: true, skipped: true, reason: 'auto_restore_disabled' };
  }

  let status;
  try {
    status = await storage.readDatabaseStatus();
  } catch (error) {
    const fixed = await restoreBestBackup(storage);
    return {
      success: true,
      restored: true,
      reason: 'database_inaccessible_restored_latest',
      error: error.message,
      restoredData: fixed
    };
  }

  if (status?.error) {
    const fixed = await restoreBestBackup(storage);
    return {
      success: true,
      restored: true,
      reason: 'database_corrupted_restored_latest',
      status,
      restoredData: fixed
    };
  }

  const backup = await backupHealthyDatabase(storage, status, options).catch((error) => ({
    success: false,
    skipped: true,
    reason: 'healthy_backup_failed',
    message: error.message
  }));

  return {
    success: true,
    restored: false,
    skipped: true,
    reason: isEffectivelyEmpty(status)
      ? 'database_readable_and_intentionally_empty_preserved'
      : 'database_healthy',
    status,
    bootBackup: backup,
    note: 'Banco legivel preservado como fonte de verdade. Backup antigo nao substitui exclusoes validas.'
  };
}

module.exports = { runDeployDatabaseGuard, isEffectivelyEmpty, totalDataWeight };
