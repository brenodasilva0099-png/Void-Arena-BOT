const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
let src = fs.readFileSync(file, 'utf8');

if (!src.includes('ChannelType,')) {
  src = src.replace('  Events,\n  PermissionFlagsBits,', '  Events,\n  ChannelType,\n  PermissionFlagsBits,');
}

if (!src.includes('teamADiscordIds: teamDiscordIds(teamA, users)')) {
  src = src.replace(
    "captainDiscordIds: unique([...teamDiscordIds(teamA, users), ...teamDiscordIds(teamB, users)])",
    "teamADiscordIds: teamDiscordIds(teamA, users),\n        teamBDiscordIds: teamDiscordIds(teamB, users),\n        captainDiscordIds: unique([...teamDiscordIds(teamA, users), ...teamDiscordIds(teamB, users)])"
  );
}

if (!src.includes('function safeChannelName')) {
  const helpers = `
function safeChannelName(value = '') {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[@#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'time';
}

function legacyVoiceSlug(value = '') {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'time';
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

function readableTeamName(team = {}, fallback = 'time') {
  return String(team.name || team.displayName || team.tag || fallback).trim() || fallback;
}

function privateTeamVoiceName(team = {}) {
  return safeChannelName('👤・' + readableTeamName(team, 'time'));
}

async function findOrCreateTeamVoice(client, team = {}, allowedIds = [], payload = {}, settings = {}) {
  if (!settings.autoCreateMatchChannels && settings.autoCreateMatchChannels !== undefined) return null;
  const categoryId = configuredMatchCategoryId(payload, settings);
  if (!categoryId || !client?.channels?.fetch) return null;

  const category = await client.channels.fetch(categoryId).catch(() => null);
  const guild = category?.guild || client.guilds?.cache?.first?.() || null;
  if (!guild?.channels?.create) return null;

  const rawName = readableTeamName(team, 'time');
  const name = privateTeamVoiceName(team);
  const legacyName = legacyVoiceSlug(rawName);
  const plainName = safeChannelName(rawName);
  const existing = Array.from(guild.channels.cache.values()).find((channel) => (
    channel?.type === ChannelType.GuildVoice &&
    channel.parentId === categoryId &&
    (channel.name === name || channel.name === plainName || channel.name === legacyName)
  ));
  if (existing) {
    if (existing.name !== name && existing.edit) await existing.edit({ name }).catch(() => null);
    return existing;
  }

  const ids = Array.from(new Set(allowedIds || [])).filter(Boolean).slice(0, 7);
  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
    ...ids.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream] }))
  ];

  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: categoryId,
    userLimit: 7,
    permissionOverwrites,
    reason: 'Void Arena: call privada automática do time'
  });
}

async function ensureTeamVoiceChannels(client, match = {}, payload = {}, settings = {}) {
  const entries = [
    { team: match.teamA, ids: match.teamADiscordIds || [] },
    { team: match.teamB, ids: match.teamBDiscordIds || [] }
  ];
  const created = [];
  for (const entry of entries) {
    if (!entry.team?.id) continue;
    const channel = await findOrCreateTeamVoice(client, entry.team, entry.ids, payload, settings).catch(() => null);
    if (channel?.id) created.push({ id: channel.id, name: channel.name, team: readableTeamName(entry.team, 'time') });
  }
  return created;
}
`;
  src = src.replace('\nfunction hubKey(match = {}) {', `${helpers}\nfunction hubKey(match = {}) {`);
}

if (!src.includes('teamVoiceChannels?.length')) {
  src = src.replace(
    "`${statusLabel}`\n    ].join('\\n'))",
    "`${statusLabel}`,\n      match.teamVoiceChannels?.length ? '🔊 **Calls dos times:** ' + match.teamVoiceChannels.map((item) => item.team + ': <#' + item.id + '>').join(' • ') : ''\n    ].filter(Boolean).join('\\n'))"
  );
}

if (!src.includes('const voices = await ensureTeamVoiceChannels(client, match, payload, settings)')) {
  src = src.replace(
    "for (const match of matches) {\n    try { hubs.push(await sendOrUpdateHub(client, match, payload)); }",
    "for (const match of matches) {\n    try {\n      const voices = await ensureTeamVoiceChannels(client, match, payload, settings).catch(() => []);\n      if (voices?.length) match.teamVoiceChannels = voices;\n      hubs.push(await sendOrUpdateHub(client, match, payload));\n    }"
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: calls privadas dos times usam 👤・ e nome do time.');
