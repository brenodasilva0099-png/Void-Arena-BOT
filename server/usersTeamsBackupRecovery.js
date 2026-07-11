const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const CLEAN_SNAPSHOT_PATH = process.env.REAL_STATE_RECOVERY_BACKUP_PATH || 'backups/2026-07/void-arena-backup-2026-07-11T01-27-52-103Z.json';
const OWNER_DISCORD_ID = String(process.env.OWNER_DISCORD_ID || '1235713276277559326').trim();
const REQUIRED_TEAM_KEYS = new Set(['yung', 'thecreator']);
const HISTORY_SCAN_LIMIT = Math.max(10, Math.min(100, Number(process.env.REAL_TEAM_RECOVERY_BACKUP_SCAN_LIMIT || 40) || 40));

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

function userIdentity(user = {}) {
  return String(user.discordId || user.id || '').trim();
}

function teamIdentity(team = {}) {
  const id = String(team.id || '').trim();
  if (id) return `id:${id}`;
  return `name:${normalizeKey(team.name || team.title || '')}|tag:${normalizeKey(team.tag || '')}`;
}

function teamNameKey(team = {}) {
  return normalizeKey(team.name || team.title || team.tag || team.slug || '');
}

function teamDiscordIds(team = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = String(value || '').trim();
    if (/^\d{16,22}$/.test(id)) ids.add(id);
  };
  add(team.ownerDiscordId);
  add(team.directorDiscordId);
  add(team.captainDiscordId);
  (Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []).forEach(add);
  (Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : []).forEach(add);
  (Array.isArray(team.playerDetails) ? team.playerDetails : []).forEach((player) => add(player?.discordId || player?.account));
  (Array.isArray(team.reserveDetails) ? team.reserveDetails : []).forEach((player) => add(player?.discordId || player?.account));
  return ids;
}

function isOwnerCreatedTeam(team = {}) {
  if (!OWNER_DISCORD_ID) return false;
  return [team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId]
    .map((value) => String(value || '').trim())
    .some((id) => id === OWNER_DISCORD_ID);
}

function shouldRecoverTeam(team = {}) {
  const key = teamNameKey(team);
  if (REQUIRED_TEAM_KEYS.has(key)) return true;
  return !isOwnerCreatedTeam(team);
}

function hasValidDiscordId(user = {}) {
  const discordId = String(user.discordId || user.discord?.id || '').trim();
  return /^\d{16,22}$/.test(discordId) && !user.deletedAt && !user.hiddenFromPlayersDirectory;
}

function mergeUsers(currentUsers = [], recoveredUsers = []) {
  const map = new Map();
  [...(Array.isArray(recoveredUsers) ? recoveredUsers : []), ...(Array.isArray(currentUsers) ? currentUsers : [])].forEach((user) => {
    const key = userIdentity(user);
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...user });
  });
  return Array.from(map.values());
}

function mergeTeams(currentTeams = [], recoveredTeams = []) {
  const map = new Map();
  (Array.isArray(recoveredTeams) ? recoveredTeams : []).forEach((team) => {
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

function collectReferencedUsers(allUsers = [], teams = []) {
  const refs = new Set();
  (Array.isArray(teams) ? teams : []).forEach((team) => {
    [team.ownerUserId, team.directorUserId, team.captainUserId].forEach((value) => {
      const safe = String(value || '').trim();
      if (safe) refs.add(safe);
    });
    teamDiscordIds(team).forEach((id) => refs.add(id));
    [...(team.playerDetails || []), ...(team.reserveDetails || [])].forEach((player) => {
      [player?.id, player?.userId, player?.discordId].forEach((value) => {
        const safe = String(value || '').trim();
        if (safe) refs.add(safe);
      });
    });
  });

  return (Array.isArray(allUsers) ? allUsers : []).filter((user) => {
    if (!hasValidDiscordId(user)) return false;
    return refs.has(String(user.id || '').trim()) || refs.has(String(user.discordId || '').trim());
  });
}

async function collectRecoveryHistory() {
  const databases = [];
  const seenPaths = new Set();

  const pushBackup = async (path) => {
    const safePath = String(path || '').trim();
    if (!safePath || seenPaths.has(safePath)) return;
    seenPaths.add(safePath);
    const backup = await githubBackups.fetchBackupFromGitHubPath(safePath).catch(() => null);
    const database = parseBackupDatabase(backup || {});
    if (database) databases.push({ path: safePath, database });
  };

  await pushBackup(CLEAN_SNAPSHOT_PATH);
  const recent = await githubBackups.listBackupsFromGitHub({ limit: HISTORY_SCAN_LIMIT }).catch(() => []);
  for (const item of recent) await pushBackup(item.path);
  return databases;
}

async function restoreRealStateIfNeeded(storage) {
  if (envTrue('REAL_STATE_RECOVERY_DISABLE')) {
    return { success: true, skipped: true, reason: 'real_state_recovery_disabled' };
  }

  const currentBackup = await storage.exportDatabaseBackup();
  const currentDatabase = parseBackupDatabase(currentBackup) || {};
  const currentUsers = Array.isArray(currentDatabase.users) ? currentDatabase.users : [];
  const currentTeams = Array.isArray(currentDatabase.teams) ? currentDatabase.teams : [];

  const history = await collectRecoveryHistory();
  if (!history.length) {
    return { success: true, skipped: true, reason: 'no_backup_history_available_current_data_preserved' };
  }

  const recoveredTeamMap = new Map();
  const allBackupUsers = [];

  history.forEach(({ database }) => {
    const teams = Array.isArray(database.teams) ? database.teams : [];
    const users = Array.isArray(database.users) ? database.users : [];
    allBackupUsers.push(...users);
    teams.filter(shouldRecoverTeam).forEach((team) => {
      const key = teamIdentity(team);
      if (!key) return;
      const previous = recoveredTeamMap.get(key);
      const previousTime = new Date(previous?.updatedAt || previous?.createdAt || 0).getTime();
      const nextTime = new Date(team.updatedAt || team.createdAt || 0).getTime();
      if (!previous || nextTime >= previousTime) recoveredTeamMap.set(key, { ...team });
    });
  });

  const recoveredTeams = Array.from(recoveredTeamMap.values());
  const requiredFound = new Set(recoveredTeams.map(teamNameKey).filter((key) => REQUIRED_TEAM_KEYS.has(key)));
  const missingRequired = [...REQUIRED_TEAM_KEYS].filter((key) => !requiredFound.has(key));
  const recoveredUsers = collectReferencedUsers(allBackupUsers, recoveredTeams);

  const mergedTeams = mergeTeams(currentTeams, recoveredTeams);
  const mergedUsers = mergeUsers(currentUsers, recoveredUsers);
  const beforeTeamIds = new Set(currentTeams.map(teamIdentity));
  const addedTeams = mergedTeams.filter((team) => !beforeTeamIds.has(teamIdentity(team)));
  const beforeUserIds = new Set(currentUsers.map(userIdentity).filter(Boolean));
  const addedUsers = mergedUsers.filter((user) => !beforeUserIds.has(userIdentity(user)));

  if (!addedTeams.length && !addedUsers.length) {
    return {
      success: true,
      skipped: true,
      reason: 'real_external_teams_and_players_already_present',
      currentTeams: currentTeams.length,
      currentUsers: currentUsers.length,
      requiredFound: [...requiredFound],
      missingRequired
    };
  }

  const nextDatabase = {
    ...currentDatabase,
    users: mergedUsers,
    teams: mergedTeams,
    meta: {
      ...(currentDatabase.meta || {}),
      usersTeamsRecoveredAt: new Date().toISOString(),
      usersTeamsRecoveryPolicy: 'merge-current-plus-required-yung-thecreator-plus-non-owner-teams-from-history',
      usersTeamsRecoveryScannedBackups: history.length
    }
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    database: nextDatabase,
    exportedAt: new Date().toISOString()
  });

  const savedBackup = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'real-external-teams-and-users-merged-after-recovery'
  }).catch((error) => ({ success: false, message: error.message }));

  return {
    success: true,
    restored: true,
    reason: 'missing_real_external_teams_and_players_merged_without_replacing_current_data',
    addedTeams: addedTeams.map((team) => team.name || team.tag || team.id),
    addedUsers: addedUsers.length,
    requiredFound: [...requiredFound],
    missingRequired,
    beforeTeams: currentTeams.length,
    afterTeams: mergedTeams.length,
    beforeUsers: currentUsers.length,
    afterUsers: mergedUsers.length,
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
    note: 'YUNG, The Creator e times reais de outros usuarios sao recuperados do historico sem remover cadastros atuais. Exclusoes manuais continuam protegidas pelos tombstones.'
  };
}

module.exports = {
  recoverUsersAndTeamsFromBackup,
  restoreNamedUsersFromBackup,
  parseBackupDatabase,
  CLEAN_SNAPSHOT_PATH
};
