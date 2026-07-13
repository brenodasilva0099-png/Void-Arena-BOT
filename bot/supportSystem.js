const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Events,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const zlib = require('node:zlib');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

const SUPPORT_CHANNEL_NAME = process.env.SUPPORT_CHANNEL_NAME || '🛟・suporte-void-arena';
const SUPPORT_CATEGORY_ID = String(process.env.SUPPORT_CATEGORY_ID || process.env.VOID_ARENA_CATEGORY_ID || '1523133579570184194').trim();
const SUPPORT_PANEL_CHANNEL_ID = String(process.env.SUPPORT_PANEL_CHANNEL_ID || process.env.SUPPORT_TICKET_CHANNEL_ID || '1493602223035515082').trim();
const SUPPORT_SITE_HISTORY_CHANNEL_ID = String(process.env.SUPPORT_SITE_HISTORY_CHANNEL_ID || 'site-main').trim() || 'site-main';
const SUPPORT_PANEL_MARKER = 'void-arena-support-ticket-panel-v1';

function canManage(member) {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

function parseDatabaseBackup(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup.database) {
    const buffer = Buffer.from(String(backup.database || ''), 'base64');
    return JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
  }
  if (backup?.database && typeof backup.database === 'object') return backup.database;
  return backup && typeof backup === 'object' ? backup : null;
}

async function readSupportTickets(options = {}) {
  const backup = await storage.exportDatabaseBackup();
  const db = parseDatabaseBackup(backup) || {};
  const tickets = Array.isArray(db.settings?.supportTickets) ? db.settings.supportTickets : [];
  const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
  const status = String(options.status || '').trim().toLowerCase();

  return tickets
    .filter((ticket) => !status || String(ticket.status || '').toLowerCase() === status)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, limit);
}

async function writeSupportTickets(tickets = [], meta = {}) {
  const backup = await storage.exportDatabaseBackup();
  const db = parseDatabaseBackup(backup) || {};
  db.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};
  db.settings.supportTickets = (Array.isArray(tickets) ? tickets : []).slice(-500);
  db.settings.support = {
    ...(db.settings.support || {}),
    updatedAt: new Date().toISOString(),
    ...meta
  };
  db.meta = {
    ...(db.meta || {}),
    supportUpdatedAt: new Date().toISOString(),
    supportPolicy: 'support-tickets-preserved-in-current-database-and-backups'
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    database: db,
    exportedAt: new Date().toISOString()
  });

  await githubBackups.saveBackupToGitHub(storage, {
    reason: 'support-ticket-updated-current-state'
  }).catch(() => null);

  return imported;
}

async function saveSupportTicket(payload = {}) {
  const now = new Date().toISOString();
  const backup = await storage.exportDatabaseBackup();
  const db = parseDatabaseBackup(backup) || {};
  const tickets = Array.isArray(db.settings?.supportTickets) ? db.settings.supportTickets : [];

  const ticket = {
    id: payload.id || `support_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    source: String(payload.source || 'site').trim() || 'site',
    status: String(payload.status || 'open').trim() || 'open',
    priority: String(payload.priority || 'normal').trim() || 'normal',
    category: String(payload.category || 'Site').trim().slice(0, 80),
    title: String(payload.title || 'Pedido de suporte').trim().slice(0, 120),
    description: String(payload.description || '').trim().slice(0, 1800),
    page: String(payload.page || '').trim().slice(0, 300),
    userId: String(payload.userId || '').trim(),
    discordId: String(payload.discordId || '').trim(),
    discordTag: String(payload.discordTag || '').trim().slice(0, 120),
    userName: String(payload.userName || payload.discordTag || 'Jogador').trim().slice(0, 120),
    userAvatar: String(payload.userAvatar || '').trim().slice(0, 1000),
    createdAt: payload.createdAt || now,
    updatedAt: now,
    comments: Array.isArray(payload.comments) ? payload.comments.slice(-80) : []
  };

  const nextTickets = [...tickets, ticket].slice(-500);
  await writeSupportTickets(nextTickets, { lastTicketId: ticket.id });
  return ticket;
}

async function updateSupportTicketStatus(id = '', status = '', updates = {}) {
  const safeId = String(id || '').trim();
  if (!safeId) throw new Error('Pedido de suporte inválido.');
  const backup = await storage.exportDatabaseBackup();
  const db = parseDatabaseBackup(backup) || {};
  const tickets = Array.isArray(db.settings?.supportTickets) ? db.settings.supportTickets : [];
  const index = tickets.findIndex((ticket) => String(ticket.id || '') === safeId);
  if (index < 0) throw new Error('Pedido de suporte não encontrado.');

  tickets[index] = {
    ...tickets[index],
    ...updates,
    status: String(status || tickets[index].status || 'open').trim(),
    updatedAt: new Date().toISOString()
  };

  await writeSupportTickets(tickets, { lastTicketId: safeId });
  return tickets[index];
}

async function deleteSupportTicket(id = '') {
  const safeId = String(id || '').trim();
  if (!safeId) throw new Error('Pedido de suporte inválido.');
  const backup = await storage.exportDatabaseBackup();
  const db = parseDatabaseBackup(backup) || {};
  const tickets = Array.isArray(db.settings?.supportTickets) ? db.settings.supportTickets : [];
  const before = tickets.length;
  const nextTickets = tickets.filter((ticket) => String(ticket.id || '') !== safeId);
  if (nextTickets.length === before) throw new Error('Pedido de suporte não encontrado.');
  await writeSupportTickets(nextTickets, { lastDeletedTicketId: safeId });
  return { success: true, deleted: true, id: safeId };
}

function supportPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🛟 Suporte Void Arena')
    .setDescription([
      'Encontrou erro no site, login, times, jogadores, formulários, chaveamento ou placar?',
      '',
      'Clique no botão abaixo para abrir um **ticket** e descreva o problema.',
      '',
      '🌐 **Local do problema**',
      '🧩 **O que aconteceu**',
      '📌 **Página ou seção afetada**',
      '✅ O pedido fica salvo no site e a equipe recebe o histórico organizado.'
    ].join('\n'))
    .setColor(0x22d3ee)
    .setFooter({ text: `Void Arena • Central de Suporte • ${SUPPORT_PANEL_MARKER}` });
}

function panelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voidsupport:open')
        .setLabel('Abrir ticket')
        .setEmoji('🛟')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function supportPanelPayload() {
  return { embeds: [supportPanelEmbed()], components: panelComponents() };
}

async function sendSupportPanel(messageOrChannel) {
  const payload = supportPanelPayload();
  if (typeof messageOrChannel.reply === 'function') return messageOrChannel.reply(payload);
  return messageOrChannel.send(payload);
}

async function ensureSupportPanelInChannel(client) {
  if (!SUPPORT_PANEL_CHANNEL_ID || !client?.channels?.fetch) return { sent: false, reason: 'no_channel_id' };
  const channel = await client.channels.fetch(SUPPORT_PANEL_CHANNEL_ID).catch(() => null);
  if (!channel?.send || !channel?.messages?.fetch) return { sent: false, reason: 'invalid_channel' };

  const payload = supportPanelPayload();
  const recentMessages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = recentMessages?.find?.((message) => (
    message.author?.id === client.user?.id &&
    message.embeds?.some?.((embed) => String(embed.footer?.text || '').includes(SUPPORT_PANEL_MARKER))
  ));

  if (existing?.editable) {
    await existing.edit(payload);
    console.log(`[Suporte] Painel de ticket atualizado no canal ${SUPPORT_PANEL_CHANNEL_ID}.`);
    return { sent: true, edited: true, channelId: SUPPORT_PANEL_CHANNEL_ID, messageId: existing.id };
  }

  const message = await channel.send(payload);
  await message.pin?.('Painel fixo de suporte Void Arena').catch(() => null);
  console.log(`[Suporte] Painel de ticket publicado no canal ${SUPPORT_PANEL_CHANNEL_ID}.`);
  return { sent: true, edited: false, channelId: SUPPORT_PANEL_CHANNEL_ID, messageId: message.id };
}

function normalizeChannelName(name = '') {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function findOrCreateSupportChannel(message) {
  const guild = message.guild;
  if (!guild) throw new Error('Servidor inválido.');
  const targetKey = normalizeChannelName(SUPPORT_CHANNEL_NAME);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && normalizeChannelName(channel.name) === targetKey);
  if (existing) return existing;

  const parent = SUPPORT_CATEGORY_ID ? guild.channels.cache.get(SUPPORT_CATEGORY_ID) : null;
  const channel = await guild.channels.create({
    name: SUPPORT_CHANNEL_NAME,
    type: ChannelType.GuildText,
    parent: parent?.type === ChannelType.GuildCategory ? parent.id : undefined,
    topic: '🛟 Central de suporte Void Arena para problemas no site, bot, times, jogadores e formulários.',
    reason: 'Central de suporte Void Arena criada pelo bot.'
  });
  return channel;
}

async function createSupportChannelAndPanel(message) {
  const channel = await findOrCreateSupportChannel(message);
  await sendSupportPanel(channel);
  await message.reply(`✅ Canal de suporte pronto: <#${channel.id}>`);
}

function supportModal() {
  return new ModalBuilder()
    .setCustomId('voidsupport:modal')
    .setTitle('Suporte Void Arena')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Resumo do problema')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(120)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('category')
          .setLabel('Área afetada')
          .setPlaceholder('Ex: Times, Jogadores, Login, Formulários...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('page')
          .setLabel('Página ou local')
          .setPlaceholder('Ex: /pages/times.html ou menu Jogadores')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(300)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Descreva o que aconteceu')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1800)
      )
    );
}

async function notifySupportLog(client, ticket = {}) {
  const channelId = String(process.env.SUPPORT_LOG_CHANNEL_ID || process.env.APPLICATION_LOG_CHANNEL_ID || process.env.TRAINING_LOG_CHANNEL_ID || SUPPORT_PANEL_CHANNEL_ID || '').trim();
  if (!channelId || !client?.channels?.fetch) return { sent: false, reason: 'no_channel' };
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.send) return { sent: false, reason: 'invalid_channel' };

  const message = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🛟 Novo ticket de suporte')
        .setColor(0x22d3ee)
        .setDescription([
          `**Usuário:** ${ticket.userName || ticket.discordTag || 'Jogador'}`,
          `**Área:** ${ticket.category || '-'}`,
          `**Página:** ${ticket.page || '-'}`,
          `**Protocolo:** ${ticket.id || '-'}`,
          '',
          `**Resumo:** ${ticket.title || '-'}`,
          '',
          String(ticket.description || '-').slice(0, 900)
        ].join('\n'))
        .setTimestamp(new Date(ticket.createdAt || Date.now()))
    ]
  }).catch(() => null);

  return { sent: Boolean(message), channelId, messageId: message?.id || '' };
}

async function saveSupportHistoryMessage(ticket = {}, notification = {}) {
  const lines = [
    '🛟 **Novo ticket de suporte aberto**',
    `Protocolo: ${ticket.id || '-'}`,
    `Jogador: ${ticket.userName || ticket.discordTag || 'Jogador'}`,
    `Área: ${ticket.category || '-'}`,
    ticket.page ? `Página: ${ticket.page}` : '',
    `Resumo: ${ticket.title || '-'}`,
    notification?.channelId ? `Log Discord: <#${notification.channelId}>` : ''
  ].filter(Boolean);

  await storage.saveChatMessage({
    channelId: SUPPORT_SITE_HISTORY_CHANNEL_ID,
    source: 'system',
    authorId: 'void-arena-support',
    authorName: 'Suporte Void Arena',
    authorAvatar: '/assets/hollow-nexus.png',
    content: lines.join('\n'),
    createdAt: ticket.createdAt || new Date().toISOString(),
    meta: {
      type: 'support_ticket_created',
      ticketId: ticket.id || '',
      discordId: ticket.discordId || '',
      supportPanelChannelId: SUPPORT_PANEL_CHANNEL_ID,
      supportLogChannelId: notification?.channelId || ''
    }
  }).catch((error) => {
    console.error('[Suporte] Falha ao registrar ticket no historico do site:', error.message);
  });
}

async function handleSupportModal(interaction) {
  const ticket = await saveSupportTicket({
    source: 'discord',
    discordId: interaction.user.id,
    discordTag: interaction.user.tag || interaction.user.username,
    userName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
    userAvatar: interaction.user.displayAvatarURL?.({ size: 128 }) || '',
    title: interaction.fields.getTextInputValue('title'),
    category: interaction.fields.getTextInputValue('category'),
    page: interaction.fields.getTextInputValue('page'),
    description: interaction.fields.getTextInputValue('description')
  });
  const notification = await notifySupportLog(interaction.client, ticket);
  await saveSupportHistoryMessage(ticket, notification);

  await interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Ticket enviado')
        .setDescription('Seu ticket foi salvo no site e a equipe recebeu o registro no histórico para análise.')
        .setColor(0x22c55e)
        .addFields(
          { name: 'Protocolo', value: ticket.id, inline: false },
          { name: 'Área', value: ticket.category || '-', inline: true },
          { name: 'Status', value: 'Aberto', inline: true }
        )
    ]
  });
}

function registerSupportSystem(client) {
  if (!client || client.__voidArenaSupportRegistered) return client;
  client.__voidArenaSupportRegistered = true;

  client.once(Events.ClientReady, () => {
    setTimeout(() => {
      ensureSupportPanelInChannel(client).catch((error) => console.error('[Suporte] Falha ao publicar painel fixo:', error.message));
    }, 8000).unref?.();
  });

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    const content = message.content.trim().toLowerCase();

    if (content === '.suporte-painel') {
      if (!canManage(message.member)) {
        await message.reply('❌ Apenas staff/admin pode criar o painel de suporte.');
        return;
      }
      await sendSupportPanel(message);
      return;
    }

    if (content === '.suporte-chat') {
      if (!canManage(message.member)) {
        await message.reply('❌ Apenas staff/admin pode criar o chat de suporte.');
        return;
      }
      if (!message.guild.members.me?.permissions?.has?.(PermissionFlagsBits.ManageChannels)) {
        await message.reply('❌ Preciso da permissão **Gerenciar canais** para criar o chat de suporte.');
        return;
      }
      await createSupportChannelAndPanel(message);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton?.() && interaction.customId === 'voidsupport:open') {
        await interaction.showModal(supportModal());
        return;
      }
      if (interaction.isModalSubmit?.() && interaction.customId === 'voidsupport:modal') {
        await handleSupportModal(interaction);
      }
    } catch (error) {
      console.error('❌ Erro no suporte Void Arena:', error);
      if (interaction.deferred || interaction.replied) await interaction.editReply(`❌ Erro: ${error.message}`).catch(() => {});
      else await interaction.reply({ content: `❌ Erro: ${error.message}`, ephemeral: true }).catch(() => {});
    }
  });

  return client;
}

module.exports = {
  registerSupportSystem,
  readSupportTickets,
  saveSupportTicket,
  updateSupportTicketStatus,
  deleteSupportTicket,
  ensureSupportPanelInChannel
};