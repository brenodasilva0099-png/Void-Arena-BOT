const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'storage.js');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
let changed = false;

function replaceOnce(from, to, message) {
  if (!source.includes(from)) {
    if (!source.includes(to)) throw new Error(message);
    return;
  }
  source = source.replace(from, to);
  changed = true;
}

replaceOnce(
  '  teams: [],\n  bracket: {',
  '  teams: [],\n  teamDeletionTombstones: [],\n  bracket: {',
  'Banco não possui o bloco de times esperado.'
);

replaceOnce(
  '  db.teams = Array.isArray(raw.teams) ? raw.teams : [];\n  db.bracket = {',
  `  db.teamDeletionTombstones = Array.isArray(raw.teamDeletionTombstones)
    ? raw.teamDeletionTombstones.map((item) => ({
      id: String(item?.id || '').trim(),
      name: String(item?.name || '').trim().slice(0, 120),
      tag: String(item?.tag || '').trim().slice(0, 24),
      deletedAt: item?.deletedAt || null,
      reason: String(item?.reason || '').trim().slice(0, 160)
    })).filter((item) => item.id)
    : [];
  const deletedTeamIds = new Set(db.teamDeletionTombstones.map((item) => item.id));
  db.teams = (Array.isArray(raw.teams) ? raw.teams : [])
    .filter((team) => !deletedTeamIds.has(String(team?.id || '')));
  db.bracket = {`,
  'Normalização do banco não possui o bloco de times esperado.'
);

replaceOnce(
`async function readTeams() {
  const db = await readDatabase();
  return Array.isArray(db.teams) ? db.teams : [];
}`,
`async function readTeams() {
  const db = await readDatabase();
  const deletedIds = new Set(
    (Array.isArray(db.teamDeletionTombstones) ? db.teamDeletionTombstones : [])
      .map((item) => String(item?.id || ''))
      .filter(Boolean)
  );
  return (Array.isArray(db.teams) ? db.teams : [])
    .filter((team) => !deletedIds.has(String(team?.id || '')));
}`,
  'Leitura final de times não foi encontrada; execute primeiro o patch de pureza.'
);

replaceOnce(
`async function saveTeam(team) {
  return updateDatabase((db) => {
    db.teams = Array.isArray(db.teams) ? db.teams : [];
    const index = db.teams.findIndex((item) => teamsRepresentSameClub(item, team));`,
`async function saveTeam(team) {
  return updateDatabase((db) => {
    db.teams = Array.isArray(db.teams) ? db.teams : [];
    db.teamDeletionTombstones = Array.isArray(db.teamDeletionTombstones) ? db.teamDeletionTombstones : [];
    const incomingId = String(team?.id || '').trim();
    if (incomingId && db.teamDeletionTombstones.some((item) => String(item?.id || '') === incomingId)) {
      const error = new Error('Este clube foi excluído e não pode ser restaurado por dados antigos.');
      error.code = 'TEAM_TOMBSTONED';
      throw error;
    }
    const index = db.teams.findIndex((item) => teamsRepresentSameClub(item, team));`,
  'saveTeam protegido por identidade não foi encontrado.'
);

const deleteTeamOld = `async function deleteTeam(id) {
  return updateDatabase((db) => {
    const before = db.teams.length;
    db.teams = db.teams.filter((team) => team.id !== id);

    if (db.teams.length !== before) {
      const remainingIds = new Set(db.teams.map((team) => team.id));
      const cleanSlots = (items) => (Array.isArray(items) ? items : []).map((slot) => {
        const slotId = typeof slot === 'string' ? slot : slot?.id;
        return slotId && remainingIds.has(slotId) ? slotId : null;
      });
      db.bracket.slots = cleanSlots(db.bracket.slots);
      db.bracket.round16 = cleanSlots(db.bracket.round16);
      db.bracket.quarters = cleanSlots(db.bracket.quarters);
      db.bracket.semis = cleanSlots(db.bracket.semis);
      db.bracket.finals = cleanSlots(db.bracket.finals);
      return true;
    }

    return false;
  });
}`;

const deleteTeamNew = `async function deleteTeam(id, metadata = {}) {
  return updateDatabase((db) => {
    const targetId = String(id || '').trim();
    if (!targetId) return false;
    db.teams = Array.isArray(db.teams) ? db.teams : [];
    db.teamDeletionTombstones = Array.isArray(db.teamDeletionTombstones) ? db.teamDeletionTombstones : [];
    const removedTeam = db.teams.find((team) => String(team?.id || '') === targetId) || null;
    db.teams = db.teams.filter((team) => String(team?.id || '') !== targetId);

    if (!db.teamDeletionTombstones.some((item) => String(item?.id || '') === targetId)) {
      db.teamDeletionTombstones.push({
        id: targetId,
        name: String(removedTeam?.name || metadata.name || '').trim().slice(0, 120),
        tag: String(removedTeam?.tag || metadata.tag || '').trim().slice(0, 24),
        deletedAt: new Date().toISOString(),
        reason: String(metadata.reason || 'user-requested-team-deletion').trim().slice(0, 160)
      });
    }

    const remainingIds = new Set(db.teams.map((team) => String(team?.id || '')));
    const cleanSlots = (items) => (Array.isArray(items) ? items : []).map((slot) => {
      const slotId = typeof slot === 'string' ? slot : slot?.id;
      return slotId && remainingIds.has(String(slotId)) ? slotId : null;
    });
    db.bracket.slots = cleanSlots(db.bracket.slots);
    db.bracket.round16 = cleanSlots(db.bracket.round16);
    db.bracket.quarters = cleanSlots(db.bracket.quarters);
    db.bracket.semis = cleanSlots(db.bracket.semis);
    db.bracket.finals = cleanSlots(db.bracket.finals);
    return Boolean(removedTeam);
  });
}`;

replaceOnce(
  deleteTeamOld,
  deleteTeamNew,
  'deleteTeam esperado não foi encontrado.'
);

fs.writeFileSync(file, source, 'utf8');
new Function(source);

for (const marker of [
  'teamDeletionTombstones',
  "error.code = 'TEAM_TOMBSTONED'",
  "reason: String(metadata.reason || 'user-requested-team-deletion')"
]) {
  if (!source.includes(marker)) throw new Error(`Proteção de exclusão ausente: ${marker}`);
}

console.log(changed
  ? '[Teams/Delete] Exclusões persistentes com tombstone instaladas.'
  : '[Teams/Delete] Exclusões persistentes já estavam instaladas.');
