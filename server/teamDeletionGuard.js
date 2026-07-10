const fs = require('node:fs/promises');
const path = require('node:path');

const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : PROJECT_DATA_DIR;
const TOMBSTONE_FILE = path.join(DATA_DIR, 'deleted-team-ids.json');

let installed = false;
let writeQueue = Promise.resolve();

function normalizeId(value = '') {
  return String(value || '').trim();
}

function timeMs(value = '') {
  const ms = new Date(value || '').getTime();
  return Number.isFinite(ms) ? ms : 0;
}

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
      records.set(id, {
        id,
        deletedAt: typeof item === 'object' && item?.deletedAt ? item.deletedAt : fallbackDeletedAt
      });
    });

    return { records, updatedAt: fallbackDeletedAt };
  } catch {
    return { records: new Map(), updatedAt: null };
  }
}

async function readTombstones() {
  const data = await readTombstoneData();
  return new Set(data.records.keys());
}

async function writeTombstoneRecords(records) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const now = new Date().toISOString();
  const payload = {
    deletedTeamIds: Array.from(records.values())
      .map((record) => ({ id: record.id, deletedAt: record.deletedAt || now }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    updatedAt: now
  };
  const temp = `${TOMBSTONE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(payload, null, 2));
  await fs.rename(temp, TOMBSTONE_FILE);
}

async function writeTombstones(ids) {
  const now = new Date().toISOString();
  const records = new Map(Array.from(ids).map((id) => [normalizeId(id), { id: normalizeId(id), deletedAt: now }]).filter(([id]) => id));
  return writeTombstoneRecords(records);
}

function queueWrite(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

function teamIsNewerThanDeletion(team = {}, record = {}) {
  const deletedAt = timeMs(record.deletedAt);
  if (!deletedAt) return false;
  const createdAt = timeMs(team.createdAt);
  const updatedAt = timeMs(team.updatedAt);
  return Math.max(createdAt, updatedAt) > deletedAt;
}

async function forgetDeletedTeamId(teamId = '') {
  const id = normalizeId(teamId);
  if (!id) return false;
  return queueWrite(async () => {
    const { records } = await readTombstoneData();
    if (!records.has(id)) return false;
    records.delete(id);
    await writeTombstoneRecords(records);
    console.log(`[Times] ID ${id} removido da lista de exclusoes permanentes por novo cadastro/salvamento explicito.`);
    return true;
  });
}

function installTeamDeletionGuard(storage) {
  if (!storage || installed) return storage;
  installed = true;

  const originalReadTeams = storage.readTeams.bind(storage);
  const originalSaveTeam = storage.saveTeam.bind(storage);
  const originalDeleteTeam = storage.deleteTeam.bind(storage);

  storage.readTeams = async function guardedReadTeams() {
    const [teams, tombstoneData] = await Promise.all([
      originalReadTeams(),
      readTombstoneData()
    ]);

    const visibleTeams = [];
    const revivedIds = [];

    (Array.isArray(teams) ? teams : []).forEach((team) => {
      const id = normalizeId(team?.id);
      const record = tombstoneData.records.get(id);
      if (!record) {
        visibleTeams.push(team);
        return;
      }

      if (teamIsNewerThanDeletion(team, record)) {
        visibleTeams.push(team);
        revivedIds.push(id);
      }
    });

    if (revivedIds.length) {
      await queueWrite(async () => {
        const { records } = await readTombstoneData();
        revivedIds.forEach((id) => records.delete(id));
        await writeTombstoneRecords(records);
      });
      console.log(`[Times] ${revivedIds.length} time(s) criado(s) apos exclusao foram reativados na listagem.`);
    }

    return visibleTeams;
  };

  storage.saveTeam = async function guardedSaveTeam(team = {}) {
    const id = normalizeId(team.id);
    if (!id) return originalSaveTeam(team);

    // Salvamento vindo do site é uma ação explícita do usuário. Se o mesmo ID estiver
    // marcado como excluído por causa de backup antigo/cache/recriação, removemos o
    // bloqueio antes de salvar para o time recém-cadastrado aparecer normalmente.
    await forgetDeletedTeamId(id);

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

    console.log(`[Times] Exclusao permanente registrada para ${teamId}.`);
    return result;
  };

  console.log(`[Times] Protecao contra restauracao de times excluidos ativa em ${TOMBSTONE_FILE}.`);
  return storage;
}

module.exports = {
  installTeamDeletionGuard,
  readTombstones,
  forgetDeletedTeamId,
  TOMBSTONE_FILE
};
