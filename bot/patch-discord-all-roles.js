const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('async function listDiscordRoles(client)')) {
  const helper = `
async function listDiscordRoles(client) {
  if (!client) return { success: true, roles: [], message: 'Bot ainda não inicializou.' };
  const roles = [];
  let guilds = Array.from(client.guilds?.cache?.values?.() || []);
  for (const partialGuild of guilds) {
    let guild = partialGuild;
    try { if (partialGuild?.fetch) guild = await partialGuild.fetch(); } catch {}
    if (!guild?.id) continue;
    try {
      const fetchedRoles = await guild.roles.fetch();
      Array.from((fetchedRoles || guild.roles.cache).values())
        .filter((role) => role && role.id !== guild.id)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .forEach((role) => roles.push({
          id: role.id,
          name: role.name,
          guildId: guild.id,
          guildName: guild.name,
          position: role.position || 0,
          color: role.hexColor || '',
          managed: Boolean(role.managed),
          mention: '<@&' + role.id + '>'
        }));
    } catch (error) {
      console.error('Erro ao buscar todos os cargos:', error.message);
    }
  }
  return { success: true, roles, message: roles.length ? '' : 'Nenhum cargo encontrado.' };
}
`;
  src = src.replace('\nasync function listDiscordMentions(client) {', helper + '\nasync function listDiscordMentions(client) {');
  changed = true;
}

src = src.replace(".filter((role) => role && role.id !== guild.id && !role.managed)", ".filter((role) => role && role.id !== guild.id)");
src = src.replace('.slice(0, 100);', '.slice(0, 250);');

if (!src.includes("app.get('/internal/discord/roles'")) {
  const route = `
  app.get('/internal/discord/roles', async (_req, res) => {
    try {
      return res.json(await listDiscordRoles(client));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

`;
  src = src.replace("  app.get('/internal/discord/mentions', async (_req, res) => {", route + "  app.get('/internal/discord/mentions', async (_req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: todos os cargos do servidor expostos para permissões do site.');
