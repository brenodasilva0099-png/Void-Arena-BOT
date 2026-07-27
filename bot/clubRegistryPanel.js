const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits
} = require('discord.js');
const storage = require('../server/storage');

const CLUB_REGISTRY_CHANNEL_ID = String(
  process.env.CLUB_REGISTRY_CHANNEL_ID || '1531017902138851439'
).trim();
const SITE_URL = 'https://hollownexus.com.br';
const HEADER_FOOTER = 'Hollow Nexus League • Diretório oficial de clubes';
const CLUB_FOOTER = 'Hollow Nexus League • Clube registrado';
const MAX_LOGO_BYTES = 8 * 1024 * 1024;

let lastClubRegistryStatus = {
  status: 'idle',
  channelId: CLUB_REGISTRY_CHANNEL_ID,
  ranAt: null,
  teams: 0,
  created: 0,
  updated: 0,
  deleted: 0,
  failures: 0,
  error: null
};

function setStatus(patch = {}) {
  lastClubRegistryStatus = {
    ...lastClubRegistryStatus,
    ...patch
  };
  return lastClubRegistryStatus;
}

function cleanText(value = '', fallback = 'Não informado', max = 1024) {
  const text = String(value || '').trim();
  return (text || fallback).slice(0, max);
}

function cleanUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https:\/\//i.test(raw)) return raw.slice(0, 1800);
  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) {
    return `${SITE_URL}${raw}`.slice(0, 1800);
  }
  return '';
}

function teamProfileUrl(team = {}) {
  return `${SITE_URL}/pages/perfil-clube.html?id=${encodeURIComponent(String(team.id || ''))}`;
}

function displayUser(user = {}) {
  return cleanText(
    user?.profile?.displayName ||
    user?.profile?.username ||
    user?.name ||
    '',
    '',
    80
  );
}

function looksLikeDiscordId(value = '') {
  return /^\d{16,22}$/.test(String(value || '').trim());
}

function rosterNames(team = {}, users = [], type = 'players') {
  const detailsKey = type === 'reserves' ? 'reserveDetails' : 'playerDetails';
  const accountKey = type === 'reserves' ? 'reserves' : 'players';
  const details = Array.isArray(team[detailsKey]) ? team[detailsKey] : [];
  const storedNames = Array.isArray(team[type]) ? team[type] : [];
  const accounts = Array.isArray(team.playerAccounts?.[accountKey])
    ? team.playerAccounts[accountKey]
    : [];
  const usersByIdentity = new Map();

  for (const user of users) {
    for (const key of [user?.id, user?.discordId]) {
      if (key) usersByIdentity.set(String(key), user);
    }
  }

  const size = Math.max(details.length, storedNames.length, accounts.length);
  const names = [];

  for (let index = 0; index < size; index += 1) {
    const detail = details[index] || {};
    const rawName = typeof detail === 'string'
      ? detail
      : detail.name || detail.playerName || '';
    const identities = [
      typeof detail === 'object' ? detail.id : '',
      typeof detail === 'object' ? detail.userId : '',
      typeof detail === 'object' ? detail.discordId : '',
      accounts[index],
      storedNames[index]
    ].filter(Boolean);
    const linkedUser = identities
      .map((identity) => usersByIdentity.get(String(identity)))
      .find(Boolean);
    const fallbackName = String(storedNames[index] || '').trim();
    const name = cleanText(
      rawName ||
      displayUser(linkedUser) ||
      (!looksLikeDiscordId(fallbackName) ? fallbackName : ''),
      '',
      80
    );

    if (name && !names.some((item) => (
      item.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')
    ))) {
      names.push(name);
    }
  }

  return names;
}

function rosterField(names = [], emptyText = 'Nenhum jogador público vinculado.') {
  if (!names.length) return emptyText;
  return names.map((name, index) => `${index + 1}. ${name}`).join('\n').slice(0, 1024);
}

function socialLinks(socials = {}) {
  const labels = {
    discord: 'Discord',
    instagram: 'Instagram',
    twitter: 'X/Twitter',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitch: 'Twitch',
    steam: 'Steam',
    xbox: 'Xbox',
    website: 'Site'
  };

  return Object.entries(labels)
    .map(([key, label]) => {
      const url = cleanUrl(socials?.[key]);
      return url ? `[${label}](${url})` : '';
    })
    .filter(Boolean)
    .join(' • ')
    .slice(0, 1024);
}

function dataLogoAttachment(value = '', index = 0) {
  const match = String(value || '').match(
    /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i
  );
  if (!match) return null;

  const extension = /^jpe?g$/i.test(match[1]) ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_LOGO_BYTES) return null;

  const name = `clube-${index + 1}.${extension}`;
  return {
    attachment: new AttachmentBuilder(buffer, { name }),
    url: `attachment://${name}`
  };
}

function logoForPayload(team = {}, index = 0) {
  const logo = String(
    team.logo ||
    team.logoUrl ||
    team.logoURL ||
    team.teamLogo ||
    team.badge ||
    team.escudo ||
    ''
  ).trim();
  const attached = dataLogoAttachment(logo, index);
  if (attached) return { thumbnail: attached.url, files: [attached.attachment] };
  const external = cleanUrl(logo);
  return { thumbnail: external, files: [] };
}

function registeredTimestamp(value = '') {
  const timestamp = new Date(value || '').getTime();
  if (!Number.isFinite(timestamp)) return 'Data não informada';
  return `<t:${Math.floor(timestamp / 1000)}:D>`;
}

function buildHeaderPayload(teamCount = 0) {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('🏆 Clubes Registrados')
    .setDescription([
      `Atualmente, a Hollow Nexus League possui **${Number(teamCount || 0)} clube(s) registrado(s)**.`,
      '',
      'Abaixo estão os perfis oficiais, com liderança, elenco e acesso direto às páginas de cada clube.',
      'Os dados são carregados do cadastro atual do site.'
    ].join('\n'))
    .setFooter({ text: HEADER_FOOTER })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Ver todos os clubes')
          .setEmoji('🛡️')
          .setURL(`${SITE_URL}/pages/clubes.html`)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('Registrar meu clube')
          .setEmoji('➕')
          .setURL(`${SITE_URL}/pages/cadastrar-clube.html`)
          .setStyle(ButtonStyle.Link)
      )
    ],
    allowedMentions: { parse: [] }
  };
}

function buildClubPayload(team = {}, users = [], index = 0, total = 0) {
  const players = rosterNames(team, users, 'players');
  const reserves = rosterNames(team, users, 'reserves');
  const logo = logoForPayload(team, index);
  const links = socialLinks(team.socials || {});
  const profileUrl = teamProfileUrl(team);
  const titleParts = [
    `${index + 1}. ${cleanText(team.name, 'Clube', 80)}`,
    team.tag ? `[${cleanText(team.tag, '', 12)}]` : ''
  ].filter(Boolean);
  const description = cleanText(
    team.description,
    'Clube participante da Hollow Nexus League.',
    320
  );
  const embed = new EmbedBuilder()
    .setColor(index % 2 === 0 ? 0x8b5cf6 : 0x22d3ee)
    .setTitle(`🛡️ ${titleParts.join(' ')}`)
    .setURL(profileUrl)
    .setDescription(description)
    .addFields(
      {
        name: '👔 Diretor',
        value: cleanText(team.directorName || team.ownerName, 'Não definido', 180),
        inline: true
      },
      {
        name: '🎖️ Capitão',
        value: cleanText(team.captainName || team.ownerName, 'Não definido', 180),
        inline: true
      },
      {
        name: '🌎 Região',
        value: cleanText(team.region, 'Não informada', 100),
        inline: true
      },
      {
        name: `⚽ Titulares • ${players.length}`,
        value: rosterField(players),
        inline: false
      },
      {
        name: `🪑 Reservas • ${reserves.length}`,
        value: rosterField(reserves, 'Nenhum reserva público vinculado.'),
        inline: false
      },
      {
        name: '📅 Registrado em',
        value: registeredTimestamp(team.createdAt),
        inline: true
      }
    )
    .setFooter({ text: `${CLUB_FOOTER} • ${index + 1}/${total}` });

  if (links) embed.addFields({ name: '🔗 Conexões', value: links, inline: false });
  if (logo.thumbnail) embed.setThumbnail(logo.thumbnail);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Abrir perfil do clube')
          .setEmoji('🌐')
          .setURL(profileUrl)
          .setStyle(ButtonStyle.Link)
      )
    ],
    files: logo.files,
    attachments: [],
    allowedMentions: { parse: [] }
  };
}

function isHeaderMessage(message) {
  return message?.embeds?.some?.(
    (embed) => String(embed.footer?.text || '') === HEADER_FOOTER
  );
}

function isClubMessage(message) {
  return message?.embeds?.some?.(
    (embed) => String(embed.footer?.text || '').startsWith(CLUB_FOOTER)
  );
}

function messageTeamId(message) {
  const url = String(message?.embeds?.[0]?.url || '');
  if (!url) return '';
  try {
    return new URL(url).searchParams.get('id') || '';
  } catch {
    return '';
  }
}

function canManage(member) {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

async function fetchBotRegistryMessages(channel, client) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return Array.from(messages.values()).filter(
    (message) => message.author?.id === client.user?.id
  );
}

async function syncClubRegistryPanel(client, { reason = 'boot' } = {}) {
  const startedAt = new Date().toISOString();
  setStatus({
    status: 'running',
    startedAt,
    ranAt: null,
    reason,
    teams: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    failures: 0,
    error: null
  });
  client.__hollowClubRegistryStatus = { ...lastClubRegistryStatus };

  try {
    const channel = await client?.channels?.fetch?.(CLUB_REGISTRY_CHANNEL_ID).catch(() => null);
    if (!channel?.send || !channel?.messages?.fetch || !channel?.isTextBased?.()) {
      throw new Error(`Canal de clubes inválido ou sem acesso: ${CLUB_REGISTRY_CHANNEL_ID}`);
    }

    const [teamsRaw, users, existingMessages] = await Promise.all([
      storage.readTeams().catch(() => []),
      storage.readUsers().catch(() => []),
      fetchBotRegistryMessages(channel, client)
    ]);
    const teams = (Array.isArray(teamsRaw) ? teamsRaw : [])
      .filter((team) => team?.id && team?.name)
      .sort((a, b) => String(a.name).localeCompare(
        String(b.name),
        'pt-BR',
        { sensitivity: 'base' }
      ));
    const validTeamIds = new Set(teams.map((team) => String(team.id)));
    const headerMessages = existingMessages.filter(isHeaderMessage);
    const existingByTeamId = new Map();
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let failures = 0;

    for (const message of existingMessages.filter(isClubMessage)) {
      const teamId = messageTeamId(message);
      if (teamId && !existingByTeamId.has(teamId)) {
        existingByTeamId.set(teamId, message);
      } else {
        await message.delete()
          .then(() => { deleted += 1; })
          .catch(() => { failures += 1; });
      }
    }

    const headerPayload = buildHeaderPayload(teams.length);
    const header = headerMessages[0];
    if (header?.editable) {
      await header.edit(headerPayload);
      updated += 1;
    } else {
      await channel.send(headerPayload);
      created += 1;
    }
    for (const duplicate of headerMessages.slice(1)) {
      await duplicate.delete()
        .then(() => { deleted += 1; })
        .catch(() => { failures += 1; });
    }

    for (let index = 0; index < teams.length; index += 1) {
      const team = teams[index];
      const payload = buildClubPayload(team, users, index, teams.length);
      const existing = existingByTeamId.get(String(team.id));
      try {
        if (existing?.editable) {
          await existing.edit(payload);
          updated += 1;
        } else {
          await channel.send(payload);
          created += 1;
        }
      } catch (error) {
        failures += 1;
        console.error(
          `[Clubes Registrados] Falha no clube "${team.name}":`,
          error.message
        );
      }
    }

    for (const [teamId, message] of existingByTeamId) {
      if (validTeamIds.has(teamId)) continue;
      await message.delete()
        .then(() => { deleted += 1; })
        .catch(() => { failures += 1; });
    }

    const result = setStatus({
      status: failures ? 'partial' : 'complete',
      startedAt,
      ranAt: new Date().toISOString(),
      reason,
      teams: teams.length,
      created,
      updated,
      deleted,
      failures,
      error: null
    });
    client.__hollowClubRegistryStatus = { ...result };
    console.log(
      `[Clubes Registrados] ${teams.length} clube(s) sincronizado(s) no canal ${CLUB_REGISTRY_CHANNEL_ID}. ` +
      `Criados: ${created} • Atualizados: ${updated} • Removidos: ${deleted} • Falhas: ${failures}.`
    );
    return result;
  } catch (error) {
    const result = setStatus({
      status: 'failed',
      startedAt,
      ranAt: new Date().toISOString(),
      reason,
      failures: Number(lastClubRegistryStatus.failures || 0) + 1,
      error: String(error?.message || error)
    });
    client.__hollowClubRegistryStatus = { ...result };
    console.error('[Clubes Registrados] Falha ao sincronizar o painel:', result.error);
    return result;
  }
}

function registerClubRegistryPanel(client) {
  if (!client || client.__hollowClubRegistryRegistered) return client;
  client.__hollowClubRegistryRegistered = true;
  client.__hollowClubRegistryStatus = { ...lastClubRegistryStatus };

  const scheduleSync = (readyClient) => {
    const timer = setTimeout(() => {
      syncClubRegistryPanel(readyClient, { reason: 'boot' }).catch((error) => {
        console.error('[Clubes Registrados] Falha inesperada:', error.message);
      });
    }, 18_000);
    timer.unref?.();
  };

  if (client.isReady?.()) scheduleSync(client);
  else client.once(Events.ClientReady, scheduleSync);

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    const command = String(message.content || '').trim().toLocaleLowerCase('pt-BR');
    if (!['.clubes-refresh', '.clubes-registrados-refresh'].includes(command)) return;
    if (!canManage(message.member)) {
      await message.reply('❌ Apenas staff/admin pode atualizar os clubes registrados.');
      return;
    }

    const result = await syncClubRegistryPanel(client, { reason: 'manual-command' });
    await message.reply(
      result.status === 'complete'
        ? `✅ Diretório atualizado com **${result.teams} clube(s)** no canal <#${CLUB_REGISTRY_CHANNEL_ID}>.`
        : `⚠️ A atualização terminou com ${result.failures || 1} falha(s): ${result.error || 'verifique os logs do BOT.'}`
    );
  });

  return client;
}

function getClubRegistryStatus() {
  return { ...lastClubRegistryStatus };
}

module.exports = {
  registerClubRegistryPanel,
  syncClubRegistryPanel,
  getClubRegistryStatus,
  buildHeaderPayload,
  buildClubPayload,
  rosterNames,
  dataLogoAttachment,
  CLUB_REGISTRY_CHANNEL_ID
};
