const { Events, EmbedBuilder } = require('discord.js');
const placar = require('./placarStorage');

function normalizeModeArg(raw) {
  const value = String(raw || '').toLowerCase().replace('x', 'v');
  return value === '5v5' ? '5v5' : '3v3';
}

function label(mode) {
  return normalizeModeArg(mode).toUpperCase().replace('V', 'x');
}

async function buildEmbeds(mode) {
  const data = await placar.getFullScoreboard();
  const safeMode = normalizeModeArg(mode);
  const required = safeMode === '5v5' ? 10 : 6;
  const queue = data.queues?.[safeMode] || [];
  const ranking = data.leaderboards?.[safeMode] || [];
  const unique = new Map();
  queue.concat(ranking).forEach((item) => {
    const id = String(item.discordId || '').trim();
    if (id && !unique.has(id)) unique.set(id, item);
  });
  const selected = Array.from(unique.values()).slice(0, required);
  while (selected.length < required) {
    selected.push({ name: 'Jogador teste ' + (selected.length + 1), points: 0, matches: 0, wins: 0, winRate: 0, rankEmoji: '🥉' });
  }
  const size = safeMode === '5v5' ? 5 : 3;
  const teamA = selected.slice(0, size);
  const teamB = selected.slice(size, size * 2);
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

function registerPlacarDebugCommand(client) {
  if (!client || client.__placarDebugCommand) return;
  client.__placarDebugCommand = true;
  client.on(Events.MessageCreate, async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const text = String(msg.content || '').trim();
    if (!text.toLowerCase().startsWith('!placar-preview')) return;
    const mode = normalizeModeArg(text.split(/\s+/)[1]);
    const embeds = await buildEmbeds(mode);
    const channelId = String(process.env.PLACAR_CONFIG_CHANNEL_ID || '1518387894522216559').trim();
    const target = await msg.client.channels.fetch(channelId).catch(() => msg.channel);
    await target.send({ content: 'Preview manual da fila ' + label(mode), embeds });
    if (target.id !== msg.channelId) await msg.reply('Preview enviado no canal de config.');
  });
}

module.exports = { registerPlacarDebugCommand };
