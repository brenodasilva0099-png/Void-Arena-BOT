const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  Routes
} = require('discord.js');

const storage = require('../server/storage');

// Void Arena 5.0.3: uma HUB interativa por confronto, série MD1/MD3/MD5 e avanço só ao fechar a série.
const DEFAULT_RESULTS_CHANNEL_ID = '1521257495727706234';
const OPEN_PREFIX = 'result:open:';
const SUBMIT_PREFIX = 'result:submit:';

function resultsChannelId(payload = {}) {
  return String(payload.resultsChannelId || process.env.RESULTS_CHANNEL_ID || DEFAULT_RESULTS_CHANNEL_ID).trim();
}

function siteUrl() {
  return String(process.env.SITE_API_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '');
}

function siteToken() {
  return process.env.SITE_REALTIME_TOKEN || process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
}

async function callSite(pathname, payload = {}) {
  const token = siteToken();
  const response = await fetch(`${siteUrl()}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-site-realtime-token': token, 'x-bot-api-key': token, 'x-internal-token': token } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || `Site recusou (${response.status})`);
  return data;
}

function roundKey(value = '') {
  const key = String(value || '').toLowerCase();
  return ({ slot: 'slots', slots: 'slots', inicial: 'slots', round16: 'round16', oitavas: 'round16', quarters: 'quarters', quartas: 'quarters', semis: 'semis', semi: 'semis', finals: 'finals', final: 'finals' })[key] || key;
}

function roundLabel(key = '') {
  return ({ slots: 'Rodada inicial', round16: 'Oitavas', quarters: 'Quartas', semis: 'Semifinal', finals: 'Final' })[key] || key;
}

function maxGames(format = 'MD1') {
  const found = String(format || '').match(/MD(\d+)/i);
  const number = found ? Number(found[1]) || 1 : 1;
  return Math.max(1, Math.min(9, number));
}

function winsNeeded(bestOf = 1) {
  return Math.floor(Number(bestOf || 1) / 2) + 1;
}

function clampGameNumber(value, bestOf = 1) {
  const number = Math.floor(Number(value || 1));
  return Math.max(1, Math.min(maxGames(`MD${bestOf}`), Number.isFinite(number) ? number : 1));
}

function teamIdOf(item) {
  return typeof item === 'string' ? item : String(item?.id || '');
}

function safeTeam(team = {}) {
  return {
    id: String(team.id || ''),
    name: String(team.name || team.tag || 'Time').slice(0, 120),
    tag: String(team.tag || '').slice(0, 24),
    ownerUserId: String(team.ownerUserId || ''),
    players: Array.isArray(team.players) ? team.players : [],
    reserves: Array.isArray(team.reserves) ? team.reserves : [],
    playerAccounts: team.playerAccounts || {}
  };
}

function unique(list = []) {
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

function discordIdFrom(value = '', usersById = new Map(), usersByDiscordId = new Map()) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return usersById.get(raw)?.discordId || usersByDiscordId.get(raw)?.discordId || '';
}

function teamDiscordIds(team = {}, users = []) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByDiscordId = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const ids = [];
  const owner = usersById.get(String(team.ownerUserId || ''));
  if (owner?.discordId) ids.push(owner.discordId);
  const accounts = [
    ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
    ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : []),
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : [])
  ];
  accounts.forEach((value) => {
    const id = discordIdFrom(value, usersById, usersByDiscordId);
    if (id) ids.push(id);
  });
  return unique(ids);
}

function hubKey(match = {}) {
  return `${match.roundKey}_${match.matchIndex}_${match.teamA?.id || 'a'}_${match.teamB?.id || 'b'}`;
}

function hubId(match = {}) {
  return `${match.roundKey}_${match.matchIndex}`;
}

function matchesFromBracket({ bracket = {}, teams = [], settings = {}, users = [] } = {}) {
  const byId = new Map(teams.map((team) => { const safe = safeTeam(team); return [safe.id, safe]; }));
  const format = settings.matchFormat || 'MD1';
  const slotSize = Math.max(16, Array.isArray(bracket.slots) && bracket.slots.length > 16 ? 32 : 16);
  const defs = [{ key: 'slots', size: slotSize }, { key: 'round16', size: 16 }, { key: 'quarters', size: 8 }, { key: 'semis', size: 4 }, { key: 'finals', size: 2 }];
  const matches = [];
  for (const def of defs) {
    const arr = Array.isArray(bracket[def.key]) ? bracket[def.key] : [];
    for (let i = 0; i < def.size; i += 2) {
      const teamA = byId.get(teamIdOf(arr[i]));
      const teamB = byId.get(teamIdOf(arr[i + 1]));
      if (!teamA || !teamB) continue;
      const matchIndex = Math.floor(i / 2);
      const bestOf = maxGames(format);
      const match = {
        hubId: `${def.key}_${matchIndex}`,
        roundKey: def.key,
        roundLabel: roundLabel(def.key),
        matchIndex,
        matchNumber: matchIndex + 1,
        matchFormat: format,
        maxGames: bestOf,
        winsNeeded: winsNeeded(bestOf),
        teamA,
        teamB,
        captainDiscordIds: unique([...teamDiscordIds(teamA, users), ...teamDiscordIds(teamB, users)])
      };
      match.hubKey = hubKey(match);
      matches.push(match);
    }
  }
  return matches;
}

function envRoleIds(...names) {
  return names.flatMap((name) => String(process.env[name] || '').split(',')).map((item) => item.trim()).filter(Boolean);
}
function memberHasAnyRole(member, roleIds = []) {
  if (!member?.roles?.cache || !roleIds.length) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}
function isStaff(member) {
  const roleIds = envRoleIds('RESULTS_ROLE_IDS', 'CONTROL_PANEL_ROLE_IDS', 'ADMIN_ROLE_IDS');
  return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator) || member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) || memberHasAnyRole(member, roleIds));
}
function canUse(member, match) {
  return isStaff(member) || (match.captainDiscordIds || []).includes(member?.id);
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function seriesState(match = {}, result = null) {
  const bestOf = safeNumber(result?.bestOf || match.maxGames, match.maxGames || 1);
  const needed = safeNumber(result?.winsNeeded || winsNeeded(bestOf), winsNeeded(bestOf));
  const scoreA = safeNumber(result?.seriesScoreA ?? result?.finalScoreA, 0);
  const scoreB = safeNumber(result?.seriesScoreB ?? result?.finalScoreB, 0);
  const played = safeNumber(result?.playedGames, 0);
  const current = clampGameNumber(result?.currentGameNumber || played + 1, bestOf);
  const possibleRemaining = Math.max(0, bestOf - played);
  const winsRemaining = Math.max(0, needed - Math.max(scoreA, scoreB));
  const status = String(result?.status || 'pending');
  return { bestOf, needed, scoreA, scoreB, played, current, possibleRemaining, winsRemaining, status };
}

function gameHistoryText(match = {}, result = null) {
  const games = Array.isArray(result?.games) ? result.games.slice().sort((a, b) => Number(a.gameNumber) - Number(b.gameNumber)) : [];
  if (!games.length) return 'Nenhuma partida enviada ainda.';
  return games.slice(0, 5).map((game) => {
    const status = game.status === 'validated' ? 'validada' : game.status === 'conflict' ? 'conflito' : 'aguardando';
    const score = game.finalScoreA !== null && game.finalScoreA !== undefined
      ? `${game.finalScoreA} x ${game.finalScoreB}`
      : game.submissions?.[0]
        ? `${game.submissions[0].scoreA} x ${game.submissions[0].scoreB}`
        : 'sem placar';
    return `Jogo ${game.gameNumber}: ${score} (${status})`;
  }).join('\n');
}

async function fetchResultState(match) {
  try {
    const data = await callSite('/internal/results/state', { hubId: hubId(match), match });
    return data.result || null;
  } catch {
    return null;
  }
}

async function embedFor(match, resultOverride = null) {
  const result = resultOverride || await fetchResultState(match);
  const state = seriesState(match, result);
  const statusLabel = state.status === 'validated'
    ? '✅ Série finalizada'
    : state.status === 'conflict'
      ? '⚠️ Conflito pendente'
      : state.played > 0
        ? '🟣 Série em andamento'
        : '⏳ Aguardando 1º resultado';
  const currentLine = state.status === 'validated'
    ? '🏁 Série concluída. O site já pode avançar o vencedor.'
    : `🎮 Jogo atual: **${state.current}/${state.bestOf}**`;
  const lastProof = result?.proof?.url || result?.proof?.proxyUrl || '';

  return new EmbedBuilder()
    .setTitle(`🎮 Resultado • ${match.teamA.name} x ${match.teamB.name}`)
    .setColor(state.status === 'validated' ? 0x22c55e : state.status === 'conflict' ? 0xef4444 : 0x8b5cf6)
    .setDescription([
      `🏁 **${match.roundLabel} ${match.matchNumber}**  •  **${match.matchFormat}**`,
      `📊 **Série:** ${match.teamA.name} **${state.scoreA}** x **${state.scoreB}** ${match.teamB.name}`,
      `${currentLine}`,
      `${statusLabel}`
    ].join('\n'))
    .addFields(
      { name: '📌 Resumo', value: [`Jogos: **${state.played}/${state.bestOf}**`, `Restam: **${state.possibleRemaining}**`, `Faltam p/ fechar: **${state.winsRemaining}**`].join('  •  '), inline: false },
      { name: '🧾 Histórico', value: gameHistoryText(match, result).slice(0, 900), inline: false },
      { name: '👑 Capitães autorizados', value: match.captainDiscordIds.length ? match.captainDiscordIds.map((id) => `<@${id}>`).join(', ') : 'Nenhum capitão vinculado. Staff pode enviar.', inline: false }
    )
    .setFooter({ text: `Void Arena • HUB única • ${match.hubKey}${lastProof ? ' • print anexada' : ''}` })
    .setTimestamp(new Date());
}

function hubComponents(match) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${OPEN_PREFIX}${match.roundKey}:${match.matchIndex}`)
        .setLabel('📤 Enviar / atualizar jogo')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

async function findExistingHub(channel, match) {
  if (!channel?.messages?.fetch) return null;
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages?.size) return null;
  return Array.from(messages.values()).find((message) => {
    if (!message.author?.bot) return false;
    return Array.from(message.embeds || []).some((embed) => String(embed.footer?.text || '').includes(match.hubKey));
  }) || null;
}

async function sendOrUpdateHub(client, match, payload = {}, resultOverride = null) {
  const channelId = resultsChannelId(payload);
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.send) throw new Error(`Canal de resultados inválido: ${channelId}`);
  const messagePayload = { embeds: [await embedFor(match, resultOverride)], components: hubComponents(match), allowedMentions: { users: match.captainDiscordIds || [] } };
  const existing = await findExistingHub(channel, match);
  if (existing?.editable) {
    const edited = await existing.edit(messagePayload);
    return { ...match, reused: true, discordChannelId: edited.channelId, discordMessageId: edited.id };
  }
  const sent = await channel.send(messagePayload);
  return { ...match, created: true, discordChannelId: sent.channelId, discordMessageId: sent.id };
}

async function syncResultHubsForBracket(client, payload = {}) {
  const bracket = payload.bracket || await storage.readBracket();
  const teams = Array.isArray(payload.teams) ? payload.teams : await storage.readTeams();
  const users = Array.isArray(payload.users) ? payload.users : await storage.readUsers();
  const settings = payload.settings || await storage.readTournamentSettings().catch(() => ({}));
  const matches = matchesFromBracket({ bracket, teams, settings, users });
  const hubs = [];
  const errors = [];
  for (const match of matches) {
    try { hubs.push(await sendOrUpdateHub(client, match, payload)); }
    catch (error) { errors.push({ match: `${match.teamA?.name || 'Time A'} vs ${match.teamB?.name || 'Time B'}`, message: error.message }); }
  }
  return { success: true, resultsChannelId: resultsChannelId(payload), totalMatches: matches.length, created: hubs.filter((hub) => hub.created).length, reused: hubs.filter((hub) => hub.reused).length, hubs, errors };
}

function readModal(raw, id) {
  for (const row of raw?.data?.components || []) if (row.component?.custom_id === id) return String(row.component.value || '').trim();
  return '';
}
function upload(raw, id) {
  for (const row of raw?.data?.components || []) {
    const component = row.component || {};
    if (component.custom_id === id && Array.isArray(component.values)) {
      const resolved = raw?.data?.resolved?.attachments || {};
      const found = component.values.map(String).map((value) => resolved[value]).find(Boolean);
      if (!found) return null;
      return { id: String(found.id || ''), url: String(found.url || ''), proxyUrl: String(found.proxy_url || found.proxyURL || found.proxyUrl || ''), name: String(found.filename || found.name || 'resultado').slice(0, 160), contentType: String(found.content_type || found.contentType || ''), size: Number(found.size || 0) || 0 };
    }
  }
  return null;
}

async function showModal(interaction, match) {
  const state = seriesState(match, await fetchResultState(match));
  await interaction.client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), { body: { type: 9, data: { custom_id: `${SUBMIT_PREFIX}${match.roundKey}:${match.matchIndex}`, title: 'Resultado da série', components: [
    { type: 18, label: '📸 Print do resultado', description: 'Envie a print/comprovante desta partida.', component: { type: 19, custom_id: 'proof', min_values: 1, max_values: 1, required: true } },
    { type: 18, label: '🎮 Número da partida na série', description: `Atual: jogo ${state.current} de ${state.bestOf}`, component: { type: 4, custom_id: 'gameNumber', style: 1, min_length: 1, max_length: 2, required: true, value: String(state.current), placeholder: String(state.current) } },
    { type: 18, label: `Gols ${match.teamA.tag || match.teamA.name}`.slice(0, 45), component: { type: 4, custom_id: 'scoreA', style: 1, min_length: 1, max_length: 3, required: true, placeholder: '0' } },
    { type: 18, label: `Gols ${match.teamB.tag || match.teamB.name}`.slice(0, 45), component: { type: 4, custom_id: 'scoreB', style: 1, min_length: 1, max_length: 3, required: true, placeholder: '0' } }
  ] } } });
}

async function currentMatch(round, index) {
  const [bracket, teams, users, settings] = await Promise.all([storage.readBracket(), storage.readTeams(), storage.readUsers(), storage.readTournamentSettings().catch(() => ({}))]);
  return matchesFromBracket({ bracket, teams, users, settings }).find((match) => match.roundKey === round && match.matchIndex === index);
}

async function updateHubAfterSubmit(client, match, result) {
  try {
    await sendOrUpdateHub(client, match, {}, result);
  } catch (error) {
    console.error('Erro ao atualizar HUB após envio:', error);
  }
}

async function submitToSite(interaction, raw, match) {
  await interaction.deferReply({ ephemeral: true });
  const proof = upload(raw, 'proof');
  if (!proof?.url) return interaction.editReply('Não achei a print enviada.');

  const gameNumber = Number(readModal(raw, 'gameNumber'));
  const payload = {
    roundKey: match.roundKey,
    matchIndex: match.matchIndex,
    match,
    gameNumber,
    scoreA: Number(readModal(raw, 'scoreA')),
    scoreB: Number(readModal(raw, 'scoreB')),
    proof,
    authorDiscordId: interaction.user.id,
    authorName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
    isStaff: isStaff(interaction.member),
    createdAt: new Date().toISOString()
  };
  if (![payload.gameNumber, payload.scoreA, payload.scoreB].every(Number.isFinite)) return interaction.editReply('Preencha os números corretamente.');
  if (payload.scoreA === payload.scoreB) return interaction.editReply('Resultado empatado não fecha uma partida. Informe o placar vencedor.');

  const data = await callSite('/internal/results/submit', payload);
  await updateHubAfterSubmit(interaction.client, match, data.result || null);

  const result = data.result || {};
  const message = result.status === 'validated'
    ? 'Série finalizada, resultado validado e chaveamento atualizado no site.'
    : result.status === 'conflict'
      ? 'Resultado salvo, mas deu conflito nesta partida. Staff precisa resolver.'
      : result.status === 'partial'
        ? `Partida salva. Série: ${result.seriesScoreA || 0} x ${result.seriesScoreB || 0}. Próximo jogo: ${result.currentGameNumber || '?'} de ${result.bestOf || match.maxGames}.`
        : 'Resultado salvo. Aguardando confirmação do outro capitão.';
  return interaction.editReply(message);
}

function registerMatchResultHandlers(client) {
  if (!client || client.__matchResultsReady) return client;
  client.__matchResultsReady = true;
  const rawMap = new Map();
  client.on('raw', (payload) => { if (payload?.t === 'INTERACTION_CREATE' && payload?.d?.id) { rawMap.set(payload.d.id, payload.d); setTimeout(() => rawMap.delete(payload.d.id), 120000); } });
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      const text = String(message.content || '').trim();
      if (!text.startsWith('.resultado-hub') && text !== '.resultados-sync') return;
      if (!isStaff(message.member)) return message.reply('Apenas staff pode usar esse comando.');
      if (text === '.resultados-sync') {
        const result = await syncResultHubsForBracket(message.client);
        return message.reply(`✅ HUBs sincronizadas
🆕 ${result.created} criada(s) • 🔁 ${result.reused} atualizada(s) • 🎮 ${result.totalMatches} confronto(s)${result.errors?.length ? ` • ⚠️ ${result.errors.length} erro(s)` : ''}.`);
      }
      const [, roundArg = 'slots', numArg = '1'] = text.split(/\s+/);
      const match = await currentMatch(roundKey(roundArg), Math.max(0, Number(numArg || 1) - 1));
      if (!match) return message.reply('Não achei esse confronto completo no chaveamento.');
      const hub = await sendOrUpdateHub(message.client, match);
      return message.reply(`${hub.reused ? 'HUB atualizada' : 'HUB criada'} para **${match.teamA.name} vs ${match.teamB.name}**.`);
    } catch (error) { console.error('Erro resultados:', error); return message.reply(`Erro: ${error.message}`).catch(() => {}); }
  });
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const id = String(interaction.customId || '');
      if (interaction.isButton?.() && id.startsWith(OPEN_PREFIX)) {
        const [round, idx] = id.slice(OPEN_PREFIX.length).split(':');
        const match = await currentMatch(round, Number(idx));
        if (!match) return interaction.reply({ content: 'Confronto não encontrado.', ephemeral: true });
        if (!canUse(interaction.member, match)) return interaction.reply({ content: 'Apenas capitães desses times ou staff podem enviar.', ephemeral: true });
        return showModal(interaction, match);
      }
      if (interaction.isModalSubmit?.() && id.startsWith(SUBMIT_PREFIX)) {
        const [round, idx] = id.slice(SUBMIT_PREFIX.length).split(':');
        const match = await currentMatch(round, Number(idx));
        if (!match) return interaction.reply({ content: 'Confronto não encontrado.', ephemeral: true });
        if (!canUse(interaction.member, match)) return interaction.reply({ content: 'Apenas capitães desses times ou staff podem enviar.', ephemeral: true });
        return submitToSite(interaction, rawMap.get(interaction.id), match);
      }
    } catch (error) {
      console.error('Erro interação resultado:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply(`Erro: ${error.message}`).catch(() => {});
      return interaction.reply({ content: `Erro: ${error.message}`, ephemeral: true }).catch(() => {});
    }
  });
  return client;
}

module.exports = { registerMatchResultHandlers, syncResultHubsForBracket, matchesFromBracket };
