const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
let src = fs.readFileSync(file, 'utf8');

const helperMarker = 'async function listManagedMatchVoiceChannels';
if (!src.includes(helperMarker)) {
  const helpers = `
function configuredMatchVoiceCategoryId(payload = {}) {
  return String(
    payload.categoryId ||
    payload.discordMatchCategoryId ||
    process.env.MATCH_VOICE_CATEGORY_ID ||
    process.env.DISCORD_MATCH_CATEGORY_ID ||
    process.env.MATCH_CATEGORY_ID ||
    '1523133579570184194'
  ).trim();
}

function isMatchVoiceChannel(channel, categoryId = '') {
  return Boolean(
    channel &&
    (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) &&
    (!categoryId || channel.parentId === categoryId)
  );
}

async function listManagedMatchVoiceChannels(client, payload = {}) {
  const categoryId = configuredMatchVoiceCategoryId(payload);
  const guild = payload.guildId
    ? await client?.guilds?.fetch?.(String(payload.guildId)).catch(() => null)
    : resolvePrimaryGuild(client);

  if (!guild?.channels?.fetch) return { success: true, categoryId, channels: [], message: 'Bot ainda não está conectado ao servidor.' };

  const fetched = await guild.channels.fetch().catch(() => null);
  const channelList = Array.from((fetched || guild.channels.cache || new Map()).values()).filter(Boolean);
  const parent = categoryId ? channelList.find((channel) => channel.id === categoryId) : null;

  const channels = channelList
    .filter((channel) => isMatchVoiceChannel(channel, categoryId))
    .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
    .map((channel) => ({
      id: channel.id,
      name: channel.name || 'call',
      guildId: guild.id,
      guildName: guild.name,
      parentId: channel.parentId || '',
      parentName: parent?.name || channel.parent?.name || '',
      userLimit: channel.userLimit || 0,
      members: channel.members?.size || 0,
      managed: String(channel.name || '').startsWith('👤・')
    }));

  return { success: true, categoryId, categoryName: parent?.name || '', channels };
}

async function deleteManagedMatchVoiceChannels(client, payload = {}) {
  const categoryId = configuredMatchVoiceCategoryId(payload);
  const channelIds = Array.from(new Set(Array.isArray(payload.channelIds) ? payload.channelIds : []))
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  if (!channelIds.length) throw new Error('Selecione pelo menos uma call para apagar.');

  const deleted = [];
  const skipped = [];

  for (const channelId of channelIds) {
    const channel = await client?.channels?.fetch?.(channelId).catch(() => null);
    if (!channel) { skipped.push({ id: channelId, reason: 'não encontrada' }); continue; }
    if (!isMatchVoiceChannel(channel, categoryId)) { skipped.push({ id: channelId, name: channel.name || '', reason: 'fora da categoria/sem ser call' }); continue; }
    await channel.delete('Void Arena: call privada removida pelo painel do site');
    deleted.push({ id: channel.id, name: channel.name || 'call' });
  }

  return { success: true, categoryId, deleted, skipped, message: `${deleted.length} call(s) apagada(s).` };
}
`;
  src = src.replace('\nasync function listDiscordMentions(client) {', `${helpers}\nasync function listDiscordMentions(client) {`);
}

if (!src.includes("app.get('/internal/discord/match-voices'")) {
  const routes = `
  app.get('/internal/discord/match-voices', async (req, res) => {
    try {
      return res.json(await listManagedMatchVoiceChannels(client, req.query || {}));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete('/internal/discord/match-voices', async (req, res) => {
    try {
      return res.json(await deleteManagedMatchVoiceChannels(client, req.body || {}));
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/discord/match-voices/delete', async (req, res) => {
    try {
      return res.json(await deleteManagedMatchVoiceChannels(client, req.body || {}));
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
`;
  src = src.replace("\n  app.get('/internal/discord/channels', async (_req, res) => {", `${routes}\n  app.get('/internal/discord/channels', async (_req, res) => {`);
} else if (!src.includes("app.post('/internal/discord/match-voices/delete'")) {
  const postRoute = `
  app.post('/internal/discord/match-voices/delete', async (req, res) => {
    try {
      return res.json(await deleteManagedMatchVoiceChannels(client, req.body || {}));
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
`;
  src = src.replace("\n  app.get('/internal/discord/channels', async (_req, res) => {", `${postRoute}\n  app.get('/internal/discord/channels', async (_req, res) => {`);
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: endpoints de listar/apagar calls privadas dos times.');
