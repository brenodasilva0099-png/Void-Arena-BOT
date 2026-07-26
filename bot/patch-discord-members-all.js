const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);

let src = fs.readFileSync(file, 'utf8');
let changed = false;

const listMentionsStart = src.indexOf('async function listDiscordMentions(client)');
const listMentionsEnd = listMentionsStart >= 0
  ? src.indexOf('async function sendDiscordMessage', listMentionsStart)
  : -1;

if (listMentionsStart >= 0 && listMentionsEnd > listMentionsStart) {
  const replacement = String.raw`async function listDiscordMentions(client) {
  if (!client) return { success: true, members: [], roles: [], memberCount: 0, roleCount: 0, message: 'Bot ainda não inicializou.' };

  let guilds = [];
  try {
    guilds = Array.from(client.guilds?.cache?.values?.() || []);
    if (!guilds.length && client.guilds?.fetch) {
      const fetchedGuilds = await client.guilds.fetch();
      guilds = Array.from(fetchedGuilds.values());
    }
  } catch {}

  const membersById = new Map();
  const rolesById = new Map();

  for (const partialGuild of guilds) {
    let guild = partialGuild;
    try {
      if (partialGuild?.fetch) guild = await partialGuild.fetch();
      else if (partialGuild?.id && client.guilds?.fetch) guild = await client.guilds.fetch(partialGuild.id);
    } catch {}
    if (!guild?.id) continue;

    try {
      const fetchedRoles = await guild.roles.fetch();
      Array.from((fetchedRoles || guild.roles.cache)?.values?.() || [])
        .filter((role) => role && role.id !== guild.id && !role.managed)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .forEach((role) => rolesById.set(role.id, {
          id: role.id,
          name: role.name,
          guildId: guild.id,
          guildName: guild.name,
          mention: '<@&' + role.id + '>'
        }));
    } catch (error) {
      console.error('Erro ao buscar cargos:', error.message);
    }

    try {
      let collection = guild.members?.cache;
      try {
        const fetchedMembers = await guild.members.fetch();
        if (fetchedMembers) collection = fetchedMembers;
      } catch (error) {
        console.error('Erro ao buscar todos os membros do servidor:', error.message);
      }

      Array.from(collection?.values?.() || [])
        .filter((member) => member?.user)
        .forEach((member) => {
          const previous = membersById.get(member.user.id) || {};
          membersById.set(member.user.id, {
            ...previous,
            id: member.user.id,
            discordId: member.user.id,
            name: member.displayName || member.user.globalName || member.user.username || member.user.id,
            username: member.user.username || '',
            guildId: guild.id,
            guildName: guild.name,
            avatar: member.user.displayAvatarURL?.({ size: 128 }) || '',
            mention: '<@' + member.user.id + '>',
            isBot: Boolean(member.user.bot)
          });
        });
    } catch (error) {
      console.error('Erro ao montar catálogo de membros:', error.message);
    }
  }

  const members = Array.from(membersById.values())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  const roles = Array.from(rolesById.values());

  return {
    success: true,
    members,
    roles,
    memberCount: members.length,
    roleCount: roles.length,
    message: members.length ? '' : 'Nenhum membro encontrado. Verifique o intent GuildMembers e aguarde o BOT concluir a inicialização.'
  };
}

`;
  const current = src.slice(listMentionsStart, listMentionsEnd);
  if (current !== replacement) {
    src = src.slice(0, listMentionsStart) + replacement + src.slice(listMentionsEnd);
    changed = true;
  }
}

if (!src.includes('async function listDiscordAllMembers')) {
  const helper = String.raw`
async function listDiscordAllMembers(client, { limit = 5000 } = {}) {
  const max = Math.max(1, Math.min(5000, Number(limit || 5000) || 5000));
  const catalog = await listDiscordMentions(client);
  const members = (catalog.members || []).slice(0, max);
  return {
    success: catalog.success !== false,
    members,
    count: members.length,
    memberCount: members.length,
    message: catalog.message || ''
  };
}
`;
  src = src.replace('\nfunction startInternalApi({ client, port = 3002 } = {}) {', helper + '\nfunction startInternalApi({ client, port = 3002 } = {}) {');
  changed = true;
}

if (!src.includes("app.get('/internal/discord/members/all'")) {
  const route = String.raw`
  app.get('/internal/discord/members/all', async (req, res) => {
    try {
      return res.json(await listDiscordAllMembers(client, { limit: req.query.limit || 5000 }));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, members: [] });
    }
  });

`;
  src = src.replace("  app.get('/internal/discord/member-roles/:discordId', async (req, res) => {", route + "  app.get('/internal/discord/member-roles/:discordId', async (req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed
  ? 'Patch aplicado: catálogo completo de membros do Discord, incluindo bots.'
  : 'Patch ignorado: catálogo completo de membros já está disponível.');
