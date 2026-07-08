const express = require('express');

let installed = false;

function cleanDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  const digit = raw.match(/\b\d{16,22}\b/);
  return digit ? digit[0] : '';
}

function dmChannelId(discordId = '') {
  return `voidarena-dm-${cleanDiscordId(discordId)}`;
}

function userLabel(user) {
  return user?.globalName || user?.username || user?.tag || user?.id || 'Jogador';
}

function userAvatar(user, size = 128) {
  return user?.displayAvatarURL?.({ size }) || '';
}

async function fetchPublicDiscordUser(client, discordId = '') {
  const id = cleanDiscordId(discordId);
  if (!id) throw new Error('Informe um Discord ID valido.');
  if (!client?.users?.fetch) throw new Error('Bot Discord indisponivel.');
  const user = await client.users.fetch(id, { force: true }).catch(() => null);
  if (!user) throw new Error('Usuario Discord nao encontrado.');
  return {
    id: user.id,
    discordId: user.id,
    name: userLabel(user),
    username: user.username || '',
    globalName: user.globalName || '',
    tag: user.tag || user.username || '',
    avatar: userAvatar(user, 128),
    bot: Boolean(user.bot)
  };
}

function parseDmHistory(message = {}) {
  let data = null;
  try { data = JSON.parse(message.content || '{}'); } catch {}
  return {
    id: message.id || data?.discordMessageId || '',
    createdAt: data?.createdAt || message.createdAt || null,
    direction: data?.direction || 'outbound',
    authorId: message.authorId || '',
    authorName: message.authorName || 'Void Arena Bot',
    authorAvatar: message.authorAvatar || '',
    content: data?.text || message.content || '',
    deliveredToDiscord: data?.deliveredToDiscord !== false,
    discordChannelId: data?.discordChannelId || message.discordChannelId || '',
    discordMessageId: data?.discordMessageId || message.discordMessageId || '',
    meta: data?.meta || {}
  };
}

function installVoidArenaDirectMessageRoutes({ client, storage } = {}) {
  if (installed) return;
  installed = true;
  const originalListen = express.application.listen;
  express.application.listen = function patchedListen(...args) {
    if (!this.__voidArenaDmRoutes) {
      this.__voidArenaDmRoutes = true;
      this.get('/internal/discord/user/:discordId', async (req, res) => {
        try {
          const user = await fetchPublicDiscordUser(client, req.params.discordId);
          return res.json({ success: true, user });
        } catch (error) {
          return res.status(404).json({ success: false, message: error.message });
        }
      });
      this.get('/internal/discord/dm-history/:discordId', async (req, res) => {
        try {
          const id = cleanDiscordId(req.params.discordId);
          const limit = Math.max(1, Math.min(150, Number(req.query.limit || 80) || 80));
          const messages = await storage.readChatMessages({ channelId: dmChannelId(id), limit }).catch(() => []);
          return res.json({ success: true, discordId: id, messages: messages.map(parseDmHistory).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) });
        } catch (error) {
          return res.status(400).json({ success: false, message: error.message, messages: [] });
        }
      });
      console.log('API interna de consulta de DMs Void Arena registrada.');
    }
    return originalListen.apply(this, args);
  };
}

module.exports = { installVoidArenaDirectMessageRoutes };
