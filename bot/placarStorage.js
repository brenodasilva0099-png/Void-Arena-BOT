const fs = require('node:fs/promises');
const path = require('node:path');

const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : PROJECT_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'abyss-tournament-db.json');
const MODES = ['3v3', '5v5'];

const RANKS = [
  { key: 'bronze', name: 'Bronze', emoji: '🥉', min: 0 },
  { key: 'prata', name: 'Prata', emoji: '🥈', min: 25 },
  { key: 'ouro', name: 'Ouro', emoji: '🥇', min: 60 },
  { key: 'platina', name: 'Platina', emoji: '💠', min: 100 },
  { key: 'diamante', name: 'Diamante', emoji: '💎', min: 160 },
  { key: 'mestre', name: 'Mestre', emoji: '👑', min: 230 },
  { key: 'abyssal', name: 'Abyssal', emoji: '⚜️', min: 320 }
];

function normalizeMode(mode = '') {
  const raw = String(mode || '').toLowerCase().replace('x', 'v').trim();
  return raw === '5v5' ? '5v5' : '3v3';
}

function defaultPlacar() {
  return {
    version: 3,
    pointsRule: {
      win: 3,
      draw: 1,
      loss: 0,
      participation: 2,
      goal: 0.5,
      assist: 0.5,
      defense: 0.5,
      interception: 0.25,
      pass: 0.1,
      mvp: 1,
      cleanSheet: 1,
      noShow: -1
    },
    fairness: {
      enabled: true,
      activeWindowMinutes: 90,
      pairWindowMinutes: 240,
      recentMatchWeight: 100,
      pairRepeatWeight: 35
    },
    players: { '3v3': {}, '5v5': {} },
    queues: { '3v3': [], '5v5': [] },
    matches: [],
    updatedAt: null
  };
}

async function readRawDatabase() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { meta: {}, settings: {} };
  }
}

async function writeRawDatabase(db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  db.meta = db.meta && typeof db.meta === 'object' ? db.meta : {};
  db.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};
  db.meta.updatedAt = new Date().toISOString();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  return db;
}

function rankForPoints(points = 0) {
  const value = Number(points || 0) || 0;
  return [...RANKS].reverse().find((rank) => value >= rank.min) || RANKS[0];
}

function normalizePlayer(raw = {}, fallback = {}) {
  const discordId = String(raw.discordId || fallback.discordId || '').trim();
  const matches = Number(raw.matches || 0) || 0;
  const wins = Number(raw.wins || 0) || 0;
  const points = Math.max(0, Math.round((Number(raw.points || 0) || 0) * 10) / 10);
  const rank = rankForPoints(points);
  return {
    discordId,
    name: String(raw.name || fallback.name || 'Jogador').trim().slice(0, 80),
    avatar: String(raw.avatar || fallback.avatar || '').trim(),
    points,
    matches,
    wins,
    draws: Number(raw.draws || 0) || 0,
    losses: Number(raw.losses || 0) || 0,
    goals: Number(raw.goals || 0) || 0,
    assists: Number(raw.assists || 0) || 0,
    defenses: Number(raw.defenses || 0) || 0,
    interceptions: Number(raw.interceptions || raw.interceptacoes || 0) || 0,
    passes: Number(raw.passes || 0) || 0,
    mvp: Number(raw.mvp || 0) || 0,
    cleanSheets: Number(raw.cleanSheets || 0) || 0,
    noShows: Number(raw.noShows || 0) || 0,
    winRate: matches ? Math.round((wins / matches) * 1000) / 10 : 0,
    rankKey: rank.key,
    rankName: rank.name,
    rankEmoji: rank.emoji,
    lastMatchAt: raw.lastMatchAt || null,
    updatedAt: raw.updatedAt || null
  };
}

function normalizeQueueEntry(raw = {}) {
  return {
    discordId: String(raw.discordId || '').trim(),
    name: String(raw.name || 'Jogador').trim().slice(0, 80),
    avatar: String(raw.avatar || '').trim(),
    joinedAt: raw.joinedAt || new Date().toISOString()
  };
}

function normalizeFairness(raw = {}) {
  const base = defaultPlacar().fairness;
  return {
    enabled: raw.enabled !== false,
    activeWindowMinutes: Math.max(10, Number(raw.activeWindowMinutes || base.activeWindowMinutes) || base.activeWindowMinutes),
    pairWindowMinutes: Math.max(30, Number(raw.pairWindowMinutes || base.pairWindowMinutes) || base.pairWindowMinutes),
    recentMatchWeight: Math.max(1, Number(raw.recentMatchWeight || base.recentMatchWeight) || base.recentMatchWeight),
    pairRepeatWeight: Math.max(1, Number(raw.pairRepeatWeight || base.pairRepeatWeight) || base.pairRepeatWeight)
  };
}

function normalizePointsRule(raw = {}) {
  const base = defaultPlacar().pointsRule;
  if (process.env.PLACAR_KEEP_CUSTOM_POINTS === '1' && raw && typeof raw === 'object') return { ...base, ...raw };
  return base;
}

function normalizePlacar(raw = {}) {
  const base = defaultPlacar();
  const pointsRule = normalizePointsRule(raw.pointsRule || {});
  const players = { '3v3': {}, '5v5': {} };
  MODES.forEach((mode) => {
    Object.entries(raw.players?.[mode] || {}).forEach(([id, player]) => {
      const normalized = normalizePlayer(player, { discordId: id });
      if (normalized.discordId) players[mode][normalized.discordId] = normalized;
    });
  });
  const queues = { '3v3': [], '5v5': [] };
  MODES.forEach((mode) => {
    const seen = new Set();
    (Array.isArray(raw.queues?.[mode]) ? raw.queues[mode] : []).map(normalizeQueueEntry).forEach((entry) => {
      if (!entry.discordId || seen.has(entry.discordId)) return;
      seen.add(entry.discordId);
      queues[mode].push(entry);
    });
  });
  return {
    ...base,
    ...raw,
    version: 3,
    pointsRule,
    fairness: normalizeFairness(raw.fairness || {}),
    players,
    queues,
    matches: Array.isArray(raw.matches) ? raw.matches.slice(-500) : [],
    updatedAt: raw.updatedAt || null
  };
}

async function readPlacar() {
  const db = await readRawDatabase();
  return normalizePlacar(db.settings?.placar || {});
}

async function writePlacar(placar) {
  const db = await readRawDatabase();
  db.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};
  db.settings.placar = normalizePlacar({ ...placar, updatedAt: new Date().toISOString() });
  await writeRawDatabase(db);
  return db.settings.placar;
}

function publicPlayer(player = {}) { return normalizePlayer(player); }

async function getLeaderboard(mode = '3v3') {
  const placar = await readPlacar();
  const safeMode = normalizeMode(mode);
  const players = Object.values(placar.players[safeMode] || {})
    .map(publicPlayer)
    .sort((a, b) => b.points - a.points || b.winRate - a.winRate || b.wins - a.wins || b.goals - a.goals || a.name.localeCompare(b.name));
  return { mode: safeMode, ranks: RANKS, pointsRule: placar.pointsRule, players };
}

async function getFullScoreboard() {
  const [three, five] = await Promise.all([getLeaderboard('3v3'), getLeaderboard('5v5')]);
  const placar = await readPlacar();
  return { success: true, ranks: RANKS, pointsRule: placar.pointsRule, fairness: placar.fairness, queues: placar.queues, matches: placar.matches.slice(-30).reverse(), leaderboards: { '3v3': three.players, '5v5': five.players }, updatedAt: placar.updatedAt };
}

async function addToQueue(mode, player = {}) {
  const safeMode = normalizeMode(mode);
  const placar = await readPlacar();
  const entry = normalizeQueueEntry({ ...player, joinedAt: new Date().toISOString() });
  if (!entry.discordId) throw new Error('Jogador sem Discord ID.');
  placar.queues[safeMode] = placar.queues[safeMode].filter((item) => item.discordId !== entry.discordId);
  placar.queues[safeMode].push(entry);
  await writePlacar(placar);
  return { mode: safeMode, queue: placar.queues[safeMode] };
}

async function removeFromQueue(mode, discordId = '') {
  const safeMode = normalizeMode(mode);
  const placar = await readPlacar();
  const before = placar.queues[safeMode].length;
  placar.queues[safeMode] = placar.queues[safeMode].filter((item) => item.discordId !== String(discordId || '').trim());
  await writePlacar(placar);
  return { mode: safeMode, removed: before !== placar.queues[safeMode].length, queue: placar.queues[safeMode] };
}

function matchTimestamp(match = {}) {
  const raw = match.finishedAt || match.createdAt || '';
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function matchPlayers(match = {}) {
  return [...(match.teamA || []), ...(match.teamB || [])].map((p) => String(p.discordId || '').trim()).filter(Boolean);
}

function pairKey(a = '', b = '') { return [String(a), String(b)].sort().join(':'); }

function recentPlayerActivity(placar, mode, playerId, windowMinutes = 90) {
  const safeMode = normalizeMode(mode);
  const now = Date.now();
  const since = now - windowMinutes * 60 * 1000;
  const matches = (placar.matches || []).filter((match) => normalizeMode(match.mode) === safeMode && matchTimestamp(match) >= since && matchPlayers(match).includes(String(playerId)));
  const last = matches.reduce((max, match) => Math.max(max, matchTimestamp(match)), 0);
  return { recentMatches: matches.length, lastMatchAt: last ? new Date(last).toISOString() : null, lastAgoMinutes: last ? Math.round((now - last) / 60000) : null };
}

function recentPairCounts(placar, mode, windowMinutes = 240) {
  const safeMode = normalizeMode(mode);
  const since = Date.now() - windowMinutes * 60 * 1000;
  const counts = new Map();
  (placar.matches || []).forEach((match) => {
    if (normalizeMode(match.mode) !== safeMode || matchTimestamp(match) < since) return;
    for (const team of [match.teamA || [], match.teamB || []]) {
      const ids = team.map((p) => String(p.discordId || '').trim()).filter(Boolean);
      for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
        const key = pairKey(ids[i], ids[j]);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  });
  return counts;
}

function shuffle(items = []) { return [...items].map((item) => ({ item, n: Math.random() })).sort((a, b) => a.n - b.n).map((entry) => entry.item); }

function fairQueuePick(placar, mode, queue, size) {
  const config = normalizeFairness(placar.fairness || {});
  const scored = queue.map((entry, index) => {
    const activity = recentPlayerActivity(placar, mode, entry.discordId, config.activeWindowMinutes);
    const joined = Date.parse(entry.joinedAt || '') || Date.now();
    const score = (activity.recentMatches * config.recentMatchWeight) - Math.max(0, Math.round((Date.now() - joined) / 60000));
    return { entry, index, activity, score, random: Math.random() };
  });
  const ordered = config.enabled ? [...scored].sort((a, b) => a.score - b.score || a.index - b.index || a.random - b.random) : scored.slice(0, size);
  const picked = ordered.slice(0, size);
  const pickedIds = new Set(picked.map((item) => item.entry.discordId));
  const leftover = queue.filter((entry) => !pickedIds.has(entry.discordId));
  const selected = picked.map((item) => item.entry);
  selected.fairness = { enabled: config.enabled, activeWindowMinutes: config.activeWindowMinutes, pairWindowMinutes: config.pairWindowMinutes, picked: picked.map((item) => ({ discordId: item.entry.discordId, name: item.entry.name, recentMatches: item.activity.recentMatches, lastAgoMinutes: item.activity.lastAgoMinutes })), rotatedToBack: leftover.length, rule: 'prioriza quem jogou menos recentemente quando existe fila sobrando' };
  return { selected, leftover };
}

async function popQueueForMatch(mode) {
  const safeMode = normalizeMode(mode);
  const size = safeMode === '5v5' ? 10 : 6;
  const placar = await readPlacar();
  const queue = placar.queues[safeMode] || [];
  if (queue.length < size) return null;
  const { selected, leftover } = fairQueuePick(placar, safeMode, queue, size);
  placar.queues[safeMode] = leftover;
  await writePlacar(placar);
  return selected;
}

function teamPairPenalty(team = [], player = {}, pairCounts = new Map()) {
  return team.reduce((sum, mate) => sum + (pairCounts.get(pairKey(mate.discordId, player.discordId)) || 0), 0);
}

function balancedTeams(players = [], teamSize = 3, pairCounts = new Map()) {
  const teamA = [];
  const teamB = [];
  shuffle(players).forEach((player) => {
    if (teamA.length >= teamSize) return teamB.push(player);
    if (teamB.length >= teamSize) return teamA.push(player);
    const aPenalty = teamPairPenalty(teamA, player, pairCounts);
    const bPenalty = teamPairPenalty(teamB, player, pairCounts);
    if (aPenalty < bPenalty) teamA.push(player);
    else if (bPenalty < aPenalty) teamB.push(player);
    else if (teamA.length <= teamB.length) teamA.push(player);
    else teamB.push(player);
  });
  return { teamA, teamB };
}

async function createMatch(mode, players = [], extra = {}) {
  const safeMode = normalizeMode(mode);
  const teamSize = safeMode === '5v5' ? 5 : 3;
  const placar = await readPlacar();
  const config = normalizeFairness(placar.fairness || {});
  const queueFairness = players.fairness || extra.fairness || null;
  const randomized = shuffle(players).slice(0, teamSize * 2);
  const pairCounts = recentPairCounts(placar, safeMode, config.pairWindowMinutes);
  const teams = config.enabled ? balancedTeams(randomized, teamSize, pairCounts) : { teamA: randomized.slice(0, teamSize), teamB: randomized.slice(teamSize, teamSize * 2) };
  const match = {
    id: `placar_${safeMode}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    mode: safeMode,
    status: 'open',
    reportLock: null,
    teamA: teams.teamA,
    teamB: teams.teamB,
    scoreA: null,
    scoreB: null,
    voiceChannelId: String(extra.voiceChannelId || '').trim(),
    textChannelId: String(extra.textChannelId || '').trim(),
    discordMessageId: String(extra.discordMessageId || '').trim(),
    createdAt: new Date().toISOString(),
    finishedAt: null,
    fairness: { enabled: config.enabled, queue: queueFairness, teamSplit: 'balanceia jogadores para reduzir dupla repetida nas últimas partidas', pairWindowMinutes: config.pairWindowMinutes },
    result: null
  };
  placar.matches.push(match);
  placar.matches = placar.matches.slice(-500);
  await writePlacar(placar);
  return match;
}

async function attachMatchMessage(matchId, payload = {}) {
  const placar = await readPlacar();
  const match = placar.matches.find((item) => item.id === matchId);
  if (!match) throw new Error('Partida não encontrada.');
  match.discordMessageId = String(payload.discordMessageId || match.discordMessageId || '').trim();
  match.textChannelId = String(payload.textChannelId || match.textChannelId || '').trim();
  match.voiceChannelId = String(payload.voiceChannelId || match.voiceChannelId || '').trim();
  await writePlacar(placar);
  return match;
}

async function claimMatchReporter(matchId, discordId = '') {
  const placar = await readPlacar();
  const match = placar.matches.find((item) => item.id === String(matchId || '').trim());
  if (!match) throw new Error('Partida não encontrada.');
  if (match.status === 'finished') throw new Error('Essa partida já foi finalizada.');
  const id = String(discordId || '').trim();
  const now = Date.now();
  const lockTime = Date.parse(match.reportLock?.claimedAt || '');
  const expired = !Number.isFinite(lockTime) || now - lockTime > 15 * 60 * 1000;
  if (match.reportLock?.discordId && match.reportLock.discordId !== id && !expired) {
    const minutes = Math.max(1, Math.ceil((15 * 60 * 1000 - (now - lockTime)) / 60000));
    throw new Error(`O placar já está sendo atualizado por <@${match.reportLock.discordId}>. Aguarde ${minutes}min ou peça para ele enviar.`);
  }
  match.reportLock = { discordId: id, claimedAt: new Date().toISOString() };
  await writePlacar(placar);
  return match;
}

function toNumberMap(input = {}) {
  const result = {};
  Object.entries(input || {}).forEach(([id, value]) => {
    const safe = String(id || '').trim();
    const num = Math.max(0, Number(value || 0) || 0);
    if (safe) result[safe] = num;
  });
  return result;
}

function parseStatMap(raw = '') {
  const map = {};
  String(raw || '').split(/[;,\n]+/).forEach((chunk) => {
    const match = chunk.match(/(\d{8,25}|<@!?(\d{8,25})>|@[\w.]+)\s*[:=\- ]\s*(\d+(?:\.\d+)?)/);
    if (!match) return;
    const id = (match[2] || match[1] || '').replace(/\D/g, '');
    const value = Number(match[3] || 0) || 0;
    if (id && value) map[id] = (map[id] || 0) + value;
  });
  return map;
}

function normalizeStatsPayload(payload = {}) {
  if (payload.stats && typeof payload.stats === 'object') {
    return {
      goals: toNumberMap(payload.stats.goals),
      assists: toNumberMap(payload.stats.assists),
      defenses: toNumberMap(payload.stats.defenses),
      interceptions: toNumberMap(payload.stats.interceptions),
      passes: toNumberMap(payload.stats.passes)
    };
  }
  return {
    goals: parseStatMap(payload.goals || ''),
    assists: parseStatMap(payload.assists || ''),
    defenses: parseStatMap(payload.defenses || ''),
    interceptions: parseStatMap(payload.interceptions || ''),
    passes: parseStatMap(payload.passes || '')
  };
}

async function finishMatch(matchId, payload = {}) {
  const placar = await readPlacar();
  const match = placar.matches.find((item) => item.id === String(matchId || '').trim());
  if (!match) throw new Error('Partida não encontrada.');
  if (match.status === 'finished') throw new Error('Essa partida já foi finalizada.');
  if (match.reportLock?.discordId && String(payload.reportedBy || '').trim() && match.reportLock.discordId !== String(payload.reportedBy || '').trim()) {
    throw new Error('Só quem clicou em Atualizar placar pode finalizar este envio.');
  }

  const scoreA = Math.max(0, Number(payload.scoreA || 0) || 0);
  const scoreB = Math.max(0, Number(payload.scoreB || 0) || 0);
  const stats = normalizeStatsPayload(payload);
  const mvpId = String(payload.mvpId || '').replace(/\D/g, '');
  const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
  const teamAIds = new Set((match.teamA || []).map((p) => p.discordId));
  const teamBIds = new Set((match.teamB || []).map((p) => p.discordId));
  const allIds = new Set(allPlayers.map((p) => p.discordId));
  if (!mvpId || !allIds.has(mvpId)) throw new Error('MVP obrigatório e precisa ser um jogador da partida.');
  const sumA = [...teamAIds].reduce((sum, id) => sum + (Number(stats.goals[id] || 0) || 0), 0);
  const sumB = [...teamBIds].reduce((sum, id) => sum + (Number(stats.goals[id] || 0) || 0), 0);
  if (Math.round(sumA * 10) / 10 !== scoreA) throw new Error(`A soma dos gols individuais do Time A (${sumA}) precisa bater com o placar (${scoreA}).`);
  if (Math.round(sumB * 10) / 10 !== scoreB) throw new Error(`A soma dos gols individuais do Time B (${sumB}) precisa bater com o placar (${scoreB}).`);

  const winner = scoreA === scoreB ? 'draw' : scoreA > scoreB ? 'A' : 'B';
  const safeMode = normalizeMode(match.mode);
  placar.players[safeMode] = placar.players[safeMode] || {};
  const deltas = [];

  allPlayers.forEach((p) => {
    const current = normalizePlayer(placar.players[safeMode][p.discordId], p);
    const isA = teamAIds.has(p.discordId);
    const teamGoals = isA ? scoreA : scoreB;
    const enemyGoals = isA ? scoreB : scoreA;
    const won = winner !== 'draw' && ((winner === 'A' && isA) || (winner === 'B' && !isA));
    const lost = winner !== 'draw' && !won;
    const playerGoals = Number(stats.goals[p.discordId] || 0) || 0;
    const playerAssists = Number(stats.assists[p.discordId] || 0) || 0;
    const playerDefenses = Number(stats.defenses[p.discordId] || 0) || 0;
    const playerInterceptions = Number(stats.interceptions[p.discordId] || 0) || 0;
    const playerPasses = Number(stats.passes[p.discordId] || 0) || 0;
    let delta = placar.pointsRule.participation;
    if (winner === 'draw') delta += placar.pointsRule.draw;
    else if (won) delta += placar.pointsRule.win;
    else if (lost) delta += placar.pointsRule.loss;
    delta += playerGoals * placar.pointsRule.goal;
    delta += playerAssists * placar.pointsRule.assist;
    delta += playerDefenses * placar.pointsRule.defense;
    delta += playerInterceptions * placar.pointsRule.interception;
    delta += playerPasses * placar.pointsRule.pass;
    if (enemyGoals === 0 && teamGoals > 0) delta += placar.pointsRule.cleanSheet;
    if (mvpId && p.discordId === mvpId) delta += placar.pointsRule.mvp;
    delta = Math.round(delta * 10) / 10;

    const next = normalizePlayer({
      ...current,
      name: p.name || current.name,
      avatar: p.avatar || current.avatar,
      points: current.points + delta,
      matches: current.matches + 1,
      wins: current.wins + (won ? 1 : 0),
      draws: current.draws + (winner === 'draw' ? 1 : 0),
      losses: current.losses + (lost ? 1 : 0),
      goals: current.goals + playerGoals,
      assists: current.assists + playerAssists,
      defenses: current.defenses + playerDefenses,
      interceptions: current.interceptions + playerInterceptions,
      passes: current.passes + playerPasses,
      cleanSheets: current.cleanSheets + (enemyGoals === 0 && teamGoals > 0 ? 1 : 0),
      mvp: current.mvp + (mvpId && p.discordId === mvpId ? 1 : 0),
      lastMatchAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    placar.players[safeMode][p.discordId] = next;
    deltas.push({ discordId: p.discordId, name: p.name || current.name, before: current.points, delta, after: next.points, rankKey: next.rankKey, rankName: next.rankName, rankEmoji: next.rankEmoji, stats: { goals: playerGoals, assists: playerAssists, defenses: playerDefenses, interceptions: playerInterceptions, passes: playerPasses, mvp: p.discordId === mvpId } });
  });

  match.status = 'finished';
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.finishedAt = new Date().toISOString();
  match.result = { winner, ...stats, mvpId, reportedBy: String(payload.reportedBy || '').trim(), proofUrl: String(payload.proofUrl || '').trim(), deltas };
  await writePlacar(placar);
  return { match, deltas, leaderboard: (await getLeaderboard(safeMode)).players };
}

async function getMatch(matchId) {
  const placar = await readPlacar();
  return placar.matches.find((item) => item.id === String(matchId || '').trim()) || null;
}

module.exports = {
  RANKS,
  normalizeMode,
  readPlacar,
  getFullScoreboard,
  getLeaderboard,
  addToQueue,
  removeFromQueue,
  popQueueForMatch,
  createMatch,
  attachMatchMessage,
  claimMatchReporter,
  finishMatch,
  getMatch,
  rankForPoints
};
