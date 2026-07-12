const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('async function listDiscordRoleMembers')) {
  const helper = `
async function listDiscordRoleMembers(client, roleIds = []) {
  const selectedRoleIds = new Set((Array.isArray(roleIds) ? roleIds : [])
    .map((id) => String(id || '').trim())
    .filter((id) => /^\\d{16,22}$/.test(id)));

  if (!selectedRoleIds.size) {
    return { success: true, members: [], roleIds: [], message: 'Selecione pelo menos um cargo.' };
  }

  if (!client?.guilds?.cache?.size) {
    return { success: true, members: [], roleIds: Array.from(selectedRoleIds), message: 'Bot ainda não está online.' };
  }

  const membersById = new Map();
  const rolesById = new Map();

  for (const partialGuild of client.guilds.cache.values()) {
    let guild = partialGuild;
    try { if (partialGuild?.fetch) guild = await partialGuild.fetch(); } catch {}
    if (!guild?.id) continue;

    try {
      const fetchedRoles = await guild.roles.fetch();
      Array.from((fetchedRoles || guild.roles.cache).values())
        .filter((role) => role && selectedRoleIds.has(role.id))
        .forEach((role) => rolesById.set(role.id, {
          id: role.id,
          name: role.name,
          color: role.hexColor || '',
          guildId: guild.id,
          guildName: guild.name,
          mention: '<@&' + role.id + '>'
        }));
    } catch {}

    let collection = guild.members?.cache;
    try {
      const fetchedMembers = await guild.members.fetch();
      if (fetchedMembers) collection = fetchedMembers;
    } catch (error) {
      console.error('Erro ao buscar membros por cargo:', error.message);
    }

    Array.from(collection?.values?.() || [])
      .filter((member) => member?.user && !member.user.bot)
      .forEach((member) => {
        const matchedRoles = Array.from(member.roles?.cache?.values?.() || [])
          .filter((role) => selectedRoleIds.has(role.id))
          .map((role) => ({
            id: role.id,
            name: role.name,
            color: role.hexColor || '',
            guildId: guild.id,
            guildName: guild.name,
            mention: '<@&' + role.id + '>'
          }));

        if (!matchedRoles.length) return;
        const previous = membersById.get(member.user.id) || { roles: [] };
        const roleMap = new Map([...(previous.roles || []), ...matchedRoles].map((role) => [role.id, role]));
        membersById.set(member.user.id, {
          id: member.user.id,
          discordId: member.user.id,
          name: member.displayName || member.user.globalName || member.user.username || member.user.id,
          username: member.user.username || '',
          avatar: member.user.displayAvatarURL?.({ size: 128 }) || '',
          guildId: guild.id,
          guildName: guild.name,
          roles: Array.from(roleMap.values())
        });
      });
  }

  return {
    success: true,
    roleIds: Array.from(selectedRoleIds),
    roles: Array.from(rolesById.values()),
    members: Array.from(membersById.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    count: membersById.size
  };
}
`;
  src = src.replace('\nasync function sendDiscordMessage(client, { discordChannelId, content, allowedMentions } = {}) {', helper + '\nasync function sendDiscordMessage(client, { discordChannelId, content, allowedMentions } = {}) {');
  changed = true;
}

if (!src.includes("app.post('/internal/discord/role-members'")) {
  const route = `
  app.post('/internal/discord/role-members', async (req, res) => {
    try {
      const data = await listDiscordRoleMembers(client, req.body?.roleIds || []);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, members: [] });
    }
  });

`;
  src = src.replace("  app.get('/internal/discord/mentions', async (_req, res) => {", route + "  app.get('/internal/discord/mentions', async (_req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: membros por cargo disponíveis para notificações.' : 'Patch ignorado: membros por cargo já disponíveis.');
