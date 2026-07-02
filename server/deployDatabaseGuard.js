const githubBackups = require('./githubBackups');

const BASELINE_PATH = process.env.GITHUB_BACKUP_BASELINE_PATH || 'backups/2026-07/void-arena-backup-2026-07-02T02-35-01-258Z.json';

function isEffectivelyEmpty(status = {}) {
  return (
    Number(status.users || 0) === 0 &&
    Number(status.teams || 0) === 0 &&
    Number(status.messages || 0) === 0 &&
    Number(status.teamChats || 0) === 0 &&
    Number(status.bracketSlots || 0) === 0
  );
}

async function useBaseline(storage) {
  return githubBackups.restoreBackupFromGitHubPath(storage, BASELINE_PATH);
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
    const fixed = await useBaseline(storage);
    return { success: true, restored: true, reason: 'database_inaccessible', restored: fixed };
  }

  if (status?.error || isEffectivelyEmpty(status)) {
    const fixed = await useBaseline(storage);
    return { success: true, restored: true, reason: 'database_empty_or_corrupted', restored: fixed };
  }

  return {
    success: true,
    restored: false,
    skipped: true,
    reason: 'database_healthy',
    status,
    note: 'Banco saudavel: nenhum ajuste executado.'
  };
}

module.exports = { runDeployDatabaseGuard, isEffectivelyEmpty };
