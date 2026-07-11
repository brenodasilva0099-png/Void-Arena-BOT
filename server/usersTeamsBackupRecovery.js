const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const CLEAN_SNAPSHOT_PATH = process.env.REAL_STATE_RECOVERY_BACKUP_PATH || 'backups/2026-07/void-arena-backup-2026-07-11T01-27-52-103Z.json';
const TARGET_TEAM_KEYS = new Set(['hollownexus', 'ong', 'tecuieto', 'tequieto']);
const TARGET_REAL_USER_COUNT = Math.max(1, Number(process.env.REAL_STATE_RECOVERY_USER_COUNT || 7) || 7);

function envTrue(name) {
  return String(process.env[name] || '').toLowerCase() === 'true';
}

function normalizeKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseBackupDatabase(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup.database) {
    const buffer = Buffer.from(String(backup.database || ''), 'base64');
    return JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
  }
  if (backup?.database && typeof backup.database === 'object') return backup.database;
  if (Array.isArray(backup?.users) || Array.isArray(backup?.teams)) return backup;
  return null;
}

function teamMatchesTarget(team = {}) {
  const keys = [team.name, team.title, team.tag, team.slug, team.id]
    .map(normalizeKey)
    .filter(Boolean);
  return keys.some((key) => TARGET_TEAM_KEYS.has(key));
}

function hasValidDiscordId(user = {}) {
  const discordId = String(user.discordId || user.discord?.id || '').trim();
  return /^\d{16,22}$/.test(discordId) && !user.deletedAt && !user.hiddenFromPlayersDirectory;
}

function collectTeamUserRefs(teams = []) {
  const refs = new Set();
  const add = (value) => {
    const safe = String(value || '').trim();
    if (safe) refs.add(safe);
  };
  const scanPlayer = (player = {}) => {
    if (typeof player === 'string') return;
    add(player.id);
    add(player.userId);
    add(player.discordId);
    add(player.account);
  };

  teams.forEach((team) => {
    add(team.ownerUserId);
    add(team.ownerDiscordId);
    add(team.directorUserId);
    add(team.directorDiscordId);
    add(team.captainUserId);
    add(team.captainDiscordId);
    (Array.isArray(team.playerDetails) ? team.playerDetails : []).forEach(scanPlayer);
    (Array.isArray(team.reserveDetails) ? team.reserveDetails : []).forEach(scanPlayer);
    (Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []).forEach(add);
    (Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : []).forEach(add);
  });

  return refs;
}

function userScore(user = {}, refs = new Set()) {
  let score = 0;
  const id = String(user.id || '').trim();
  const discordId = String(user.discordId || '').trim();
  const profile = user.profile || {};
  if (refs.has(id) || refs.has(discordId)) score += 100;
  if (discordId) score += 40;
  if (user.avatar || user.discordAvatar || profile.avatar) score += 30;
  if (profile.banner || profile.discordBanner) score += 20;
  if (profile.username || user.name || user.discordUsername || user.discordTag) score += 15;
  if (user.provider === 'discord' || user.authProvider === 'discord') score += 10;
  return score;
}

function userIdentity(user = {}) {
  return String(user.discordId || user.id || '').trim();
}

function teamIdentity(team = {}) {
  const id = String(team.id || '').trim();
  if (id) return `id:${id}`;
  const name = normalizeKey(team.name || team.title || '');
  const tag = normalizeKey(team.tag || '');
  return `name:${name}|tag:${tag}`;
}

function selectBaselineUsers(users = [], baselineTeams = []) {
  const refs = collectTeamUserRefs(baselineTeams);
  const seen = new Set();
  return (Array.isArray(users) ? users : [])
    .filter(hasValidDiscordId)
    .map((user) => ({ user, score: userScore(user, refs) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.user)
    .filter((user) => {
      const key = userIdentity(user);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, TARGET_REAL_USER_COUNT)
    .map((user) => ({
      ...user,
      deletedAt: null,
      hiddenFromPlayersDirectory: false,
      hiddenAt: null
    }));
}

function mergeUsers(currentUsers = [], baselineUsers = []) {
  const map = new Map();
  (Array.isArray(baselineUsers) ? baselineUsers : []).forEach((user) => {
    const key = userIdentity(user);
    if (key) map.set(key, { ...user });
  });
  (Array.isArray(currentUsers) ? currentUsers : []).forEach((user) => {
    const key = userIdentity(user);
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...user });
  });
  return Array.from(map.values());
}

function mergeTeams(currentTeams = [], baselineTeams = []) {
  const map = new Map();
  (Array.isArray(baselineTeams) ? baselineTeams : []).forEach((team) => {
    const key = teamIdentity(team);
    if (key) map.set(key, { ...team });
  });
  (Array.isArray(currentTeams) ? currentTeams : []).forEach((team) => {
    const key = teamIdentity(team);
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...team });
  });
  return Array.from(map.values());
}

function containsBaselineTeams(currentTeams = [], baselineTeams = []) {
  const currentIds = new Set(currentTeams.map(teamIdentity));
  return baselineTeams.every((team) => currentIds.has(teamIdentity(team)));
}

function containsBaselineUsers(currentUsers = [], baselineUsers = []) {
  const currentIds = new Set(currentUsers.map(userIdentity).filter(Boolean));
  return baselineUsers.every((user) => currentIds.has(userIdentity(user)));
}

async function restoreRealStateIfNeeded(storage) {
  if (envTrue('REAL_STATE_RECOVERY_DISABLE')) {
    return { success: true, skipped: true, reason: 'real_state_recovery_disabled' };
  }

  const currentBackup = await storage.exportDatabaseBackup();
  const currentDatabase = parseBackupDatabase(currentBackup) || {};
  const currentUsers = Array.isArray(currentDatabase.users) ? currentDatabase.users : [];
  const currentTeams = Array.isArray(currentDatabase.teams) ? currentDatabase.teams : [];

  let cleanBackup;
  try {
    cleanBackup = await githubBackups.fetchBackupFromGitHubPath(CLEAN_SNAPSHOT_PATH);
  } catch (error) {
    return {
      success: true,
      skipped: true,
      reason: 'clean_snapshot_unavailable_current_data_preserved',
      message: error.message
    };
  }

  const cleanDatabase = parseBackupDatabase(cleanBackup) || {};
  const backupTeams = Array.isArray(cleanDatabase.teams) ? cleanDatabase.teams : [];
  const backupUsers = Array.isArray(cleanDatabase.users) ? cleanDatabase.users : [];
  const baselineTeams = backupTeams.filter(teamMatchesTarget);
  const baselineUsers = selectBaselineUsers(backupUsers, baselineTeams);

  if (!baselineTeams.length && !baselineUsers.length) {
    return { success: true, skipped: true, reason: 'clean_snapshot_has_no_recoverable_users_or_teams' };
  }

  if (containsBaselineTeams(currentTeams, baselineTeams) && containsBaselineUsers(currentUsers, baselineUsers)) {
    return {
      success: true,
      skipped: true,
      reason: 'real_users_and_teams_already_present',
      currentUsers: currentUsers.length,
      currentTeams: currentTeams.length
    };
  }

  const mergedUsers = mergeUsers(currentUsers, baselineUsers);
  const mergedTeams = mergeTeams(currentTeams, baselineTeams);
  const nextDatabase = {
    ...currentDatabase,
    users: mergedUsers,
    teams: mergedTeams,
    meta: {
      ...(currentDatabase.meta || {}),
      usersTeamsRecoveredAt: new Date().toISOString(),
      usersTeamsRecoveryPath: CLEAN_SNAPSHOT_PATH,
      usersTeamsRecoveryPolicy: 'merge-missing-baseline-never-replace-current'
    }
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    database: nextDatabase,
    exportedAt: new Date().toISOString()
  });

  const savedBackup = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'users-teams-merged-after-recovery'
  }).catch((error) => ({ success: false, message: error.message }));

  return {
    success: true,
    restored: true,
    reason: 'missing_real_users_and_teams_merged_without_removing_current_data',
    beforeUsers: currentUsers.length,
    beforeTeams: currentTeams.length,
    afterUsers: mergedUsers.length,
    afterTeams: mergedTeams.length,
    imported,
    backupAfterMerge: savedBackup
  };
}

async function restoreNamedUsersFromBackup() {
  return { success: true, skipped: true, reason: 'named_restore_removed_to_prevent_resurrection' };
}

async function recoverUsersAndTeamsFromBackup(storage) {
  const realState = await restoreRealStateIfNeeded(storage).catch((error) => ({
    success: false,
    skipped: true,
    reason: 'real_state_recovery_failed_current_data_preserved',
    message: error.message
  }));

  return {
    success: Boolean(realState.success),
    restored: Boolean(realState.restored),
    skipped: !realState.restored,
    reason: realState.reason || 'real_state_checked',
    realState,
    note: 'Usuarios e times reais ausentes sao apenas mesclados. Cadastros atuais e futuros nunca sao substituidos pela recuperacao.'
  };
}

module.exports = {
  recoverUsersAndTeamsFromBackup,
  restoreNamedUsersFromBackup,
  parseBackupDatabase,
  CLEAN_SNAPSHOT_PATH
};
