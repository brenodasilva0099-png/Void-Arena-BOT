const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const ANNOUNCE_CHANNEL_ID = String(process.env.REMATCH_AVISOS_CHANNEL_ID || '1494883146116890697').trim();
const CAFE_CHANNEL_ID = String(process.env.CAFE_COM_LEITE_CHANNEL_ID || process.env.PLACAR_QUEUE_CHANNEL_ID || '1523063064658972833').trim();
const HISTORY_CHANNEL_ID = String(process.env.RESULTS_HISTORY_CHANNEL_ID || process.env.RESULT_HISTORY_CHANNEL_ID || '1518441859519877120').trim();
const REMATCH_ROLE_ID = String(process.env.REMATCH_ROLE_ID || '').trim();

const POSITION_ROLES = [
  { key: 'atacante', label: 'Atacante', emoji: '💢', id: '1498823616073302096' },
  { key: 'ala_of', label: 'Ala OF', emoji: '💢', id: '1523472874986537070' },
  { key: 'ala_def', label: 'Ala DEF', emoji: '💢', id: '1523473090443481220' },
  { key: 'zag_mc', label: 'Zag / MC', emoji: '💢', id: '1498823871602884638' },
  { key: 'goleiro', label: 'Goleiro', emoji: '💢', id: '1498824182144700506' }
];

function panelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rematch-role:rematch').setLabel('Resgatar Rematch').setEmoji('🎮').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rematch-role:pos:atacante').setLabel('Atacante').setEmoji('💢').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rematch-role:pos:ala_of').setLabel('Ala OF').setEmoji('💢').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rematch-role:pos:ala_def').setLabel('Ala DEF').setEmoji('💢').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rematch-role:pos:zag_mc').setLabel('Zag / MC').setEmoji('💢').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rematch-role:pos:goleiro').setLabel('Goleiro').setEmoji('💢').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rematch-role:return:position').setLabel('Devolver posição').setEmoji('♻️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('rematch-role:return:rematch').setLabel('Devolver Rematch').setEmoji('↩️').setStyle(ButtonStyle.Danger)
    )
  ];
}

function panelEmbed(guild) {
  const rematchMention = REMATCH_ROLE_ID ? `<@&${REMATCH_ROLE_ID}>` : '**Rematch**';
  const positions = POSITION_ROLES.map((role) => `<@&${role.id}>`).join('\n');
  return new EmbedBuilder()
    .setTitle('☕ Café com Leite • Cargos Rematch')
    .setColor(0x22d3ee)
    .setDescription([
      `Para participar dos eventos **Café com Leite** em <#${CAFE_CHANNEL_ID}>, os jogadores precisam estar com o cargo ${rematchMention} e com o(s) cargo(s) da sua posição.`,
      '',
      'Isso ajuda o sistema e os capitães a identificarem com mais facilidade a função de cada jogador dentro das equipes sorteadas nas filas.',
      '',
      '**Cargos de posição disponíveis:**',
      positions,
      '',
      'Clique no botão da sua função para resgatar. Se clicar errado, use **Devolver posição** ou clique novamente no mesmo cargo para remover.',
      '',
      'Obrigado a todos os membros que participam, testam e ajudam a deixar os eventos mais organizados. 💜'
    ].join('\n'))
    .setFooter({ text: `${guild?.name || 'Void Arena'} • Sistema de cargos Rematch` })
    .setTimestamp(new Date());
}

async function findRematchRole(guild) {
  if (!guild?.roles?.fetch) return null;
  if (REMATCH_ROLE_ID) {
    const role = await guild.roles.fetch(REMATCH_ROLE_ID).catch(() => null);
    if (role) return role;
  }
  const roles = await guild.roles.fetch().catch(() => null);
  if (!roles) return null;
  return Array.from(roles.values()).find((role) => String(role.name || '').toLowerCase().includes('rematch')) || null;
}

async function pinMessage(message) {
  if (!message?.pin || message.pinned) return message;
  await message.pin('Void Arena: painel de cargos Rematch').catch(() => null);
  return message;
}

async function ensureRematchRolePanel(client) {
  if (!ANNOUNCE_CHANNEL_ID || !client?.channels?.fetch) return null;
  const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased?.()) return null;
  const embed = panelEmbed(channel.guild);
  const messages = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  const botMessages = Array.from(messages?.values?.() || []).filter((msg) => msg.author?.id === client.user?.id);
  const panels = botMessages.filter((msg) => String(msg.embeds?.[0]?.title || '').includes('Café com Leite • Cargos Rematch'));
  const existing = panels[0];
  for (const extra of panels.slice(1)) await extra.delete().catch(() => null);
  if (existing) {
    await existing.edit({ embeds: [embed], components: panelRows(), allowedMentions: { roles: POSITION_ROLES.map((role) => role.id).concat(REMATCH_ROLE_ID ? [REMATCH_ROLE_ID] : []) } }).catch(() => null);
    return pinMessage(existing);
  }
  const sent = await channel.send({ embeds: [embed], components: panelRows(), allowedMentions: { roles: POSITION_ROLES.map((role) => role.id).concat(REMATCH_ROLE_ID ? [REMATCH_ROLE_ID] : []) } });
  return pinMessage(sent);
}

async function logRoleAction(client, guild, member, action, roleName) {
  const channel = await client.channels.fetch(HISTORY_CHANNEL_ID).catch(() => null);
  if (!channel?.send) return;
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('📌 Cargo Rematch atualizado')
      .setColor(action === 'removeu' ? 0xef4444 : 0x22c55e)
      .setDescription([`**Jogador:** ${member}`, `**Ação:** ${action} **${roleName}**`, `**Servidor:** ${guild.name}`].join('\n'))
      .setTimestamp(new Date())]
  }).catch(() => null);
}

async function addOrRemoveRole(interaction, role, roleLabel) {
  const member = interaction.member;
  if (!role) return interaction.reply({ content: '❌ Cargo não encontrado no servidor. Verifique se o cargo existe e se o bot está acima dele na hierarquia.', ephemeral: true });
  const hasRole = member.roles.cache.has(role.id);
  if (hasRole) {
    await member.roles.remove(role.id, `Void Arena: devolveu cargo ${roleLabel}`);
    await logRoleAction(interaction.client, interaction.guild, member, 'removeu', roleLabel);
    return interaction.reply({ content: `♻️ Cargo removido: **${roleLabel}**.`, ephemeral: true });
  }
  await member.roles.add(role.id, `Void Arena: resgatou cargo ${roleLabel}`);
  await logRoleAction(interaction.client, interaction.guild, member, 'resgatou', roleLabel);
  return interaction.reply({ content: `✅ Cargo adicionado: **${roleLabel}**.`, ephemeral: true });
}

async function removeRoles(interaction, roles, label) {
  const ids = roles.map((role) => role?.id).filter((id) => id && interaction.member.roles.cache.has(id));
  if (!ids.length) return interaction.reply({ content: `Você não está com nenhum cargo de ${label} para devolver.`, ephemeral: true });
  await interaction.member.roles.remove(ids, `Void Arena: devolveu cargos de ${label}`);
  await logRoleAction(interaction.client, interaction.guild, interaction.member, 'removeu', `cargos de ${label}`);
  return interaction.reply({ content: `♻️ Cargo(s) de ${label} removido(s).`, ephemeral: true });
}

function registerRematchRolePanel(client) {
  if (!client || client.__voidArenaRematchRolesRegistered) return;
  client.__voidArenaRematchRolesRegistered = true;

  client.once(Events.ClientReady, () => {
    setTimeout(() => ensureRematchRolePanel(client).catch((error) => console.error('[rematch-cargos] painel:', error.message)), 5000).unref?.();
  });

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    const text = String(message.content || '').trim().toLowerCase();
    if (text !== '!rematch-cargos' && text !== '!cargos-rematch') return;
    await ensureRematchRolePanel(client);
    await message.reply('✅ Painel de cargos Rematch atualizado/fixado.').catch(() => null);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (!interaction.isButton?.() || !String(interaction.customId || '').startsWith('rematch-role:')) return;
      if (!interaction.guild || !interaction.member) return interaction.reply({ content: 'Use dentro do servidor.', ephemeral: true });
      const parts = String(interaction.customId).split(':');
      const action = parts[1];
      const value = parts[2];
      if (action === 'rematch') {
        const role = await findRematchRole(interaction.guild);
        return addOrRemoveRole(interaction, role, role?.name || 'Rematch');
      }
      if (action === 'pos') {
        const info = POSITION_ROLES.find((role) => role.key === value);
        const role = info ? await interaction.guild.roles.fetch(info.id).catch(() => null) : null;
        return addOrRemoveRole(interaction, role, info?.label || 'posição');
      }
      if (action === 'return' && value === 'position') {
        const roles = await Promise.all(POSITION_ROLES.map((info) => interaction.guild.roles.fetch(info.id).catch(() => null)));
        return removeRoles(interaction, roles, 'posição');
      }
      if (action === 'return' && value === 'rematch') {
        const role = await findRematchRole(interaction.guild);
        return removeRoles(interaction, [role], role?.name || 'Rematch');
      }
    } catch (error) {
      console.error('[rematch-cargos] interação:', error);
      const payload = { content: `❌ ${error.message}`, ephemeral: true };
      if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => null);
      return interaction.reply(payload).catch(() => null);
    }
  });
}

module.exports = { registerRematchRolePanel, ensureRematchRolePanel };
