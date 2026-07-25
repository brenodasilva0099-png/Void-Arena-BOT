require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const githubBackups = require('../server/githubBackups');
const storage = require('../server/storage');

const AUTHORIZATION = '2026-07-25-user-approved-emergency-protected-union-v1';
const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : PROJECT_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'abyss-tournament-db.json');

const COLLECTIONS = [
  'users',
  'teams',
  'events',
  'playerApplications',
  'trainingSubmissions',
  'eventRegistrationRequests',
  'messages',
  'messageArchives',
  'teamChats'
];

function clean(value = '') {
  return String(value || '').trim();
}

function normalize(value = '') {
  return clean(value).toLowerCase();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEmptyValue(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function mergePreferCurrent(current, older) {
  if (current === undefined || current === null || current === '') return clone(older);
  if (Array.isArray(current)) return current.length ? clone(current) : clone(Array.isArray(older) ? older : current);
  if (!isPlainObject(current) || !isPlainObject(older)) return clone(current);

  const merged = clone(current) || {};
  for (const [key, value] of Object.entries(older)) {
    if (!(key in merged) || isEmptyValue(merged[key])) merged[key] = clone(value);
    else if (isPlainObject(merged[key]) && isPlainObject(value)) merged[key] = mergePreferCurrent(merged[key], value);
  }
  return merged;
}

function identityFor(collection, item = {}) {
  if (!item || typeof item !== 'object') return '';

  if (collection === 'users') {
    if (clean(item.discordId)) return `discord:${clean(item.discordId)}`;
    if (clean(item.id)) return `id:${clean(item.id)}`;
    if (clean(item.email)) return `email:${normalize(item.email)}`;
  }

  if (collection === 'teams') {
    if (clean(item.id)) return `id:${clean(item.id)}`;
    const name = normalize(item.name || item.teamName);
    const tag = normalize(item.tag);
    if (name || tag) return `team:${name}|${tag}`;
  }

  if (collection === 'events') {
    if (clean(item.id)) return `id:${clean(item.id)}`;
    if (clean(item.name || item.title)) return `event:${normalize(item.name || item.title)}`;
  }

  if (collection === 'playerApplications') {
    if (clean(item.id)) return `id:${clean(item.id)}`;
    return `application:${clean(item.discordId || item.userId)}|${clean(item.createdAt)}|${normalize(item.userName || item.discordTag)}`;
  }

  if (collection === 'eventRegistrationRequests') {
    if (clean(item.id)) return `id:${clean(item.id)}`;
    return `event-request:${clean(item.eventId)}|${clean(item.teamId)}|${clean(item.createdAt)}`;
  }

  if (collection === 'messages' || collection === 'messageArchives') {
    if (clean(item.id)) return `id:${clean(item.id)}`;
    if (clean(item.discordMessageId)) return `discord:${clean(item.discordMessageId)}`;
    return `message:${clean(item.channelId)}|${clean(item.createdAt)}|${clean(item.authorId)}|${clean(item.content).slice(0, 80)}`;
  }

  if (clean(item.id)) return `id:${clean(item.id)}`;
  return `${collection}:${crypto.createHash('sha1').update(JSON.stringify(item)).digest('hex')}`;
}

function mergeCollection(collection, currentItems = [], backupItems = []) {
  const result = [];
  const positions = new Map();

  for (const item of Array.isArray(currentItems) ? currentItems : []) {
    const key = identityFor(collection, item);
    if (!key || positions.has(key)) continue;
    positions.set(key, result.length);
    result.push(clone(item));
  }

  for (const item of Array.isArray(backupItems) ? backupItems : []) {
    const key = identityFor(collection, item);
    if (!key) continue;
    if (!positions.has(key)) {
      positions.set(key, result.length);
      result.push(clone(item));
      continue;
    }
    const index = positions.get(key);
    result[index] = mergePreferCurrent(result[index], item);
  }

  return result;
}

function decodeBackup(backup = {}) {
  if (backup?.type !== 'void-arena-database-backup' || backup?.format !== 'gzip-base64-json' || !backup?.database) {
    throw new Error('Snapshot não contém um banco compactado válido.');
  }
  const raw = zlib.gunzipSync(Buffer.from(String(backup.database), 'base64')).toString('utf8');
  return JSON.parse(raw || '{}');
}

function summary(db = {}) {
  const bracket = isPlainObject(db.bracket) ? db.bracket : {};
  return {
    users: Array.isArray(db.users) ? db.users.length : 0,
    teams: Array.isArray(db.teams) ? db.teams.length : 0,
    events: Array.isArray(db.events) ? db.events.length : 0,
    playerApplications: Array.isArray(db.playerApplications) ? db.playerApplications.length : 0,
    trainingSubmissions: Array.isArray(db.trainingSubmissions) ? db.trainingSubmissions.length : 0,
    eventRegistrationRequests: Array.isArray(db.eventRegistrationRequests) ? db.eventRegistrationRequests.length : 0,
    messages: Array.isArray(db.messages) ? db.messages.length : 0,
    teamChats: Array.isArray(db.teamChats) ? db.teamChats.length : 0,
    bracketSlots: Array.isArray(bracket.slots) ? bracket.slots.filter(Boolean).length : 0
  };
}

function candidateScore(item = {}) {
  const s = item.summary || {};
  return (
    Number(s.users || 0) * 1000000 +
    Number(s.teams || 0) * 100000 +
    Number(s.events || 0) * 10000 +
    Number(s.playerApplications || 0) * 1000 +
    Number(s.eventRegistrationRequests || 0) * 100 +
    Number(s.teamChats || 0) * 10 +
    Number(s.messages || 0)
  );
}

async function readCurrentDatabase() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return { exists: true, raw, database: JSON.parse(raw || '{}') };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, raw: '', database: {} };
    throw new Error(`Banco ativo não pôde ser lido e foi preservado: ${error.message}`);
  }
}

async function loadCandidateDatabases() {
  const candidates = [];
  const latest = await githubBackups.fetchLatestBackupFromGitHub();
  candidates.push({
    path: 'latest/void-arena-backup-latest.json',
    savedAt: latest.githubBackup?.savedAt || latest.exportedAt || null,
    summary: latest.summary || {},
    database: decodeBackup(latest)
  });

  const history = await githubBackups.listBackupsFromGitHub({ limit: 40 }).catch((error) => {
    console.warn('[Data/Emergency Recovery] Histórico parcial indisponível:', error.message);
    return [];
  });

  const selected = history
    .slice()
    .sort((a, b) => candidateScore(b) - candidateScore(a) || new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
    .slice(0, 12);

  for (const item of selected) {
    if (!item?.path || item.path === 'latest/void-arena-backup-latest.json') continue;
    const backup = await githubBackups.fetchBackupFromGitHubPath(item.path).catch((error) => {
      console.warn(`[Data/Emergency Recovery] Snapshot ignorado (${item.path}):`, error.message);
      return null;
    });
    if (!backup) continue;
    candidates.push({
      path: item.path,
      savedAt: backup.githubBackup?.savedAt || backup.exportedAt || item.savedAt || null,
      summary: backup.summary || item.summary || {},
      database: decodeBackup(backup)
    });
  }

  return candidates;
}

function mergeDatabases(currentDb = {}, candidates = []) {
  let merged = clone(currentDb) || {};
  for (const collection of COLLECTIONS) {
    merged[collection] = Array.isArray(merged[collection]) ? merged[collection] : [];
  }
  merged.settings = isPlainObject(merged.settings) ? merged.settings : {};
  merged.rolePermissions = isPlainObject(merged.rolePermissions) ? merged.rolePermissions : {};
  merged.bracket = isPlainObject(merged.bracket) ? merged.bracket : {};

  for (const candidate of candidates) {
    const db = candidate.database || {};
    for (const collection of COLLECTIONS) {
      merged[collection] = mergeCollection(collection, merged[collection], db[collection]);
    }
    merged.settings = mergePreferCurrent(merged.settings, isPlainObject(db.settings) ? db.settings : {});
    merged.rolePermissions = mergePreferCurrent(merged.rolePermissions, isPlainObject(db.rolePermissions) ? db.rolePermissions : {});
    merged.bracket = mergePreferCurrent(merged.bracket, isPlainObject(db.bracket) ? db.bracket : {});
    merged.meta = mergePreferCurrent(isPlainObject(merged.meta) ? merged.meta : {}, isPlainObject(db.meta) ? db.meta : {});
  }

  merged.meta = {
    ...(isPlainObject(merged.meta) ? merged.meta : {}),
    name: merged.meta?.name || 'Void Arena Database',
    version: merged.meta?.version || 1,
    createdAt: merged.meta?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emergencyRecovery: {
      authorization: AUTHORIZATION,
      recoveredAt: new Date().toISOString(),
      sources: candidates.map((item) => ({ path: item.path, savedAt: item.savedAt, summary: item.summary }))
    }
  };
  return merged;
}

async function writeSafely(current, merged) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (current.exists) {
    const safetyPath = path.join(DATA_DIR, `abyss-tournament-db.before-protected-union-${Date.now()}.json`);
    await fs.writeFile(safetyPath, current.raw, 'utf8');
    console.log(`[Data/Emergency Recovery] Estado anterior preservado em ${safetyPath}.`);
  }

  const raw = JSON.stringify(merged, null, 2);
  const temp = `${DB_FILE}.protected-union.tmp`;
  await fs.writeFile(temp, raw, 'utf8');
  await fs.rename(temp, DB_FILE);
  return raw;
}

async function main() {
  console.log(`[Data/Emergency Recovery] Autorização explícita: ${AUTHORIZATION}`);
  const current = await readCurrentDatabase();
  const before = summary(current.database);
  const candidates = await loadCandidateDatabases();
  if (!candidates.length) throw new Error('Nenhum snapshot válido foi encontrado.');

  const merged = mergeDatabases(current.database, candidates);
  const after = summary(merged);
  const beforeRaw = current.exists ? JSON.stringify(current.database) : '';
  const afterRaw = JSON.stringify(merged);
  const changed = beforeRaw !== afterRaw;

  if (changed) await writeSafely(current, merged);

  const backupManifest = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'emergency-recovery:protected-union-2026-07-25'
  });
  if (backupManifest?.skipped) {
    throw new Error(`O banco foi recuperado, mas o novo latest foi bloqueado: ${backupManifest.reason || backupManifest.message}`);
  }

  console.log('[Data/Emergency Recovery] União protegida concluída.', {
    changed,
    before,
    after,
    snapshotsConsidered: candidates.length,
    backupPath: backupManifest.backupPath || null,
    latestPath: backupManifest.latestPath || null
  });

  if (after.users < 1 || after.teams < 1 || after.events < 1) {
    throw new Error(`Recuperação incompleta: ${JSON.stringify(after)}`);
  }
}

main().catch((error) => {
  console.error('[Data/Emergency Recovery] Falha fatal:', error.message);
  process.exitCode = 1;
});