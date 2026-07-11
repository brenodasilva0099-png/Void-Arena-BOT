const fs = require('node:fs/promises');
const pathLib = require('node:path');
const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const DEFAULT_RECOVERY_BACKUP_PATH = 'backups/2026-07/void-arena-backup-2026-07-10T21-13-15-122Z.json';
const DEFAULT_NAMED_RESTORE = ['x1', 'x!'];
const DATA_DIR = process.env.DATA_DIR ? pathLib.resolve(process.env.DATA_DIR) : pathLib.join(__dirname, '..', 'data');
const NAMED_RESTORE_MARKER = pathLib.join(DATA_DIR, 'named-user-restore-x1.done.json');

function parseBackupDatabase(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup.database) {
    const buffer = Buffer.from(String(backup.database || ''), 'base64');
    return JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
  }

  if (backup?.database && typeof backup.database === 'object') return backup.database;
  if (Array.isArray(backup?.users) || Array.isArray(backup?.teams)) return backup;
  return null;
}

function norm(value = '') {
  return String(value || '').trim().toLowerCase();
}

function userLabels(user = {}) {
  return [
    user.name,
    user.discordTag,
    user.discordUsername,
    user.profile?.username,
    user.profile?.realName,
    user.discordId
  ].map(norm).filter(Boolean);
}

function userMatchesNames(user = {}, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : []).map(norm).filter(Boolean));
  if (!wanted.size) return false;
  return userLabels(user).some((label) => wanted.has(label));
}

function isHiddenUser(user = {}) {
  return Boolean(user.deletedAt || user.hiddenFromPlayersDirectory);
}

function byId(items = []) {
  return new Map((Array.isArray(items) ? items : [])
    .map((item) => [String(item?.id || item?.discordId || '').trim(), item])
    .filter(([id]) => id));
}

function byDiscord(items = []) {
  return new Map((Array.isArray(items) ? items : [])
    .map((item) => [String(item?.discordId || '').trim(), item])
    .filter(([id]) => id));
}

async function namedRestoreMarkerExists() {
  try {
    const raw = await fs.readFile(NAMED_RESTORE_MARKER, 'utf8');
    const data = JSON.parse(raw || '{}');
    return data?.completed === true ? data : null;
  } catch {
    return null;
  }
}

async function markNamedRestoreDone(extra = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = {
    completed: true,
    completedAt: new Date().toISOString(),
    ...extra
  };
  await fs.writeFile(NAMED_RESTORE_MARKER, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function mergeUser(backupUser = {}, currentUser = null, options = {}) {
  if (!currentUser) {
    return {
      ...backupUser,
      ...(options.reactivate ? {
        deletedAt: null,
        hiddenFromPlayersDirectory: false,
        hiddenAt: null,
        restoredFromBackupAt: new Date().toISOString()
      } : {})
    };
  }

  const merged = {
    ...backupUser,
    ...currentUser,
    discordId: currentUser.discordId || backupUser.discordId || '',
    provider: currentUser.provider || backupUser.provider || 'discord',
    profile: {
      ...(backupUser.profile || {}),
      ...(currentUser.profile || {})
    },
    socials: {
      ...(backupUser.socials || {}),
      ...(currentUser.socials || {})
    },
    updatedAt: new Date().toISOString()
  };

  if (options.reactivate) {
    merged.deletedAt = null;
    merged.hiddenFromPlayersDirectory = false;
    merged.hiddenAt = null;
    merged.restoredFromBackupAt = new Date().toISOString();
    merged.restoredFromBackupReason = options.reason || 'named-user-restore';
  }

  return merged;
}

async function loadBackupDatabase(path) {
  const backup = await githubBackups.fetchBackupFromGitHubPath(path);
  const database = parseBackupDatabase(backup);
  return { backup, database };
}

async function restoreNamedUsersFromBackup(storage, options = {}) {
  const enabled = String(process.env.USERS_NAMED_RESTORE || 'true').toLowerCase() !== 'false';
  if (!enabled) return { success: true, skipped: true, reason: 'named_restore_disabled' };

  const path = String(options.path || process.env.USERS_TEAMS_RECOVERY_BACKUP_PATH || DEFAULT_RECOVERY_BACKUP_PATH).trim();
  const names = String(process.env.USERS_NAMED_RESTORE_NAMES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const wantedNames = names.length ? names : DEFAULT_NAMED_RESTORE;
  const force = Boolean(options.force) || String(process.env.USERS_NAMED_RESTORE_FORCE || '').toLowerCase() === 'true';
  const marker = await namedRestoreMarkerExists();

  if (marker && !force) {
    return { success: true, skipped: true, reason: 'named_restore_already_completed', marker, names: wantedNames };
  }

  const currentUsers = await storage.readUsers().catch(() => []);
  const currentById = byId(currentUsers);
  const currentByDiscord = byDiscord(currentUsers);
  const alreadyVisible = currentUsers.some((user) => userMatchesNames(user, wantedNames) && !isHiddenUser(user));

  if (alreadyVisible && !force) {
    const markerData = await markNamedRestoreDone({ reason: 'named_user_already_visible', names: wantedNames, path });
    return { success: true, skipped: true, reason: 'named_user_already_visible', marker: markerData, names: wantedNames };
  }

  const { backup, database } = await loadBackupDatabase(path);
  const backupUsers = Array.isArray(database?.users) ? database.users : [];
  const candidates = backupUsers.filter((user) => userMatchesNames(user, wantedNames));

  if (!candidates.length) {
    return { success: false, skipped: true, reason: 'named_user_not_found_in_backup', names: wantedNames, summary: backup.summary || {} };
  }

  const restored = [];
  for (const backupUser of candidates) {
    const current = currentById.get(String(backupUser.id || backupUser.discordId || '').trim()) || currentByDiscord.get(String(backupUser.discordId || '').trim()) || null;
    const restoredUser = mergeUser(backupUser, current, { reactivate: true, reason: 'restore-x1-discord-login' });
    await storage.saveUser(restoredUser);
    restored.push({ id: restoredUser.id || '', discordId: restoredUser.discordId || '', name: restoredUser.name || restoredUser.profile?.username || '' });
  }

  const markerData = await markNamedRestoreDone({ reason: 'named_user_restored_from_backup', names: wantedNames, path, restored });
  return { success: true, restored: true, restoredUsers: restored.length, users: restored, path, names: wantedNames, marker: markerData };
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
    const namedRestore = await restoreNamedUsersFromBackup(storage, { path }).catch((error) => ({ success: false, skipped: true, reason: 'named_restore_failed', message: error.message }));
    return {
      success: true,
      skipped: true,
      reason: 'current_database_not_missing_users_teams',
      status,
      path,
      namedRestore
    };
  }

  const { backup, database } = await loadBackupDatabase(path);
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

  const namedRestore = await restoreNamedUsersFromBackup(storage, { path, force: true }).catch((error) => ({ success: false, skipped: true, reason: 'named_restore_failed', message: error.message }));
  const nextStatus = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));

  return {
    success: true,
    restored: true,
    path,
    backupSummary: backup.summary || {},
    restoredUsers,
    restoredTeams,
    namedRestore,
    before: status,
    after: nextStatus
  };
}

module.exports = {
  recoverUsersAndTeamsFromBackup,
  restoreNamedUsersFromBackup,
  parseBackupDatabase,
  DEFAULT_RECOVERY_BACKUP_PATH
};
