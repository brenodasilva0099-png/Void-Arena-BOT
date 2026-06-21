const express = require('express');
const { ChannelType } = require('discord.js');
const { extractDiscordMessageAttachments } = require('./discordClient');
const storage = require('../server/storage');
const {
  readChatMessages,
  saveChatMessage
} = storage;

const INTERNAL_TOKEN = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';

const STORAGE_METHODS = new Set([
  'readDatabaseStatus',
  'readEvents',
  'saveTournamentEvent',
  'registerTeamInEvent',
  'readTournamentSettings',
  'writeTournamentSettings',
  'readChatMessages',
  'saveChatMessage',
  'updateChatMessage',
  'mergeChatMessageDiscordData',
  'readChatBridgeSettings',
  'writeChatBridgeSettings',
  'readStatsBridgeSettings',
  'writeStatsBridgeSettings',
  'readTeamChats',
  'findOrCreateTeamChat',
  'findOrCreateDirectChat',
  'readTeamChatById',
  'readTeamChatMessages',
  'saveTeamChatMessage',
  'updateTeamChatMessage',
  'readUsers',
  'findUserByEmail',
  'findUserById',
  'findUserByDiscordId',
  'saveUser',
  'readTeams',
  'saveTeam',
  'deleteTeam',
  'readBracket',
  'writeBracket',
]);

function discordChannelKind(type) {
  switch (type) {
    case ChannelType.GuildText: return 'text';
    case ChannelType.GuildAnnouncement: return 'announcement';
    case ChannelType.GuildVoice: return 'voice';
    case ChannelType.GuildStageVoice: return 'stage';
    case ChannelType.GuildForum: return 'forum';
    case ChannelType.GuildCategory: return 'category';
    default: return 'other';
  }
}

function discordChannelTypeName(type) {
  const labels = {
    text: 'Texto',
    announcement: 'Anúncios',
    voice: 'Voz',
    stage: 'Palco',
    forum: 'Fórum',
    category: 'Categoria',
    other: 'Outro'
  };
  return labels[discordChannelKind(type)] || labels.other;
}

function canUseAsChatBridge(channel) {
  return channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement;
}

function requireInternalToken(req, res, next) {
  if (!INTERNAL_TOKEN) return next();
  const token = req.headers['x-bot-api-key'] || req.headers['x-internal-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token !== INTERNAL_TOKEN) {
    return res.status(401).json({ success: false, message: 'Token interno inválido.' });
  }
  return next();
}

async function listDiscordChannels(client) {
  if (!client?.guilds?.cache) return { success: true, channels: [], message: 'Bot ainda não está online.' };

  const guilds = Array.from(client.guilds.cache.values());
  const channels = [];

  for (const guild of guilds) {
    let guildChannels = guild.channels.cache;

    try {
      const fetched = await guild.channels.fetch();
      if (fetched) guildChannels = fetched;
    } catch {}

    const channelList = Array.from(guildChannels.values()).filter(Boolean);
    const channelById = new Map(channelList.map((channel) => [channel.id, channel]));

    channelList
      .filter((channel) => ['text', 'announcement', 'voice', 'stage', 'forum', 'category'].includes(discordChannelKind(channel.type)))
      .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
      .forEach((channel) => {
        const parent = channel.parent || channelById.get(channel.parentId);
        channels.push({
          id: channel.id,
          name: channel.name || 'canal',
          displayName: channel.type === ChannelType.GuildCategory
            ? `📁 ${channel.name || 'Categoria'}`
            : `${parent?.name ? `${parent.name} / ` : ''}${channel.name || 'canal'}`,
          guildId: guild.id,
          guildName: guild.name,
          type: channel.type,
          kind: discordChannelKind(channel.type),
          typeName: discordChannelTypeName(channel.type),
          parentId: channel.parentId || '',
          parentName: parent?.name || '',
          position: channel.rawPosition ?? channel.position ?? 0,
          canBridge: canUseAsChatBridge(channel)
        });
      });
  }

  return { success: true, channels };
}

async function listDiscordMentions(client) {
  if (!client?.guilds?.cache) return { success: true, members: [], roles: [], message: 'Bot ainda não está online.' };

  const guilds = Array.from(client.guilds.cache.values());
  const members = [];
  const roles = [];

  for (const guild of guilds) {
    try {
      const fetchedRoles = await guild.roles.fetch();
      const roleList = Array.from((fetchedRoles || guild.roles.cache).values())
        .filter((role) => role && role.id !== guild.id && !role.managed)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .slice(0, 80);

      roleList.forEach((role) => {
        roles.push({
          id: role.id,
          name: role.name,
          guildId: guild.id,
          guildName: guild.name,
          mention: `<@&${role.id}>`
        });
      });
    } catch {}

    try {
      let memberCollection = guild.members.cache;
      try {
        const fetchedMembers = await guild.members.fetch({ limit: 100 });
        if (fetchedMembers) memberCollection = fetchedMembers;
      } catch {}

      Array.from(memberCollection.values())
        .filter((member) => member?.user && !member.user.bot)
        .slice(0, 100)
        .forEach((member) => {
          members.push({
            id: member.user.id,
            name: member.displayName || member.user.globalName || member.user.username,
            username: member.user.username,
            guildId: guild.id,
            guildName: guild.name,
            avatar: member.user.displayAvatarURL?.({ size: 64 }) || '',
            mention: `<@${member.user.id}>`
          });
        });
    } catch {}
  }

  return { success: true, members, roles };
}

async function sendDiscordMessage(client, { discordChannelId, content, allowedMentions } = {}) {
  if (!discordChannelId || !client?.channels?.fetch) return { success: false, message: 'Bot Discord indisponível ou canal não informado.' };
  const channel = await client.channels.fetch(discordChannelId);
  if (!channel?.isTextBased?.()) return { success: false, message: 'Canal Discord inválido para envio.' };
  const sent = await channel.send({
    content: String(content || '').slice(0, 2000),
    allowedMentions: allowedMentions || { parse: ['users', 'roles'] }
  });
  return { success: true, discordMessageId: sent.id, discordChannelId: sent.channelId };
}

async function editDiscordMessage(client, { discordChannelId, discordMessageId, content, allowedMentions } = {}) {
  if (!discordChannelId || !discordMessageId || !client?.channels?.fetch) return { success: false, message: 'Bot Discord indisponível ou mensagem não informada.' };
  const channel = await client.channels.fetch(discordChannelId);
  const message = await channel?.messages?.fetch?.(discordMessageId);
  if (!message?.editable) return { success: false, message: 'Mensagem Discord não pode ser editada.' };
  await message.edit({
    content: String(content || '').slice(0, 2000),
    allowedMentions: allowedMentions || { parse: ['users', 'roles'] }
  });
  return { success: true, discordMessageId, discordChannelId };
}

async function importDiscordHistory(client, { discordChannelId, siteChannelId, limit = 100 } = {}) {
  const safeDiscordChannelId = String(discordChannelId || '').trim();
  const safeSiteChannelId = String(siteChannelId || 'site-main').trim() || 'site-main';
  const maxLimit = Math.max(1, Math.min(100, Number(limit || 100)));

  if (!safeDiscordChannelId || !client?.channels?.fetch) {
    return { success: true, imported: 0, skipped: 0, reason: safeDiscordChannelId ? 'Bot Discord indisponível.' : 'Canal Discord não informado.' };
  }

  const channel = await client.channels.fetch(safeDiscordChannelId);
  if (!channel?.isTextBased?.() || !channel.messages?.fetch) {
    return { success: true, imported: 0, skipped: 0, reason: 'Canal Discord inválido para histórico.' };
  }

  const existing = await readChatMessages({ channelId: safeSiteChannelId, limit: 100 });
  const existingDiscordIds = new Set(existing.map((message) => message.discordMessageId).filter(Boolean));
  const fetched = await channel.messages.fetch({ limit: maxLimit });
  const discordMessages = Array.from(fetched.values())
    .filter((message) => !message.author?.bot)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let imported = 0;
  let skipped = 0;

  for (const message of discordMessages) {
    if (existingDiscordIds.has(message.id)) {
      skipped += 1;
      continue;
    }

    const attachments = extractDiscordMessageAttachments(message);
    await saveChatMessage({
      channelId: safeSiteChannelId,
      source: 'discord',
      authorId: message.author?.id || '',
      authorName: message.member?.displayName || message.author?.globalName || message.author?.username || 'Discord',
      authorAvatar: message.author?.displayAvatarURL?.({ size: 128 }) || '',
      content: message.content || '',
      attachments,
      discordMessageId: message.id,
      discordChannelId: message.channelId,
      createdAt: message.createdAt?.toISOString?.() || new Date(message.createdTimestamp || Date.now()).toISOString()
    });
    imported += 1;
  }

  return { success: true, imported, skipped };
}

function startInternalApi({ client, port = 3002 } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(requireInternalToken);

  app.get('/internal/health', async (_req, res) => {
    const database = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));
    return res.json({
      success: true,
      service: 'Void Arena Bot Internal API',
      online: Boolean(client?.user),
      tag: client?.user?.tag || null,
      guilds: client?.guilds?.cache?.size || 0,
      database
    });
  });

  app.post('/internal/storage/:method', async (req, res) => {
    const method = String(req.params.method || '').trim();

    if (!STORAGE_METHODS.has(method) || typeof storage[method] !== 'function') {
      return res.status(404).json({ success: false, message: `Método de storage não permitido: ${method}` });
    }

    try {
      const args = Array.isArray(req.body?.args) ? req.body.args : [];
      const result = await storage[method](...args);
      return res.json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/internal/discord/channels', async (_req, res) => {
    try {
      return res.json(await listDiscordChannels(client));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/internal/discord/mentions', async (_req, res) => {
    try {
      return res.json(await listDiscordMentions(client));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/discord/send-message', async (req, res) => {
    try {
      return res.json(await sendDiscordMessage(client, req.body || {}));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.patch('/internal/discord/edit-message', async (req, res) => {
    try {
      return res.json(await editDiscordMessage(client, req.body || {}));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/discord/import-history', async (req, res) => {
    try {
      return res.json(await importDiscordHistory(client, req.body || {}));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  const server = app.listen(port, () => {
    console.log(`🔌 Bot Internal API rodando em: http://localhost:${port}`);
  });

  return server;
}

module.exports = {
  startInternalApi,
  listDiscordChannels,
  listDiscordMentions,
  sendDiscordMessage,
  editDiscordMessage,
  importDiscordHistory
};
