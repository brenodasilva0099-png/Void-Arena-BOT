const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
let src = fs.readFileSync(file, 'utf8');

if (!src.includes('ChannelType,')) {
  src = src.replace('  Events,\n  PermissionFlagsBits,', '  Events,\n  ChannelType,\n  PermissionFlagsBits,');
}

if (!src.includes('function safeChannelName')) {
  const helpers = `
function safeChannelName(value = '') {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'partida';
}

function configuredMatchCategoryId(payload = {}, settings = {}) {
  return String(
    payload.discordMatchCategoryId ||
    settings.discordMatchCategoryId ||
    process.env.MATCH_VOICE_CATEGORY_ID ||
    process.env.DISCORD_MATCH_CATEGORY_ID ||
    process.env.MATCH_CATEGORY_ID ||
    '1523133579570184194'
  ).trim();
}

async function findOrCreateMatchVoice(client, match = {}, payload = {}, settings = {}) {
  if (!settings.autoCreateMatchChannels && settings.autoCreateMatchChannels !== undefined) return null;
  const categoryId = configuredMatchCategoryId(payload, settings);
  if (!categoryId || !client?.channels?.fetch) return null;

  const category = await client.channels.fetch(categoryId).catch(() => null);
  const guild = category?.guild || client.guilds?.cache?.first?.() || null;
  if (!guild?.channels?.create) return null;

  const a = match.teamA?.tag || match.teamA?.name || 'time-a';
  const b = match.teamB?.tag || match.teamB?.name || 'time-b';
  const name = safeChannelName(`partida-${match.roundKey || 'fase'}-${match.matchNumber || Number(match.matchIndex || 0) + 1}-${a}-vs-${b}`);
  const existing = Array.from(guild.channels.cache.values()).find((channel) => (
    channel?.type === ChannelType.GuildVoice &&
    channel.parentId === categoryId &&
    channel.name === name
  ));
  if (existing) return existing;

  const allowedIds = Array.from(new Set(match.captainDiscordIds || [])).filter(Boolean);
  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
    ...allowedIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream] }))
  ];

  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: categoryId,
    userLimit: allowedIds.length || undefined,
    permissionOverwrites,
    reason: 'Void Arena: call privada automática do confronto'
  });
}
`;
  src = src.replace('\nfunction hubKey(match = {}) {', `${helpers}\nfunction hubKey(match = {}) {`);
}

if (!src.includes('match.voiceChannelId ? `🔊 **Call privada:**')) {
  src = src.replace(
    "`${statusLabel}`\n    ].join('\\n'))",
    "`${statusLabel}`,\n      match.voiceChannelId ? `🔊 **Call privada:** <#${match.voiceChannelId}>` : ''\n    ].filter(Boolean).join('\\n'))"
  );
}

src = src.replace(
  "for (const match of matches) {\n    try { hubs.push(await sendOrUpdateHub(client, match, payload)); }",
  "for (const match of matches) {\n    try {\n      const voice = await findOrCreateMatchVoice(client, match, payload, settings).catch(() => null);\n      if (voice?.id) match.voiceChannelId = voice.id;\n      hubs.push(await sendOrUpdateHub(client, match, payload));\n    }"
);

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: HUBs criam calls privadas dos confrontos quando configurado.');
