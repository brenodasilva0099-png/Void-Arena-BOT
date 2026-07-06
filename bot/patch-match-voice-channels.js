const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
let src = fs.readFileSync(file, 'utf8');

function insertBefore(source, needle, insert) {
  if (!source.includes(needle)) return source;
  return source.replace(needle, insert + needle);
}

if (!src.includes('ChannelType,')) {
  src = src.replace('  Events,\n  PermissionFlagsBits,', '  Events,\n  ChannelType,\n  PermissionFlagsBits,');
}

if (!src.includes('teamADiscordIds: teamDiscordIds(teamA, users)')) {
  src = src.replace(
    "captainDiscordIds: unique([...teamDiscordIds(teamA, users), ...teamDiscordIds(teamB, users)])",
    "teamADiscordIds: teamDiscordIds(teamA, users),\n        teamBDiscordIds: teamDiscordIds(teamB, users),\n        captainDiscordIds: unique([...teamDiscordIds(teamA, users), ...teamDiscordIds(teamB, users)])"
  );
}

if (!src.includes('function matchVoiceViewOnlyRoleIds')) {
  const helpers = `
function envList(name, fallback = '') {
  return String(process.env[name] || fallback).split(',').map((item) => item.trim()).filter(Boolean);
}

function matchVoiceViewOnlyRoleIds() {
  return envList('MATCH_VOICE_VIEW_ROLE_IDS', '1297729406432710656,1493641717059031182');
}

function matchVoiceConnectRoleIds() {
  return envList('MATCH_VOICE_CONNECT_ROLE_IDS', '1523438475716853851');
}

function safeChannelName(value = '') {
  return String(value || '')
    .split('\r').join(' ')
    .split('\n').join(' ')
    .split('\t').join(' ')
    .split('@').join('')
    .split('#').join('')
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

function voicePermissionOverwrites(guild, allowedIds = []) {
  const uniqueIds = Array.from(new Set(allowedIds || [])).map(String).filter(Boolean).slice(0, 7);
  return [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
    ...matchVoiceViewOnlyRoleIds().map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.SendMessages]
    })),
    ...matchVoiceConnectRoleIds().map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.UseVAD, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]
    })),
    ...uniqueIds.map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.UseVAD, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages]
    }))
  ];
}

async function applyTeamVoicePermissions(channel, guild, allowedIds = []) {
  if (!channel?.permissionOverwrites?.set || !guild?.id) return channel;
  await channel.permissionOverwrites.set(voicePermissionOverwrites(guild, allowedIds), 'Void Arena: permissões das calls privadas dos times').catch(() => null);
  if (channel.userLimit !== 7 && channel.edit) await channel.edit({ userLimit: 7 }).catch(() => null);
  return channel;
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
    await applyTeamVoicePermissions(existing, guild, allowedIds);
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: categoryId,
    userLimit: 7,
    permissionOverwrites: voicePermissionOverwrites(guild, allowedIds),
    reason: 'Void Arena: call privada automática do time'
  });
}

function teamsForVoiceFromBracket(bracket = {}, teams = [], settings = {}) {
  const byId = new Map(teams.map((team) => { const safe = safeTeam(team); return [safe.id, safe]; }));
  const entries = [];

  for (const key of ['slots', 'round16', 'quarters', 'semis', 'finals']) {
    const arr = Array.isArray(bracket[key]) ? bracket[key] : [];
    arr.forEach((item, index) => {
      const id = teamIdOf(item);
      if (id) entries.push({ id, label: key + '-' + (index + 1) });
    });
  }

  const groups = Array.isArray(bracket.groups) ? bracket.groups : [];
  groups.forEach((group, groupIndex) => {
    const items = group.teams || group.teamIds || [];
    items.forEach((item, index) => {
      const id = teamIdOf(item);
      if (id) entries.push({ id, label: (group.name || ('Grupo ' + (groupIndex + 1))) + '-' + (index + 1) });
    });
  });

  const counts = new Map();
  const selected = [];
  for (const entry of entries) {
    const base = byId.get(entry.id);
    if (!base) continue;
    const seen = (counts.get(entry.id) || 0) + 1;
    counts.set(entry.id, seen);
    if (seen === 1) selected.push(base);
    else selected.push({ ...base, id: base.id + ':' + seen, originalTeamId: base.id, name: readableTeamName(base, 'time') + ' ' + String(seen).padStart(2, '0') });
  }

  if (selected.length) return selected;
  const limit = Math.max(1, Math.min(32, Number(settings.teamLimit || settings.limit || settings.maxTeams || teams.length || 32) || 32));
  return teams.map(safeTeam).filter((team) => team.id).slice(0, limit);
}

async function ensureAllTeamVoiceChannels(client, bracket = {}, teams = [], users = [], payload = {}, settings = {}) {
  const voiceTeams = teamsForVoiceFromBracket(bracket, teams, settings);
  const created = [];
  for (const team of voiceTeams) {
    const ids = teamDiscordIds(team, users);
    const channel = await findOrCreateTeamVoice(client, team, ids, payload, settings).catch((error) => {
      console.error('Erro ao criar call do time', team?.name || team?.tag || team?.id, error.message);
      return null;
    });
    if (channel?.id) created.push({ id: channel.id, name: channel.name, team: readableTeamName(team, 'time') });
  }
  return created;
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
  src = insertBefore(src, '\nfunction hubKey(match = {}) {', helpers);
}

if (!src.includes('const allTeamVoiceChannels = await ensureAllTeamVoiceChannels(client, bracket, teams, users, payload, settings)')) {
  src = src.replace(
    "  const matches = matchesFromBracket({ bracket, teams, settings, users });\n  const hubs = [];",
    "  const matches = matchesFromBracket({ bracket, teams, settings, users });\n  const allTeamVoiceChannels = await ensureAllTeamVoiceChannels(client, bracket, teams, users, payload, settings).catch((error) => { console.error('Erro ao garantir calls de todos os times:', error.message); return []; });\n  const hubs = [];"
  );
}

if (!src.includes('const voices = await ensureTeamVoiceChannels(client, match, payload, settings)')) {
  src = src.replace(
    "for (const match of matches) {\n    try { hubs.push(await sendOrUpdateHub(client, match, payload)); }",
    "for (const match of matches) {\n    try {\n      const voices = await ensureTeamVoiceChannels(client, match, payload, settings).catch(() => []);\n      if (voices?.length) match.teamVoiceChannels = voices;\n      hubs.push(await sendOrUpdateHub(client, match, payload));\n    }"
  );
}

if (!src.includes('totalTeamVoiceChannels: allTeamVoiceChannels.length')) {
  src = src.replace(
    "return { success: true, resultsChannelId: resultsChannelId(payload), totalMatches: matches.length, created: hubs.filter((hub) => hub.created).length, reused: hubs.filter((hub) => hub.reused).length, hubs, errors };",
    "return { success: true, resultsChannelId: resultsChannelId(payload), totalMatches: matches.length, totalTeamVoiceChannels: allTeamVoiceChannels.length, created: hubs.filter((hub) => hub.created).length, reused: hubs.filter((hub) => hub.reused).length, hubs, teamVoiceChannels: allTeamVoiceChannels, errors };"
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: calls privadas garantidas para todos os times e permissões de cargos.');
