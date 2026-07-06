const { Events } = require('discord.js');
const storage = require('../server/storage');

const DEFAULT_RESULTS_CHANNELS = ['1518441859519877120'];

function resultChannelIds() {
  return String(process.env.GROUP_RESULTS_CHANNEL_IDS || process.env.RESULTS_HISTORY_CHANNEL_ID || DEFAULT_RESULTS_CHANNELS.join(','))
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function clean(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function row(raw = {}) {
  const wins = Math.max(0, Number(raw.wins || raw.v || 0) || 0);
  const draws = Math.max(0, Number(raw.draws || raw.e || 0) || 0);
  return {
    played: Math.max(0, Number(raw.played || raw.p || 0) || 0),
    wins,
    draws,
    losses: Math.max(0, Number(raw.losses || raw.d || 0) || 0),
    goalsFor: Math.max(0, Number(raw.goalsFor || raw.goals || raw.g || 0) || 0),
    goalsAgainst: Math.max(0, Number(raw.goalsAgainst || raw.gc || 0) || 0),
    points: wins * 3 + draws
  };
}

function buildTeamIndex(teams = []) {
  const map = new Map();
  teams.forEach((team) => {
    const names = [team.id, team.name, team.tag, team.displayName].map(clean).filter(Boolean);
    names.forEach((name) => map.set(name, team));
  });
  return map;
}

function findTeamByText(text = '', teams = [], index = new Map()) {
  const value = clean(text);
  if (!value) return null;
  if (index.has(value)) return index.get(value);
  return teams.find((team) => {
    const candidates = [team.name, team.tag, team.displayName].map(clean).filter(Boolean);
    return candidates.some((candidate) => candidate && (value.includes(candidate) || candidate.includes(value)));
  }) || null;
}

function parseResult(content = '', teams = []) {
  const text = String(content || '').replace(/<@&?\d+>/g, ' ').replace(/\s+/g, ' ').trim();
  const index = buildTeamIndex(teams);
  const patterns = [
    /(.{2,60}?)\s+(\d{1,2})\s*[xX-]\s*(\d{1,2})\s+(.{2,60})$/,
    /time\s*a\s*[:\-]?\s*(.{2,60}?)\s+(\d{1,2})\s*[xX-]\s*(\d{1,2})\s*(?:time\s*b\s*[:\-]?)?\s*(.{2,60})$/i,
    /resultado\s*[:\-]?\s*(.{2,60}?)\s+(\d{1,2})\s*[xX-]\s*(\d{1,2})\s+(.{2,60})$/i
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (!match) continue;
    const teamA = findTeamByText(match[1], teams, index);
    const teamB = findTeamByText(match[4], teams, index);
    const scoreA = Number(match[2]);
    const scoreB = Number(match[3]);
    if (teamA?.id && teamB?.id && teamA.id !== teamB.id && Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
      return { teamA, teamB, scoreA, scoreB };
    }
  }

  return null;
}

function teamIdsInGroups(bracket = {}) {
  const ids = new Set();
  (Array.isArray(bracket.groups) ? bracket.groups : []).forEach((group) => {
    (group.teams || group.teamIds || []).forEach((item) => {
      const id = typeof item === 'string' ? item : item?.id;
      if (id) ids.add(String(id));
    });
  });
  return ids;
}

async function applyResultToGroups(result, source = {}) {
  const bracket = await storage.readBracket();
  const groupIds = teamIdsInGroups(bracket);
  if (!groupIds.has(String(result.teamA.id)) || !groupIds.has(String(result.teamB.id))) return { applied: false, reason: 'teams_not_in_groups' };

  const standings = { ...(bracket.groupStandings || {}) };
  const a = row(standings[result.teamA.id]);
  const b = row(standings[result.teamB.id]);

  a.played += 1;
  b.played += 1;
  a.goalsFor += result.scoreA;
  b.goalsFor += result.scoreB;
  a.goalsAgainst += result.scoreB;
  b.goalsAgainst += result.scoreA;

  if (result.scoreA > result.scoreB) { a.wins += 1; b.losses += 1; }
  else if (result.scoreB > result.scoreA) { b.wins += 1; a.losses += 1; }
  else { a.draws += 1; b.draws += 1; }

  a.points = a.wins * 3 + a.draws;
  b.points = b.wins * 3 + b.draws;
  standings[result.teamA.id] = a;
  standings[result.teamB.id] = b;

  await storage.writeBracket({
    ...bracket,
    groupStandings: standings,
    updatedAt: new Date().toISOString(),
    lastGroupResult: {
      teamAId: result.teamA.id,
      teamBId: result.teamB.id,
      scoreA: result.scoreA,
      scoreB: result.scoreB,
      sourceChannelId: source.channelId || '',
      sourceMessageId: source.messageId || '',
      updatedAt: new Date().toISOString()
    }
  });

  return { applied: true };
}

function registerGroupStandingsFromResults(client) {
  if (!client || client.__groupStandingsFromResults) return;
  client.__groupStandingsFromResults = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      if (!resultChannelIds().includes(String(message.channelId))) return;
      const teams = await storage.readTeams();
      const result = parseResult(message.content || '', teams);
      if (!result) return;
      const applied = await applyResultToGroups(result, { channelId: message.channelId, messageId: message.id });
      if (applied.applied) {
        await message.react('✅').catch(() => null);
        console.log(`[grupos] Resultado aplicado: ${result.teamA.name} ${result.scoreA}x${result.scoreB} ${result.teamB.name}`);
      }
    } catch (error) {
      console.error('[grupos] Erro ao aplicar resultado do chat:', error.message);
    }
  });
}

module.exports = { registerGroupStandingsFromResults };
