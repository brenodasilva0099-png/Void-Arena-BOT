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
  return [user.id, user.discordId, user.name, user.profile?.username, user.profile?.displayName]
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
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
  users.forEach((user) => userLabels(user).forEach((label) => usersByLabel.set(label, user)));

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

function feeLabel(event = {}) {
  const fee = clean(event.entryFee || event.registrationFee || '', 80);
  return event.isFree === true || !fee ? 'F2P / gratuito' : fee;
}

function buildMessage(event = {}, reason = 'published') {
  const title = eventTitle(event);
  const isEdit = ['edited', 'updated', 'changed'].includes(String(reason || '').toLowerCase());
  const isAnnouncement = ['announcement', 'manual_announcement', 'notice'].includes(String(reason || '').toLowerCase());
  const header = isAnnouncement ? '📣 **Aviso da Void Arena**' : isEdit ? '⚙️ **Evento atualizado na Void Arena**' : '🏆 **Novo evento na Void Arena**';
  const statusText = isAnnouncement
    ? 'recebeu um novo aviso da organização'
    : isEdit
      ? 'teve informações atualizadas'
      : 'foi publicado e está disponível para inscrição';
  const registered = Number(event.registeredCount || event.registrations?.length || 0) || 0;
  const limit = Number(event.teamLimit || 0) || '?';
  const lines = [
    header,
    `**${title}** ${statusText}.`,
    `Formato: **${clean(event.matchFormat || 'MD1', 16)}** • Vagas: **${registered}/${limit}** • Taxa: **${feeLabel(event)}**`,
    event.startAt ? `Início: **${clean(event.startAt, 40)}**` : '',
    event.reward || event.prize ? `Recompensa: **${clean(event.reward || event.prize, 160)}**` : '',
    event.description ? `Resumo: ${clean(event.description, 260)}` : '',
    event.paymentInstructions ? `Validação: ${clean(event.paymentInstructions, 260)}` : '',
    '',
    `Acesse: ${eventLink()}`,
    isEdit ? 'Esta mensagem foi atualizada para não enviar uma nova DM a cada edição.' : 'Crie ou escolha seu time e envie a inscrição pela página de Eventos.'
  ];

  return lines.filter((line) => line !== '').join('\n').slice(0, 1900);
}

function noticesFromEvent(event = {}) {
  const raw = Array.isArray(event.captainNoticeMessages) ? event.captainNoticeMessages : [];
  const map = new Map();
  raw.forEach((item) => {
    const discordId = clean(item.discordId, 40);
    if (!discordId) return;
    map.set(discordId, {
      discordId,
      channelId: clean(item.channelId, 40),
      messageId: clean(item.messageId, 40),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
    });
  });
  return map;
}

async function readStoredEvent(event = {}) {
  const events = await storage.readEvents().catch(() => []);
  return events.find((item) => String(item.id || '') === String(event.id || '')) || event;
}

async function persistNotices(event = {}, noticeMap = new Map()) {
  if (!event?.id || typeof storage.saveTournamentEvent !== 'function') return null;
  const stored = await readStoredEvent(event);
  const notices = Array.from(noticeMap.values());
  return storage.saveTournamentEvent({ ...stored, ...event, captainNoticeMessages: notices, updatedAt: new Date().toISOString() }).catch(() => null);
}

async function sendCaptainDM(client, discordId, content) {
  if (!client?.users?.fetch) return { discordId, sent: false, error: 'Bot Discord ainda não está pronto para enviar DM.' };
  try {
    const user = await client.users.fetch(discordId);
    const message = await user.send({ content, allowedMentions: { parse: [] } });
    return { discordId, sent: true, channelId: message.channelId || message.channel?.id || '', messageId: message.id };
  } catch (error) {
    return { discordId, sent: false, error: error.message };
  }
}

async function editCaptainDM(client, notice = {}, content) {
  if (!client?.channels?.fetch || !notice.channelId || !notice.messageId) {
    return { discordId: notice.discordId, edited: false, error: 'Mensagem anterior não encontrada.' };
  }

  try {
    const channel = await client.channels.fetch(notice.channelId);
    const message = await channel.messages.fetch(notice.messageId);
    await message.edit({ content, allowedMentions: { parse: [] } });
    return { discordId: notice.discordId, edited: true, channelId: notice.channelId, messageId: notice.messageId };
  } catch (error) {
    return { discordId: notice.discordId, edited: false, error: error.message };
  }
}

async function notifyEventCaptains(client, payload = {}) {
  const incomingEvent = payload.event || {};
  const storedEvent = await readStoredEvent(incomingEvent);
  const event = { ...storedEvent, ...incomingEvent };
  const reason = clean(payload.reason || 'published', 40);
  const forceNew = Boolean(payload.forceNew || ['created', 'announcement', 'manual_announcement', 'notice'].includes(String(reason).toLowerCase()));
  const editOnly = !forceNew;
  const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);

  const recipientIds = Array.from(new Set(teams.flatMap((team) => captainDiscordIds(team, users))));
  if (!recipientIds.length) {
    return { success: true, skipped: true, reason: 'no_captain_discord_ids', message: 'Nenhum capitão com Discord vinculado foi encontrado.', attempted: 0, sent: 0, edited: 0, failed: 0 };
  }

  const content = buildMessage(event, reason);
  const noticeMap = noticesFromEvent(storedEvent);
  const results = [];

  for (const discordId of recipientIds) {
    const existing = noticeMap.get(discordId);
    if (editOnly) {
      if (!existing?.messageId) {
        results.push({ discordId, skipped: true, reason: 'no_existing_dm_to_edit' });
        continue;
      }
      const edited = await editCaptainDM(client, existing, content);
      results.push(edited);
      if (edited.edited) noticeMap.set(discordId, { ...existing, updatedAt: new Date().toISOString() });
      continue;
    }

    const sent = await sendCaptainDM(client, discordId, content);
    results.push(sent);
    if (sent.sent) {
      noticeMap.set(discordId, { discordId, channelId: sent.channelId, messageId: sent.messageId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }

  await persistNotices(event, noticeMap);

  const sent = results.filter((item) => item.sent).length;
  const edited = results.filter((item) => item.edited).length;
  const failed = results.filter((item) => item.error).length;
  const skipped = results.filter((item) => item.skipped).length;

  return {
    success: sent > 0 || edited > 0 || skipped > 0,
    mode: forceNew ? 'send_new' : 'edit_existing',
    attempted: results.length,
    sent,
    edited,
    skipped,
    failed,
    event: { id: event.id || '', title: eventTitle(event), status: event.status || '', teamLimit: event.teamLimit || null, matchFormat: event.matchFormat || '' },
    results
  };
}

module.exports = { notifyEventCaptains, captainDiscordIds, buildMessage };
