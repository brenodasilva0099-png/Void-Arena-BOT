const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'storage.js');
if (!fs.existsSync(file)) process.exit(0);

let src = fs.readFileSync(file, 'utf8');
let changed = false;

function replaceOnce(from, to) {
  if (!src.includes(from)) return false;
  src = src.replace(from, to);
  changed = true;
  return true;
}

replaceOnce(
`function normalizeTournamentEvents(rawEvents = []) {
  const source = Array.isArray(rawEvents) && rawEvents.length ? rawEvents : DEFAULT_TOURNAMENT_EVENTS;
  const normalized = source.map(normalizeTournamentEvent);

  if (!normalized.some((event) => event.id === 'coliseu-void-arena')) {
    normalized.unshift(normalizeTournamentEvent(DEFAULT_TOURNAMENT_EVENTS[0]));
  }

  return normalized;
}`,
`function normalizeTournamentEvents(rawEvents = []) {
  const source = Array.isArray(rawEvents) ? rawEvents : [];
  return source.map(normalizeTournamentEvent);
}`
);

replaceOnce(
`async function exportDatabaseBackup() {
  const db = await readDatabase();
  const rawJson = JSON.stringify(db);
  const compressed = zlib.gzipSync(Buffer.from(rawJson, 'utf8')).toString('base64');`,
`async function exportDatabaseBackup() {
  await ensureDatabase();
  const rawJson = await fs.readFile(DB_FILE, 'utf8');
  const db = JSON.parse(rawJson || '{}');
  const compressed = zlib.gzipSync(Buffer.from(rawJson || '{}', 'utf8')).toString('base64');`
);

replaceOnce(
`  try {
    return normalizeDatabase(JSON.parse(raw || '{}'));
  } catch {
    const backupName = \`abyss-tournament-db-corrompido-\${Date.now()}.json\`;
    await fs.rename(DB_FILE, path.join(DATA_DIR, backupName));
    const recovered = await readLegacyDatabase();
    await writeDatabase(recovered, { mirrorLegacy: true });
    return recovered;
  }`,
`  try {
    return normalizeDatabase(JSON.parse(raw || '{}'));
  } catch (error) {
    const failure = new Error('Banco JSON corrompido. O arquivo foi preservado e nenhuma restauração automática foi executada.');
    failure.cause = error;
    throw failure;
  }`
);

replaceOnce(
`async function readTeams() {
  const db = await readDatabase();

  if (Array.isArray(db.teams) && db.teams.length) {
    return db.teams;
  }

  // Fallback de segurança: se o banco central estiver vazio por algum motivo,
  // religa os times já cadastrados do arquivo legado teams.json.
  const legacy = await readJsonIfExists(LEGACY_TEAMS_FILE, { teams: [] });
  const legacyTeams = Array.isArray(legacy?.teams) ? legacy.teams : [];

  if (legacyTeams.length) {
    await updateDatabase((currentDb) => {
      if (!Array.isArray(currentDb.teams) || !currentDb.teams.length) {
        currentDb.teams = legacyTeams;
      }
      return currentDb.teams;
    });

    return legacyTeams;
  }

  return [];
}`,
`async function readTeams() {
  const db = await readDatabase();
  return Array.isArray(db.teams) ? db.teams : [];
}`
);

replaceOnce(
`    events: Array.isArray(db.events) ? db.events.length : 0,
    trainingSubmissions: Array.isArray(db.trainingSubmissions) ? db.trainingSubmissions.length : 0,
    messages: Array.isArray(db.messages) ? db.messages.length : 0,`,
`    events: Array.isArray(db.events) ? db.events.length : 0,
    playerApplications: Array.isArray(db.playerApplications) ? db.playerApplications.length : 0,
    trainingSubmissions: Array.isArray(db.trainingSubmissions) ? db.trainingSubmissions.length : 0,
    eventRegistrationRequests: Array.isArray(db.eventRegistrationRequests) ? db.eventRegistrationRequests.length : 0,
    messages: Array.isArray(db.messages) ? db.messages.length : 0,`
);

if (changed) fs.writeFileSync(file, src, 'utf8');
const finalSource = fs.readFileSync(file, 'utf8');
new Function(finalSource);
for (const marker of [
  "const rawJson = await fs.readFile(DB_FILE, 'utf8');",
  'playerApplications: Array.isArray(db.playerApplications)',
  'eventRegistrationRequests: Array.isArray(db.eventRegistrationRequests)',
  'O arquivo foi preservado e nenhuma restauração automática foi executada.'
]) {
  if (!finalSource.includes(marker)) throw new Error(`Regra de fidelidade ausente: ${marker}`);
}
console.log(changed
  ? '[Data/Purity] Backup bruto, formulários contabilizados, eventos sem injeção, leitura sem escrita e corrupção preservada.'
  : '[Data/Purity] Regras de fidelidade do banco já estavam aplicadas.');