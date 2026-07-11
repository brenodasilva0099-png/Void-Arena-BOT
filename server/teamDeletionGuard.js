const fs = require('node:fs/promises');
const path = require('node:path');

const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : PROJECT_DATA_DIR;
const TOMBSTONE_FILE = path.join(DATA_DIR, 'deleted-team-ids.json');

let installed = false;
let writeQueue = Promise.resolve();

function normalizeId(value = '') { return String(value || '').trim(); }
function timeMs(value = '') { const ms = new Date(value || '').getTime(); return Number.isFinite(ms) ? ms : 0; }

async function readTombstoneData() {
  try {
    const raw = await fs.readFile(TOMBSTONE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const fallbackDeletedAt = parsed.updatedAt || null;
    const items = Array.isArray(parsed) ? parsed : parsed.deletedTeamIds;
    const records = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const id = normalizeId(typeof item === 'string' ? item : item?.id || item?.teamId);
      if (!id) return;
      records.set(id, { id, deletedAt: typeof item === 'object' && item?.deletedAt ? item.deletedAt : fallbackDeletedAt });
    });
    return { records, updatedAt: fallbackDeletedAt };
  } catch { return { records: new Map(), updatedAt: null }; }
}
async function readTombstones() { const data = await readTombstoneData(); return new Set(data.records.keys()); }
async function writeTombstoneRecords(records) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const now = new Date().toISOString();
  const payload = { deletedTeamIds: Array.from(records.values()).map((record) => ({ id: record.id, deletedAt: record.deletedAt || now })).sort((a, b) => a.id.localeCompare(b.id)), updatedAt: now };
  const temp = `${TOMBSTONE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(payload, null, 2));
  await fs.rename(temp, TOMBSTONE_FILE);
}
async function writeTombstones(ids) {
  const now = new Date().toISOString();
  const records = new Map(Array.from(ids).map((id) => [normalizeId(id), { id: normalizeId(id), deletedAt: now }]).filter(([id]) => id));
  return writeTombstoneRecords(records);
}
function queueWrite(task) { const run = writeQueue.then(task, task); writeQueue = run.catch(() => {}); return run; }
function teamTime(team = {}) { return Math.max(timeMs(team.createdAt), timeMs(team.updatedAt)); }
function shouldBlockRestoredTeam(team = {}, record = {}) {
  const deletedAt = timeMs(record.deletedAt);
  const savedAt = teamTime(team);
  if (!deletedAt || !savedAt) return false;
  return savedAt <= deletedAt;
}
async function forgetDeletedTeamId(teamId = '') {
  const id = normalizeId(teamId);
  if (!id) return false;
  return queueWrite(async () => {
    const { records } = await readTombstoneData();
    if (!records.has(id)) return false;
    records.delete(id);
    await writeTombstoneRecords(records);
    console.log(`[Times] ID ${id} removido da lista de exclusoes por salvamento/cadastro atual.`);
    return true;
  });
}
async function removeTombstonedTeamsFromImportedStorage(originalReadTeams, originalDeleteTeam) {
  const [teams, tombstoneData] = await Promise.all([originalReadTeams(), readTombstoneData()]);
  const removed = [];
  for (const team of Array.isArray(teams) ? teams : []) {
    const id = normalizeId(team?.id);
    const record = tombstoneData.records.get(id);
    if (!record || !shouldBlockRestoredTeam(team, record)) continue;
    await originalDeleteTeam(id).catch(() => false);
    removed.push(id);
  }
  if (removed.length) console.log(`[Times] ${removed.length} time(s) antigos removidos apos import/restore de backup: ${removed.join(', ')}`);
  return removed;
}
function installTeamDeletionGuard(storage) {
  if (!storage || installed) return storage;
  installed = true;
  const originalReadTeams = storage.readTeams.bind(storage);
  const originalSaveTeam = storage.saveTeam.bind(storage);
  const originalDeleteTeam = storage.deleteTeam.bind(storage);
  const originalImportDatabaseBackup = typeof storage.importDatabaseBackup === 'function' ? storage.importDatabaseBackup.bind(storage) : null;

  // Leitura normal deve refletir o banco atual. A limpeza de times antigos acontece no restore/import.
  storage.readTeams = async function guardedReadTeams() {
    return originalReadTeams();
  };

  storage.saveTeam = async function guardedSaveTeam(team = {}) {
    const id = normalizeId(team.id);
    if (id) await forgetDeletedTeamId(id);
    const cleanTeam = { ...team };
    delete cleanTeam.recreateDeletedTeam;
    return originalSaveTeam(cleanTeam);
  };

  storage.deleteTeam = async function guardedDeleteTeam(id) {
    const teamId = normalizeId(id);
    if (!teamId) return false;
    const result = await originalDeleteTeam(teamId);
    await queueWrite(async () => {
      const { records } = await readTombstoneData();
      records.set(teamId, { id: teamId, deletedAt: new Date().toISOString() });
      await writeTombstoneRecords(records);
    });
    console.log(`[Times] Exclusao registrada para ${teamId}.`);
    return result;
  };

  if (originalImportDatabaseBackup) {
    storage.importDatabaseBackup = async function guardedImportDatabaseBackup(payload = {}) {
      const result = await originalImportDatabaseBackup(payload);
      const removed = await removeTombstonedTeamsFromImportedStorage(originalReadTeams, originalDeleteTeam);
      return { ...result, removedTombstonedTeams: removed };
    };
  }

  console.log(`[Times] Protecao contra restauracao de times excluidos ativa em ${TOMBSTONE_FILE}.`);
  return storage;
}
module.exports = { installTeamDeletionGuard, readTombstones, forgetDeletedTeamId, TOMBSTONE_FILE };
