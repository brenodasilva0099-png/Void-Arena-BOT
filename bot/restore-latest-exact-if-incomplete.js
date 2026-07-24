require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const githubBackups = require('../server/githubBackups');

const RESTORE_AUTHORIZATION = '2026-07-24-user-approved-exact-latest-v1';
const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : PROJECT_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'abyss-tournament-db.json');

function listLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function databaseSummary(db = {}) {
  const bracket = db.bracket && typeof db.bracket === 'object' ? db.bracket : {};
  return {
    users: listLength(db.users),
    teams: listLength(db.teams),
    events: listLength(db.events),
    playerApplications: listLength(db.playerApplications),
    trainingSubmissions: listLength(db.trainingSubmissions),
    eventRegistrationRequests: listLength(db.eventRegistrationRequests),
    messages: listLength(db.messages),
    messageArchives: listLength(db.messageArchives),
    teamChats: listLength(db.teamChats),
    bracketSlots: Array.isArray(bracket.slots) ? bracket.slots.filter(Boolean).length : 0
  };
}

function activeDatabaseIsIncomplete(summary = {}) {
  return (
    Number(summary.users || 0) <= 1 &&
    Number(summary.teams || 0) === 0 &&
    Number(summary.events || 0) <= 1 &&
    Number(summary.playerApplications || 0) === 0 &&
    Number(summary.trainingSubmissions || 0) === 0 &&
    Number(summary.eventRegistrationRequests || 0) === 0 &&
    Number(summary.messages || 0) === 0 &&
    Number(summary.messageArchives || 0) === 0 &&
    Number(summary.teamChats || 0) === 0 &&
    Number(summary.bracketSlots || 0) === 0
  );
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readActiveDatabase() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const database = JSON.parse(raw || '{}');
    return { exists: true, raw, database, summary: databaseSummary(database) };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { exists: false, raw: '', database: {}, summary: databaseSummary({}) };
    }
    throw new Error(`Banco ativo não pôde ser lido e foi preservado sem alterações: ${error.message}`);
  }
}

function decodeExactBackup(backup = {}) {
  if (backup.type !== 'void-arena-database-backup') {
    throw new Error('O latest não é um backup de banco da Void Arena.');
  }
  if (backup.format !== 'gzip-base64-json' || !backup.database) {
    throw new Error('O latest não contém o banco compactado esperado.');
  }

  const raw = zlib.gunzipSync(Buffer.from(String(backup.database), 'base64')).toString('utf8');
  const database = JSON.parse(raw || '{}');
  return { raw, database, summary: databaseSummary(database) };
}

function validateReplacement(current, latest) {
  if (!activeDatabaseIsIncomplete(current.summary)) {
    return {
      allowed: false,
      reason: 'active_database_has_substantial_data'
    };
  }

  if (latest.summary.users <= current.summary.users || latest.summary.teams <= current.summary.teams) {
    throw new Error(`O latest não é superior ao banco incompleto atual. Atual=${JSON.stringify(current.summary)} Latest=${JSON.stringify(latest.summary)}`);
  }

  if (latest.summary.users < 1 || latest.summary.teams < 1) {
    throw new Error('O latest também está vazio/incompleto; restauração recusada.');
  }

  return { allowed: true, reason: current.exists ? 'active_database_incomplete' : 'active_database_missing' };
}

async function writeExactDatabase(current, latest) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  if (current.exists) {
    const safetyCopy = path.join(DATA_DIR, `abyss-tournament-db.before-exact-restore-${Date.now()}.json`);
    await fs.writeFile(safetyCopy, current.raw, 'utf8');
    console.log(`[Data/Restore] Cópia de segurança do estado incompleto preservada em ${safetyCopy}.`);
  }

  const tempFile = `${DB_FILE}.exact-restore.tmp`;
  await fs.writeFile(tempFile, latest.raw, 'utf8');
  await fs.rename(tempFile, DB_FILE);

  const verifiedRaw = await fs.readFile(DB_FILE, 'utf8');
  if (sha256(verifiedRaw) !== sha256(latest.raw)) {
    throw new Error('Falha de integridade: o hash do banco gravado não corresponde ao latest.');
  }

  return {
    file: DB_FILE,
    hash: sha256(verifiedRaw),
    summary: latest.summary
  };
}

async function main() {
  console.log(`[Data/Restore] Autorização explícita: ${RESTORE_AUTHORIZATION}`);

  const current = await readActiveDatabase();
  const config = githubBackups.getConfig();

  if (!activeDatabaseIsIncomplete(current.summary)) {
    console.log('[Data/Restore] Banco ativo possui dados substanciais; restauração exata não foi executada.', current.summary);
    return;
  }

  if (!config.token) {
    throw new Error('Banco ativo está incompleto, mas GITHUB_BACKUP_TOKEN/GITHUB_TOKEN não está configurado. O BOT não iniciará com banco vazio.');
  }
  if (!config.repo) {
    throw new Error('Banco ativo está incompleto, mas o repositório de backup não está configurado.');
  }

  const backup = await githubBackups.fetchLatestBackupFromGitHub();
  const latest = decodeExactBackup(backup);
  const decision = validateReplacement(current, latest);

  if (!decision.allowed) {
    console.log(`[Data/Restore] Restauração ignorada: ${decision.reason}.`, current.summary);
    return;
  }

  const result = await writeExactDatabase(current, latest);
  console.log('[Data/Restore] Latest restaurado exatamente, sem merge e sem normalização.', {
    authorization: RESTORE_AUTHORIZATION,
    backupExportedAt: backup.exportedAt || null,
    reason: decision.reason,
    ...result
  });
}

main().catch((error) => {
  console.error('[Data/Restore] Falha fatal na restauração exata:', error.message);
  process.exitCode = 1;
});
