const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
let changed = false;

const replacement = String.raw`function teamsForVoiceFromBracket(bracket = {}, teams = [], settings = {}) {
  const byId = new Map(teams.map((team) => { const safe = safeTeam(team); return [safe.id, safe]; }));
  const orderedIds = [];
  const seenIds = new Set();

  function addTeam(item) {
    const id = teamIdOf(item);
    if (!id || seenIds.has(id) || !byId.has(id)) return;
    seenIds.add(id);
    orderedIds.push(id);
  }

  for (const key of ['slots', 'round16', 'quarters', 'semis', 'finals']) {
    const arr = Array.isArray(bracket[key]) ? bracket[key] : [];
    arr.forEach(addTeam);
  }

  const groups = Array.isArray(bracket.groups) ? bracket.groups : [];
  groups.forEach((group) => {
    const items = Array.isArray(group?.teams) ? group.teams : (Array.isArray(group?.teamIds) ? group.teamIds : []);
    items.forEach(addTeam);
  });

  if (orderedIds.length) return orderedIds.map((id) => byId.get(id)).filter(Boolean);

  const limit = Math.max(1, Math.min(32, Number(settings.teamLimit || settings.limit || settings.maxTeams || teams.length || 32) || 32));
  const uniqueTeams = [];
  const fallbackSeen = new Set();
  for (const rawTeam of teams) {
    const team = safeTeam(rawTeam);
    if (!team.id || fallbackSeen.has(team.id)) continue;
    fallbackSeen.add(team.id);
    uniqueTeams.push(team);
    if (uniqueTeams.length >= limit) break;
  }
  return uniqueTeams;
}

function stripPrivateVoicePrefix(value = '') {
  return String(value || '').replace(/^👤・/, '').trim();
}

function escapeVoiceRegex(value = '') {
  return String(value || '').replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
}

async function cleanupGeneratedDuplicateTeamVoices(client, teams = [], payload = {}, settings = {}) {
  const categoryId = configuredMatchCategoryId(payload, settings);
  if (!categoryId || !client?.channels?.fetch) return [];

  const category = await client.channels.fetch(categoryId).catch(() => null);
  const guild = category?.guild || client.guilds?.cache?.first?.() || null;
  if (!guild?.channels?.cache) return [];

  const registeredNames = new Set(
    teams.map((team) => readableTeamName(team, 'time').toLowerCase()).filter(Boolean)
  );
  const voices = Array.from(guild.channels.cache.values()).filter((channel) => (
    channel?.type === ChannelType.GuildVoice && channel.parentId === categoryId
  ));
  const removed = [];

  for (const team of teams) {
    const baseName = readableTeamName(team, 'time');
    if (!baseName) continue;
    const duplicatePattern = new RegExp('^(?:👤・)?' + escapeVoiceRegex(baseName) + '\\s+(?:0[2-9]|[1-9]\\d)$', 'i');

    for (const channel of voices) {
      const logicalName = stripPrivateVoicePrefix(channel.name);
      if (!duplicatePattern.test(channel.name) && !duplicatePattern.test(logicalName)) continue;
      if (registeredNames.has(logicalName.toLowerCase())) continue;
      if (!channel.deletable || typeof channel.delete !== 'function') continue;
      await channel.delete('Hollow Nexus: remoção de call duplicada gerada pelo chaveamento').catch(() => null);
      removed.push({ id: channel.id, name: channel.name, team: baseName });
    }
  }

  if (removed.length) {
    console.log('[Calls/Dedupe] Calls duplicadas removidas:', removed.map((item) => item.name).join(', '));
  }
  return removed;
}

async function ensureAllTeamVoiceChannels(client, bracket = {}, teams = [], users = [], payload = {}, settings = {}) {
  const voiceTeams = teamsForVoiceFromBracket(bracket, teams, settings);
  await cleanupGeneratedDuplicateTeamVoices(client, teams, payload, settings).catch((error) => {
    console.error('[Calls/Dedupe] Falha ao limpar duplicatas antigas:', error.message);
  });

  const created = [];
  for (const team of voiceTeams) {
    const ids = teamDiscordIds(team, users);
    const channel = await findOrCreateTeamVoice(client, team, ids, payload, settings).catch((error) => {
      console.error('Erro ao criar call do time', team?.name || team?.tag || team?.id, error.message);
      return null;
    });
    if (channel?.id) created.push({ id: channel.id, name: channel.name, team: readableTeamName(team, 'time') });
  }
  return created;
}
`;

const blockPattern = /function teamsForVoiceFromBracket\(bracket = \{\}, teams = \[\], settings = \{\}\) \{[\s\S]*?\n\}\n\nasync function ensureTeamVoiceChannels/;
const next = source.replace(blockPattern, `${replacement}\nasync function ensureTeamVoiceChannels`);
if (next === source && !source.includes('async function cleanupGeneratedDuplicateTeamVoices')) {
  throw new Error('[Calls/Dedupe] Bloco de seleção/criação de calls não encontrado.');
}
if (next !== source) {
  source = next;
  changed = true;
}

if (!source.includes('function scheduleStoredVoiceDedup(client)')) {
  const anchor = 'function registerMatchResultHandlers(client) {';
  if (!source.includes(anchor)) throw new Error('[Calls/Dedupe] Registro dos handlers de resultado não encontrado.');
  const helper = `async function runStoredVoiceDedup(client) {
  const [teams, settings] = await Promise.all([
    storage.readTeams().catch(() => []),
    storage.readTournamentSettings().catch(() => ({}))
  ]);
  return cleanupGeneratedDuplicateTeamVoices(client, teams, {}, settings);
}

function scheduleStoredVoiceDedup(client) {
  const run = () => runStoredVoiceDedup(client).catch((error) => console.error('[Calls/Dedupe] Falha no saneamento inicial:', error.message));
  if (client?.isReady?.()) run();
  else client?.once?.(Events.ClientReady, run);
}

`;
  source = source.replace(anchor, helper + anchor);
  changed = true;
}

if (!source.includes('scheduleStoredVoiceDedup(client);')) {
  const anchor = '  client.__matchResultsReady = true;\n';
  if (!source.includes(anchor)) throw new Error('[Calls/Dedupe] Inicialização dos handlers não encontrada.');
  source = source.replace(anchor, `${anchor}  scheduleStoredVoiceDedup(client);\n`);
  changed = true;
}

for (const forbidden of [
  "base.id + ':' + seen",
  "readableTeamName(base, 'time') + ' ' + String(seen).padStart(2, '0')"
]) {
  if (source.includes(forbidden)) throw new Error(`[Calls/Dedupe] Lógica antiga ainda ativa: ${forbidden}`);
}
for (const required of [
  'const seenIds = new Set();',
  'async function cleanupGeneratedDuplicateTeamVoices',
  'scheduleStoredVoiceDedup(client);',
  'remoção de call duplicada gerada pelo chaveamento'
]) {
  if (!source.includes(required)) throw new Error(`[Calls/Dedupe] Proteção ausente: ${required}`);
}

if (changed) fs.writeFileSync(file, source, 'utf8');
new Function(fs.readFileSync(file, 'utf8'));
console.log('[Calls/Dedupe] Uma call por ID de time; duplicatas numéricas antigas serão removidas com segurança.');