const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'patch-voidarena-direct-messages.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('async function syncDiscordDmHistory')) {
  const helper = `
async function syncDiscordDmHistory(client, storage, discordId = '', limit = 80) {
  const id = cleanDiscordId(discordId);
  if (!id || !client?.users?.fetch || !storage?.readChatMessages) return { synced: 0, skipped: 0 };
  const existing = await storage.readChatMessages({ channelId: dmChannelId(id), limit: 200 }).catch(() => []);
  const seenDiscordIds = new Set(existing.map((item) => {
    try { return JSON.parse(item.content || '{}')?.discordMessageId || item.discordMessageId || ''; }
    catch { return item.discordMessageId || ''; }
  }).filter(Boolean));

  const user = await client.users.fetch(id, { force: true }).catch(() => null);
  const dm = await user?.createDM?.().catch(() => null);
  if (!dm?.messages?.fetch) return { synced: 0, skipped: 0 };

  const fetched = await dm.messages.fetch({ limit: Math.max(1, Math.min(100, Number(limit || 80))) }).catch(() => null);
  if (!fetched?.size) return { synced: 0, skipped: 0 };

  let synced = 0;
  let skipped = 0;
  const messages = Array.from(fetched.values()).sort((a, b) => Number(a.createdTimestamp || 0) - Number(b.createdTimestamp || 0));
  for (const message of messages) {
    if (!message?.id || seenDiscordIds.has(message.id)) { skipped += 1; continue; }
    const fromBot = client.user?.id && message.author?.id === client.user.id;
    await saveDmHistory(storage, id, {
      source: fromBot ? 'discord-bot' : 'discord-dm',
      direction: fromBot ? 'outbound' : 'inbound',
      text: message.content || '',
      deliveredToDiscord: true,
      discordChannelId: message.channelId || dm.id || '',
      discordMessageId: message.id || '',
      meta: { type: 'synced_discord_dm_history' },
      authorId: message.author?.id || '',
      authorName: userLabel(message.author),
      authorAvatar: userAvatar(message.author, 128),
      createdAt: message.createdAt?.toISOString?.() || new Date(message.createdTimestamp || Date.now()).toISOString()
    });
    seenDiscordIds.add(message.id);
    synced += 1;
  }
  return { synced, skipped };
}
`;
  src = src.replace('\nfunction installVoidArenaDirectMessageRoutes({ client, storage } = {}) {', helper + '\nfunction installVoidArenaDirectMessageRoutes({ client, storage } = {}) {');
  changed = true;
}

const oldRoute = "const messages = await storage.readChatMessages({ channelId: dmChannelId(id), limit }).catch(() => []);\n          return res.json({ success: true, discordId: id, messages: messages.map(parseDmHistory).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) });";
const newRoute = "const sync = await syncDiscordDmHistory(client, storage, id, limit).catch((error) => ({ synced: 0, skipped: 0, error: error.message }));\n          const messages = await storage.readChatMessages({ channelId: dmChannelId(id), limit }).catch(() => []);\n          return res.json({ success: true, discordId: id, sync, messages: messages.map(parseDmHistory).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) });";
if (src.includes(oldRoute)) {
  src = src.replace(oldRoute, newRoute);
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: histórico de DM sincroniza mensagens reais do Discord.' : 'Patch ignorado: sync de histórico de DM já ativo.');
