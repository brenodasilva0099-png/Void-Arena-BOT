const githubBackups = require('./githubBackups');

const BASELINE_PATH = process.env.GITHUB_BACKUP_BASELINE_PATH || '';
const REGRESSION_KEYS = [
  'users',
  'teams',
  'events',
  'playerApplications',
  'trainingSubmissions',
  'eventRegistrationRequests',
  'teamChats'
];

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
    eventRegistrationRequests: Number(status.eventRegistrationRequests || 0),
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

function summaryValue(summary = {}, key = '') {
  return Number(summary?.[key] || 0) || 0;
}

function regressionDetails(status = {}, latestSummary = {}) {
  return REGRESSION_KEYS
    .map((key) => ({ key, current: summaryValue(status, key), latest: summaryValue(latestSummary, key) }))
    .filter((item) => item.latest > item.current);
}

function shouldRestoreLiveLatest(status = {}, latestSummary = {}) {
  if (String(process.env.GITHUB_BACKUP_RESTORE_LIVE_ON_REGRESSION || 'true').toLowerCase() === 'false') return false;
  if (!latestSummary || typeof latestSummary !== 'object') return false;
  const regressions = regressionDetails(status, latestSummary);
  if (!regressions.length) return false;

  const currentWeight = REGRESSION_KEYS.reduce((sum, key) => sum + summaryValue(status, key), 0);
  const latestWeight = REGRESSION_KEYS.reduce((sum, key) => sum + summaryValue(latestSummary, key), 0);
  if (!latestWeight || currentWeight >= latestWeight) return false;

  // Quando Render sobe sem disco persistente ou com seed fraco, o banco vem menor.
  // Nessa situação, latest do GitHub é a cópia viva que deve voltar.
  if (status.persistent === false) return true;
  if (isEffectivelyEmpty(status)) return true;
  return regressions.some((item) => ['users', 'teams', 'playerApplications', 'events'].includes(item.key));
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
  const allowRestore = String(process.env.GITHUB_BACKUP_AUTO_RESTORE || process.env.GITHUB_BACKUP_RESTORE_LIVE_ON_REGRESSION || 'true').toLowerCase() !== 'false';

  let status;
  try {
    status = await storage.readDatabaseStatus();
  } catch (error) {
    if (!allowRestore) {
      return { success: false, skipped: true, reason: 'database_inaccessible_restore_disabled', error: error.message };
    }
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
    if (!allowRestore) {
      return { success: false, skipped: true, reason: 'database_corrupted_restore_disabled', status };
    }
    const fixed = await restoreBestBackup(storage);
    return {
      success: true,
      restored: true,
      reason: 'database_corrupted_restored_latest',
      status,
      restoredData: fixed
    };
  }

  const latest = await githubBackups.fetchLatestBackupFromGitHub().catch(() => null);
  const regressions = latest?.summary ? regressionDetails(status, latest.summary) : [];

  if (allowRestore && shouldRestoreLiveLatest(status, latest?.summary || {})) {
    const fixed = await restoreBestBackup(storage);
    return {
      success: true,
      restored: true,
      reason: 'database_regressed_on_boot_restored_live_latest',
      statusBefore: status,
      latestSummary: latest?.summary || null,
      regressions,
      restoredData: fixed,
      note: 'Banco do deploy veio menor que o latest vivo. Latest restaurado antes de qualquer backup de boot.'
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
    latestSummary: latest?.summary || null,
    regressions,
    bootBackup: backup,
    note: 'Banco legivel preservado como fonte de verdade. Backup de boot regressivo nao substitui latest.'
  };
}

module.exports = { runDeployDatabaseGuard, isEffectivelyEmpty, totalDataWeight, regressionDetails, shouldRestoreLiveLatest };