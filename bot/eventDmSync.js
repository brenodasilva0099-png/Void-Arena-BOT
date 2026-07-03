const dmRefs = new Map();
const lastSeenEventUpdate = new Map();
let primed = false;

function clean(value = '') {
  return String(value || '').trim();
}

function eventTitle(event = {}) {
  return event.title || event.name || 'Evento Void Arena';
}

function eventUrl() {
  return String(process.env.SITE_PUBLIC_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '') + '/pages/eventos.html';
}

function messageContent(event = {}) {
  const title = eventTitle(event);
  const format = event.matchFormat || 'MD1';
  const limit = Number(event.teamLimit || 0) || '?';
  const count = Array.isArray(event.registrations) ? event.registrations.length : 0;
  const start = event.startAt || 'a definir';
  const summary = event.description || 'Evento atualizado pela organização.';

  return [
    '🏆 **Atualização de evento na Void Arena**',
    '',
    `**${title}** foi atualizado pela organização.`,
    `Formato: ${format} • Vagas: ${count}/${limit}`,
    `Início: ${start}`,
    `Resumo: ${summary}`,
    '',
    `Acesse: ${eventUrl()}`,
    'Confira a página de Eventos para ver as informações atuais.'
  ].join('\n');
}

function extractDiscordId(value = '') {
  const raw = clean(value);
  if (!raw) return '';
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function buildCaptainTargets(event = {}, teams = [], users = []) {
  const usersById = new Map(users.map((user) => [String(user.id), user]));
  const teamById = new Map(teams.map((team) => [String(team.id), team]));
  const registeredIds = new Set((Array.isArray(event.registrations) ? event.registrations : []).map((item) => String(item.teamId || '')).filter(Boolean));
  const sourceTeams = registeredIds.size ? Array.from(registeredIds).map((id) => teamById.get(id)).filter(Boolean) : teams;
  const targets = new Map();

  sourceTeams.forEach((team) => {
    const owner = usersById.get(String(team.ownerUserId || ''));
    const ownerDiscordId = clean(owner?.discordId || '');
    if (ownerDiscordId) {
      targets.set(ownerDiscordId, {
        discordId: ownerDiscordId,
        userId: owner?.id || '',
        teamId: team.id || '',
        name: owner?.profile?.username || owner?.name || team.name || 'Capitão'
      });
    }

    const accounts = [
      ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
      ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [])
    ];
    accounts.forEach((item) => {
      const id = extractDiscordId(item);
      if (id && !targets.has(id)) {
        targets.set(id, { discordId: id, userId: '', teamId: team.id || '', name: team.name || 'Capitão' });
      }
    });
  });

  return Array.from(targets.values()).slice(0, 80);
}

async function sendOrEditDm(client, event, target) {
  const key = `${event.id}:${target.discordId}`;
  const content = messageContent(event);
  const existing = dmRefs.get(key);
  const user = await client.users.fetch(target.discordId).catch(() => null);
  if (!user) return { target, sent: false, edited: false, error: 'user_not_found' };

  if (existing?.channelId && existing?.messageId) {
    try {
      const dm = await user.createDM();
      const message = await dm.messages.fetch(existing.messageId).catch(() => null);
      if (message?.editable) {
        await message.edit({ content, allowedMentions: { parse: [] } });
        dmRefs.set(key, { ...existing, updatedAt: new Date().toISOString() });
        return { target, sent: false, edited: true };
      }
    } catch {}
  }

  const sent = await user.send({ content, allowedMentions: { parse: [] } });
  dmRefs.set(key, {
    discordId: target.discordId,
    teamId: target.teamId || '',
    userId: target.userId || '',
    channelId: sent.channelId,
    messageId: sent.id,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return { target, sent: true, edited: false };
}

async function syncOnce(client, storage, options = {}) {
  if (!client?.users?.fetch) return { success: true, skipped: true, reason: 'client_not_ready' };

  const [events, teams, users] = await Promise.all([
    storage.readEvents(),
    storage.readTeams(),
    storage.readUsers()
  ]);

  if (!primed && options.prime !== false) {
    events.forEach((event) => lastSeenEventUpdate.set(String(event.id), String(event.updatedAt || event.createdAt || '')));
    primed = true;
    return { success: true, primed: true, events: events.length };
  }

  const changed = events.filter((event) => {
    const id = String(event.id || '');
    const stamp = String(event.updatedAt || event.createdAt || '');
    const previous = lastSeenEventUpdate.get(id);
    lastSeenEventUpdate.set(id, stamp);
    return id && stamp && previous && previous !== stamp;
  });

  let edited = 0;
  let sent = 0;
  const errors = [];

  for (const event of changed) {
    const targets = buildCaptainTargets(event, teams, users);
    for (const target of targets) {
      try {
        const result = await sendOrEditDm(client, event, target);
        if (result.edited) edited += 1;
        if (result.sent) sent += 1;
        if (result.error) errors.push(result);
      } catch (error) {
        errors.push({ discordId: target.discordId, message: error.message });
      }
    }
  }

  return { success: true, changed: changed.length, edited, sent, errors };
}

function startEventDmSync(client, storage) {
  const enabled = String(process.env.EVENT_DM_SYNC || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Event DM Sync: desativado.');
    return null;
  }

  const seconds = Math.max(15, Number(process.env.EVENT_DM_SYNC_INTERVAL_SECONDS || 30) || 30);
  const run = async (label = 'interval') => {
    try {
      const result = await syncOnce(client, storage);
      if (result.changed || result.sent || result.edited || result.errors?.length) {
        console.log(`Event DM Sync ${label}: ${result.changed || 0} evento(s), ${result.edited || 0} editada(s), ${result.sent || 0} nova(s), ${result.errors?.length || 0} erro(s).`);
      }
    } catch (error) {
      console.error('Event DM Sync falhou:', error.message);
    }
  };

  setTimeout(() => run('prime'), 20 * 1000).unref?.();
  const timer = setInterval(() => run('interval'), seconds * 1000);
  timer.unref?.();
  console.log(`Event DM Sync ativo a cada ${seconds}s.`);
  return timer;
}

module.exports = { startEventDmSync, syncOnce };
