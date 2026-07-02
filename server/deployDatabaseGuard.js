const githubBackups = require('./githubBackups');

function isEffectivelyEmpty(status = {}) {
  return (
    Number(status.users || 0) === 0 &&
    Number(status.teams || 0) === 0 &&
    Number(status.messages || 0) === 0 &&
    Number(status.teamChats || 0) === 0 &&
    Number(status.bracketSlots || 0) === 0
  );
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
    console.warn('Banco inacessível no boot. Tentando restaurar latest backup:', error.message);
    const restored = await githubBackups.restoreLatestBackupFromGitHub(storage);
    return { success: true, restored: true, reason: 'database_inaccessible', restored };
  }

  if (status?.error || isEffectivelyEmpty(status)) {
    console.warn('Banco vazio/corrompido no boot. Tentando restaurar latest backup.', status);
    const restored = await githubBackups.restoreLatestBackupFromGitHub(storage);
    return { success: true, restored: true, reason: 'database_empty_or_corrupted', restored };
  }

  return {
    success: true,
    restored: false,
    skipped: true,
    reason: 'database_healthy',
    status,
    note: 'Banco saudável: nenhum restore executado.'
  };
}

module.exports = { runDeployDatabaseGuard, isEffectivelyEmpty };
