const { Events, EmbedBuilder } = require('discord.js');
const placar = require('./placarStorage');

const RANK_ROLE_IDS = {
  abyssal: '1494779368969470083',
  mestre: '1494779378087886928',
  diamante: '1494779977743339582',
  platina: '1494780148212568090',
  ouro: '1494780420447928422',
  prata: '1494780533572632586',
  bronze: '1494780591303037019'
};

function normalizeModeArg(raw) {
  const value = String(raw || '').toLowerCase().replace('x', 'v');
  return value === '5v5' ? '5v5' : '3v3';
}

function label(mode) {
  return normalizeModeArg(mode).toUpperCase().replace('V', 'x');
}

function samplePlayers(data, safeMode, required) {
  const queue = data.queues?.[safeMode] || [];
  const ranking = data.leaderboards?.[safeMode] || [];
  const unique = new Map();
  queue.concat(ranking).forEach((item) => {
    const id = String(item.discordId || '').trim();
    if (id && !unique.has(id)) unique.set(id, item);
  });
  const selected = Array.from(unique.values()).slice(0, required);
  while (selected.length < required) {
    selected.push({ name: 'Jogador teste ' + (selected.length + 1), points: 0, matches: 0, wins: 0, winRate: 0, rankEmoji: '🥉', rankKey: 'bronze', rankName: 'Bronze' });
  }
  return selected;
}

async function buildEmbeds(mode) {
  const data = await placar.getFullScoreboard();
  const safeMode = normalizeModeArg(mode);
  const required = safeMode === '5v5' ? 10 : 6;
  const selected = samplePlayers(data, safeMode, required);
  const size = safeMode === '5v5' ? 5 : 3;
  const teamA = selected.slice(0, size);
  const teamB = selected.slice(size, size * 2);
  const ranking = data.leaderboards?.[safeMode] || [];
  const ranked = new Map(ranking.map((player, index) => [player.discordId, { ...player, pos: index + 1 }]));
  const showPlayer = (p) => p.discordId ? '<@' + p.discordId + '>' : p.name;
  const rankLine = (p) => {
    const r = p.discordId ? ranked.get(p.discordId) : null;
    if (!r) return showPlayer(p) + ' — sem ranking ainda';
    return showPlayer(p) + ' — #' + r.pos + ' ' + r.rankEmoji + ' ' + r.points + ' pts • ' + r.matches + 'J • ' + r.wins + 'V';
  };
  const activityLine = (p) => {
    if (!p.discordId) return p.name + ' — teste';
    const recent = (data.matches || []).filter((m) => {
      if (normalizeModeArg(m.mode) !== safeMode) return false;
      const time = Date.parse(m.finishedAt || m.createdAt || '');
      if (!Number.isFinite(time) || Date.now() - time > 90 * 60 * 1000) return false;
      const ids = (m.teamA || []).concat(m.teamB || []).map((x) => String(x.discordId || ''));
      return ids.includes(p.discordId);
    }).length;
    return showPlayer(p) + ' — ' + recent + ' partida(s) nos ultimos 90min';
  };
  const matchEmbed = new EmbedBuilder()
    .setTitle('Partida encontrada - ' + label(safeMode))
    .setColor(0x8b5cf6)
    .setDescription(['Time A', teamA.map(showPlayer).join('\n'), '', 'Time B', teamB.map(showPlayer).join('\n')].join('\n'));
  const debugEmbed = new EmbedBuilder()
    .setTitle('Checagem Cafe com Leite - ' + label(safeMode))
    .setColor(0xf59e0b)
    .setDescription(['Ranking atual dos sorteados', selected.map(rankLine).join('\n'), '', 'Atividade recente', selected.map(activityLine).join('\n'), '', 'Rotacao usada', 'No fechamento real, o bot prioriza quem jogou menos recentemente e tenta evitar duplas repetidas.'].join('\n'));
  return [matchEmbed, debugEmbed];
}

function nextRank(points) {
  const ranks = placar.RANKS;
  const current = placar.rankForPoints(points);
  const idx = ranks.findIndex((rank) => rank.key === current.key);
  return ranks[idx + 1] || null;
}

function resultDelta(player, side, scoreA, scoreB, rule, details) {
  const won = scoreA === scoreB ? false : side === 'A' ? scoreA > scoreB : scoreB > scoreA;
  const draw = scoreA === scoreB;
  const teamGoals = side === 'A' ? scoreA : scoreB;
  const enemyGoals = side === 'A' ? scoreB : scoreA;
  const goals = Number(details.goals[player.name] || 0) || 0;
  const assists = Number(details.assists[player.name] || 0) || 0;
  const defenses = Number(details.defenses[player.name] || 0) || 0;
  const isMvp = details.mvp === player.name;
  let delta = rule.participation;
  if (draw) delta += rule.draw;
  else if (won) delta += rule.win;
  else delta += rule.loss;
  delta += goals * rule.goal;
  delta += assists * rule.assist;
  delta += defenses * rule.defense;
  if (enemyGoals === 0 && teamGoals > 0) delta += rule.cleanSheet;
  if (isMvp) delta += rule.mvp;
  return { delta: Math.round(delta * 10) / 10, goals, assists, defenses, isMvp, won, draw, cleanSheet: enemyGoals === 0 && teamGoals > 0 };
}

async function buildResultPreviewEmbeds(mode) {
  const data = await placar.getFullScoreboard();
  const safeMode = normalizeModeArg(mode);
  const required = safeMode === '5v5' ? 10 : 6;
  const selected = samplePlayers(data, safeMode, required);
  const size = safeMode === '5v5' ? 5 : 3;
  const teamA = selected.slice(0, size);
  const teamB = selected.slice(size, size * 2);
  const rule = data.pointsRule || {};
  const scoreA = safeMode === '5v5' ? 4 : 3;
  const scoreB = safeMode === '5v5' ? 2 : 1;
  const details = { goals: {}, assists: {}, defenses: {}, mvp: teamA[0].name };
  teamA.forEach((p, i) => { details.goals[p.name] = i === 0 ? 2 : i === 1 ? 1 : 0; details.assists[p.name] = i === 0 ? 1 : 0; details.defenses[p.name] = i === 2 ? 2 : 0; });
  teamB.forEach((p, i) => { details.goals[p.name] = i === 0 ? 1 : 0; details.assists[p.name] = i === 1 ? 1 : 0; details.defenses[p.name] = i === 2 ? 1 : 0; });
  const byId = new Map((data.leaderboards?.[safeMode] || []).map((p) => [p.discordId, p]));
  const show = (p) => p.discordId ? '<@' + p.discordId + '>' : p.name;
  const before = (p) => p.discordId && byId.get(p.discordId) ? byId.get(p.discordId) : p;
  const updateLine = (p, side) => {
    const old = before(p);
    const calc = resultDelta(p, side, scoreA, scoreB, rule, details);
    const oldPts = Number(old.points || 0) || 0;
    const nextPts = Math.round((oldPts + calc.delta) * 10) / 10;
    const rank = placar.rankForPoints(nextPts);
    const upcoming = nextRank(nextPts);
    const extras = ['+' + calc.delta + ' VAP', rank.emoji + ' ' + rank.name, upcoming ? 'faltam ' + Math.max(0, Math.round((upcoming.min - nextPts) * 10) / 10) + ' p/ ' + upcoming.name : 'patente maxima'];
    return show(p) + ' — ' + oldPts + ' → **' + nextPts + '** • ' + extras.join(' • ');
  };
  const formEmbed = new EmbedBuilder()
    .setTitle('Como o jogador vai enviar o resultado - ' + label(safeMode))
    .setColor(0x22d3ee)
    .setDescription([
      'Depois que a fila fecha, a mensagem da partida fica com o botão **Reportar resultado**.',
      'Ao clicar, abre um formulário/modal com estes campos:',
      '',
      '**1. Gols do Time A** — exemplo: `' + scoreA + '`',
      '**2. Gols do Time B** — exemplo: `' + scoreB + '`',
      '**3. MVP opcional** — marcar jogador ou ID',
      '**4. Gols individuais** — exemplo: `@jogador=2, @outro=1`',
      '**5. Assists/defesas** — exemplo: `assists: @id=1 | defesas: @id=3`',
      '',
      'Após enviar, o bot soma VAP, atualiza ranking no site/placar e troca o cargo da patente.'
    ].join('\n'));
  const calcEmbed = new EmbedBuilder()
    .setTitle('Preview da soma VAP individual')
    .setColor(0x22c55e)
    .setDescription([
      '**Regra atual Café com Leite**',
      '+3 vitória • +1 empate • +0 derrota • +2 participação • +0,5 gol • +0,5 assistência • +0,5 defesa • +1 clean sheet • +1 MVP',
      '',
      '**Time A vence ' + scoreA + ' x ' + scoreB + '**',
      teamA.map((p) => updateLine(p, 'A')).join('\n'),
      '',
      '**Time B**',
      teamB.map((p) => updateLine(p, 'B')).join('\n')
    ].join('\n'));
  const roleEmbed = new EmbedBuilder()
    .setTitle('Patentes/cargos integrados')
    .setColor(0x8b5cf6)
    .setDescription(placar.RANKS.map((rank) => rank.emoji + ' **' + rank.name + '** — ' + rank.min + '+ VAP • cargo `' + (RANK_ROLE_IDS[rank.key] || 'sem ID') + '`').join('\n'));
  return [formEmbed, calcEmbed, roleEmbed];
}

function registerPlacarDebugCommand(client) {
  if (!client || client.__placarDebugCommand) return;
  client.__placarDebugCommand = true;
  client.on(Events.MessageCreate, async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const text = String(msg.content || '').trim();
    const lower = text.toLowerCase();
    if (!lower.startsWith('!placar-preview') && !lower.startsWith('!placar-resultado-preview')) return;
    const mode = normalizeModeArg(text.split(/\s+/)[1]);
    const embeds = lower.startsWith('!placar-resultado-preview') ? await buildResultPreviewEmbeds(mode) : await buildEmbeds(mode);
    const channelId = String(process.env.PLACAR_CONFIG_CHANNEL_ID || '1518387894522216559').trim();
    const target = await msg.client.channels.fetch(channelId).catch(() => msg.channel);
    await target.send({ content: lower.startsWith('!placar-resultado-preview') ? 'Preview manual do envio de resultado ' + label(mode) : 'Preview manual da fila ' + label(mode), embeds });
    if (target.id !== msg.channelId) await msg.reply('Preview enviado no canal de config.');
  });
}

module.exports = { registerPlacarDebugCommand };
