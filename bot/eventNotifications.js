const storage = require('../server/storage');

function clean(value = '', max = 120) {
  return String(value || '').trim().slice(0, max);
}

function discordIdFromValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function userLabels(user = {}) {
  return [
    user.id,
    user.discordId,
    user.name,
    user.profile?.username,
    user.profile?.displayName
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function resolveDiscordId(value = '', usersByLabel = new Map()) {
  const direct = discordIdFromValue(value);
  if (direct) return direct;
  const user = usersByLabel.get(String(value || '').trim().toLowerCase());
  return user?.discordId || '';
}

function captainDiscordIds(team = {}, users = []) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByLabel = new Map();

  users.forEach((user) => {
    userLabels(user).forEach((label) => usersByLabel.set(label, user));
  });

  const ids = [];
  const owner = usersById.get(String(team.ownerUserId || ''));
  if (owner?.discordId) ids.push(owner.discordId);

  const candidateValues = [
    team.captainDiscordId,
    team.captainId,
    team.captainName,
    team.ownerDiscordId,
    ...(Array.isArray(team.players) ? team.players.slice(0, 1) : []),
    ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players.slice(0, 1) : [])
  ];

  candidateValues.forEach((value) => {
    const id = resolveDiscordId(value, usersByLabel);
    if (id) ids.push(id);
  });

  return Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
}

function eventTitle(event = {}) {
  return clean(event.title || event.name || 'Novo evento Void Arena', 80);
}

function eventLink() {
  const siteUrl = String(process.env.PUBLIC_SITE_URL || process.env.SITE_PUBLIC_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '');
  return `${siteUrl}/pages/eventos.html`;
}

function buildMessage(event = {}, reason = 'published') {
  const title = eventTitle(event);
  const statusText = reason === 'created' ? 'foi criado e está disponível' : 'foi publicado e está disponível';
  const registered = Number(event.registeredCount || event.registrations?.length || 0) || 0;
  const limit = Number(event.teamLimit || 0) || '?';
  const lines = [
    '🏆 **Novo evento na Void Arena**',
    `**${title}** ${statusText} para inscrição.`,
    `Formato: **${clean(event.matchFormat || 'MD1', 16)}** • Vagas: **${registered}/${limit}**`,
    event.startAt ? `Início: **${clean(event.startAt, 40)}**` : '',
    event.description ? `Resumo: ${clean(event.description, 220)}` : '',
    '',
    `Acesse: ${eventLink()}`,
    'Crie ou escolha seu time e envie a inscrição pela página de Eventos.'
  ];

  return lines.filter((line) => line !== '').join('\n').slice(0, 1900);
}

async function sendCaptainDM(client, discordId, content) {
  if (!client?.users?.fetch) {
    return { discordId, sent: false, error: 'Bot Discord ainda não está pronto para enviar DM.' };
  }

  try {
    const user = await client.users.fetch(discordId);
    await user.send({ content, allowedMentions: { parse: [] } });
    return { discordId, sent: true };
  } catch (error) {
    return { discordId, sent: false, error: error.message };
  }
}

async function notifyEventCaptains(client, payload = {}) {
  const event = payload.event || {};
  const reason = clean(payload.reason || 'published', 40);
  const [teams, users] = await Promise.all([
    storage.readTeams().catch(() => []),
    storage.readUsers().catch(() => [])
  ]);

  const recipientIds = Array.from(new Set(
    teams.flatMap((team) => captainDiscordIds(team, users))
  ));

  if (!recipientIds.length) {
    return {
      success: true,
      skipped: true,
      reason: 'no_captain_discord_ids',
      message: 'Nenhum capitão com Discord vinculado foi encontrado.',
      attempted: 0,
      sent: 0,
      failed: 0
    };
  }

  const content = buildMessage(event, reason);
  const results = [];
  for (const discordId of recipientIds) {
    results.push(await sendCaptainDM(client, discordId, content));
  }

  const sent = results.filter((item) => item.sent).length;
  const failed = results.length - sent;

  return {
    success: sent > 0,
    attempted: results.length,
    sent,
    failed,
    event: {
      id: event.id || '',
      title: eventTitle(event),
      status: event.status || '',
      teamLimit: event.teamLimit || null,
      matchFormat: event.matchFormat || ''
    },
    results
  };
}

module.exports = { notifyEventCaptains, captainDiscordIds, buildMessage };
