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

// Void Arena 5.0.2: HUBs com encoding UTF-8 limpo e emoji válido.
const DEFAULT_RESULTS_CHANNEL_ID = '1521257495727706234';
const OPEN_PREFIX = 'result:open:';
const SUBMIT_PREFIX = 'result:submit:';

function resultsChannelId(payload = {}) {
  return String(payload.resultsChannelId || process.env.RESULTS_CHANNEL_ID || DEFAULT_RESULTS_CHANNEL_ID).trim();
}

function roundKey(value = '') {
  const key = String(value || '').toLowerCase();
  return ({ slot: 'slots', slots: 'slots', oitavas: 'slots', quarters: 'quarters', quartas: 'quarters', semis: 'semis', semi: 'semis', finals: 'finals', final: 'finals' })[key] || key;
}

function roundLabel(key = '') {
  return ({ slots: 'Oitavas', quarters: 'Quartas', semis: 'Semifinal', finals: 'Final' })[key] || key;
}

function maxGames(format = 'MD1') {
  const found = String(format || '').match(/MD(\d+)/i);
  return found ? Number(found[1]) || 1 : 1;
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

function matchesFromBracket({ bracket = {}, teams = [], settings = {}, users = [] } = {}) {
  const byId = new Map(teams.map((team) => { const safe = safeTeam(team); return [safe.id, safe]; }));
  const format = settings.matchFormat || 'MD1';
  const defs = [{ key: 'slots', size: 16 }, { key: 'quarters', size: 8 }, { key: 'semis', size: 4 }, { key: 'finals', size: 2 }];
  const matches = [];
  for (const def of defs) {
    const arr = Array.isArray(bracket[def.key]) ? bracket[def.key] : [];
    for (let i = 0; i < def.size; i += 2) {
      const teamA = byId.get(teamIdOf(arr[i]));
      const teamB = byId.get(teamIdOf(arr[i + 1]));
      if (!teamA || !teamB) continue;
      const matchIndex = Math.floor(i / 2);
      const match = {
        hubId: `${def.key}_${matchIndex}`,
        roundKey: def.key,
        roundLabel: roundLabel(def.key),
        matchIndex,
        matchNumber: matchIndex + 1,
        matchFormat: format,
        maxGames: maxGames(format),
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

function embedFor(match) {
  return new EmbedBuilder()
    .setTitle('🏆 Resultado da Partida')
    .setColor(0x8b5cf6)
    .setDescription([
      `**${match.teamA.name}** vs **${match.teamB.name}**`, '',
      `**Rodada:** ${match.roundLabel} ${match.matchNumber}`,
      `**Formato:** ${match.matchFormat}`,
      `**Partidas jogadas:** 0/${match.maxGames}`,
      `**Partidas faltando:** ${match.maxGames}`, '',
      'Clique em **Enviar resultado** para mandar a print e o placar.'
    ].join('\n'))
    .addFields({ name: 'Capitães autorizados', value: match.captainDiscordIds.length ? match.captainDiscordIds.map((id) => `<@${id}>`).join(', ') : 'Nenhum capitão vinculado. Staff pode enviar.' })
    .setFooter({ text: `Void Arena • Resultados oficiais • ${match.hubKey}` })
    .setTimestamp(new Date());
}
function hubComponents(match) {
  return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${OPEN_PREFIX}${match.roundKey}:${match.matchIndex}`).setLabel('Enviar resultado').setEmoji('📤').setStyle(ButtonStyle.Primary))];
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
async function sendOrUpdateHub(client, match, payload = {}) {
  const channelId = resultsChannelId(payload);
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.send) throw new Error(`Canal de resultados inválido: ${channelId}`);
  const messagePayload = { embeds: [embedFor(match)], components: hubComponents(match), allowedMentions: { users: match.captainDiscordIds || [] } };
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
  await interaction.client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), { body: { type: 9, data: { custom_id: `${SUBMIT_PREFIX}${match.roundKey}:${match.matchIndex}`, title: 'Enviar resultado', components: [
    { type: 18, label: 'Print do resultado', description: 'Envie a print/comprovante da partida.', component: { type: 19, custom_id: 'proof', min_values: 1, max_values: 1, required: true } },
    { type: 18, label: `Gols ${match.teamA.tag || match.teamA.name}`.slice(0, 45), component: { type: 4, custom_id: 'scoreA', style: 1, min_length: 1, max_length: 3, required: true, placeholder: '0' } },
    { type: 18, label: `Gols ${match.teamB.tag || match.teamB.name}`.slice(0, 45), component: { type: 4, custom_id: 'scoreB', style: 1, min_length: 1, max_length: 3, required: true, placeholder: '0' } },
    { type: 18, label: 'Partidas já jogadas', component: { type: 4, custom_id: 'played', style: 1, min_length: 1, max_length: 3, required: true, placeholder: String(match.maxGames || 1) } },
    { type: 18, label: 'Partidas faltando', component: { type: 4, custom_id: 'remaining', style: 1, min_length: 1, max_length: 3, required: true, placeholder: '0' } }
  ] } } });
}
async function currentMatch(round, index) {
  const [bracket, teams, users, settings] = await Promise.all([storage.readBracket(), storage.readTeams(), storage.readUsers(), storage.readTournamentSettings().catch(() => ({}))]);
  return matchesFromBracket({ bracket, teams, users, settings }).find((match) => match.roundKey === round && match.matchIndex === index);
}
async function submitToSite(interaction, raw, match) {
  await interaction.deferReply({ ephemeral: true });
  const proof = upload(raw, 'proof');
  if (!proof?.url) return interaction.editReply('❌ Não achei a print enviada.');
  const payload = { roundKey: match.roundKey, matchIndex: match.matchIndex, match, scoreA: Number(readModal(raw, 'scoreA')), scoreB: Number(readModal(raw, 'scoreB')), playedGames: Number(readModal(raw, 'played')), remainingGames: Number(readModal(raw, 'remaining')), proof, authorDiscordId: interaction.user.id, authorName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username, isStaff: isStaff(interaction.member), createdAt: new Date().toISOString() };
  if (![payload.scoreA, payload.scoreB, payload.playedGames, payload.remainingGames].every(Number.isFinite)) return interaction.editReply('❌ Preencha os números corretamente.');
  const siteUrl = String(process.env.SITE_API_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '');
  const token = process.env.SITE_REALTIME_TOKEN || process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
  const response = await fetch(`${siteUrl}/internal/results/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-site-realtime-token': token, 'x-bot-api-key': token, 'x-internal-token': token }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || `Site recusou (${response.status})`);
  const msg = data.result?.status === 'validated' ? '✅ Resultado validado e chaveamento atualizado no site.' : data.result?.status === 'conflict' ? '⚠️ Resultado salvo, mas deu conflito. Staff precisa resolver.' : '✅ Resultado salvo. Aguardando confirmação do outro capitão.';
  return interaction.editReply(msg);
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
      if (!isStaff(message.member)) return message.reply('❌ Apenas staff pode usar esse comando.');
      if (text === '.resultados-sync') {
        const result = await syncResultHubsForBracket(message.client);
        return message.reply(`✅ HUBs sincronizadas: ${result.created} criadas, ${result.reused} atualizadas, ${result.totalMatches} confronto(s)${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}.`);
      }
      const [, roundArg = 'slots', numArg = '1'] = text.split(/\s+/);
      const match = await currentMatch(roundKey(roundArg), Math.max(0, Number(numArg || 1) - 1));
      if (!match) return message.reply('❌ Não achei esse confronto completo no chaveamento.');
      const hub = await sendOrUpdateHub(message.client, match);
      return message.reply(`${hub.reused ? '🔄 HUB atualizada' : '✅ HUB criada'} para **${match.teamA.name} vs ${match.teamB.name}**.`);
    } catch (error) { console.error('Erro resultados:', error); return message.reply(`❌ Erro: ${error.message}`).catch(() => {}); }
  });
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const id = String(interaction.customId || '');
      if (interaction.isButton?.() && id.startsWith(OPEN_PREFIX)) {
        const [round, idx] = id.slice(OPEN_PREFIX.length).split(':');
        const match = await currentMatch(round, Number(idx));
        if (!match) return interaction.reply({ content: '❌ Confronto não encontrado.', ephemeral: true });
        if (!canUse(interaction.member, match)) return interaction.reply({ content: '❌ Apenas capitães desses times ou staff podem enviar.', ephemeral: true });
        return showModal(interaction, match);
      }
      if (interaction.isModalSubmit?.() && id.startsWith(SUBMIT_PREFIX)) {
        const [round, idx] = id.slice(SUBMIT_PREFIX.length).split(':');
        const match = await currentMatch(round, Number(idx));
        if (!match) return interaction.reply({ content: '❌ Confronto não encontrado.', ephemeral: true });
        if (!canUse(interaction.member, match)) return interaction.reply({ content: '❌ Apenas capitães desses times ou staff podem enviar.', ephemeral: true });
        return submitToSite(interaction, rawMap.get(interaction.id), match);
      }
    } catch (error) {
      console.error('Erro interação resultado:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply(`❌ Erro: ${error.message}`).catch(() => {});
      return interaction.reply({ content: `❌ Erro: ${error.message}`, ephemeral: true }).catch(() => {});
    }
  });
  return client;
}

module.exports = { registerMatchResultHandlers, syncResultHubsForBracket, matchesFromBracket };
