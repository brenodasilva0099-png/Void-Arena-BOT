const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');

const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : PROJECT_DATA_DIR;

const DB_FILE = path.join(DATA_DIR, 'abyss-tournament-db.json');
const LEGACY_USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEGACY_TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const LEGACY_BRACKET_FILE = path.join(DATA_DIR, 'bracket.json');

const SEED_DB_FILE = path.join(PROJECT_DATA_DIR, 'abyss-tournament-db.json');
const SEED_USERS_FILE = path.join(PROJECT_DATA_DIR, 'users.json');
const SEED_TEAMS_FILE = path.join(PROJECT_DATA_DIR, 'teams.json');
const SEED_BRACKET_FILE = path.join(PROJECT_DATA_DIR, 'bracket.json');

const EMPTY_DATABASE = {
  meta: {
    name: 'Abyss Tourment Game Database',
    version: 1,
    createdAt: null,
    updatedAt: null
  },
  users: [],
  teams: [],
  bracket: {
    slots: [],
    quarters: [],
    semis: [],
    finals: [],
    matchProgress: {
      slots: [],
      quarters: [],
      semis: [],
      finals: []
    },
    generatedAt: null,
    updatedAt: null
  },
  settings: {},
  messages: [],
  messageArchives: [],
  teamChats: [],
  events: [],
  trainingSubmissions: []
};



const DEFAULT_TOURNAMENT_EVENTS = [
  {
    id: 'coliseu-void-arena',
    name: 'Coliseu Void Arena',
    title: 'Coliseu Void Arena',
    mode: 'Rematch',
    matchFormat: 'MD3',
    structure: 'Grupos + Playoffs',
    teamLimit: 16,
    minimumTeams: 4,
    startAt: '',
    status: 'open',
    description: 'Campeonato principal da comunidade. Inscreva seu time, confira o limite de vagas e envie o comprovante pelo ticket do Discord.',
    registrations: [],
    createdAt: null,
    updatedAt: null
  }
];

function normalizeEventRegistration(raw = {}) {
  const now = new Date().toISOString();
  const status = ['pending', 'approved', 'rejected', 'cancelled'].includes(String(raw.status || '').toLowerCase())
    ? String(raw.status).toLowerCase()
    : 'pending';

  return {
    id: String(raw.id || `eventreg_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    teamId: String(raw.teamId || '').trim(),
    userId: String(raw.userId || '').trim(),
    status,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };
}

function normalizeTournamentEvent(raw = {}) {
  const now = new Date().toISOString();
  const teamLimit = normalizeTournamentTeamLimit(raw.teamLimit || 16);
  const registrations = Array.isArray(raw.registrations)
    ? raw.registrations.map(normalizeEventRegistration).filter((item) => item.teamId)
    : [];
  const uniqueRegistrations = [];
  const seenTeams = new Set();

  registrations.forEach((item) => {
    if (seenTeams.has(item.teamId)) return;
    seenTeams.add(item.teamId);
    uniqueRegistrations.push(item);
  });

  return {
    id: String(raw.id || 'coliseu-void-arena').trim() || 'coliseu-void-arena',
    name: String(raw.name || raw.title || 'Coliseu Void Arena').trim().slice(0, 80),
    title: String(raw.title || raw.name || 'Coliseu Void Arena').trim().slice(0, 80),
    mode: String(raw.mode || 'Rematch').trim().slice(0, 40),
    matchFormat: String(raw.matchFormat || 'MD3').trim().slice(0, 12),
    structure: String(raw.structure || 'Grupos + Playoffs').trim().slice(0, 60),
    teamLimit,
    minimumTeams: Math.max(2, Math.min(teamLimit, Number(raw.minimumTeams || 4) || 4)),
    startAt: String(raw.startAt || '').trim().slice(0, 40),
    status: ['open', 'closed', 'running', 'finished'].includes(String(raw.status || '').toLowerCase())
      ? String(raw.status).toLowerCase()
      : 'open',
    description: String(raw.description || 'Campeonato principal da comunidade. Inscreva seu time, confira o limite de vagas e envie o comprovante pelo ticket do Discord.').trim().slice(0, 260),
    registrations: uniqueRegistrations,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };
}

function normalizeTournamentEvents(rawEvents = []) {
  const source = Array.isArray(rawEvents) && rawEvents.length ? rawEvents : DEFAULT_TOURNAMENT_EVENTS;
  const normalized = source.map(normalizeTournamentEvent);

  if (!normalized.some((event) => event.id === 'coliseu-void-arena')) {
    normalized.unshift(normalizeTournamentEvent(DEFAULT_TOURNAMENT_EVENTS[0]));
  }

  return normalized;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeMatchProgress(raw = {}) {
  const normalize = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(1);
    return arr.map((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
    });
  };

  return {
    slots: normalize(raw.slots, 16),
    quarters: normalize(raw.quarters, 8),
    semis: normalize(raw.semis, 4),
    finals: normalize(raw.finals, 2)
  };
}


function normalizeChatMessage(raw = {}) {
  const now = new Date().toISOString();
  return {
    id: String(raw.id || `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    channelId: String(raw.channelId || 'site-main').trim() || 'site-main',
    source: ['discord', 'site', 'system'].includes(String(raw.source || '').toLowerCase())
      ? String(raw.source).toLowerCase()
      : 'site',
    authorId: String(raw.authorId || '').trim(),
    authorName: String(raw.authorName || 'Usuário').trim().slice(0, 80),
    authorAvatar: String(raw.authorAvatar || '').trim(),
    content: String(raw.content || '').trim().slice(0, 2000),
    attachments: Array.isArray(raw.attachments) ? raw.attachments.slice(0, 5).map((item) => ({
      url: String(item?.url || '').trim(),
      proxyUrl: String(item?.proxyUrl || item?.proxyURL || '').trim(),
      name: String(item?.name || '').trim().slice(0, 120),
      contentType: String(item?.contentType || '').trim().slice(0, 80),
      size: Number(item?.size || 0) || 0,
      width: Number(item?.width || 0) || 0,
      height: Number(item?.height || 0) || 0
    })).filter((item) => item.url || item.proxyUrl) : [],
    discordMessageId: String(raw.discordMessageId || '').trim(),
    discordChannelId: String(raw.discordChannelId || '').trim(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now,
    editedAt: raw.editedAt || null
  };
}


function normalizeMessageArchive(raw = {}) {
  const now = new Date().toISOString();
  return {
    id: String(raw.id || `arch_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    channelId: String(raw.channelId || 'site-main').trim() || 'site-main',
    label: String(raw.label || 'Arquivo de mensagens').trim().slice(0, 120),
    from: raw.from || null,
    to: raw.to || null,
    messageCount: Number(raw.messageCount || 0),
    messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeChatMessage) : [],
    createdAt: raw.createdAt || now
  };
}

function normalizeTeamChat(raw = {}) {
  const now = new Date().toISOString();
  const type = String(raw.type || '').toLowerCase() === 'direct' ? 'direct' : 'team';
  const teamIds = Array.isArray(raw.teamIds)
    ? raw.teamIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 2)
    : [];
  const participantIds = Array.isArray(raw.participantIds)
    ? raw.participantIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 2)
    : [];
  const sortedTeamIds = Array.from(new Set(teamIds)).sort();
  const sortedParticipantIds = Array.from(new Set(participantIds)).sort();
  const idPrefix = type === 'direct' ? 'screen' : 'teamchat';
  const id = String(raw.id || `${idPrefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  return {
    id,
    type,
    teamIds: type === 'team' ? sortedTeamIds : [],
    participantIds: type === 'direct' ? sortedParticipantIds : [],
    channelId: String(raw.channelId || `${type === 'direct' ? 'screen' : 'team'}:${id}`).trim(),
    title: String(raw.title || (type === 'direct' ? 'Screen' : 'Chat entre times')).trim().slice(0, 120),
    status: raw.status === 'archived' ? 'archived' : 'active',
    createdBy: String(raw.createdBy || '').trim(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now,
    lastMessageAt: raw.lastMessageAt || null,
    archivedAt: raw.archivedAt || null
  };
}

function normalizeTrainingVideo(raw = {}) {
  return {
    id: String(raw.id || '').trim(),
    url: String(raw.url || '').trim(),
    proxyUrl: String(raw.proxyUrl || raw.proxyURL || '').trim(),
    name: String(raw.name || raw.filename || 'treino.mp4').trim().slice(0, 160),
    contentType: String(raw.contentType || raw.content_type || '').trim().slice(0, 120),
    size: Number(raw.size || 0) || 0,
    width: Number(raw.width || 0) || 0,
    height: Number(raw.height || 0) || 0,
    ephemeral: Boolean(raw.ephemeral)
  };
}

function normalizeTrainingComment(raw = {}) {
  const now = new Date().toISOString();

  return {
    id: String(raw.id || `training_comment_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    authorId: String(raw.authorId || '').trim(),
    authorDiscordId: String(raw.authorDiscordId || '').trim(),
    authorName: String(raw.authorName || 'Equipe Void Arena').trim().slice(0, 100),
    content: String(raw.content || '').trim().slice(0, 1200),
    deliveredToDiscord: Boolean(raw.deliveredToDiscord),
    dmError: String(raw.dmError || '').trim().slice(0, 240),
    createdAt: raw.createdAt || now
  };
}

function normalizeTrainingSubmission(raw = {}) {
  const now = new Date().toISOString();
  const status = ['pending', 'reviewed', 'approved', 'rejected', 'archived'].includes(String(raw.status || '').toLowerCase())
    ? String(raw.status).toLowerCase()
    : 'pending';

  return {
    id: String(raw.id || `training_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    playerId: String(raw.playerId || '').trim(),
    playerDiscordId: String(raw.playerDiscordId || raw.discordId || '').trim(),
    playerName: String(raw.playerName || 'Jogador').trim().slice(0, 100),
    playerAvatar: String(raw.playerAvatar || '').trim(),
    teamId: String(raw.teamId || '').trim(),
    guildId: String(raw.guildId || '').trim(),
    type: String(raw.type || 'Treino').trim().slice(0, 80),
    position: String(raw.position || '').trim().slice(0, 80),
    description: String(raw.description || '').trim().slice(0, 900),
    video: normalizeTrainingVideo(raw.video || {}),
    originalVideo: normalizeTrainingVideo(raw.originalVideo || raw.video || {}),
    discordChannelId: String(raw.discordChannelId || '').trim(),
    discordMessageId: String(raw.discordMessageId || '').trim(),
    mirroredToDiscord: Boolean(raw.mirroredToDiscord),
    mirrorError: String(raw.mirrorError || '').trim().slice(0, 240),
    status,
    reviewNote: String(raw.reviewNote || '').trim().slice(0, 900),
    comments: Array.isArray(raw.comments)
      ? raw.comments.map(normalizeTrainingComment).filter((comment) => comment.content).slice(-80)
      : [],
    reviewedBy: String(raw.reviewedBy || '').trim(),
    reviewedAt: raw.reviewedAt || null,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };
}




function normalizeApplicationComment(raw = {}) {
  const now = new Date().toISOString();

  return {
    id: String(raw.id || `application_comment_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    authorId: String(raw.authorId || '').trim(),
    authorDiscordId: String(raw.authorDiscordId || '').trim(),
    authorName: String(raw.authorName || 'Equipe Hollow Nexus').trim().slice(0, 100),
    content: String(raw.content || '').trim().slice(0, 1200),
    deliveredToDiscord: Boolean(raw.deliveredToDiscord),
    dmError: String(raw.dmError || '').trim().slice(0, 240),
    createdAt: raw.createdAt || now
  };
}

function normalizePlayerApplication(raw = {}) {
  const now = new Date().toISOString();

  const normalizePosition = (value) => {
    const allowed = ['Goleiro', 'Fixo', 'Ala Defensivo', 'Ala Ofensivo', 'Pivô'];
    const found = allowed.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase());
    return found || String(value || '').trim().slice(0, 40);
  };

  const normalizeStyle = (value) => {
    const allowed = ['Defensivo', 'Equilibrado', 'Ofensivo'];
    const found = allowed.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase());
    return found || String(value || '').trim().slice(0, 40);
  };

  const status = ['pending', 'approved', 'rejected', 'archived'].includes(String(raw.status || '').toLowerCase())
    ? String(raw.status).toLowerCase()
    : 'pending';

  return {
    id: String(raw.id || `application_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    source: ['site', 'discord'].includes(String(raw.source || '').toLowerCase()) ? String(raw.source).toLowerCase() : 'site',

    userId: String(raw.userId || '').trim(),
    discordId: String(raw.discordId || raw.userDiscordId || '').trim(),
    discordTag: String(raw.discordTag || '').trim().slice(0, 100),
    userName: String(raw.userName || raw.name || 'Jogador').trim().slice(0, 100),
    userAvatar: String(raw.userAvatar || '').trim(),

    realNameSteamCode: String(raw.realNameSteamCode || '').trim().slice(0, 180),
    age: String(raw.age || '').trim().slice(0, 30),
    primaryPosition: normalizePosition(raw.primaryPosition),
    secondaryPosition: normalizePosition(raw.secondaryPosition),
    playStyle: normalizeStyle(raw.playStyle),
    experienceHours: String(raw.experienceHours || '').trim().slice(0, 180),
    previousTeam: String(raw.previousTeam || '').trim().slice(0, 220),
    availability: String(raw.availability || '').trim().slice(0, 1400),
    strengths: String(raw.strengths || '').trim().slice(0, 1400),
    weaknesses: String(raw.weaknesses || '').trim().slice(0, 1400),
    reason: String(raw.reason || '').trim().slice(0, 1400),

    status,
    notes: String(raw.notes || '').trim().slice(0, 1000),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };
}


function normalizeDatabase(raw = {}) {
  const now = new Date().toISOString();
  const db = clone(EMPTY_DATABASE);

  db.meta = {
    ...db.meta,
    ...(raw.meta && typeof raw.meta === 'object' ? raw.meta : {}),
    createdAt: raw.meta?.createdAt || now,
    updatedAt: raw.meta?.updatedAt || now
  };

  db.users = Array.isArray(raw.users) ? raw.users : [];
  db.teams = Array.isArray(raw.teams) ? raw.teams : [];
  db.bracket = {
    slots: Array.isArray(raw.bracket?.slots) ? raw.bracket.slots : [],
    quarters: Array.isArray(raw.bracket?.quarters) ? raw.bracket.quarters : [],
    semis: Array.isArray(raw.bracket?.semis) ? raw.bracket.semis : [],
    finals: Array.isArray(raw.bracket?.finals) ? raw.bracket.finals : [],
    matchProgress: normalizeMatchProgress(raw.bracket?.matchProgress),
    generatedAt: raw.bracket?.generatedAt || null,
    updatedAt: raw.bracket?.updatedAt || null
  };
  db.settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  db.messages = Array.isArray(raw.messages)
    ? raw.messages.map(normalizeChatMessage).filter((message) => message.content || message.attachments.length)
    : [];
  db.messageArchives = Array.isArray(raw.messageArchives)
    ? raw.messageArchives.map(normalizeMessageArchive).slice(-120)
    : [];
  db.teamChats = Array.isArray(raw.teamChats)
    ? raw.teamChats.map(normalizeTeamChat).filter((chat) => (chat.type === 'direct' ? chat.participantIds.length >= 2 : chat.teamIds.length >= 2))
    : [];
  db.events = normalizeTournamentEvents(raw.events || raw.settings?.events || []);
  db.playerApplications = Array.isArray(raw.playerApplications)
    ? raw.playerApplications.map(normalizePlayerApplication).slice(-500)
    : [];
  db.trainingSubmissions = Array.isArray(raw.trainingSubmissions)
    ? raw.trainingSubmissions.map(normalizeTrainingSubmission).slice(-1000)
    : [];

  return db;
}

async function readJsonIfExists(file, fallback = null) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw || 'null') || fallback;
  } catch {
    return fallback;
  }
}

async function readLegacyDatabase() {
  const now = new Date().toISOString();
  const users = await readJsonIfExists(LEGACY_USERS_FILE, null) || await readJsonIfExists(SEED_USERS_FILE, { users: [] });
  const teams = await readJsonIfExists(LEGACY_TEAMS_FILE, null) || await readJsonIfExists(SEED_TEAMS_FILE, { teams: [] });
  const bracket = await readJsonIfExists(LEGACY_BRACKET_FILE, null) || await readJsonIfExists(SEED_BRACKET_FILE, { slots: [], generatedAt: null });

  return normalizeDatabase({
    meta: {
      ...EMPTY_DATABASE.meta,
      createdAt: now,
      updatedAt: now,
      migratedFrom: 'legacy-json-files'
    },
    users: Array.isArray(users?.users) ? users.users : [],
    teams: Array.isArray(teams?.teams) ? teams.teams : [],
    bracket: {
      slots: Array.isArray(bracket?.slots) ? bracket.slots : [],
      quarters: Array.isArray(bracket?.quarters) ? bracket.quarters : [],
      semis: Array.isArray(bracket?.semis) ? bracket.semis : [],
      finals: Array.isArray(bracket?.finals) ? bracket.finals : [],
      matchProgress: normalizeMatchProgress(bracket?.matchProgress),
      generatedAt: bracket?.generatedAt || null,
      updatedAt: bracket?.updatedAt || null
    },
    settings: {}
  });
}

async function ensureDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    const seedDatabase = await readJsonIfExists(SEED_DB_FILE, null);
    const migrated = seedDatabase ? normalizeDatabase(seedDatabase) : await readLegacyDatabase();

    migrated.meta = {
      ...(migrated.meta || {}),
      bootstrappedFrom: seedDatabase ? 'seed-central-database' : 'legacy-json-files',
      dataDir: DATA_DIR,
      updatedAt: new Date().toISOString()
    };

    await writeDatabase(migrated, { mirrorLegacy: true });
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await fs.readFile(DB_FILE, 'utf8');

  try {
    return normalizeDatabase(JSON.parse(raw || '{}'));
  } catch {
    const backupName = `abyss-tournament-db-corrompido-${Date.now()}.json`;
    await fs.rename(DB_FILE, path.join(DATA_DIR, backupName));
    const recovered = await readLegacyDatabase();
    await writeDatabase(recovered, { mirrorLegacy: true });
    return recovered;
  }
}

async function writeDatabase(db, options = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const normalized = normalizeDatabase(db);
  normalized.meta.updatedAt = new Date().toISOString();

  const tempFile = `${DB_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(normalized, null, 2));
  await fs.rename(tempFile, DB_FILE);

  if (options.mirrorLegacy !== false) {
    await Promise.all([
      fs.writeFile(LEGACY_USERS_FILE, JSON.stringify({ users: normalized.users }, null, 2)),
      fs.writeFile(LEGACY_TEAMS_FILE, JSON.stringify({ teams: normalized.teams }, null, 2)),
      fs.writeFile(LEGACY_BRACKET_FILE, JSON.stringify(normalized.bracket, null, 2))
    ]);
  }

  return normalized;
}

async function updateDatabase(updater) {
  const db = await readDatabase();
  const result = await updater(db);
  await writeDatabase(db, { mirrorLegacy: true });
  return result;
}

async function readDatabaseStatus() {
  const db = await readDatabase();
  return {
    file: DB_FILE,
    dataDir: DATA_DIR,
    projectDataDir: PROJECT_DATA_DIR,
    persistent: Boolean(process.env.DATA_DIR),
    version: db.meta.version,
    createdAt: db.meta.createdAt,
    updatedAt: db.meta.updatedAt,
    users: db.users.length,
    teams: db.teams.length,
    messages: Array.isArray(db.messages) ? db.messages.length : 0,
    messageArchives: Array.isArray(db.messageArchives) ? db.messageArchives.length : 0,
    teamChats: Array.isArray(db.teamChats) ? db.teamChats.length : 0,
    events: Array.isArray(db.events) ? db.events.length : 0,
    playerApplications: Array.isArray(db.playerApplications) ? db.playerApplications.length : 0,
    trainingSubmissions: Array.isArray(db.trainingSubmissions) ? db.trainingSubmissions.length : 0,
    bracketSlots: Array.isArray(db.bracket.slots) ? db.bracket.slots.filter(Boolean).length : 0
  };
}

async function readUsers() {
  const db = await readDatabase();
  return Array.isArray(db.users) ? db.users : [];
}

async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function findUserById(id) {
  const users = await readUsers();
  return users.find((user) => user.id === id) || null;
}

async function findUserByDiscordId(discordId) {
  const users = await readUsers();
  return users.find((user) => user.discordId === discordId) || null;
}

async function saveUser(user) {
  return updateDatabase((db) => {
    const index = db.users.findIndex((item) => item.id === user.id);

    if (index >= 0) db.users[index] = user;
    else db.users.push(user);

    return user;
  });
}

async function readTeams() {
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
}

async function saveTeam(team) {
  return updateDatabase((db) => {
    const index = db.teams.findIndex((item) => item.id === team.id);

    if (index >= 0) db.teams[index] = team;
    else db.teams.push(team);

    return team;
  });
}

async function deleteTeam(id) {
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
      db.bracket.quarters = cleanSlots(db.bracket.quarters);
      db.bracket.semis = cleanSlots(db.bracket.semis);
      db.bracket.finals = cleanSlots(db.bracket.finals);
      return true;
    }

    return false;
  });
}

async function readBracket() {
  const db = await readDatabase();
  return {
    slots: Array.isArray(db.bracket?.slots) ? db.bracket.slots : [],
    quarters: Array.isArray(db.bracket?.quarters) ? db.bracket.quarters : [],
    semis: Array.isArray(db.bracket?.semis) ? db.bracket.semis : [],
    finals: Array.isArray(db.bracket?.finals) ? db.bracket.finals : [],
    matchProgress: normalizeMatchProgress(db.bracket?.matchProgress),
    generatedAt: db.bracket?.generatedAt || null,
    updatedAt: db.bracket?.updatedAt || null
  };
}

async function writeBracket(bracket) {
  const safeBracket = {
    slots: Array.isArray(bracket.slots) ? bracket.slots : [],
    quarters: Array.isArray(bracket.quarters) ? bracket.quarters : [],
    semis: Array.isArray(bracket.semis) ? bracket.semis : [],
    finals: Array.isArray(bracket.finals) ? bracket.finals : [],
    matchProgress: normalizeMatchProgress(bracket.matchProgress),
    generatedAt: bracket.generatedAt || null,
    updatedAt: bracket.updatedAt || new Date().toISOString()
  };

  return updateDatabase((db) => {
    db.bracket = safeBracket;
    return safeBracket;
  });
}


function normalizeTournamentTeamLimit(value) {
  const number = Number(value || 16);
  const allowed = [4, 8, 16, 32];
  return allowed.includes(number) ? number : 16;
}

function normalizeTournamentGroupCount(value, teamLimit = 16) {
  const number = Number(value || 4);
  const allowed = [2, 4, 8];
  const maxByTeamLimit = Math.max(2, Math.min(8, Math.floor(normalizeTournamentTeamLimit(teamLimit) / 2)));
  return allowed.includes(number) && number <= maxByTeamLimit ? number : Math.min(4, maxByTeamLimit);
}

function normalizeTournamentGroups(rawGroups = [], teamLimit = 16, groupCount = 4) {
  const count = normalizeTournamentGroupCount(groupCount, teamLimit);
  const groups = Array.isArray(rawGroups) ? rawGroups.slice(0, count) : [];

  while (groups.length < count) {
    groups.push({ id: `group_${groups.length + 1}`, name: `Grupo ${String.fromCharCode(65 + groups.length)}`, teamIds: [] });
  }

  return groups.map((group, index) => ({
    id: String(group.id || `group_${index + 1}`),
    name: String(group.name || `Grupo ${String.fromCharCode(65 + index)}`).trim().slice(0, 40),
    teamIds: Array.isArray(group.teamIds)
      ? group.teamIds.map((id) => String(id || '').trim()).filter(Boolean).slice(0, Math.ceil(normalizeTournamentTeamLimit(teamLimit) / count))
      : []
  }));
}

async function readTournamentSettings() {
  const db = await readDatabase();
  const tournament = db.settings?.tournament || {};
  const teamLimit = normalizeTournamentTeamLimit(tournament.teamLimit);
  const groupCount = normalizeTournamentGroupCount(tournament.groupCount, teamLimit);

  return {
    tournamentName: tournament.tournamentName || 'Rematch Championship',
    matchFormat: tournament.matchFormat || 'MD1',
    structure: tournament.structure || 'single_elimination',
    teamLimit,
    groupCount,
    groups: normalizeTournamentGroups(tournament.groups, teamLimit, groupCount),
    autoCreateMatchChannels: tournament.autoCreateMatchChannels !== false,
    discordMatchCategoryId: String(tournament.discordMatchCategoryId || '').trim(),
    updatedAt: tournament.updatedAt || null
  };
}

async function writeTournamentSettings(settings = {}) {
  return updateDatabase((db) => {
    db.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};

    const teamLimit = normalizeTournamentTeamLimit(settings.teamLimit);
    const groupCount = normalizeTournamentGroupCount(settings.groupCount, teamLimit);

    db.settings.tournament = {
      tournamentName: String(settings.tournamentName || 'Rematch Championship').trim() || 'Rematch Championship',
      matchFormat: String(settings.matchFormat || 'MD1').trim() || 'MD1',
      structure: String(settings.structure || 'single_elimination').trim() || 'single_elimination',
      teamLimit,
      groupCount,
      groups: normalizeTournamentGroups(settings.groups, teamLimit, groupCount),
      autoCreateMatchChannels: settings.autoCreateMatchChannels !== false,
      discordMatchCategoryId: String(settings.discordMatchCategoryId || '').trim(),
      updatedAt: new Date().toISOString()
    };

    return db.settings.tournament;
  });
}


async function readEvents() {
  const db = await readDatabase();
  return normalizeTournamentEvents(db.events);
}

async function registerTeamInEvent(eventId, teamId, userId = '') {
  const safeEventId = String(eventId || 'coliseu-void-arena').trim() || 'coliseu-void-arena';
  const safeTeamId = String(teamId || '').trim();
  const safeUserId = String(userId || '').trim();
  if (!safeTeamId) throw new Error('Selecione um time para inscrever.');

  return updateDatabase((db) => {
    db.events = normalizeTournamentEvents(db.events);
    const eventIndex = db.events.findIndex((event) => event.id === safeEventId);
    if (eventIndex < 0) throw new Error('Campeonato não encontrado.');

    const event = normalizeTournamentEvent(db.events[eventIndex]);
    if (event.status !== 'open') throw new Error('As inscrições desse campeonato não estão abertas.');
    if (event.registrations.length >= event.teamLimit) throw new Error('Esse campeonato já atingiu o limite de times.');

    const existing = event.registrations.find((registration) => registration.teamId === safeTeamId);
    if (existing) {
      return { event, registration: existing, alreadyRegistered: true };
    }

    const registration = normalizeEventRegistration({
      teamId: safeTeamId,
      userId: safeUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    event.registrations.push(registration);
    event.updatedAt = new Date().toISOString();
    db.events[eventIndex] = event;
    return { event, registration, alreadyRegistered: false };
  });
}


async function saveTournamentEvent(payload = {}) {
  return updateDatabase((db) => {
    db.events = normalizeTournamentEvents(db.events);
    const now = new Date().toISOString();
    const eventId = String(payload.id || '').trim() || `event_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const normalized = normalizeTournamentEvent({
      ...payload,
      id: eventId,
      createdAt: payload.createdAt || now,
      updatedAt: now,
      registrations: Array.isArray(payload.registrations) ? payload.registrations : []
    });

    const index = db.events.findIndex((event) => event.id === eventId);
    if (index >= 0) {
      const current = normalizeTournamentEvent(db.events[index]);
      db.events[index] = normalizeTournamentEvent({
        ...current,
        ...normalized,
        registrations: Array.isArray(payload.registrations) ? payload.registrations : current.registrations,
        createdAt: current.createdAt || normalized.createdAt,
        updatedAt: now
      });
      return db.events[index];
    }

    db.events.push(normalized);
    return normalized;
  });
}

async function readChatMessages(options = {}) {
  const db = await readDatabase();
  const channelId = String(options.channelId || 'site-main').trim() || 'site-main';
  const limit = Math.max(1, Math.min(100, Number(options.limit || 50)));

  return (Array.isArray(db.messages) ? db.messages : [])
    .filter((message) => message.channelId === channelId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-limit);
}

async function saveChatMessage(message = {}) {
  const now = new Date().toISOString();
  const normalized = normalizeChatMessage({
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: message.createdAt || now,
    updatedAt: now
  });

  return updateDatabase((db) => {
    db.messages = Array.isArray(db.messages) ? db.messages : [];
    db.messageArchives = Array.isArray(db.messageArchives) ? db.messageArchives : [];
    db.messages.push(normalized);

    // Mantém o chat fluido: deixa só as 120 mensagens mais recentes ativas por canal.
    // As mensagens antigas são compactadas em arquivos dentro do próprio banco.
    const ACTIVE_LIMIT = 120;
    const ARCHIVE_CHUNK = 60;
    const byChannel = new Map();

    for (const item of db.messages) {
      const key = item.channelId || 'site-main';
      if (!byChannel.has(key)) byChannel.set(key, []);
      byChannel.get(key).push(item);
    }

    const nextMessages = [];

    for (const [channelId, items] of byChannel.entries()) {
      const sorted = items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const overflow = sorted.length - ACTIVE_LIMIT;

      if (overflow > 0) {
        const archiveCount = Math.max(ARCHIVE_CHUNK, overflow);
        const archivedMessages = sorted.splice(0, archiveCount);
        if (archivedMessages.length) {
          db.messageArchives.push(normalizeMessageArchive({
            channelId,
            label: `Arquivo ${channelId} • ${new Date().toLocaleString('pt-BR')}`,
            from: archivedMessages[0]?.createdAt || null,
            to: archivedMessages.at(-1)?.createdAt || null,
            messageCount: archivedMessages.length,
            messages: archivedMessages,
            createdAt: now
          }));
        }
      }

      nextMessages.push(...sorted);
    }

    db.messages = nextMessages;
    db.messageArchives = db.messageArchives.slice(-120);

    return normalized;
  });
}


async function updateChatMessage(messageId, updates = {}, options = {}) {
  const now = new Date().toISOString();
  const id = String(messageId || '').trim();
  const channelId = String(options.channelId || '').trim();

  if (!id) throw new Error('Mensagem inválida.');

  return updateDatabase((db) => {
    db.messages = Array.isArray(db.messages) ? db.messages : [];
    const index = db.messages.findIndex((message) => (
      message.id === id && (!channelId || message.channelId === channelId)
    ));

    if (index < 0) {
      throw new Error('Mensagem não encontrada.');
    }

    const current = normalizeChatMessage(db.messages[index]);

    if (options.authorId && current.authorId && current.authorId !== String(options.authorId)) {
      throw new Error('Você só pode editar mensagens enviadas pela sua conta.');
    }

    if (options.source && current.source !== String(options.source)) {
      throw new Error('Essa mensagem não pode ser editada por aqui.');
    }

    const nextContent = String(updates.content ?? current.content ?? '').trim().slice(0, 2000);

    if (!nextContent) {
      throw new Error('A mensagem não pode ficar vazia.');
    }

    db.messages[index] = normalizeChatMessage({
      ...current,
      content: nextContent,
      updatedAt: now,
      editedAt: now
    });

    return db.messages[index];
  });
}


async function mergeChatMessageDiscordData(messageId, updates = {}, options = {}) {
  const now = new Date().toISOString();
  const id = String(messageId || '').trim();
  const channelId = String(options.channelId || '').trim();

  if (!id) throw new Error('Mensagem inválida.');

  return updateDatabase((db) => {
    db.messages = Array.isArray(db.messages) ? db.messages : [];
    const index = db.messages.findIndex((message) => (
      message.id === id && (!channelId || message.channelId === channelId)
    ));

    if (index < 0) {
      throw new Error('Mensagem não encontrada.');
    }

    const current = normalizeChatMessage(db.messages[index]);
    const nextAttachments = Array.isArray(updates.attachments)
      ? updates.attachments
      : current.attachments;
    const hasContentUpdate = Object.prototype.hasOwnProperty.call(updates, 'content');

    db.messages[index] = normalizeChatMessage({
      ...current,
      content: hasContentUpdate ? String(updates.content || '') : current.content,
      attachments: nextAttachments,
      updatedAt: now,
      editedAt: current.editedAt
    });

    return db.messages[index];
  });
}

async function readChatBridgeSettings() {
  const db = await readDatabase();
  const bridge = db.settings?.chatBridge || {};

  return {
    enabled: Boolean(bridge.enabled),
    siteChannelId: String(bridge.siteChannelId || 'site-main'),
    discordChannelId: String(bridge.discordChannelId || '').trim(),
    updatedAt: bridge.updatedAt || null
  };
}

async function writeChatBridgeSettings(settings = {}) {
  return updateDatabase((db) => {
    db.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};
    db.settings.chatBridge = {
      enabled: Boolean(settings.enabled),
      siteChannelId: String(settings.siteChannelId || 'site-main').trim() || 'site-main',
      discordChannelId: String(settings.discordChannelId || '').trim(),
      updatedAt: new Date().toISOString()
    };

    return db.settings.chatBridge;
  });
}


async function readStatsBridgeSettings() {
  const db = await readDatabase();
  const bridge = db.settings?.statsBridge || {};

  return {
    enabled: Boolean(bridge.enabled),
    siteChannelId: String(bridge.siteChannelId || 'stats-main'),
    discordChannelId: String(bridge.discordChannelId || '').trim(),
    updatedAt: bridge.updatedAt || null
  };
}

async function writeStatsBridgeSettings(settings = {}) {
  return updateDatabase((db) => {
    db.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};
    db.settings.statsBridge = {
      enabled: Boolean(settings.enabled),
      siteChannelId: String(settings.siteChannelId || 'stats-main').trim() || 'stats-main',
      discordChannelId: String(settings.discordChannelId || '').trim(),
      updatedAt: new Date().toISOString()
    };

    return db.settings.statsBridge;
  });
}


async function readTeamChats() {
  const db = await readDatabase();
  return Array.isArray(db.teamChats) ? db.teamChats : [];
}

async function findOrCreateTeamChat({ teamAId, teamBId, createdBy = '' } = {}) {
  const teamIds = Array.from(new Set([String(teamAId || '').trim(), String(teamBId || '').trim()].filter(Boolean))).sort();
  if (teamIds.length < 2) throw new Error('Selecione dois times diferentes.');

  return updateDatabase((db) => {
    db.teamChats = Array.isArray(db.teamChats) ? db.teamChats : [];
    const existing = db.teamChats.find((chat) => {
      const ids = Array.isArray(chat.teamIds) ? chat.teamIds.slice().sort() : [];
      return ids.length === 2 && ids[0] === teamIds[0] && ids[1] === teamIds[1] && chat.status !== 'archived';
    });

    if (existing) return normalizeTeamChat(existing);

    const id = `teamchat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const chat = normalizeTeamChat({
      id,
      teamIds,
      channelId: `team:${id}`,
      title: 'Chat entre times',
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    db.teamChats.push(chat);
    return chat;
  });
}



async function findOrCreateDirectChat({ participantAId, participantBId, createdBy = '' } = {}) {
  const participantIds = Array.from(new Set([String(participantAId || '').trim(), String(participantBId || '').trim()].filter(Boolean))).sort();
  if (participantIds.length < 2) throw new Error('Selecione uma pessoa diferente da sua conta.');

  return updateDatabase((db) => {
    db.teamChats = Array.isArray(db.teamChats) ? db.teamChats.map(normalizeTeamChat) : [];
    const existing = db.teamChats.find((chat) => {
      if (chat.type !== 'direct' || chat.status === 'archived') return false;
      const ids = Array.isArray(chat.participantIds) ? chat.participantIds.slice().sort() : [];
      return ids.length === 2 && ids[0] === participantIds[0] && ids[1] === participantIds[1];
    });

    if (existing) return normalizeTeamChat(existing);

    const id = `screen_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const chat = normalizeTeamChat({
      id,
      type: 'direct',
      participantIds,
      channelId: `screen:${id}`,
      title: 'Screen',
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    db.teamChats.push(chat);
    return chat;
  });
}

async function readTeamChatById(conversationId) {
  const chats = await readTeamChats();
  return chats.find((chat) => chat.id === conversationId) || null;
}

async function readTeamChatMessages(conversationId, options = {}) {
  const chat = await readTeamChatById(conversationId);
  if (!chat) return [];
  return readChatMessages({
    channelId: chat.channelId,
    limit: options.limit || 80
  });
}

async function saveTeamChatMessage(conversationId, message = {}) {
  const chat = await readTeamChatById(conversationId);
  if (!chat) throw new Error('Chat entre times não encontrado.');

  const saved = await saveChatMessage({
    ...message,
    channelId: chat.channelId,
    source: message.source || 'site'
  });

  await updateDatabase((db) => {
    db.teamChats = Array.isArray(db.teamChats) ? db.teamChats : [];
    const index = db.teamChats.findIndex((item) => item.id === conversationId);
    if (index >= 0) {
      db.teamChats[index] = {
        ...db.teamChats[index],
        updatedAt: new Date().toISOString(),
        lastMessageAt: saved.createdAt
      };
    }
    return true;
  });

  return saved;
}


async function updateTeamChatMessage(conversationId, messageId, updates = {}, options = {}) {
  const chat = await readTeamChatById(conversationId);
  if (!chat) throw new Error('Chat entre times não encontrado.');

  return updateChatMessage(messageId, updates, { ...options, channelId: chat.channelId });
}


async function readTrainingSubmissions(options = {}) {
  const db = await readDatabase();
  const limit = Math.max(1, Math.min(200, Number(options.limit || 80)));
  const playerDiscordId = String(options.playerDiscordId || '').trim();
  const playerId = String(options.playerId || '').trim();
  const status = String(options.status || '').trim().toLowerCase();

  return (Array.isArray(db.trainingSubmissions) ? db.trainingSubmissions : [])
    .map(normalizeTrainingSubmission)
    .filter((item) => !playerDiscordId || item.playerDiscordId === playerDiscordId)
    .filter((item) => !playerId || item.playerId === playerId)
    .filter((item) => !status || item.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

async function saveTrainingSubmission(payload = {}) {
  const now = new Date().toISOString();
  const normalized = normalizeTrainingSubmission({
    ...payload,
    id: payload.id || `training_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: payload.createdAt || now,
    updatedAt: now
  });

  return updateDatabase((db) => {
    db.trainingSubmissions = Array.isArray(db.trainingSubmissions)
      ? db.trainingSubmissions.map(normalizeTrainingSubmission)
      : [];

    const index = db.trainingSubmissions.findIndex((item) => item.id === normalized.id);
    if (index >= 0) db.trainingSubmissions[index] = normalized;
    else db.trainingSubmissions.push(normalized);

    db.trainingSubmissions = db.trainingSubmissions.slice(-1000);
    return normalized;
  });
}

async function updateTrainingSubmissionStatus(id, updates = {}) {
  const safeId = String(id || '').trim();
  if (!safeId) throw new Error('Envio de treino inválido.');

  return updateDatabase((db) => {
    db.trainingSubmissions = Array.isArray(db.trainingSubmissions)
      ? db.trainingSubmissions.map(normalizeTrainingSubmission)
      : [];

    const index = db.trainingSubmissions.findIndex((item) => item.id === safeId);
    if (index < 0) throw new Error('Envio de treino não encontrado.');

    const current = normalizeTrainingSubmission(db.trainingSubmissions[index]);
    const next = normalizeTrainingSubmission({
      ...current,
      status: updates.status || current.status,
      reviewNote: updates.reviewNote ?? current.reviewNote,
      reviewedBy: updates.reviewedBy || current.reviewedBy,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    db.trainingSubmissions[index] = next;
    return next;
  });
}

async function addTrainingSubmissionComment(id, comment = {}) {
  const safeId = String(id || '').trim();
  if (!safeId) throw new Error('Envio de treino inválido.');

  const normalizedComment = normalizeTrainingComment({
    ...comment,
    id: comment.id || `training_comment_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: comment.createdAt || new Date().toISOString()
  });

  if (!normalizedComment.content) {
    throw new Error('Escreva um comentário.');
  }

  return updateDatabase((db) => {
    db.trainingSubmissions = Array.isArray(db.trainingSubmissions)
      ? db.trainingSubmissions.map(normalizeTrainingSubmission)
      : [];

    const index = db.trainingSubmissions.findIndex((item) => item.id === safeId);
    if (index < 0) throw new Error('Envio de treino não encontrado.');

    const current = normalizeTrainingSubmission(db.trainingSubmissions[index]);
    const comments = Array.isArray(current.comments) ? current.comments : [];

    const next = normalizeTrainingSubmission({
      ...current,
      comments: [...comments, normalizedComment].slice(-80),
      reviewNote: normalizedComment.content,
      updatedAt: new Date().toISOString()
    });

    db.trainingSubmissions[index] = next;

    return {
      submission: next,
      comment: normalizedComment
    };
  });
}



function summarizeDatabase(db = {}) {
  return {
    users: Array.isArray(db.users) ? db.users.length : 0,
    teams: Array.isArray(db.teams) ? db.teams.length : 0,
    events: Array.isArray(db.events) ? db.events.length : 0,
    trainingSubmissions: Array.isArray(db.trainingSubmissions) ? db.trainingSubmissions.length : 0,
    messages: Array.isArray(db.messages) ? db.messages.length : 0,
    messageArchives: Array.isArray(db.messageArchives) ? db.messageArchives.length : 0,
    teamChats: Array.isArray(db.teamChats) ? db.teamChats.length : 0,
    bracketSlots: Array.isArray(db.bracket?.slots) ? db.bracket.slots.filter(Boolean).length : 0,
    updatedAt: db.meta?.updatedAt || null
  };
}

async function exportDatabaseBackup() {
  const db = await readDatabase();
  const rawJson = JSON.stringify(db);
  const compressed = zlib.gzipSync(Buffer.from(rawJson, 'utf8')).toString('base64');

  return {
    success: true,
    type: 'void-arena-database-backup',
    version: 1,
    format: 'gzip-base64-json',
    exportedAt: new Date().toISOString(),
    source: {
      dataDir: DATA_DIR,
      dbFile: DB_FILE
    },
    summary: summarizeDatabase(db),
    database: compressed
  };
}

async function importDatabaseBackup(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup inválido.');
  }

  let rawDatabase = null;

  if (payload.type === 'void-arena-database-backup' && payload.format === 'gzip-base64-json' && payload.database) {
    const buffer = Buffer.from(String(payload.database || ''), 'base64');
    rawDatabase = JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
  } else if (payload.database && typeof payload.database === 'object') {
    rawDatabase = payload.database;
  } else if (Array.isArray(payload.users) || Array.isArray(payload.teams) || payload.bracket || payload.settings) {
    rawDatabase = payload;
  }

  if (!rawDatabase || typeof rawDatabase !== 'object') {
    throw new Error('Backup sem banco de dados válido.');
  }

  const normalized = normalizeDatabase(rawDatabase);
  normalized.meta = {
    ...(normalized.meta || {}),
    importedAt: new Date().toISOString(),
    importedFromBackup: true,
    importedBackupExportedAt: payload.exportedAt || null,
    restoredIntoDataDir: DATA_DIR
  };

  await writeDatabase(normalized, { mirrorLegacy: true });

  return {
    success: true,
    importedAt: normalized.meta.importedAt,
    summary: summarizeDatabase(normalized),
    status: await readDatabaseStatus()
  };
}

async function readPlayerApplications(options = {}) {
  const db = await readDatabase();
  const limit = Math.max(1, Math.min(500, Number(options.limit || 120)));
  const status = String(options.status || '').trim();

  return (Array.isArray(db.playerApplications) ? db.playerApplications : [])
    .map(normalizePlayerApplication)
    .filter((item) => !status || item.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

async function savePlayerApplication(payload = {}) {
  const now = new Date().toISOString();

  const application = normalizePlayerApplication({
    ...payload,
    id: payload.id || `application_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: payload.createdAt || now,
    updatedAt: now
  });

  if (!application.realNameSteamCode) throw new Error('Informe Nome Real / Código de amizade da Steam.');
  if (!application.age) throw new Error('Informe a idade.');
  if (!application.primaryPosition) throw new Error('Informe a posição principal.');
  if (!application.secondaryPosition) throw new Error('Informe a posição secundária.');
  if (!application.playStyle) throw new Error('Informe o estilo de jogo.');
  if (!application.experienceHours) throw new Error('Informe tempo de experiência/horas jogadas.');
  if (!application.availability) throw new Error('Informe seus horários disponíveis.');
  if (!application.strengths) throw new Error('Informe seus pontos fortes.');
  if (!application.weaknesses) throw new Error('Informe seus pontos fracos.');
  if (!application.reason) throw new Error('Informe por que deseja entrar.');

  return updateDatabase((db) => {
    db.playerApplications = Array.isArray(db.playerApplications)
      ? db.playerApplications.map(normalizePlayerApplication)
      : [];

    db.playerApplications.push(application);
    db.playerApplications = db.playerApplications.slice(-500);

    return application;
  });
}

async function addPlayerApplicationComment(id, comment = {}) {
  const safeId = String(id || '').trim();
  if (!safeId) throw new Error('Inscrição inválida.');

  const normalizedComment = normalizeApplicationComment({
    ...comment,
    id: comment.id || `application_comment_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: comment.createdAt || new Date().toISOString()
  });

  if (!normalizedComment.content) {
    throw new Error('Escreva um comentário.');
  }

  return updateDatabase((db) => {
    db.playerApplications = Array.isArray(db.playerApplications)
      ? db.playerApplications.map(normalizePlayerApplication)
      : [];

    const index = db.playerApplications.findIndex((item) => item.id === safeId);
    if (index < 0) throw new Error('Inscrição não encontrada.');

    const current = normalizePlayerApplication(db.playerApplications[index]);
    const comments = Array.isArray(current.comments) ? current.comments : [];

    db.playerApplications[index] = normalizePlayerApplication({
      ...current,
      comments: [...comments, normalizedComment].slice(-80),
      notes: normalizedComment.content,
      updatedAt: new Date().toISOString()
    });

    return {
      application: db.playerApplications[index],
      comment: normalizedComment
    };
  });
}

async function updatePlayerApplicationStatus(id, updates = {}) {
  const safeId = String(id || '').trim();
  if (!safeId) throw new Error('Inscrição inválida.');

  return updateDatabase((db) => {
    db.playerApplications = Array.isArray(db.playerApplications)
      ? db.playerApplications.map(normalizePlayerApplication)
      : [];

    const index = db.playerApplications.findIndex((item) => item.id === safeId);
    if (index < 0) throw new Error('Inscrição não encontrada.');

    const current = normalizePlayerApplication(db.playerApplications[index]);

    db.playerApplications[index] = normalizePlayerApplication({
      ...current,
      status: updates.status || current.status,
      notes: updates.notes ?? current.notes,
      updatedAt: new Date().toISOString()
    });

    return db.playerApplications[index];
  });
}


module.exports = {
  addPlayerApplicationComment,
  updatePlayerApplicationStatus,
  savePlayerApplication,
  readPlayerApplications,
  addTrainingSubmissionComment,
  updateTrainingSubmissionStatus,
  saveTrainingSubmission,
  readTrainingSubmissions,
  exportDatabaseBackup,
  importDatabaseBackup,
  readDatabaseStatus,
  readEvents,
  saveTournamentEvent,
  registerTeamInEvent,
  readTournamentSettings,
  writeTournamentSettings,
  readChatMessages,
  saveChatMessage,
  updateChatMessage,
  mergeChatMessageDiscordData,
  readChatBridgeSettings,
  writeChatBridgeSettings,
  readStatsBridgeSettings,
  writeStatsBridgeSettings,
  readTeamChats,
  findOrCreateTeamChat,
  findOrCreateDirectChat,
  readTeamChatById,
  readTeamChatMessages,
  saveTeamChatMessage,
  updateTeamChatMessage,
  readUsers,
  findUserByEmail,
  findUserById,
  findUserByDiscordId,
  saveUser,
  readTeams,
  saveTeam,
  deleteTeam,
  readBracket,
  writeBracket
};
