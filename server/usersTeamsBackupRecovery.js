const zlib = require('node:zlib');
const githubBackups = require('./githubBackups');

const CLEAN_SNAPSHOT_PATH = process.env.REAL_STATE_RECOVERY_BACKUP_PATH || 'backups/2026-07/void-arena-backup-2026-07-11T01-27-52-103Z.json';
const HISTORY_SCAN_LIMIT = Math.max(10, Math.min(150, Number(process.env.REAL_TEAM_RECOVERY_BACKUP_SCAN_LIMIT || 120) || 120));

function envTrue(name) { return String(process.env[name] || '').toLowerCase() === 'true'; }
function normalizeKey(value = '') { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function parseBackupDatabase(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup.database) {
    return JSON.parse(zlib.gunzipSync(Buffer.from(String(backup.database || ''), 'base64')).toString('utf8'));
  }
  if (backup?.database && typeof backup.database === 'object') return backup.database;
  if (Array.isArray(backup?.users) || Array.isArray(backup?.teams)) return backup;
  return null;
}
function itemTime(item = {}) { return Math.max(new Date(item.updatedAt || 0).getTime() || 0, new Date(item.createdAt || 0).getTime() || 0, new Date(item.submittedAt || 0).getTime() || 0, new Date(item.reviewedAt || 0).getTime() || 0); }
function isPlainObject(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function hasValue(value) { if (value === null || value === undefined) return false; if (typeof value === 'string') return value.trim().length > 0; if (Array.isArray(value)) return value.length > 0; if (isPlainObject(value)) return Object.keys(value).length > 0; return true; }
function uniqueArray(values = []) { const seen = new Set(); const out = []; values.forEach((item) => { const key = isPlainObject(item) ? JSON.stringify(item) : String(item || ''); if (!key || seen.has(key)) return; seen.add(key); out.push(item); }); return out; }
function deepMergeFillMissing(base = {}, extra = {}) {
  const output = { ...(isPlainObject(extra) ? extra : {}), ...(isPlainObject(base) ? base : {}) };
  Object.keys(extra || {}).forEach((key) => {
    const currentValue = base?.[key];
    const extraValue = extra?.[key];
    if (Array.isArray(currentValue) || Array.isArray(extraValue)) { output[key] = uniqueArray([...(Array.isArray(currentValue) ? currentValue : []), ...(Array.isArray(extraValue) ? extraValue : [])]); return; }
    if (isPlainObject(currentValue) || isPlainObject(extraValue)) { output[key] = deepMergeFillMissing(currentValue || {}, extraValue || {}); return; }
    output[key] = hasValue(currentValue) ? currentValue : extraValue;
  });
  Object.keys(base || {}).forEach((key) => { if (!(key in output)) output[key] = base[key]; });
  return output;
}
function stableJson(value) { return JSON.stringify(value); }
function userIdentity(user = {}) { const discordId = String(user.discordId || user.discord?.id || '').trim(); if (discordId) return `discord:${discordId}`; const id = String(user.id || '').trim(); if (id) return `id:${id}`; const email = String(user.email || '').trim().toLowerCase(); return email ? `email:${email}` : ''; }
function teamIdentity(team = {}) { const id = String(team.id || '').trim(); if (id) return `id:${id}`; return `name:${normalizeKey(team.name || team.title || '')}|tag:${normalizeKey(team.tag || '')}`; }
function recordIdentity(item = {}, fallbackPrefix = 'record') { const id = String(item.id || item.messageId || item.discordMessageId || '').trim(); if (id) return `id:${id}`; const user = String(item.userId || item.discordId || item.playerDiscordId || item.responsibleDiscordId || '').trim(); const created = String(item.createdAt || item.submittedAt || item.updatedAt || '').trim(); const name = normalizeKey(item.userName || item.playerName || item.responsibleName || item.teamName || item.title || item.name || ''); return `${fallbackPrefix}:${user}:${created}:${name}`; }
function teamNameKey(team = {}) { return normalizeKey(team.name || team.title || team.tag || team.slug || ''); }
function hasValidDiscordId(user = {}) { return /^\d{16,22}$/.test(String(user.discordId || user.discord?.id || '').trim()); }
function hasRealProfileSignal(user = {}) { const profile = user.profile || {}; return Boolean(user.avatar || user.discordAvatar || profile.avatar || profile.banner || profile.discordBanner || profile.username || user.name || user.discordUsername || user.discordTag || user.provider === 'discord' || user.authProvider === 'discord'); }
function shouldRecoverUser(user = {}) { if (!hasValidDiscordId(user)) return false; if (envTrue('REAL_DATA_RECOVER_DISCORD_ID_ONLY')) return true; return hasRealProfileSignal(user); }
function shouldRecoverTeam(team = {}) { if (!team || typeof team !== 'object') return false; return Boolean(String(team.name || team.title || team.tag || team.id || '').trim()); }
function sanitizeRecoveredUser(user = {}) { const clean = deepMergeFillMissing({}, user); delete clean.deletedAt; delete clean.removedAt; delete clean.hidden; delete clean.hiddenFromPlayersDirectory; clean.provider = clean.provider || clean.authProvider || 'discord'; clean.updatedAt = clean.updatedAt || clean.createdAt || new Date().toISOString(); return clean; }
function sanitizeRecoveredTeam(team = {}) { const clean = deepMergeFillMissing({}, team); delete clean.deletedAt; delete clean.removedAt; delete clean.hidden; delete clean.archived; clean.updatedAt = clean.updatedAt || clean.createdAt || new Date().toISOString(); clean.recreateDeletedTeam = true; clean.allowRegisteredDataRestore = true; return clean; }
function mergeByIdentity(currentItems = [], recoveredItems = [], identityFn, options = {}) {
  const map = new Map();
  const modified = new Set();
  const put = (item, source) => {
    if (!item || typeof item !== 'object') return;
    const key = identityFn(item);
    if (!key) return;
    const nextItem = options.sanitize ? options.sanitize(item) : item;
    const previous = map.get(key);
    if (!previous) { map.set(key, { ...nextItem }); return; }
    const previousTime = itemTime(previous);
    const nextTime = itemTime(nextItem);
    let base;
    let extra;
    if (source === 'current') { base = nextItem; extra = previous; }
    else if (nextTime > previousTime) { base = nextItem; extra = previous; }
    else { base = previous; extra = nextItem; }
    const merged = deepMergeFillMissing(base, extra);
    if (stableJson(merged) !== stableJson(previous)) modified.add(key);
    map.set(key, merged);
  };
  (Array.isArray(recoveredItems) ? recoveredItems : []).forEach((item) => put(item, 'recovered'));
  (Array.isArray(currentItems) ? currentItems : []).forEach((item) => put(item, 'current'));
  return { items: Array.from(map.values()), modified: modified.size };
}
function normalizeDeletedApplicationIds(database = {}) { const settings = database.settings && typeof database.settings === 'object' ? database.settings : {}; const values = [...(Array.isArray(database.deletedPlayerApplicationIds) ? database.deletedPlayerApplicationIds : []), ...(Array.isArray(settings.deletedPlayerApplicationIds) ? settings.deletedPlayerApplicationIds : []), ...(Array.isArray(settings.forms?.deletedPlayerApplicationIds) ? settings.forms.deletedPlayerApplicationIds : [])]; return new Set(values.map((item) => String(typeof item === 'string' ? item : item?.id || item?.applicationId || '').trim()).filter(Boolean)); }
function filterDeletedApplications(applications = [], deletedIds = new Set()) { return (Array.isArray(applications) ? applications : []).filter((item) => !deletedIds.has(String(item?.id || '').trim())); }
function databaseSupportTickets(database = {}) { return Array.isArray(database.settings?.supportTickets) ? database.settings.supportTickets : []; }
function collectRecoveryArrays(history = [], currentDatabase = {}) {
  const recovered = { users: [], teams: [], events: [], playerApplications: [], trainingSubmissions: [], eventRegistrationRequests: [], supportTickets: [] };
  history.forEach(({ database }) => {
    if (!database || typeof database !== 'object') return;
    recovered.users.push(...(Array.isArray(database.users) ? database.users.filter(shouldRecoverUser).map(sanitizeRecoveredUser) : []));
    recovered.teams.push(...(Array.isArray(database.teams) ? database.teams.filter(shouldRecoverTeam).map(sanitizeRecoveredTeam) : []));
    recovered.events.push(...(Array.isArray(database.events) ? database.events : []));
    recovered.playerApplications.push(...(Array.isArray(database.playerApplications) ? database.playerApplications : []));
    recovered.trainingSubmissions.push(...(Array.isArray(database.trainingSubmissions) ? database.trainingSubmissions : []));
    recovered.eventRegistrationRequests.push(...(Array.isArray(database.eventRegistrationRequests) ? database.eventRegistrationRequests : []));
    recovered.supportTickets.push(...databaseSupportTickets(database));
  });
  recovered.playerApplications = filterDeletedApplications(recovered.playerApplications, normalizeDeletedApplicationIds(currentDatabase));
  return recovered;
}
async function collectRecoveryHistory() {
  const databases = [];
  const seenPaths = new Set();
  const pushBackup = async (backupPath) => { const safePath = String(backupPath || '').trim(); if (!safePath || seenPaths.has(safePath)) return; seenPaths.add(safePath); const backup = await githubBackups.fetchBackupFromGitHubPath(safePath).catch(() => null); const database = parseBackupDatabase(backup || {}); if (database) databases.push({ path: safePath, database, summary: backup?.summary || {} }); };
  await pushBackup(CLEAN_SNAPSHOT_PATH);
  const recent = await githubBackups.listBackupsFromGitHub({ limit: HISTORY_SCAN_LIMIT }).catch(() => []);
  for (const item of recent) await pushBackup(item.path);
  return databases;
}
function countAdded(current = [], merged = [], identityFn) { const before = new Set((Array.isArray(current) ? current : []).map(identityFn).filter(Boolean)); return (Array.isArray(merged) ? merged : []).filter((item) => !before.has(identityFn(item))).length; }
async function restoreRealStateIfNeeded(storage) {
  if (envTrue('REAL_STATE_RECOVERY_DISABLE')) return { success: true, skipped: true, reason: 'real_state_recovery_disabled' };
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
  if (!history.length) return { success: true, skipped: true, reason: 'no_backup_history_available_current_data_preserved' };
  const recovered = collectRecoveryArrays(history, currentDatabase);
  const usersMerge = mergeByIdentity(currentUsers, recovered.users, userIdentity, { sanitize: sanitizeRecoveredUser });
  const teamsMerge = mergeByIdentity(currentTeams, recovered.teams, teamIdentity, { sanitize: sanitizeRecoveredTeam });
  const eventsMerge = mergeByIdentity(currentEvents, recovered.events, (item) => recordIdentity(item, 'event'));
  const applicationsMerge = mergeByIdentity(currentApplications, recovered.playerApplications, (item) => recordIdentity(item, 'application'));
  const trainingMerge = mergeByIdentity(currentTraining, recovered.trainingSubmissions, (item) => recordIdentity(item, 'training'));
  const requestsMerge = mergeByIdentity(currentRequests, recovered.eventRegistrationRequests, (item) => recordIdentity(item, 'event-request'));
  const supportMerge = mergeByIdentity(currentSupportTickets, recovered.supportTickets, (item) => recordIdentity(item, 'support'));
  const mergedUsers = usersMerge.items;
  const mergedTeams = teamsMerge.items;
  const mergedEvents = eventsMerge.items;
  const mergedApplications = applicationsMerge.items;
  const mergedTraining = trainingMerge.items;
  const mergedRequests = requestsMerge.items;
  const mergedSupportTickets = supportMerge.items;
  const addedUsers = countAdded(currentUsers, mergedUsers, userIdentity);
  const addedTeams = countAdded(currentTeams, mergedTeams, teamIdentity);
  const addedEvents = countAdded(currentEvents, mergedEvents, (item) => recordIdentity(item, 'event'));
  const addedApplications = countAdded(currentApplications, mergedApplications, (item) => recordIdentity(item, 'application'));
  const addedTraining = countAdded(currentTraining, mergedTraining, (item) => recordIdentity(item, 'training'));
  const addedRequests = countAdded(currentRequests, mergedRequests, (item) => recordIdentity(item, 'event-request'));
  const addedSupportTickets = countAdded(currentSupportTickets, mergedSupportTickets, (item) => recordIdentity(item, 'support'));
  const modifiedUsers = usersMerge.modified;
  const modifiedTeams = teamsMerge.modified;
  const modifiedEvents = eventsMerge.modified;
  const modifiedApplications = applicationsMerge.modified;
  const modifiedTraining = trainingMerge.modified;
  const modifiedRequests = requestsMerge.modified;
  const modifiedSupportTickets = supportMerge.modified;
  const totalAdded = addedUsers + addedTeams + addedEvents + addedApplications + addedTraining + addedRequests + addedSupportTickets;
  const totalModified = modifiedUsers + modifiedTeams + modifiedEvents + modifiedApplications + modifiedTraining + modifiedRequests + modifiedSupportTickets;
  const teamKeys = Array.from(new Set(mergedTeams.map(teamNameKey).filter(Boolean))).slice(0, 80);
  if (!totalAdded && !totalModified) return { success: true, skipped: true, reason: 'all_current_registered_data_already_present', current: { users: currentUsers.length, teams: currentTeams.length, events: currentEvents.length, playerApplications: currentApplications.length, trainingSubmissions: currentTraining.length, eventRegistrationRequests: currentRequests.length, supportTickets: currentSupportTickets.length }, scannedBackups: history.length, teamKeys };
  const deletedPlayerApplicationIds = Array.from(normalizeDeletedApplicationIds(currentDatabase));
  const nextDatabase = { ...currentDatabase, users: mergedUsers, teams: mergedTeams, events: mergedEvents, playerApplications: mergedApplications, trainingSubmissions: mergedTraining, eventRegistrationRequests: mergedRequests, settings: { ...(currentDatabase.settings || {}), supportTickets: mergedSupportTickets, deletedPlayerApplicationIds, forms: { ...(currentDatabase.settings?.forms || {}), deletedPlayerApplicationIds }, support: { ...(currentDatabase.settings?.support || {}), updatedAt: new Date().toISOString(), mergePolicy: 'current-plus-support-tickets-from-backups' } }, meta: { ...(currentDatabase.meta || {}), allowRegisteredDataRestore: true, restoreRegisteredPlayersAndTeams: true, realDataMergeRecoveredAt: new Date().toISOString(), realDataMergePolicy: 'current-plus-all-registered-users-teams-profiles-socials-logos-events-forms-support-from-backups', realDataMergeScannedBackups: history.length } };
  const imported = await storage.importDatabaseBackup({ type: 'void-arena-database-backup', version: 1, allowRegisteredDataRestore: true, database: nextDatabase, exportedAt: new Date().toISOString(), meta: nextDatabase.meta });
  const savedBackup = await githubBackups.saveBackupToGitHub(storage, { reason: 'manual-restore-registered-players-teams-profiles-socials' }).catch((error) => ({ success: false, message: error.message }));
  return { success: true, restored: true, reason: 'current_data_merged_with_registered_backup_history_without_replacing_state', addedUsers, addedTeams, addedEvents, addedApplications, addedTraining, addedRequests, addedSupportTickets, modifiedUsers, modifiedTeams, modifiedEvents, modifiedApplications, modifiedTraining, modifiedRequests, modifiedSupportTickets, before: { users: currentUsers.length, teams: currentTeams.length, events: currentEvents.length, playerApplications: currentApplications.length, trainingSubmissions: currentTraining.length, eventRegistrationRequests: currentRequests.length, supportTickets: currentSupportTickets.length }, after: { users: mergedUsers.length, teams: mergedTeams.length, events: mergedEvents.length, playerApplications: mergedApplications.length, trainingSubmissions: mergedTraining.length, eventRegistrationRequests: mergedRequests.length, supportTickets: mergedSupportTickets.length }, scannedBackups: history.length, teamKeys, imported, backupAfterMerge: savedBackup };
}
async function restoreNamedUsersFromBackup() { return { success: true, skipped: true, reason: 'named_restore_removed_to_prevent_resurrection' }; }
async function recoverUsersAndTeamsFromBackup(storage) {
  const realState = await restoreRealStateIfNeeded(storage).catch((error) => ({ success: false, skipped: true, reason: 'real_data_merge_failed_current_data_preserved', message: error.message }));
  return { success: Boolean(realState.success), restored: Boolean(realState.restored), skipped: !realState.restored, reason: realState.reason || 'real_data_merge_checked', realState, restoredUsers: realState.addedUsers || 0, restoredTeams: realState.addedTeams || 0, note: 'Fluxo preservado: banco atual continua, dados registrados ausentes de jogadores/times/perfis/redes/logos/eventos/formularios/suporte entram por merge, e dados atuais vencem campos preenchidos.' };
}
module.exports = { recoverUsersAndTeamsFromBackup, restoreNamedUsersFromBackup, parseBackupDatabase, CLEAN_SNAPSHOT_PATH };