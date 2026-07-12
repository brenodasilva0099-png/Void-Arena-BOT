const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const CLEAN_SNAPSHOT_PATH = process.env.REAL_STATE_RECOVERY_BACKUP_PATH || 'backups/2026-07/void-arena-backup-2026-07-11T01-27-52-103Z.json';
const OWNER_DISCORD_ID = String(process.env.OWNER_DISCORD_ID || '1235713276277559326').trim();
const REQUIRED_TEAM_KEYS = new Set(['yung', 'thecreator']);
const HISTORY_SCAN_LIMIT = Math.max(10, Math.min(150, Number(process.env.REAL_TEAM_RECOVERY_BACKUP_SCAN_LIMIT || 80) || 80));

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

function itemTime(item = {}) {
  return Math.max(
    new Date(item.updatedAt || 0).getTime() || 0,
    new Date(item.createdAt || 0).getTime() || 0,
    new Date(item.submittedAt || 0).getTime() || 0,
    new Date(item.reviewedAt || 0).getTime() || 0
  );
}

function userIdentity(user = {}) {
  return String(user.discordId || user.id || '').trim();
}

function teamIdentity(team = {}) {
  const id = String(team.id || '').trim();
  if (id) return `id:${id}`;
  return `name:${normalizeKey(team.name || team.title || '')}|tag:${normalizeKey(team.tag || '')}`;
}

function recordIdentity(item = {}, fallbackPrefix = 'record') {
  const id = String(item.id || item.messageId || item.discordMessageId || '').trim();
  if (id) return `id:${id}`;
  const user = String(item.userId || item.discordId || item.playerDiscordId || item.responsibleDiscordId || '').trim();
  const created = String(item.createdAt || item.submittedAt || item.updatedAt || '').trim();
  const name = normalizeKey(item.userName || item.playerName || item.responsibleName || item.teamName || item.title || item.name || '');
  return `${fallbackPrefix}:${user}:${created}:${name}`;
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
  if (!team || typeof team !== 'object') return false;
  if (team.deletedAt || team.removedAt || team.hidden) return false;
  const key = teamNameKey(team);
  if (REQUIRED_TEAM_KEYS.has(key)) return true;
  if (envTrue('REAL_DATA_RECOVER_ALL_TEAMS')) return true;
  return !isOwnerCreatedTeam(team);
}

function hasValidDiscordId(user = {}) {
  const discordId = String(user.discordId || user.discord?.id || '').trim();
  return /^\d{16,22}$/.test(discordId) && !user.deletedAt && !user.hiddenFromPlayersDirectory;
}

function hasRealProfileSignal(user = {}) {
  const profile = user.profile || {};
  return Boolean(
    user.avatar ||
    user.discordAvatar ||
    profile.avatar ||
    profile.banner ||
    profile.discordBanner ||
    profile.username ||
    user.name ||
    user.discordUsername ||
    user.discordTag ||
    user.provider === 'discord' ||
    user.authProvider === 'discord'
  );
}

function shouldRecoverUser(user = {}) {
  if (!hasValidDiscordId(user)) return false;
  if (envTrue('REAL_DATA_RECOVER_DISCORD_ID_ONLY')) return true;
  return hasRealProfileSignal(user);
}

function mergeByIdentity(currentItems = [], recoveredItems = [], identityFn, options = {}) {
  const map = new Map();
  const put = (item, source) => {
    if (!item || typeof item !== 'object') return;
    const key = identityFn(item);
    if (!key) return;
    const previous = map.get(key);
    if (!previous) {
      map.set(key, { ...item });
      return;
    }
    const previousTime = itemTime(previous);
    const nextTime = itemTime(item);
    const preferCurrent = source === 'current';
    const shouldReplace = preferCurrent || nextTime >= previousTime || options.keepLatest === false;
    map.set(key, shouldReplace ? { ...previous, ...item } : previous);
  };
  (Array.isArray(recoveredItems) ? recoveredItems : []).forEach((item) => put(item, 'recovered'));
  (Array.isArray(currentItems) ? currentItems : []).forEach((item) => put(item, 'current'));
  return Array.from(map.values());
}

function normalizeDeletedApplicationIds(database = {}) {
  const settings = database.settings && typeof database.settings === 'object' ? database.settings : {};
  const values = [
    ...(Array.isArray(database.deletedPlayerApplicationIds) ? database.deletedPlayerApplicationIds : []),
    ...(Array.isArray(settings.deletedPlayerApplicationIds) ? settings.deletedPlayerApplicationIds : []),
    ...(Array.isArray(settings.forms?.deletedPlayerApplicationIds) ? settings.forms.deletedPlayerApplicationIds : [])
  ];
  return new Set(values.map((item) => String(typeof item === 'string' ? item : item?.id || item?.applicationId || '').trim()).filter(Boolean));
}

function filterDeletedApplications(applications = [], deletedIds = new Set()) {
  return (Array.isArray(applications) ? applications : []).filter((item) => !deletedIds.has(String(item?.id || '').trim()));
}

function databaseSupportTickets(database = {}) {
  return Array.isArray(database.settings?.supportTickets) ? database.settings.supportTickets : [];
}

function collectRecoveryArrays(history = [], currentDatabase = {}) {
  const recovered = {
    users: [],
    teams: [],
    events: [],
    playerApplications: [],
    trainingSubmissions: [],
    eventRegistrationRequests: [],
    supportTickets: []
  };

  history.forEach(({ database }) => {
    if (!database || typeof database !== 'object') return;
    recovered.users.push(...(Array.isArray(database.users) ? database.users.filter(shouldRecoverUser) : []));
    recovered.teams.push(...(Array.isArray(database.teams) ? database.teams.filter(shouldRecoverTeam) : []));
    recovered.events.push(...(Array.isArray(database.events) ? database.events : []));
    recovered.playerApplications.push(...(Array.isArray(database.playerApplications) ? database.playerApplications : []));
    recovered.trainingSubmissions.push(...(Array.isArray(database.trainingSubmissions) ? database.trainingSubmissions : []));
    recovered.eventRegistrationRequests.push(...(Array.isArray(database.eventRegistrationRequests) ? database.eventRegistrationRequests : []));
    recovered.supportTickets.push(...databaseSupportTickets(database));
  });

  const deletedApplications = normalizeDeletedApplicationIds(currentDatabase);
  recovered.playerApplications = filterDeletedApplications(recovered.playerApplications, deletedApplications);
  return recovered;
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
    if (database) databases.push({ path: safePath, database, summary: backup?.summary || {} });
  };

  await pushBackup(CLEAN_SNAPSHOT_PATH);
  const recent = await githubBackups.listBackupsFromGitHub({ limit: HISTORY_SCAN_LIMIT }).catch(() => []);
  for (const item of recent) await pushBackup(item.path);
  return databases;
}

function countAdded(current = [], merged = [], identityFn) {
  const before = new Set((Array.isArray(current) ? current : []).map(identityFn).filter(Boolean));
  return (Array.isArray(merged) ? merged : []).filter((item) => !before.has(identityFn(item))).length;
}

async function restoreRealStateIfNeeded(storage) {
  if (envTrue('REAL_STATE_RECOVERY_DISABLE')) {
    return { success: true, skipped: true, reason: 'real_state_recovery_disabled' };
  }

  const currentBackup = await storage.exportDatabaseBackup();
  const currentDatabase = parseBackupDatabase(currentBackup) || {};
  const currentUsers = Array.isArray(currentDatabase.users) ? currentDatabase.users : [];
  const currentTeams = Array.isArray(currentDatabase.teams) ? currentDatabase.teams : [];
  const currentEvents = Array.isArray(currentDatabase.events) ? currentDatabase.events : [];
  const currentApplications = filterDeletedApplications(currentDatabase.playerApplications || [], normalizeDeletedApplicationIds(currentDatabase));
  const currentTraining = Array.isArray(currentDatabase.trainingSubmissions) ? currentDatabase.trainingSubmissions : [];
  const currentRequests = Array.isArray(currentDatabase.eventRegistrationRequests) ? currentDatabase.eventRegistrationRequests : [];
  const currentSupportTickets = databaseSupportTickets(currentDatabase);

  const history = await collectRecoveryHistory();
  if (!history.length) {
    return { success: true, skipped: true, reason: 'no_backup_history_available_current_data_preserved' };
  }

  const recovered = collectRecoveryArrays(history, currentDatabase);

  const mergedUsers = mergeByIdentity(currentUsers, recovered.users, userIdentity);
  const mergedTeams = mergeByIdentity(currentTeams, recovered.teams, teamIdentity);
  const mergedEvents = mergeByIdentity(currentEvents, recovered.events, (item) => recordIdentity(item, 'event'));
  const mergedApplications = mergeByIdentity(currentApplications, recovered.playerApplications, (item) => recordIdentity(item, 'application'));
  const mergedTraining = mergeByIdentity(currentTraining, recovered.trainingSubmissions, (item) => recordIdentity(item, 'training'));
  const mergedRequests = mergeByIdentity(currentRequests, recovered.eventRegistrationRequests, (item) => recordIdentity(item, 'event-request'));
  const mergedSupportTickets = mergeByIdentity(currentSupportTickets, recovered.supportTickets, (item) => recordIdentity(item, 'support'));

  const addedUsers = countAdded(currentUsers, mergedUsers, userIdentity);
  const addedTeams = countAdded(currentTeams, mergedTeams, teamIdentity);
  const addedEvents = countAdded(currentEvents, mergedEvents, (item) => recordIdentity(item, 'event'));
  const addedApplications = countAdded(currentApplications, mergedApplications, (item) => recordIdentity(item, 'application'));
  const addedTraining = countAdded(currentTraining, mergedTraining, (item) => recordIdentity(item, 'training'));
  const addedRequests = countAdded(currentRequests, mergedRequests, (item) => recordIdentity(item, 'event-request'));
  const addedSupportTickets = countAdded(currentSupportTickets, mergedSupportTickets, (item) => recordIdentity(item, 'support'));

  const totalAdded = addedUsers + addedTeams + addedEvents + addedApplications + addedTraining + addedRequests + addedSupportTickets;
  const requiredFound = new Set(mergedTeams.map(teamNameKey).filter((key) => REQUIRED_TEAM_KEYS.has(key)));
  const missingRequired = [...REQUIRED_TEAM_KEYS].filter((key) => !requiredFound.has(key));

  if (!totalAdded) {
    return {
      success: true,
      skipped: true,
      reason: 'all_current_real_data_already_present',
      current: {
        users: currentUsers.length,
        teams: currentTeams.length,
        events: currentEvents.length,
        playerApplications: currentApplications.length,
        trainingSubmissions: currentTraining.length,
        eventRegistrationRequests: currentRequests.length,
        supportTickets: currentSupportTickets.length
      },
      requiredFound: [...requiredFound],
      missingRequired,
      scannedBackups: history.length
    };
  }

  const deletedApplicationIds = Array.from(normalizeDeletedApplicationIds(currentDatabase));
  const nextDatabase = {
    ...currentDatabase,
    users: mergedUsers,
    teams: mergedTeams,
    events: mergedEvents,
    playerApplications: mergedApplications,
    trainingSubmissions: mergedTraining,
    eventRegistrationRequests: mergedRequests,
    settings: {
      ...(currentDatabase.settings || {}),
      supportTickets: mergedSupportTickets,
      deletedPlayerApplicationIds,
      forms: {
        ...(currentDatabase.settings?.forms || {}),
        deletedPlayerApplicationIds
      },
      support: {
        ...(currentDatabase.settings?.support || {}),
        updatedAt: new Date().toISOString(),
        mergePolicy: 'current-plus-support-tickets-from-backups'
      }
    },
    meta: {
      ...(currentDatabase.meta || {}),
      realDataMergeRecoveredAt: new Date().toISOString(),
      realDataMergePolicy: 'current-plus-all-real-users-teams-events-forms-support-from-backups',
      realDataMergeScannedBackups: history.length
    }
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    database: nextDatabase,
    exportedAt: new Date().toISOString()
  });

  const savedBackup = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'merge-current-with-real-users-teams-events-forms-support'
  }).catch((error) => ({ success: false, message: error.message }));

  return {
    success: true,
    restored: true,
    reason: 'current_data_merged_with_real_backup_history_without_replacing_state',
    addedUsers,
    addedTeams,
    addedEvents,
    addedApplications,
    addedTraining,
    addedRequests,
    addedSupportTickets,
    before: {
      users: currentUsers.length,
      teams: currentTeams.length,
      events: currentEvents.length,
      playerApplications: currentApplications.length,
      trainingSubmissions: currentTraining.length,
      eventRegistrationRequests: currentRequests.length,
      supportTickets: currentSupportTickets.length
    },
    after: {
      users: mergedUsers.length,
      teams: mergedTeams.length,
      events: mergedEvents.length,
      playerApplications: mergedApplications.length,
      trainingSubmissions: mergedTraining.length,
      eventRegistrationRequests: mergedRequests.length,
      supportTickets: mergedSupportTickets.length
    },
    requiredFound: [...requiredFound],
    missingRequired,
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
    reason: 'real_data_merge_failed_current_data_preserved',
    message: error.message
  }));

  return {
    success: Boolean(realState.success),
    restored: Boolean(realState.restored),
    skipped: !realState.restored,
    reason: realState.reason || 'real_data_merge_checked',
    realState,
    note: 'Fluxo preservado: banco atual continua, dados reais ausentes de jogadores/times/eventos/formularios/suporte entram por merge, e formularios excluidos nao voltam.'
  };
}

module.exports = {
  recoverUsersAndTeamsFromBackup,
  restoreNamedUsersFromBackup,
  parseBackupDatabase,
  CLEAN_SNAPSHOT_PATH
};
