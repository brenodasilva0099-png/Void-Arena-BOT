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

async function readTombstones() {
  try {
    const raw = await fs.readFile(TOMBSTONE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const items = Array.isArray(parsed) ? parsed : parsed.deletedTeamIds;
    return new Set((Array.isArray(items) ? items : []).map(normalizeId).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function writeTombstones(ids) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = {
    deletedTeamIds: Array.from(ids).sort(),
    updatedAt: new Date().toISOString()
  };
  const temp = `${TOMBSTONE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(payload, null, 2));
  await fs.rename(temp, TOMBSTONE_FILE);
}

function queueWrite(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

function installTeamDeletionGuard(storage) {
  if (!storage || installed) return storage;
  installed = true;

  const originalReadTeams = storage.readTeams.bind(storage);
  const originalSaveTeam = storage.saveTeam.bind(storage);
  const originalDeleteTeam = storage.deleteTeam.bind(storage);

  storage.readTeams = async function guardedReadTeams() {
    const [teams, deletedIds] = await Promise.all([
      originalReadTeams(),
      readTombstones()
    ]);
    return (Array.isArray(teams) ? teams : []).filter((team) => !deletedIds.has(normalizeId(team?.id)));
  };

  storage.saveTeam = async function guardedSaveTeam(team = {}) {
    const id = normalizeId(team.id);
    if (!id) return originalSaveTeam(team);

    const deletedIds = await readTombstones();
    if (deletedIds.has(id) && team.recreateDeletedTeam !== true) {
      const error = new Error('Este time foi excluido permanentemente e nao pode ser recriado por dados antigos.');
      error.code = 'TEAM_PERMANENTLY_DELETED';
      throw error;
    }

    if (team.recreateDeletedTeam === true) {
      deletedIds.delete(id);
      await queueWrite(() => writeTombstones(deletedIds));
      const cleanTeam = { ...team };
      delete cleanTeam.recreateDeletedTeam;
      return originalSaveTeam(cleanTeam);
    }

    return originalSaveTeam(team);
  };

  storage.deleteTeam = async function guardedDeleteTeam(id) {
    const teamId = normalizeId(id);
    if (!teamId) return false;

    const result = await originalDeleteTeam(teamId);
    await queueWrite(async () => {
      const deletedIds = await readTombstones();
      deletedIds.add(teamId);
      await writeTombstones(deletedIds);
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
  TOMBSTONE_FILE
};
