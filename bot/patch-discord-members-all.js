const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('async function listDiscordAllMembers')) {
  const helper = String.raw`
async function listDiscordAllMembers(client, { limit = 500 } = {}) {
  const max = Math.max(1, Math.min(1000, Number(limit || 500) || 500));
  if (!client?.guilds?.cache?.size) {
    return { success: true, members: [], count: 0, message: 'Bot ainda não está online.' };
  }

  const membersById = new Map();

  for (const partialGuild of client.guilds.cache.values()) {
    let guild = partialGuild;
    try { if (partialGuild?.fetch) guild = await partialGuild.fetch(); } catch {}
    if (!guild?.id) continue;

    let collection = guild.members?.cache;
    try {
      const fetched = await guild.members.fetch();
      if (fetched) collection = fetched;
    } catch (error) {
      console.error('Erro ao buscar membros do servidor:', error.message);
    }

    Array.from(collection?.values?.() || [])
      .filter((member) => member?.user && !member.user.bot)
      .forEach((member) => {
        const previous = membersById.get(member.user.id) || { roles: [] };
        const roles = Array.from(member.roles?.cache?.values?.() || [])
          .filter((role) => role && role.id !== guild.id)
          .sort((a, b) => (b.position || 0) - (a.position || 0))
          .map((role) => ({
            id: role.id,
            name: role.name,
            color: role.hexColor || '',
            guildId: guild.id,
            guildName: guild.name,
            mention: '<@&' + role.id + '>'
          }));
        const roleMap = new Map([...(previous.roles || []), ...roles].map((role) => [role.id, role]));
        membersById.set(member.user.id, {
          id: member.user.id,
          discordId: member.user.id,
          name: member.displayName || member.user.globalName || member.user.username || member.user.id,
          username: member.user.username || '',
          tag: member.user.tag || member.user.username || '',
          avatar: member.user.displayAvatarURL?.({ size: 128 }) || '',
          guildId: guild.id,
          guildName: guild.name,
          roles: Array.from(roleMap.values()).slice(0, 12)
        });
      });
  }

  const members = Array.from(membersById.values())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .slice(0, max);

  return { success: true, members, count: members.length };
}
`;
  src = src.replace('\nfunction startInternalApi({ client, port = 3002 } = {}) {', helper + '\nfunction startInternalApi({ client, port = 3002 } = {}) {');
  changed = true;
}

if (!src.includes("app.get('/internal/discord/members/all'")) {
  const route = String.raw`
  app.get('/internal/discord/members/all', async (req, res) => {
    try {
      return res.json(await listDiscordAllMembers(client, { limit: req.query.limit || 500 }));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, members: [] });
    }
  });

`;
  src = src.replace("  app.get('/internal/discord/member-roles/:discordId', async (req, res) => {", route + "  app.get('/internal/discord/member-roles/:discordId', async (req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: membros do Discord disponiveis para seletores admin.' : 'Patch ignorado: membros do Discord ja disponiveis.');
