const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
const MARKER = 'hnl-admin-chat-history-v1';

if (!fs.existsSync(file)) throw new Error('[Chat/Admin] bot/internalApi.js não encontrado.');
let source = fs.readFileSync(file, 'utf8');

if (source.includes(MARKER)) {
  console.log('[Chat/Admin] Histórico completo, edição e deduplicação manual já aplicados.');
  return;
}

source = source.replace(
  "const INTERNAL_TOKEN = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';",
  `const INTERNAL_TOKEN = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
// ${MARKER}
const manualMessageRequests = new Map();
const manualEditRequests = new Map();

function rememberManualRequest(store, key, value) {
  if (!key) return value;
  store.set(key, value);
  while (store.size > 500) store.delete(store.keys().next().value);
  return value;
}`
);

source = source.replace(
  '  return { success: true, channels };\n}',
  "  return { success: true, channels, botUserId: client?.user?.id || '', botTag: client?.user?.tag || '' };\n}"
);

const sendPattern = /async function sendDiscordMessage\(client, \{ discordChannelId, content, allowedMentions(?:, manual = false)? \} = \{\}\) \{[\s\S]*?\n\}\n\nasync function editDiscordMessage/;
if (!sendPattern.test(source)) throw new Error('[Chat/Admin] Função de envio não encontrada após os patches anteriores.');
source = source.replace(sendPattern, `async function sendDiscordMessage(client, { discordChannelId, content, allowedMentions, requestId = '', manual = false } = {}) {
  if (manual !== true) return { success: false, message: 'Envio recusado: esta rota aceita somente ação manual confirmada pelo painel.' };
  if (!discordChannelId || !client?.channels?.fetch) return { success: false, message: 'Bot Discord indisponível ou canal não informado.' };
  const safeRequestId = String(requestId || '').trim();
  const requestKey = safeRequestId ? \`send:\${discordChannelId}:\${safeRequestId}\` : '';
  if (requestKey && manualMessageRequests.has(requestKey)) {
    return { ...manualMessageRequests.get(requestKey), duplicatePrevented: true };
  }
  const channel = await client.channels.fetch(discordChannelId);
  if (!channel?.isTextBased?.()) return { success: false, message: 'Canal Discord inválido para envio.' };
  const payload = {
    content: String(content || '').slice(0, 2000),
    allowedMentions: allowedMentions || { parse: ['users', 'roles'], repliedUser: false }
  };
  const sent = await channel.send(typeof markManualSend === 'function' ? markManualSend(payload) : payload);
  const result = {
    success: true,
    discordMessageId: sent.id,
    discordChannelId: sent.channelId,
    botUserId: client.user?.id || '',
    botTag: client.user?.tag || '',
    createdAt: sent.createdAt?.toISOString?.() || new Date().toISOString(),
    manual: true
  };
  return rememberManualRequest(manualMessageRequests, requestKey, result);
}

async function editDiscordMessage`);

const editPattern = /async function editDiscordMessage\(client, \{ discordChannelId, discordMessageId, content, allowedMentions(?:, manual = false)? \} = \{\}\) \{[\s\S]*?\n\}\n\nasync function importDiscordHistory/;
if (!editPattern.test(source)) throw new Error('[Chat/Admin] Função de edição não encontrada após os patches anteriores.');
source = source.replace(editPattern, `async function editDiscordMessage(client, { discordChannelId, discordMessageId, content, allowedMentions, requestId = '', manual = false } = {}) {
  if (manual !== true) return { success: false, message: 'Edição recusada: esta rota aceita somente ação manual confirmada pelo painel.' };
  if (!discordChannelId || !discordMessageId || !client?.channels?.fetch) return { success: false, message: 'Bot Discord indisponível ou mensagem não informada.' };
  const safeRequestId = String(requestId || '').trim();
  const requestKey = safeRequestId ? \`edit:\${discordChannelId}:\${discordMessageId}:\${safeRequestId}\` : '';
  if (requestKey && manualEditRequests.has(requestKey)) {
    return { ...manualEditRequests.get(requestKey), duplicatePrevented: true };
  }
  const channel = await client.channels.fetch(discordChannelId);
  const message = await channel?.messages?.fetch?.(discordMessageId);
  if (!message || message.author?.id !== client.user?.id || !message.editable) {
    return { success: false, message: 'Somente mensagens enviadas pelo próprio BOT podem ser editadas.' };
  }
  const payload = {
    content: String(content || '').slice(0, 2000),
    allowedMentions: allowedMentions || { parse: ['users', 'roles'], repliedUser: false }
  };
  const edited = await message.edit(typeof markManualSend === 'function' ? markManualSend(payload) : payload);
  const result = {
    success: true,
    discordMessageId,
    discordChannelId,
    botUserId: client.user?.id || '',
    botTag: client.user?.tag || '',
    editedAt: edited.editedAt?.toISOString?.() || new Date().toISOString(),
    manual: true
  };
  return rememberManualRequest(manualEditRequests, requestKey, result);
}

async function readDiscordChannelHistory(client, { discordChannelId, before = '', limit = 250 } = {}) {
  const safeChannelId = String(discordChannelId || '').trim();
  const safeLimit = Math.max(1, Math.min(1000, Number(limit || 250)));
  if (!safeChannelId || !client?.channels?.fetch) {
    return { success: false, messages: [], before: '', hasMore: false, message: 'Bot Discord indisponível ou canal não informado.' };
  }
  const channel = await client.channels.fetch(safeChannelId);
  if (!channel?.isTextBased?.() || !channel.messages?.fetch) {
    return { success: false, messages: [], before: '', hasMore: false, message: 'Canal Discord inválido para histórico.' };
  }

  const collected = [];
  let cursor = String(before || '').trim();
  let remaining = safeLimit;
  let hasMore = false;

  while (remaining > 0) {
    const pageLimit = Math.min(100, remaining);
    const options = { limit: pageLimit };
    if (cursor) options.before = cursor;
    const fetched = await channel.messages.fetch(options);
    const page = Array.from(fetched.values());
    if (!page.length) { hasMore = false; break; }
    collected.push(...page);
    const oldest = page.reduce((current, item) => item.createdTimestamp < current.createdTimestamp ? item : current, page[0]);
    cursor = oldest.id;
    remaining -= page.length;
    hasMore = page.length === pageLimit;
    if (!hasMore) break;
  }

  const unique = new Map();
  for (const message of collected) unique.set(message.id, message);
  const messages = Array.from(unique.values())
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map((message) => ({
      id: message.id,
      discordMessageId: message.id,
      discordChannelId: message.channelId,
      source: 'discord',
      authorId: message.author?.id || '',
      authorName: message.member?.displayName || message.author?.globalName || message.author?.username || 'Discord',
      authorAvatar: message.author?.displayAvatarURL?.({ size: 128 }) || '',
      content: message.content || '',
      attachments: extractDiscordMessageAttachments(message),
      createdAt: message.createdAt?.toISOString?.() || new Date(message.createdTimestamp || Date.now()).toISOString(),
      editedAt: message.editedAt?.toISOString?.() || null,
      isBot: Boolean(message.author?.bot),
      isCommand: Boolean(message.interactionMetadata || message.interaction),
      editable: Boolean(message.author?.id === client.user?.id && message.editable)
    }));

  return {
    success: true,
    messages,
    before: hasMore && messages.length ? messages[0].discordMessageId : '',
    hasMore,
    botUserId: client.user?.id || '',
    botTag: client.user?.tag || ''
  };
}

async function importDiscordHistory`);

const endpointMarker = "  app.post('/internal/discord/send-message', async (req, res) => {";
if (!source.includes(endpointMarker)) throw new Error('[Chat/Admin] Ponto de rotas Discord não encontrado.');
source = source.replace(endpointMarker, `  app.get('/internal/discord/channel-history', async (req, res) => {
    try {
      return res.json(await readDiscordChannelHistory(client, {
        discordChannelId: req.query.discordChannelId,
        before: req.query.before,
        limit: req.query.limit
      }));
    } catch (error) {
      return res.status(500).json({ success: false, messages: [], before: '', hasMore: false, message: error.message });
    }
  });

${endpointMarker}`);

source = source.replace(
  '  editDiscordMessage,\n  importDiscordHistory',
  '  editDiscordMessage,\n  readDiscordChannelHistory,\n  importDiscordHistory'
);

new Function(source);
fs.writeFileSync(file, source, 'utf8');
console.log('[Chat/Admin] Histórico paginado com humanos/BOT/comandos, edição manual e deduplicação por requestId aplicados.');
