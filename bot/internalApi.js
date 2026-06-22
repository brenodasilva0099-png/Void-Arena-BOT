const express = require('express');
const { Readable } = require('node:stream');
const { ChannelType } = require('discord.js');
const { extractDiscordMessageAttachments } = require('./discordClient');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const {
  readChatMessages,
  saveChatMessage
} = storage;

const INTERNAL_TOKEN = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';

let maintenanceState = {
  enabled: false,
  message: '',
  etaMinutes: 0,
  startedAt: null,
  updatedAt: null
};

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
  'updateTrainingSubmissionStatus',
  'addTrainingSubmissionComment',
  'saveTrainingSubmission',
  'readTrainingSubmissions',
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

function resolvePrimaryGuild(client) {
  if (!client?.guilds?.cache?.size) return null;

  const configuredGuildId = String(process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "").trim();
  if (configuredGuildId) {
    const configuredGuild = client.guilds.cache.get(configuredGuildId);
    if (configuredGuild) return configuredGuild;
  }

  return client.guilds.cache.first() || null;
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


async function findTrainingSubmissionById(submissionId) {
  const submissions = await storage.readTrainingSubmissions({ limit: 500 });
  return submissions.find((item) => String(item.id) === String(submissionId)) || null;
}

function isVideoAttachment(attachment) {
  const contentType = String(attachment?.contentType || attachment?.content_type || '').toLowerCase();
  const name = String(attachment?.name || attachment?.filename || '').toLowerCase();

  return (
    contentType.startsWith('video/') ||
    /\.(mp4|mov|webm|mkv|m4v)$/i.test(name)
  );
}

function chooseVideoAttachment(message, submission = {}) {
  const videoId = String(submission.video?.id || submission.originalVideo?.id || '').trim();
  const videoName = String(submission.video?.name || submission.originalVideo?.name || '').trim();

  const attachments = Array.from(message?.attachments?.values?.() || []);

  return attachments.find((attachment) => String(attachment.id) === videoId)
    || attachments.find((attachment) => String(attachment.name || '') === videoName)
    || attachments.find(isVideoAttachment)
    || attachments[0]
    || null;
}

function messageLooksLikeSubmission(message, submission = {}) {
  const content = String(message?.content || '').toLowerCase();
  const playerName = String(submission.playerName || '').toLowerCase();
  const playerDiscordId = String(submission.playerDiscordId || '').trim();
  const description = String(submission.description || '').toLowerCase();
  const submissionId = String(submission.id || '').toLowerCase();

  const embedText = (message?.embeds || [])
    .map((embed) => [
      embed.title,
      embed.description,
      ...(embed.fields || []).map((field) => `${field.name} ${field.value}`)
    ].flat().join(' '))
    .join(' ')
    .toLowerCase();

  const haystack = `${content} ${embedText}`;

  if (submissionId && haystack.includes(submissionId)) return true;
  if (playerDiscordId && haystack.includes(playerDiscordId)) return true;
  if (playerName && haystack.includes(playerName)) return true;
  if (description && description.length >= 8 && haystack.includes(description.slice(0, 32))) return true;

  return false;
}

async function fetchMessageVideo(client, channelId, messageId, submission = {}) {
  if (!channelId || !messageId) return null;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  const message = await channel?.messages?.fetch?.(messageId).catch(() => null);

  if (!message) return null;

  const attachment = chooseVideoAttachment(message, submission);

  if (!attachment?.url) return null;

  return {
    message,
    attachment,
    source: 'saved-message'
  };
}

async function scanTrainingHistoryForVideo(client, submission = {}) {
  const channelId = String(
    process.env.TRAINING_LOG_CHANNEL_ID ||
    process.env.TRAINING_CHANNEL_ID ||
    submission.discordChannelId ||
    ''
  ).trim();

  if (!channelId) return null;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.messages?.fetch) return null;

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages?.size) return null;

  const list = Array.from(messages.values())
    .filter((message) => Array.from(message.attachments?.values?.() || []).some(isVideoAttachment))
    .sort((a, b) => Number(b.createdTimestamp || 0) - Number(a.createdTimestamp || 0));

  const directMatch = list.find((message) => messageLooksLikeSubmission(message, submission));
  const fallback = directMatch || list[0];

  if (!fallback) return null;

  const attachment = chooseVideoAttachment(fallback, submission);
  if (!attachment?.url) return null;

  return {
    message: fallback,
    attachment,
    source: directMatch ? 'history-match' : 'history-latest-video'
  };
}

async function resolveFreshTrainingVideoSource(client, submission = {}) {
  const savedChannelId = String(submission.discordChannelId || submission.video?.discordChannelId || '').trim();
  const savedMessageId = String(submission.discordMessageId || submission.video?.discordMessageId || '').trim();

  const saved = await fetchMessageVideo(client, savedChannelId, savedMessageId, submission);
  if (saved?.attachment?.url) {
    return {
      url: saved.attachment.url,
      proxyUrl: saved.attachment.proxyURL || saved.attachment.proxyUrl || '',
      name: saved.attachment.name || submission.video?.name || `treino-${submission.id}.mp4`,
      contentType: saved.attachment.contentType || submission.video?.contentType || 'video/mp4',
      size: Number(saved.attachment.size || submission.video?.size || 0) || 0,
      discordChannelId: saved.message.channelId,
      discordMessageId: saved.message.id,
      source: saved.source
    };
  }

  const scanned = await scanTrainingHistoryForVideo(client, submission);
  if (scanned?.attachment?.url) {
    return {
      url: scanned.attachment.url,
      proxyUrl: scanned.attachment.proxyURL || scanned.attachment.proxyUrl || '',
      name: scanned.attachment.name || submission.video?.name || `treino-${submission.id}.mp4`,
      contentType: scanned.attachment.contentType || submission.video?.contentType || 'video/mp4',
      size: Number(scanned.attachment.size || submission.video?.size || 0) || 0,
      discordChannelId: scanned.message.channelId,
      discordMessageId: scanned.message.id,
      source: scanned.source
    };
  }

  const video = submission.video || submission.originalVideo || {};
  const fallbackUrl = video.proxyUrl || video.proxyURL || video.url || video.attachmentUrl || video.downloadUrl || '';

  if (!fallbackUrl) {
    throw new Error('Não achei o vídeo no histórico do Discord nem no banco.');
  }

  return {
    url: fallbackUrl,
    proxyUrl: video.proxyUrl || video.proxyURL || '',
    name: video.name || video.filename || `treino-${submission.id}.mp4`,
    contentType: video.contentType || 'video/mp4',
    size: Number(video.size || 0) || 0,
    discordChannelId: '',
    discordMessageId: '',
    source: 'database-fallback'
  };
}

async function streamTrainingVideo(client, req, res) {
  const submission = await findTrainingSubmissionById(req.params.id);

  if (!submission) {
    return res.status(404).send('Treino não encontrado.');
  }

  const source = await resolveFreshTrainingVideoSource(client, submission);

  const headers = {
    'User-Agent': 'Void-Arena-Bot-Video-Proxy/1.0'
  };

  if (req.headers.range) {
    headers.Range = req.headers.range;
  }

  const videoUrl = source.proxyUrl || source.url;
  const upstream = await fetch(videoUrl, { headers });

  if (!upstream.ok && upstream.status !== 206) {
    return res.status(upstream.status || 502).send(`Não foi possível abrir o vídeo pelo Discord. Fonte: ${source.source}`);
  }

  const contentType = upstream.headers.get('content-type') || source.contentType || 'video/mp4';
  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');
  const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
  const filename = String(source.name || `treino-${submission.id}.mp4`).replace(/[^\w.\-() ]+/g, '_');

  res.status(upstream.status === 206 ? 206 : 200);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Accept-Ranges', acceptRanges);
  res.setHeader('Cache-Control', 'private, max-age=30');
  res.setHeader('X-Training-Video-Source', source.source || 'unknown');
  res.setHeader('X-Discord-Channel-Id', source.discordChannelId || '');
  res.setHeader('X-Discord-Message-Id', source.discordMessageId || '');

  if (contentLength) res.setHeader('Content-Length', contentLength);
  if (contentRange) res.setHeader('Content-Range', contentRange);

  if (!upstream.body) return res.end();

  return Readable.fromWeb(upstream.body).pipe(res);
}

async function sendTrainingCommentDM(client, payload = {}) {
  const submissionId = String(payload.submissionId || '').trim();
  const content = String(payload.content || '').trim().slice(0, 1200);

  if (!submissionId) throw new Error('Treino inválido.');
  if (!content) throw new Error('Escreva um comentário.');

  const submission = await findTrainingSubmissionById(submissionId);
  if (!submission) throw new Error('Envio de treino não encontrado.');

  const playerDiscordId = String(submission.playerDiscordId || '').trim();
  if (!playerDiscordId) throw new Error('Esse treino não tem Discord ID do jogador.');

  let deliveredToDiscord = false;
  let dmError = '';

  const commentPayload = {
    authorId: String(payload.authorId || '').trim(),
    authorDiscordId: String(payload.authorDiscordId || '').trim(),
    authorName: String(payload.authorName || 'Equipe Void Arena').trim(),
    content,
    deliveredToDiscord: false,
    dmError: ''
  };

  try {
    if (!client?.users?.fetch) throw new Error('Bot Discord indisponível.');

    const user = await client.users.fetch(playerDiscordId);
    await user.send({
      content: [
        `🎥 **Comentário sobre seu treino enviado**`,
        ``,
        `**Analista:** ${commentPayload.authorName}`,
        `**Treino:** ${submission.type || 'Treino'} • ${submission.position || 'Posição não informada'}`,
        ``,
        content,
        ``,
        `Void Arena • Sistema de análise de treinos`
      ].join('\n'),
      allowedMentions: { parse: [] }
    });

    deliveredToDiscord = true;
  } catch (error) {
    dmError = error.message || 'Não foi possível enviar DM.';
  }

  const saved = await storage.addTrainingSubmissionComment(submissionId, {
    ...commentPayload,
    deliveredToDiscord,
    dmError
  });

  return {
    success: true,
    deliveredToDiscord,
    dmError,
    submission: saved.submission,
    comment: saved.comment
  };
}

function startInternalApi({ client, port = 3002 } = {}) {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get("/public/guild-icon.png", async (_req, res) => {
    try {
      const guild = resolvePrimaryGuild(client);
      const iconUrl = guild?.iconURL?.({ extension: "png", size: 256 });

      if (!iconUrl) {
        return res.status(404).json({ success: false, message: "Servidor sem ícone ou bot ainda não conectado." });
      }

      res.set("Cache-Control", "public, max-age=300");
      return res.redirect(iconUrl);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/public/guild-brand", async (_req, res) => {
    try {
      const guild = resolvePrimaryGuild(client);
      const icon = guild?.iconURL?.({ extension: "png", size: 256 }) || null;

      return res.json({
        success: true,
        guild: guild ? {
          id: guild.id,
          name: guild.name,
          icon
        } : null
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });


  app.get('/public/maintenance', (_req, res) => {
    return res.json({
      success: true,
      maintenance: maintenanceState
    });
  });

  app.use(requireInternalToken);


  app.get('/internal/training-submissions/:id/video', async (req, res) => {
    try {
      return await streamTrainingVideo(client, req, res);
    } catch (error) {
      console.error('❌ Erro no proxy interno de vídeo:', error);
      return res.status(502).send(error.message || 'Erro ao carregar vídeo.');
    }
  });

  app.post('/internal/training-submissions/:id/comment', async (req, res) => {
    try {
      const result = await sendTrainingCommentDM(client, {
        ...(req.body || {}),
        submissionId: req.params.id
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

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


  app.get('/internal/backup/export', async (_req, res) => {
    try {
      const backup = await storage.exportDatabaseBackup();
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="void-arena-backup-${Date.now()}.json"`);
      return res.json(backup);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/backup/import', async (req, res) => {
    try {
      const result = await storage.importDatabaseBackup(req.body || {});
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });


  app.post('/internal/backup/github/export', async (req, res) => {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, {
        reason: req.body?.reason || 'manual'
      });
      return res.json({ success: true, manifest });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/internal/backup/github/latest', async (_req, res) => {
    try {
      const backup = await githubBackups.fetchLatestBackupFromGitHub();
      return res.json({
        success: true,
        exportedAt: backup.exportedAt || null,
        summary: backup.summary || null,
        githubBackup: backup.githubBackup || null
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/backup/github/restore-latest', async (_req, res) => {
    try {
      const result = await githubBackups.restoreLatestBackupFromGitHub(storage);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/maintenance/start', async (req, res) => {
    maintenanceState = {
      enabled: true,
      message: String(req.body?.message || 'Void Arena está atualizando. Voltamos em instantes.'),
      etaMinutes: Number(req.body?.etaMinutes || 3) || 3,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return res.json({ success: true, maintenance: maintenanceState });
  });

  app.post('/internal/maintenance/stop', async (_req, res) => {
    maintenanceState = {
      enabled: false,
      message: '',
      etaMinutes: 0,
      startedAt: maintenanceState.startedAt || null,
      updatedAt: new Date().toISOString()
    };

    return res.json({ success: true, maintenance: maintenanceState });
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
