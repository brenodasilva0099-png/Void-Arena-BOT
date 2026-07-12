const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('async function getDiscordMembersRolesBatch')) {
  const helper = `
async function getDiscordMembersRolesBatch(client, discordIds = []) {
  const ids = Array.from(new Set((Array.isArray(discordIds) ? discordIds : [])
    .map((id) => String(id || '').trim())
    .filter((id) => /^\\d{16,22}$/.test(id))))
    .slice(0, 120);

  if (!ids.length || !client?.guilds?.cache?.size) {
    return { success: true, rolesByDiscordId: {}, count: 0 };
  }

  const rolesByDiscordId = {};
  ids.forEach((id) => { rolesByDiscordId[id] = []; });

  for (const guild of client.guilds.cache.values()) {
    let roleColorById = new Map();
    try {
      const fetchedRoles = await guild.roles.fetch();
      roleColorById = new Map(Array.from((fetchedRoles || guild.roles.cache).values()).map((role) => [role.id, role.hexColor || role.color || '']));
    } catch {}

    for (const id of ids) {
      const member = await guild.members.fetch(id).catch(() => null);
      if (!member) continue;

      member.roles.cache
        .filter((role) => role.id !== guild.id)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .forEach((role) => {
          rolesByDiscordId[id].push({
            id: role.id,
            name: role.name,
            color: role.hexColor || roleColorById.get(role.id) || '',
            guildId: guild.id,
            guildName: guild.name
          });
        });
    }
  }

  Object.keys(rolesByDiscordId).forEach((id) => {
    const seen = new Set();
    rolesByDiscordId[id] = rolesByDiscordId[id].filter((role) => {
      if (!role?.id || seen.has(role.id)) return false;
      seen.add(role.id);
      return true;
    }).slice(0, 12);
  });

  return { success: true, rolesByDiscordId, count: ids.length };
}
`;
  src = src.replace('\n\nfunction startInternalApi({ client, port = 3002 } = {}) {', helper + '\nfunction startInternalApi({ client, port = 3002 } = {}) {');
  changed = true;
}

if (!src.includes("app.post('/internal/discord/member-roles/batch'")) {
  const route = `
  app.post('/internal/discord/member-roles/batch', async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.discordIds) ? req.body.discordIds : [];
      const data = await getDiscordMembersRolesBatch(client, ids);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
`;
  src = src.replace("\n  app.get('/internal/discord/member-roles/:discordId', async (req, res) => {", route + "\n  app.get('/internal/discord/member-roles/:discordId', async (req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: cargos Discord em lote disponíveis.' : 'Patch ignorado: cargos Discord em lote já disponíveis.');
