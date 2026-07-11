const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const DEFAULT_RECOVERY_BACKUP_PATH = 'backups/2026-07/void-arena-backup-2026-07-10T21-13-15-122Z.json';

function parseBackupDatabase(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup.database) {
    const buffer = Buffer.from(String(backup.database || ''), 'base64');
    return JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
  }

  if (backup?.database && typeof backup.database === 'object') return backup.database;
  if (Array.isArray(backup?.users) || Array.isArray(backup?.teams)) return backup;
  return null;
}

function byId(items = []) {
  return new Map((Array.isArray(items) ? items : [])
    .map((item) => [String(item?.id || item?.discordId || '').trim(), item])
    .filter(([id]) => id));
}

function mergeUser(backupUser = {}, currentUser = null) {
  if (!currentUser) return backupUser;
  return {
    ...backupUser,
    ...currentUser,
    profile: {
      ...(backupUser.profile || {}),
      ...(currentUser.profile || {})
    },
    socials: {
      ...(backupUser.socials || {}),
      ...(currentUser.socials || {})
    },
    updatedAt: currentUser.updatedAt || backupUser.updatedAt || new Date().toISOString()
  };
}

async function recoverUsersAndTeamsFromBackup(storage, options = {}) {
  const enabled = String(process.env.USERS_TEAMS_BACKUP_RECOVERY || 'true').toLowerCase() !== 'false';
  if (!enabled) return { success: true, skipped: true, reason: 'users_teams_recovery_disabled' };

  const path = String(
    options.path ||
    process.env.USERS_TEAMS_RECOVERY_BACKUP_PATH ||
    DEFAULT_RECOVERY_BACKUP_PATH
  ).trim();

  const force = Boolean(options.force) || String(process.env.USERS_TEAMS_BACKUP_RECOVERY_FORCE || '').toLowerCase() === 'true';
  const status = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));

  const currentUsersCount = Number(status.users || 0);
  const currentTeamsCount = Number(status.teams || 0);

  if (!force && !(currentUsersCount <= 1 && currentTeamsCount === 0)) {
    return {
      success: true,
      skipped: true,
      reason: 'current_database_not_missing_users_teams',
      status,
      path
    };
  }

  const backup = await githubBackups.fetchBackupFromGitHubPath(path);
  const database = parseBackupDatabase(backup);
  const backupUsers = Array.isArray(database?.users) ? database.users : [];
  const backupTeams = Array.isArray(database?.teams) ? database.teams : [];

  if (!backupUsers.length && !backupTeams.length) {
    return {
      success: false,
      skipped: true,
      reason: 'backup_without_users_or_teams',
      summary: backup.summary || {},
      path
    };
  }

  const currentUsers = await storage.readUsers().catch(() => []);
  const currentTeams = await storage.readTeams().catch(() => []);
  const currentUsersById = byId(currentUsers);
  const currentTeamIds = new Set((Array.isArray(currentTeams) ? currentTeams : []).map((team) => String(team?.id || '').trim()).filter(Boolean));

  let restoredUsers = 0;
  let restoredTeams = 0;

  for (const user of backupUsers) {
    const id = String(user?.id || user?.discordId || '').trim();
    if (!id) continue;
    await storage.saveUser(mergeUser(user, currentUsersById.get(id) || null));
    restoredUsers += 1;
  }

  for (const team of backupTeams) {
    const id = String(team?.id || '').trim();
    if (!id) continue;
    if (currentTeamIds.has(id) && !force) continue;
    await storage.saveTeam({
      ...team,
      recoveredFromBackup: true,
      recoveredFromBackupAt: new Date().toISOString(),
      recoveredFromBackupPath: path,
      updatedAt: team.updatedAt || new Date().toISOString()
    });
    restoredTeams += 1;
  }

  const nextStatus = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));

  return {
    success: true,
    restored: true,
    path,
    backupSummary: backup.summary || {},
    restoredUsers,
    restoredTeams,
    before: status,
    after: nextStatus
  };
}

module.exports = {
  recoverUsersAndTeamsFromBackup,
  parseBackupDatabase,
  DEFAULT_RECOVERY_BACKUP_PATH
};
