const fs = require('node:fs/promises');
const pathLib = require('node:path');
const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const CLEAN_SNAPSHOT_PATH = process.env.REAL_STATE_RECOVERY_BACKUP_PATH || 'backups/2026-07/void-arena-backup-2026-07-11T01-27-52-103Z.json';
const TARGET_TEAM_KEYS = new Set(['hollownexus', 'ong', 'tecuieto', 'tequieto']);
const TARGET_REAL_USER_COUNT = Math.max(1, Number(process.env.REAL_STATE_RECOVERY_USER_COUNT || 7) || 7);
const DATA_DIR = process.env.DATA_DIR ? pathLib.resolve(process.env.DATA_DIR) : pathLib.join(__dirname, '..', 'data');
const REAL_STATE_MARKER = pathLib.join(DATA_DIR, 'real-state-3teams-7discord-users.done.json');

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

async function readMarker() {
  try {
    const data = JSON.parse(await fs.readFile(REAL_STATE_MARKER, 'utf8'));
    return data?.completed === true ? data : null;
  } catch {
    return null;
  }
}

async function writeMarker(extra = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = { completed: true, completedAt: new Date().toISOString(), ...extra };
  await fs.writeFile(REAL_STATE_MARKER, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function teamMatchesTarget(team = {}) {
  const keys = [team.name, team.title, team.tag, team.slug, team.id]
    .map(normalizeKey)
    .filter(Boolean);
  return keys.some((key) => TARGET_TEAM_KEYS.has(key));
}

function hasDiscordLogin(user = {}) {
  const discordId = String(user.discordId || user.discord?.id || '').trim();
  if (!/^\d{16,22}$/.test(discordId)) return false;
  if (user.deletedAt || user.hiddenFromPlayersDirectory) return false;
  const profile = user.profile || {};
  const hasPublicProfile = Boolean(
    user.avatar ||
    user.discordAvatar ||
    profile.avatar ||
    profile.banner ||
    profile.discordBanner ||
    profile.username ||
    user.name ||
    user.discordUsername ||
    user.discordTag
  );
  return hasPublicProfile;
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

function uniqueByIdentity(users = []) {
  const seen = new Set();
  const out = [];
  users.forEach((user) => {
    const key = String(user.discordId || user.id || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(user);
  });
  return out;
}

function selectRealUsers(allUsers = [], targetTeams = []) {
  const refs = collectTeamUserRefs(targetTeams);
  const candidates = uniqueByIdentity((Array.isArray(allUsers) ? allUsers : [])
    .filter(hasDiscordLogin)
    .map((user) => ({ user, score: userScore(user, refs) }))
    .filter((item) => item.score >= 55)
    .sort((a, b) => b.score - a.score || String(a.user.name || '').localeCompare(String(b.user.name || '')))
    .map((item) => item.user));

  return candidates.slice(0, TARGET_REAL_USER_COUNT).map((user) => ({
    ...user,
    deletedAt: null,
    hiddenFromPlayersDirectory: false,
    hiddenAt: null,
    restoredFromCleanStateAt: new Date().toISOString()
  }));
}

function cleanBracketForTeams(bracket = {}, teams = []) {
  const ids = new Set(teams.map((team) => String(team.id || '').trim()).filter(Boolean));
  const cleanSlots = (items) => (Array.isArray(items) ? items : []).map((slot) => {
    const id = typeof slot === 'string' ? slot : slot?.id;
    return id && ids.has(String(id)) ? id : null;
  });
  const cleanGroups = (groups) => (Array.isArray(groups) ? groups : []).map((group) => ({
    ...group,
    teams: (Array.isArray(group.teams) ? group.teams : []).filter((id) => ids.has(String(id))),
    teamIds: (Array.isArray(group.teamIds) ? group.teamIds : []).filter((id) => ids.has(String(id)))
  }));
  return {
    ...(bracket || {}),
    slots: cleanSlots(bracket?.slots),
    round16: cleanSlots(bracket?.round16),
    quarters: cleanSlots(bracket?.quarters),
    semis: cleanSlots(bracket?.semis),
    finals: cleanSlots(bracket?.finals),
    groups: cleanGroups(bracket?.groups),
    updatedAt: new Date().toISOString()
  };
}

function currentAlreadyMatches(status = {}, teams = []) {
  const currentTeams = Number(status.teams || 0);
  const currentUsers = Number(status.users || 0);
  if (currentTeams !== 3 || currentUsers < 7) return false;
  const keys = new Set((Array.isArray(teams) ? teams : []).map((team) => normalizeKey(team.name || team.tag || team.id)));
  return ['hollownexus', 'ong'].every((key) => keys.has(key)) && [...keys].some((key) => key.includes('tecuieto') || key.includes('tequieto'));
}

async function restoreRealStateIfNeeded(storage) {
  if (envTrue('REAL_STATE_RECOVERY_DISABLE')) {
    return { success: true, skipped: true, reason: 'real_state_recovery_disabled' };
  }

  const [status, currentTeams] = await Promise.all([
    storage.readDatabaseStatus().catch((error) => ({ error: error.message })),
    storage.readTeams().catch(() => [])
  ]);

  const marker = await readMarker();
  if (marker && currentAlreadyMatches(status, currentTeams)) {
    return { success: true, skipped: true, reason: 'real_state_already_restored_and_current_matches', marker, status };
  }

  if (currentAlreadyMatches(status, currentTeams)) {
    const marked = await writeMarker({ reason: 'current_database_already_matches_real_state', status });
    await githubBackups.saveBackupToGitHub(storage, { reason: 'real-state-already-current-backup' }).catch(() => null);
    return { success: true, skipped: true, reason: 'current_database_already_matches_real_state', marker: marked, status };
  }

  const backup = await githubBackups.fetchBackupFromGitHubPath(CLEAN_SNAPSHOT_PATH);
  const database = parseBackupDatabase(backup);
  const backupTeams = Array.isArray(database?.teams) ? database.teams : [];
  const backupUsers = Array.isArray(database?.users) ? database.users : [];
  const targetTeams = backupTeams
    .filter(teamMatchesTarget)
    .map((team) => ({
      ...team,
      deletedAt: null,
      restoredFromCleanStateAt: new Date().toISOString(),
      restoredFromCleanStatePath: CLEAN_SNAPSHOT_PATH
    }));

  if (targetTeams.length !== 3) {
    return {
      success: false,
      skipped: true,
      reason: 'target_teams_not_found_in_clean_snapshot',
      foundTeams: targetTeams.map((team) => team.name || team.tag || team.id),
      backupSummary: backup.summary || {},
      path: CLEAN_SNAPSHOT_PATH
    };
  }

  const realUsers = selectRealUsers(backupUsers, targetTeams);
  if (realUsers.length < Math.min(7, TARGET_REAL_USER_COUNT)) {
    return {
      success: false,
      skipped: true,
      reason: 'not_enough_real_discord_users_in_clean_snapshot',
      restoredUsers: realUsers.length,
      backupSummary: backup.summary || {},
      path: CLEAN_SNAPSHOT_PATH
    };
  }

  const currentBackup = await storage.exportDatabaseBackup().catch(() => null);
  const currentDatabase = parseBackupDatabase(currentBackup) || {};
  const baseDatabase = database && typeof database === 'object' ? database : {};
  const nextDatabase = {
    ...baseDatabase,
    ...currentDatabase,
    users: realUsers,
    teams: targetTeams,
    bracket: cleanBracketForTeams(currentDatabase.bracket || baseDatabase.bracket || {}, targetTeams),
    meta: {
      ...(baseDatabase.meta || {}),
      ...(currentDatabase.meta || {}),
      realStateRecoveredAt: new Date().toISOString(),
      realStateRecoveryPath: CLEAN_SNAPSHOT_PATH,
      realStatePolicy: 'current-state-forward-only-no-automatic-old-backup-restore'
    }
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    database: nextDatabase,
    exportedAt: new Date().toISOString()
  });

  const savedBackup = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'real-state-restored-3-teams-7-discord-users'
  }).catch((error) => ({ success: false, message: error.message }));

  const markerData = await writeMarker({
    reason: 'restored_real_state_from_clean_snapshot',
    path: CLEAN_SNAPSHOT_PATH,
    before: status,
    teams: targetTeams.map((team) => team.name || team.tag || team.id),
    users: realUsers.map((user) => ({ id: user.id || '', discordId: user.discordId || '', name: user.profile?.username || user.name || user.discordUsername || '' })),
    importedSummary: imported.summary || null,
    backupAfterRestore: savedBackup?.backupPath || savedBackup?.savedAt || savedBackup
  });

  return {
    success: true,
    restored: true,
    reason: 'real_state_restored_3_teams_7_discord_users',
    path: CLEAN_SNAPSHOT_PATH,
    before: status,
    imported,
    marker: markerData,
    backupAfterRestore: savedBackup
  };
}

async function restoreNamedUsersFromBackup() {
  return { success: true, skipped: true, reason: 'named_restore_removed_to_prevent_resurrection' };
}

async function recoverUsersAndTeamsFromBackup(storage) {
  const realState = await restoreRealStateIfNeeded(storage).catch((error) => ({
    success: false,
    skipped: true,
    reason: 'real_state_recovery_failed',
    message: error.message
  }));

  return {
    success: Boolean(realState.success),
    restored: Boolean(realState.restored),
    skipped: !realState.restored,
    reason: realState.reason || 'real_state_checked',
    realState,
    note: 'Backups antigos nao restauram automaticamente. O fluxo agora e: estado real atual + novos cadastros daqui para frente.'
  };
}

module.exports = {
  recoverUsersAndTeamsFromBackup,
  restoreNamedUsersFromBackup,
  parseBackupDatabase,
  CLEAN_SNAPSHOT_PATH
};
