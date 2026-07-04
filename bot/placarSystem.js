const {
  Events,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const placar = require('./placarStorage');

const PLACAR_CHANNEL_ID = String(process.env.PLACAR_CHANNEL_ID || '1522782784987463801').trim();
const QUEUE_CHANNEL_ID = String(process.env.PLACAR_QUEUE_CHANNEL_ID || process.env.CAFE_COM_LEITE_CHANNEL_ID || '1523063064658972833').trim();
const MATCH_CATEGORY_ID = String(process.env.PLACAR_MATCH_CATEGORY_ID || process.env.MATCH_CATEGORY_ID || '').trim();
const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();

function playerFromMember(member) {
  return {
    discordId: member.user.id,
    name: member.displayName || member.user.globalName || member.user.username,
    avatar: member.user.displayAvatarURL?.({ size: 128 }) || ''
  };
}

function queueSize(mode) {
  return placar.normalizeMode(mode) === '5v5' ? 10 : 6;
}

function modeLabel(mode) {
  return placar.normalizeMode(mode).toUpperCase().replace('V', 'x');
}

function queuePanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('placar:queue:join:3v3').setLabel('Entrar fila 3x3').setEmoji('3️⃣').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('placar:queue:leave:3v3').setLabel('Sair 3x3').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('placar:queue:join:5v5').setLabel('Entrar fila 5x5').setEmoji('5️⃣').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('placar:queue:leave:5v5').setLabel('Sair 5x5').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('placar:ranking:3v3').setLabel('Ranking 3x3').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('placar:ranking:5v5').setLabel('Ranking 5x5').setEmoji('📊').setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function queuePanelEmbed() {
  const data = await placar.getFullScoreboard();
  const q3 = data.queues['3v3']?.length || 0;
  const q5 = data.queues['5v5']?.length || 0;
  return new EmbedBuilder()
    .setTitle('☕ Fila Café com Leite Rematch')
    .setColor(0x22d3ee)
    .setDescription([
      'Entre aqui na fila 3x3 ou 5x5. Quando fechar jogadores suficientes, o bot sorteia os times, cria a call privada e avisa os participantes por DM.',
      '',
      `**Fila 3x3:** ${q3}/6 jogadores`,
      `**Fila 5x5:** ${q5}/10 jogadores`,
      '',
      'Esse canal é só para fila e resultado da partida. O ranking/placar/patentes fica separado no canal Placar.'
    ].join('\n'))
    .setFooter({ text: 'Void Arena • Fila Café com Leite' })
    .setTimestamp(new Date());
}

async function ensureQueuePanel(client) {
  if (!QUEUE_CHANNEL_ID || !client?.channels?.fetch) return null;
  const channel = await client.channels.fetch(QUEUE_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased?.()) return null;
  const embed = await queuePanelEmbed();
  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const existing = Array.from(messages?.values?.() || []).find((msg) => msg.author?.id === client.user?.id && msg.embeds?.[0]?.title?.includes('Fila Café com Leite'));
  if (existing) {
    await existing.edit({ embeds: [embed], components: queuePanelRows() }).catch(() => null);
    return existing;
  }
  return channel.send({ embeds: [embed], components: queuePanelRows() });
}

function rankingPanelRows() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('placar:ranking:3v3').setLabel('Ranking 3x3').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('placar:ranking:5v5').setLabel('Ranking 5x5').setEmoji('📊').setStyle(ButtonStyle.Secondary)
  )];
}

function rankingText(players = [], mode = '3v3') {
  const top = players.slice(0, 10);
  if (!top.length) return `Ainda não tem ranking ${modeLabel(mode)}.`;
  return top.map((p, index) => `**#${index + 1}** ${p.rankEmoji} <@${p.discordId}> — **${p.points} pts** • ${p.wins}V/${p.matches}J • WR ${p.winRate}%`).join('\n');
}

// VOID_ARENA_RANKING_PANEL_FUNCTIONS
async function rankingPanelEmbed() {
  const data = await placar.getFullScoreboard();
  const top3 = (data.leaderboards?.['3v3'] || []).slice(0, 5);
  const top5 = (data.leaderboards?.['5v5'] || []).slice(0, 5);
  return new EmbedBuilder()
    .setTitle('🏆 Placar • Rankings e Patentes')
    .setColor(0x22d3ee)
    .setDescription([
      'Canal limpo para consultar ranking, pontos e patentes do Café com Leite.',
      '🌐 **Ver placar completo no site:** ' + SITE_PLACAR_URL,
      '',
      '**Top 3x3**',
      rankingText(top3, '3v3'),
      '',
      '**Top 5x5**',
      rankingText(top5, '5v5')
    ].join('\n'))
    .setFooter({ text: 'Void Arena • Placar oficial do servidor' })
    .setTimestamp(new Date());
}

async function ensureRankingPanel(client) {
  if (!PLACAR_CHANNEL_ID || !client?.channels?.fetch) return null;
  const channel = await client.channels.fetch(PLACAR_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased?.()) return null;

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const botMessages = Array.from(messages?.values?.() || []).filter((msg) => msg.author?.id === client.user?.id);
  for (const old of botMessages) {
    const title = old.embeds?.[0]?.title || '';
    if (title.includes('Sistema de Placar Rematch') || title.includes('Fila Café com Leite')) {
      await old.delete().catch(() => null);
    }
  }

  const embed = await rankingPanelEmbed();
  const existing = botMessages.find((msg) => msg.embeds?.[0]?.title?.includes('Placar • Rankings e Patentes'));
  if (existing) {
    await existing.edit({ embeds: [embed], components: rankingPanelRows() }).catch(() => null);
    return existing;
  }
  return channel.send({ embeds: [embed], components: rankingPanelRows() });
}

function matchEmbed(match) {
  const teamA = (match.teamA || []).map((p) => `<@${p.discordId}>`).join('\n');
  const teamB = (match.teamB || []).map((p) => `<@${p.discordId}>`).join('\n');
  return new EmbedBuilder()
    .setTitle(`⚽ Partida encontrada • ${modeLabel(match.mode)}`)
    .setColor(0x8b5cf6)
    .setDescription([
      `**ID:** \`${match.id}\``,
      match.voiceChannelId ? `**Call:** <#${match.voiceChannelId}>` : '',
      '',
      '**Time A**',
      teamA || 'A definir',
      '',
      '**Time B**',
      teamB || 'A definir',
      '',
      'Quando acabar, um participante clica em **Reportar resultado**.'
    ].filter(Boolean).join('\n'))
    .setTimestamp(new Date());
}

function matchRows(match) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`placar:result:${match.id}`).setLabel('Reportar resultado').setEmoji('📝').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`placar:ranking:${match.mode}`).setLabel(`Ranking ${modeLabel(match.mode)}`).setEmoji('🏆').setStyle(ButtonStyle.Secondary)
  )];
}

async function createPrivateVoiceForMatch(guild, sourceChannel, match) {
  const parentId = MATCH_CATEGORY_ID || sourceChannel?.parentId || null;
  const allowedIds = [...(match.teamA || []), ...(match.teamB || [])].map((p) => p.discordId);
  const overwrites = [
    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
    ...allowedIds.map((id) => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] }))
  ];
  return guild.channels.create({
    name: `rematch-${match.mode}-${String(Date.now()).slice(-4)}`,
    type: ChannelType.GuildVoice,
    parent: parentId || undefined,
    userLimit: allowedIds.length,
    permissionOverwrites: overwrites,
    reason: 'Void Arena Placar: partida encontrada por fila'
  });
}

async function moveOrDmPlayers(guild, match, voiceChannel) {
  const players = [...(match.teamA || []), ...(match.teamB || [])];
  const link = `https://discord.com/channels/${guild.id}/${voiceChannel.id}`;
  for (const player of players) {
    const member = await guild.members.fetch(player.discordId).catch(() => null);
    if (!member) continue;
    if (member.voice?.channelId) {
      await member.voice.setChannel(voiceChannel).catch(async () => {
        await member.send(`⚽ Sua partida ${modeLabel(match.mode)} foi encontrada. Entre na call: ${link}`).catch(() => null);
      });
    } else {
      await member.send([
        `⚽ **Partida encontrada na Void Arena!**`,
        `Modo: **${modeLabel(match.mode)}**`,
        `Você estava na fila, mas não estava em uma call.`,
        `Entre pela call da partida: ${link}`
      ].join('\n')).catch(() => null);
    }
  }
}

async function maybeStartMatch(client, interaction, mode) {
  const selected = await placar.popQueueForMatch(mode);
  if (!selected) return null;
  const guild = interaction.guild;
  const sourceChannel = interaction.channel;
  let match = await placar.createMatch(mode, selected, { textChannelId: QUEUE_CHANNEL_ID });
  const voiceChannel = await createPrivateVoiceForMatch(guild, sourceChannel, match).catch(() => null);
  if (voiceChannel) {
    match = await placar.attachMatchMessage(match.id, { voiceChannelId: voiceChannel.id, textChannelId: QUEUE_CHANNEL_ID });
    await moveOrDmPlayers(guild, match, voiceChannel);
  }
  const channel = await client.channels.fetch(QUEUE_CHANNEL_ID).catch(() => sourceChannel);
  const sent = await channel.send({
    content: [...match.teamA, ...match.teamB].map((p) => `<@${p.discordId}>`).join(' '),
    embeds: [matchEmbed(match)],
    components: matchRows(match),
    allowedMentions: { users: [...match.teamA, ...match.teamB].map((p) => p.discordId) }
  });
  await placar.attachMatchMessage(match.id, { discordMessageId: sent.id, textChannelId: sent.channelId, voiceChannelId: voiceChannel?.id || '' });
  await ensureQueuePanel(client);
  await ensureRankingPanel(client).catch(() => null);
  return match;
}

async function handleQueueInteraction(client, interaction, action, mode) {
  const safeMode = placar.normalizeMode(mode);
  if (!interaction.member || !interaction.guild) return interaction.reply({ content: 'Use isso dentro do servidor.', ephemeral: true });
  if (action === 'join') {
    const result = await placar.addToQueue(safeMode, playerFromMember(interaction.member));
    const started = await maybeStartMatch(client, interaction, safeMode);
    if (started) return interaction.reply({ content: `✅ Fila ${modeLabel(safeMode)} fechou. Partida criada e jogadores avisados.`, ephemeral: true });
    await ensureQueuePanel(client);
    return interaction.reply({ content: `✅ Você entrou na fila ${modeLabel(safeMode)}. Faltam ${Math.max(0, queueSize(safeMode) - result.queue.length)} jogador(es).`, ephemeral: true });
  }
  const result = await placar.removeFromQueue(safeMode, interaction.user.id);
  await ensureQueuePanel(client);
  return interaction.reply({ content: result.removed ? `✅ Você saiu da fila ${modeLabel(safeMode)}.` : `Você não estava na fila ${modeLabel(safeMode)}.`, ephemeral: true });
}

async function showRanking(interaction, mode) {
  const data = await placar.getLeaderboard(mode);
  return interaction.reply({
    embeds: [new EmbedBuilder().setTitle(`🏆 Ranking Placar ${modeLabel(data.mode)}`).setDescription(rankingText(data.players, data.mode)).setColor(0x22d3ee)],
    ephemeral: true
  });
}

function resultModal(matchId) {
  return new ModalBuilder()
    .setCustomId(`placar:result-modal:${matchId}`)
    .setTitle('Resultado da partida')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreA').setLabel('Gols do Time A').setPlaceholder('Ex: 3').setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreB').setLabel('Gols do Time B').setPlaceholder('Ex: 2').setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mvp').setLabel('MVP opcional').setPlaceholder('@jogador ou ID').setRequired(false).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('goals').setLabel('Gols individuais opcional').setPlaceholder('@jogador=2, @outro=1').setRequired(false).setStyle(TextInputStyle.Paragraph)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('extras').setLabel('Assists/defesas opcional').setPlaceholder('assists: @id=1 | defesas: @id=3').setRequired(false).setStyle(TextInputStyle.Paragraph))
    );
}

function parseExtraBlock(raw = '') {
  const text = String(raw || '');
  const assists = text.match(/assist(?:s|ências|encias)?\s*[:=]\s*([^|]+)/i)?.[1] || '';
  const defenses = text.match(/defes(?:a|as)\s*[:=]\s*([^|]+)/i)?.[1] || '';
  return { assists, defenses };
}

async function updateRankRoles(guild, playerIds = [], mode = '3v3') {
  const leaderboard = await placar.getLeaderboard(mode);
  const byId = new Map(leaderboard.players.map((p) => [p.discordId, p]));
  const roles = await guild.roles.fetch().catch(() => guild.roles.cache);
  const rankRoles = placar.RANKS.map((rank) => ({ rank, role: Array.from(roles.values()).find((role) => String(role.name || '').toLowerCase().includes(rank.key)) })).filter((item) => item.role);
  for (const id of playerIds) {
    const player = byId.get(id);
    if (!player) continue;
    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) continue;
    const target = rankRoles.find((item) => item.rank.key === player.rankKey)?.role;
    const removeIds = rankRoles.map((item) => item.role.id).filter((roleId) => roleId !== target?.id && member.roles.cache.has(roleId));
    if (removeIds.length) await member.roles.remove(removeIds, 'Void Arena Placar: atualização de patente').catch(() => null);
    if (target && !member.roles.cache.has(target.id)) await member.roles.add(target, 'Void Arena Placar: atualização de patente').catch(() => null);
  }
}

async function handleResultModal(interaction, matchId) {
  const match = await placar.getMatch(matchId);
  if (!match) return interaction.reply({ content: 'Partida não encontrada.', ephemeral: true });
  const participantIds = new Set([...(match.teamA || []), ...(match.teamB || [])].map((p) => p.discordId));
  if (!participantIds.has(interaction.user.id)) {
    return interaction.reply({ content: 'Só jogadores dessa partida podem reportar o resultado.', ephemeral: true });
  }
  const extras = parseExtraBlock(interaction.fields.getTextInputValue('extras') || '');
  const result = await placar.finishMatch(matchId, {
    scoreA: interaction.fields.getTextInputValue('scoreA'),
    scoreB: interaction.fields.getTextInputValue('scoreB'),
    mvpId: interaction.fields.getTextInputValue('mvp'),
    goals: interaction.fields.getTextInputValue('goals'),
    assists: extras.assists,
    defenses: extras.defenses,
    reportedBy: interaction.user.id
  });
  await updateRankRoles(interaction.guild, Array.from(participantIds), match.mode);
  const finished = result.match;
  const summary = new EmbedBuilder()
    .setTitle(`✅ Resultado validado • ${modeLabel(finished.mode)}`)
    .setDescription([
      `**Time A:** ${finished.scoreA}`,
      `**Time B:** ${finished.scoreB}`,
      `**Vencedor:** ${finished.result?.winner === 'draw' ? 'Empate' : `Time ${finished.result?.winner}`}`,
      '',
      'Patentes e placar individual atualizados.'
    ].join('\n'))
    .setColor(0x22c55e)
    .setTimestamp(new Date());
  await interaction.reply({ embeds: [summary] });
  await ensureRankingPanel(interaction.client).catch(() => null);
  if (interaction.message?.editable) {
    await interaction.message.edit({ embeds: [matchEmbed({ ...finished })], components: [] }).catch(() => null);
  }
}

function registerPlacarSystem(client) {
  if (!client || client.__voidArenaPlacarRegistered) return;
  client.__voidArenaPlacarRegistered = true;

  client.once(Events.ClientReady, () => {
    setTimeout(() => Promise.all([
      ensureQueuePanel(client),
      ensureRankingPanel(client)
    ]).catch((error) => console.error('[placar] painel:', error.message)), 4000).unref?.();
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton?.()) {
        const [scope, action, value, mode] = String(interaction.customId || '').split(':');
        if (scope !== 'placar') return;
        if (action === 'queue') return handleQueueInteraction(client, interaction, value, mode);
        if (action === 'ranking') return showRanking(interaction, value);
        if (action === 'result') return interaction.showModal(resultModal(value));
      }
      if (interaction.isModalSubmit?.() && String(interaction.customId || '').startsWith('placar:result-modal:')) {
        const matchId = interaction.customId.replace('placar:result-modal:', '');
        return handleResultModal(interaction, matchId);
      }
    } catch (error) {
      console.error('[placar] interação:', error);
      const payload = { content: `❌ ${error.message}`, ephemeral: true };
      if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => null);
      return interaction.reply(payload).catch(() => null);
    }
  });
}

module.exports = { registerPlacarSystem, ensureQueuePanel, ensureRankingPanel, updateRankRoles };
