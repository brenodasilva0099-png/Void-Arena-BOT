const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('function manualMatchVoiceCategoryId')) {
  const helper = [
    '',
    'function manualMatchVoiceCategoryId(payload = {}) {',
    '  return String(payload.categoryId || payload.discordMatchCategoryId || process.env.MATCH_VOICE_CATEGORY_ID || process.env.DISCORD_MATCH_CATEGORY_ID || process.env.MATCH_CATEGORY_ID || "1523133579570184194").trim();',
    '}',
    'function manualVoiceSafeName(value = "") {',
    '  return String(value || "time").split("\\r").join(" ").split("\\n").join(" ").split("\\t").join(" ").split("@").join("").split("#").join("").replace(/\\s+/g, " ").trim().slice(0, 80) || "time";',
    '}',
    'function manualVoiceRoleList(name, fallback = "") {',
    '  return String(process.env[name] || fallback).split(",").map((item) => item.trim()).filter(Boolean);',
    '}',
    'function manualVoiceOverwrites(guild, playerIds = []) {',
    '  const viewOnly = manualVoiceRoleList("MATCH_VOICE_VIEW_ROLE_IDS", "1297729406432710656,1493641717059031182");',
    '  const connectRoles = manualVoiceRoleList("MATCH_VOICE_CONNECT_ROLE_IDS", "1523438475716853851");',
    '  const ids = Array.from(new Set(playerIds || [])).map((id) => String(id || "").trim()).filter(Boolean).slice(0, 7);',
    '  return [',
    '    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },',
    '    ...viewOnly.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.SendMessages] })),',
    '    ...connectRoles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.UseVAD, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages] })),',
    '    ...ids.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.UseVAD, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages] }))',
    '  ];',
    '}',
    'async function createManualMatchVoice(client, payload = {}) {',
    '  const categoryId = manualMatchVoiceCategoryId(payload);',
    '  const rawName = manualVoiceSafeName(payload.teamName || payload.name || "Time");',
    '  const name = manualVoiceSafeName(String(rawName).startsWith("👤・") ? rawName : "👤・" + rawName);',
    '  const category = await client?.channels?.fetch?.(categoryId).catch(() => null);',
    '  const guild = category?.guild || resolvePrimaryGuild(client);',
    '  if (!guild?.channels?.create) throw new Error("Servidor/categoria não encontrado para criar call.");',
    '  const existing = Array.from(guild.channels.cache.values()).find((channel) => channel?.type === ChannelType.GuildVoice && channel.parentId === categoryId && channel.name === name);',
    '  const playerIds = Array.isArray(payload.playerIds) ? payload.playerIds : [];',
    '  if (existing) {',
    '    await existing.permissionOverwrites.set(manualVoiceOverwrites(guild, playerIds), "Void Arena: permissões da call manual").catch(() => null);',
    '    if (existing.userLimit !== 7) await existing.edit({ userLimit: 7 }).catch(() => null);',
    '    return { success: true, reused: true, categoryId, channel: { id: existing.id, name: existing.name, parentId: existing.parentId, userLimit: existing.userLimit || 0 } };',
    '  }',
    '  const channel = await guild.channels.create({ name, type: ChannelType.GuildVoice, parent: categoryId, userLimit: 7, permissionOverwrites: manualVoiceOverwrites(guild, playerIds), reason: "Void Arena: call manual criada pelo painel do chaveamento" });',
    '  return { success: true, created: true, categoryId, channel: { id: channel.id, name: channel.name, parentId: channel.parentId, userLimit: channel.userLimit || 0 } };',
    '}',
    ''
  ].join('\n');
  src = src.replace('\nasync function listDiscordMentions(client) {', helper + '\nasync function listDiscordMentions(client) {');
  changed = true;
}

if (!src.includes("app.post('/internal/discord/match-voices/create'")) {
  const route = [
    '',
    "  app.post('/internal/discord/match-voices/create', async (req, res) => {",
    '    try { return res.json(await createManualMatchVoice(client, req.body || {})); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }',
    '  });',
    ''
  ].join('\n');
  src = src.replace("\n  app.get('/internal/discord/channels', async (_req, res) => {", route + "\n  app.get('/internal/discord/channels', async (_req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: criação manual de call privada ativa.' : 'Patch ignorado: criação manual de call já ativa.');
