const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
      'Clique no botão abaixo e descreva o problema.',
      '',
      '🌐 **Local do problema**',
      '🧩 **O que aconteceu**',
      '📌 **Página ou seção afetada**',
      '✅ A equipe recebe tudo organizado no site.'
    ].join('\n'))
    .setColor(0x22d3ee)
    .setFooter({ text: 'Void Arena • Central de Suporte' });
}

async function sendSupportPanel(message) {
  await message.reply({
    embeds: [supportPanelEmbed()],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voidsupport:open')
          .setLabel('Abrir suporte')
          .setEmoji('🛟')
          .setStyle(ButtonStyle.Primary)
      )
    ]
  });
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
  const channelId = String(process.env.SUPPORT_LOG_CHANNEL_ID || process.env.APPLICATION_LOG_CHANNEL_ID || process.env.TRAINING_LOG_CHANNEL_ID || '').trim();
  if (!channelId || !client?.channels?.fetch) return { sent: false, reason: 'no_channel' };
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.send) return { sent: false, reason: 'invalid_channel' };

  const message = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🛟 Novo pedido de suporte')
        .setColor(0x22d3ee)
        .setDescription([
          `**Usuário:** ${ticket.userName || ticket.discordTag || 'Jogador'}`,
          `**Área:** ${ticket.category || '-'}`,
          `**Página:** ${ticket.page || '-'}`,
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
  await notifySupportLog(interaction.client, ticket);

  await interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Suporte enviado')
        .setDescription('Seu pedido foi salvo e a equipe recebeu o registro para análise.')
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

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    const content = message.content.trim().toLowerCase();
    if (content === '.suporte-painel') {
      if (!canManage(message.member)) {
        await message.reply('❌ Apenas staff/admin pode criar o painel de suporte.');
        return;
      }
      await sendSupportPanel(message);
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
  deleteSupportTicket
};
