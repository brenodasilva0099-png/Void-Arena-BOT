const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const placar = require('./placarStorage');

const HISTORY_ID = '1518441859519877120';
const states = new Map();
const pendingPrint = new Map();
const rankRoles = {
  abyssal: '1494779368969470083', mestre: '1494779378087886928', diamante: '1494779977743339582',
  platina: '1494780148212568090', ouro: '1494780420447928422', prata: '1494780533572632586', bronze: '1494780591303037019'
};

function modeLabel(m) { return placar.normalizeMode(m).toUpperCase().replace('V', 'x'); }
function stateKey(matchId, userId) { return String(matchId || '') + ':' + String(userId || ''); }
function printKey(channelId, userId) { return String(channelId || '') + ':' + String(userId || ''); }
function players(match) { return [...(match.teamA || []), ...(match.teamB || [])]; }
function mention(p) { return p?.discordId ? '<@' + p.discordId + '>' : String(p?.name || 'Jogador'); }
function cleanName(value = '') { return String(value || 'Jogador').replace(/[\n\r\t]/g, ' ').trim().slice(0, 80) || 'Jogador'; }
function number(value) { const n = Number(String(value || '0').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0; }
function imageFrom(msg) { return Array.from(msg.attachments?.values?.() || []).find((a) => String(a.contentType || '').startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(String(a.name || a.url || '')))?.url || ''; }

function defaultStatsFor(match) {
  const stats = { goals: {}, assists: {}, defenses: {}, interceptions: {}, passes: {} };
  players(match).forEach((p) => {
    for (const key of Object.keys(stats)) stats[key][p.discordId] = 0;
  });
  return stats;
}

function getState(matchId, userId) {
  return states.get(stateKey(matchId, userId));
}

function makeState(match, userId) {
  const current = states.get(stateKey(match.id, userId));
  if (current && Date.now() - current.createdAt < 45 * 60 * 1000) return current;
  const next = {
    matchId: match.id,
    mode: match.mode,
    userId,
    scoreA: null,
    scoreB: null,
    mvpId: '',
    proofUrl: '',
    stats: defaultStatsFor(match),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  states.set(stateKey(match.id, userId), next);
  return next;
}

function playerById(match, id) {
  return players(match).find((p) => String(p.discordId) === String(id));
}

function playerOptions(match) {
  return players(match).slice(0, 25).map((p) => ({
    label: cleanName(p.name || p.discordId).slice(0, 80),
    description: p.discordId,
    value: p.discordId
  }));
}

function statsText(match, state) {
  return players(match).map((p) => {
    const id = p.discordId;
    const stats = state.stats || defaultStatsFor(match);
    return `${mention(p)} — G:${stats.goals?.[id] || 0} A:${stats.assists?.[id] || 0} DEF:${stats.defenses?.[id] || 0} INT:${stats.interceptions?.[id] || 0} PAS:${stats.passes?.[id] || 0}`;
  }).join('\n');
}

function panelEmbed(match, state) {
  const mvp = state.mvpId ? playerById(match, state.mvpId) : null;
  return new EmbedBuilder()
    .setTitle('📝 Atualização interativa do placar • ' + modeLabel(match.mode))
    .setColor(0x8b5cf6)
    .setDescription([
      '**Etapas:**',
      '1. Defina o placar geral.',
      '2. Escolha o MVP no menu.',
      '3. Selecione cada jogador no menu de stats e preencha os números.',
      '4. Clique em **Enviar print** e mande a imagem no canal.',
      '5. Clique em **Finalizar e validar**.',
      '',
      `**Placar:** Time A ${state.scoreA ?? '—'} x ${state.scoreB ?? '—'} Time B`,
      `**MVP:** ${mvp ? mention(mvp) : 'não definido'}`,
      `**Print:** ${state.proofUrl ? '✅ recebida' : 'pendente'}`,
      '',
      '**Time A**',
      (match.teamA || []).map(mention).join('\n') || 'A definir',
      '',
      '**Time B**',
      (match.teamB || []).map(mention).join('\n') || 'A definir',
      '',
      '**Stats preenchidos**',
      statsText(match, state)
    ].join('\n').slice(0, 3900))
    .setFooter({ text: 'Só quem clicou primeiro consegue finalizar este placar.' })
    .setTimestamp(new Date());
}

function panelRows(match, state) {
  const options = playerOptions(match);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`placarx:score:${match.id}:${state.userId}`).setLabel('1. Placar geral').setEmoji('⚽').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`placarx:print:${match.id}:${state.userId}`).setLabel('Enviar print').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`placarx:finish:${match.id}:${state.userId}`).setLabel('Finalizar e validar').setEmoji('✅').setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`placarx:mvp:${match.id}:${state.userId}`)
        .setPlaceholder(state.mvpId ? 'MVP selecionado: ' + cleanName(playerById(match, state.mvpId)?.name || state.mvpId) : '2. Selecione o MVP da partida')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`placarx:player:${match.id}:${state.userId}`)
        .setPlaceholder('3. Selecione um jogador para preencher stats')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    )
  ];
}

function scoreModal(match, state) {
  return new ModalBuilder()
    .setCustomId(`placarx:score-modal:${match.id}:${state.userId}`)
    .setTitle('Placar geral ' + modeLabel(match.mode))
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreA').setLabel('Gols do Time A').setPlaceholder('Ex: 3').setValue(state.scoreA == null ? '' : String(state.scoreA)).setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreB').setLabel('Gols do Time B').setPlaceholder('Ex: 1').setValue(state.scoreB == null ? '' : String(state.scoreB)).setRequired(true).setStyle(TextInputStyle.Short))
    );
}

function playerStatsModal(match, state, playerId) {
  const p = playerById(match, playerId);
  const s = state.stats || defaultStatsFor(match);
  const value = (key) => String(s[key]?.[playerId] || 0);
  return new ModalBuilder()
    .setCustomId(`placarx:player-modal:${match.id}:${state.userId}:${playerId}`)
    .setTitle(('Stats: ' + cleanName(p?.name || playerId)).slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('goals').setLabel('Gols').setPlaceholder('Ex: 2').setValue(value('goals')).setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('assists').setLabel('Assistências').setPlaceholder('Ex: 1').setValue(value('assists')).setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('defenses').setLabel('Defesas').setPlaceholder('Ex: 4').setValue(value('defenses')).setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('interceptions').setLabel('Interceptações').setPlaceholder('Ex: 3').setValue(value('interceptions')).setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('passes').setLabel('Passes').setPlaceholder('Ex: 15').setValue(value('passes')).setRequired(true).setStyle(TextInputStyle.Short))
    );
}

async function updateRoles(guild, ids, m) {
  const board = await placar.getLeaderboard(m);
  const byId = new Map(board.players.map((p) => [p.discordId, p]));
  const all = Object.values(rankRoles);
  for (const id of ids) {
    const p = byId.get(id); const member = await guild.members.fetch(id).catch(() => null); if (!p || !member) continue;
    const target = rankRoles[p.rankKey];
    const remove = all.filter((roleId) => roleId !== target && member.roles.cache.has(roleId));
    if (remove.length) await member.roles.remove(remove, 'Void Arena Placar').catch(() => null);
    if (target && !member.roles.cache.has(target)) await member.roles.add(target, 'Void Arena Placar').catch(() => null);
  }
}

function deltaLines(match, deltas) {
  const byId = new Map(deltas.map((d) => [d.discordId, d]));
  return players(match).map((p) => {
    const d = byId.get(p.discordId); const s = d?.stats || {};
    return mention(p) + ' — ' + (d ? ('**' + d.before + ' → ' + d.after + ' VAP** +' + d.delta + ' • ' + d.rankEmoji + ' ' + d.rankName + ' • G:' + s.goals + ' A:' + s.assists + ' DEF:' + s.defenses + ' INT:' + s.interceptions + ' PAS:' + s.passes + (s.mvp ? ' • MVP' : '')) : 'sem cálculo');
  }).join('\n');
}

async function cleanupMatchResources(client, match = {}, sourceMessage = null) {
  const channelIds = new Set();
  const add = (id) => { const safe = String(id || '').trim(); if (safe) channelIds.add(safe); };
  add(match.teamAVoiceChannelId); add(match.teamBVoiceChannelId); add(match.voiceChannelAId); add(match.voiceChannelBId); add(match.voiceChannelId);
  (Array.isArray(match.teamVoiceChannels) ? match.teamVoiceChannels : []).forEach((item) => add(item.id));
  for (const id of channelIds) {
    const channel = await client.channels.fetch(id).catch(() => null);
    if (channel?.delete) await channel.delete('Void Arena Placar: partida finalizada').catch((e) => console.error('[placar] apagar call:', e.message));
  }
  const textChannelId = String(match.textChannelId || sourceMessage?.channelId || '').trim();
  const messageId = String(match.discordMessageId || sourceMessage?.id || '').trim();
  if (textChannelId && messageId) {
    const ch = await client.channels.fetch(textChannelId).catch(() => null);
    const msg = await ch?.messages?.fetch?.(messageId).catch(() => null);
    if (msg?.delete) await msg.delete().catch((e) => console.error('[placar] apagar mensagem:', e.message));
  }
}

async function sendHistory(client, match, deltas, proofUrl, reporterId) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Histórico Café com Leite • ' + modeLabel(match.mode))
    .setColor(0x22c55e)
    .setDescription([
      `**Resultado:** Time A ${match.scoreA} x ${match.scoreB} Time B`,
      `**Vencedor:** ${match.result?.winner === 'draw' ? 'Empate' : 'Time ' + match.result?.winner}`,
      `**MVP:** <@${match.result?.mvpId}>`,
      `**Validado por:** <@${reporterId}>`,
      '',
      deltaLines(match, deltas)
    ].join('\n').slice(0, 3900))
    .setImage(proofUrl || null)
    .setTimestamp(new Date());
  const hist = await client.channels.fetch(HISTORY_ID).catch(() => null);
  if (hist?.send) await hist.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
  return embed;
}

async function finishInteractive(i, match, state) {
  if (state.scoreA == null || state.scoreB == null) throw new Error('Preencha o placar geral primeiro.');
  if (!state.mvpId) throw new Error('Selecione o MVP primeiro.');
  if (!state.proofUrl) throw new Error('Envie a print da partida antes de finalizar.');
  const ids = players(match).map((p) => p.discordId);
  const result = await placar.finishMatch(match.id, {
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    mvpId: state.mvpId,
    stats: state.stats,
    proofUrl: state.proofUrl,
    reportedBy: i.user.id
  });
  await updateRoles(i.guild, ids, match.mode);
  const finished = result.match;
  const embed = await sendHistory(i.client, finished, result.deltas, state.proofUrl, i.user.id);
  await cleanupMatchResources(i.client, finished, i.message).catch((e) => console.error('[placar] limpeza:', e.message));
  states.delete(stateKey(match.id, i.user.id));
  return embed;
}

function registerPlacarAttachmentResult(client) {
  if (!client || client.__placarAttachmentResult) return;
  client.__placarAttachmentResult = true;

  client.on(Events.InteractionCreate, async (i) => {
    try {
      if (i.isButton?.() && String(i.customId || '').startsWith('placar:result:')) {
        const matchId = String(i.customId).replace('placar:result:', '');
        const match = await placar.getMatch(matchId);
        if (!match) return i.reply({ content: 'Partida não encontrada.', ephemeral: true });
        const ids = players(match).map((p) => p.discordId);
        if (!ids.includes(i.user.id)) return i.reply({ content: 'Só jogador dessa partida pode atualizar.', ephemeral: true });
        const locked = await placar.claimMatchReporter(matchId, i.user.id);
        const state = makeState(locked, i.user.id);
        return i.reply({ embeds: [panelEmbed(locked, state)], components: panelRows(locked, state), ephemeral: true, allowedMentions: { parse: [] } });
      }

      if (i.isButton?.() && String(i.customId || '').startsWith('placarx:')) {
        const [, action, matchId, ownerId] = String(i.customId).split(':');
        if (ownerId !== i.user.id) return i.reply({ content: 'Só quem abriu a atualização pode usar este painel.', ephemeral: true });
        const match = await placar.getMatch(matchId);
        if (!match) return i.reply({ content: 'Partida não encontrada.', ephemeral: true });
        const state = getState(matchId, ownerId) || makeState(match, ownerId);
        if (action === 'score') return i.showModal(scoreModal(match, state));
        if (action === 'print') {
          pendingPrint.set(printKey(i.channelId, i.user.id), { matchId, userId: i.user.id, createdAt: Date.now() });
          return i.reply({ content: '🖼️ Envie agora a print como **imagem/anexo neste mesmo canal**. Depois volte neste painel e clique em **Finalizar e validar**.', ephemeral: true });
        }
        if (action === 'finish') {
          await i.deferReply({ ephemeral: true });
          const historyEmbed = await finishInteractive(i, match, state);
          return i.editReply({ content: '✅ Placar validado, histórico enviado, mensagem da partida apagada e calls encerradas.', embeds: [historyEmbed], components: [] });
        }
      }

      if (i.isStringSelectMenu?.() && String(i.customId || '').startsWith('placarx:')) {
        const [, action, matchId, ownerId] = String(i.customId).split(':');
        if (ownerId !== i.user.id) return i.reply({ content: 'Só quem abriu a atualização pode usar este painel.', ephemeral: true });
        const match = await placar.getMatch(matchId);
        if (!match) return i.reply({ content: 'Partida não encontrada.', ephemeral: true });
        const state = getState(matchId, ownerId) || makeState(match, ownerId);
        const playerId = i.values?.[0];
        if (action === 'mvp') {
          state.mvpId = playerId;
          state.updatedAt = Date.now();
          return i.update({ embeds: [panelEmbed(match, state)], components: panelRows(match, state), allowedMentions: { parse: [] } });
        }
        if (action === 'player') return i.showModal(playerStatsModal(match, state, playerId));
      }

      if (i.isModalSubmit?.() && String(i.customId || '').startsWith('placarx:')) {
        const parts = String(i.customId).split(':');
        const action = parts[1];
        const matchId = parts[2];
        const ownerId = parts[3];
        if (ownerId !== i.user.id) return i.reply({ content: 'Só quem abriu a atualização pode enviar estes dados.', ephemeral: true });
        const match = await placar.getMatch(matchId);
        if (!match) return i.reply({ content: 'Partida não encontrada.', ephemeral: true });
        const state = getState(matchId, ownerId) || makeState(match, ownerId);
        if (action === 'score-modal') {
          state.scoreA = number(i.fields.getTextInputValue('scoreA'));
          state.scoreB = number(i.fields.getTextInputValue('scoreB'));
          state.updatedAt = Date.now();
          return i.reply({ content: `✅ Placar salvo: Time A ${state.scoreA} x ${state.scoreB} Time B.`, ephemeral: true });
        }
        if (action === 'player-modal') {
          const playerId = parts[4];
          if (!playerById(match, playerId)) return i.reply({ content: 'Jogador não encontrado nessa partida.', ephemeral: true });
          state.stats = state.stats || defaultStatsFor(match);
          state.stats.goals[playerId] = number(i.fields.getTextInputValue('goals'));
          state.stats.assists[playerId] = number(i.fields.getTextInputValue('assists'));
          state.stats.defenses[playerId] = number(i.fields.getTextInputValue('defenses'));
          state.stats.interceptions[playerId] = number(i.fields.getTextInputValue('interceptions'));
          state.stats.passes[playerId] = number(i.fields.getTextInputValue('passes'));
          state.updatedAt = Date.now();
          return i.reply({ content: `✅ Stats salvos para ${mention(playerById(match, playerId))}.`, ephemeral: true, allowedMentions: { parse: [] } });
        }
      }
    } catch (e) {
      const p = { content: '❌ ' + e.message, ephemeral: true };
      if (i.replied || i.deferred) return i.followUp(p).catch(() => null);
      return i.reply(p).catch(() => null);
    }
  });

  client.on(Events.MessageCreate, async (msg) => {
    try {
      if (!msg.guild || msg.author.bot) return;
      const pending = pendingPrint.get(printKey(msg.channelId, msg.author.id));
      if (!pending) return;
      if (Date.now() - pending.createdAt > 15 * 60 * 1000) { pendingPrint.delete(printKey(msg.channelId, msg.author.id)); return; }
      const image = imageFrom(msg);
      if (!image) return;
      const state = getState(pending.matchId, pending.userId);
      if (!state) return;
      state.proofUrl = image;
      state.updatedAt = Date.now();
      pendingPrint.delete(printKey(msg.channelId, msg.author.id));
      const reply = await msg.reply('✅ Print recebida e vinculada ao placar. Volte no painel e clique em **Finalizar e validar**.').catch(() => null);
      if (reply?.delete) setTimeout(() => reply.delete().catch(() => null), 10000).unref?.();
    } catch (e) {
      await msg.reply('❌ Erro ao validar print: ' + e.message).catch(() => null);
    }
  });
}

module.exports = { registerPlacarAttachmentResult };
