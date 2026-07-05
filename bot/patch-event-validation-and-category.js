const fs = require('node:fs');
const path = require('node:path');

function patchStorage() {
  const file = path.join(__dirname, '..', 'server', 'storage.js');
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('eventName: String(raw.eventName')) {
    src = src.replace(
      "    teamTag: String(raw.teamTag || '').trim().slice(0, 24),",
      "    teamTag: String(raw.teamTag || '').trim().slice(0, 24),\n    eventName: String(raw.eventName || raw.eventTitle || raw.tournamentName || raw.event?.title || raw.event?.name || raw.eventId || 'Evento').trim().slice(0, 120),"
    );
  }

  fs.writeFileSync(file, src, 'utf8');
}

function patchInternalApi() {
  const file = path.join(__dirname, 'internalApi.js');
  let src = fs.readFileSync(file, 'utf8');

  src = src.replace(
    "`**Evento:** ${request.eventId}`",
    "`**Evento:** ${request.eventName || request.eventTitle || request.eventId}`"
  );

  if (!src.includes('async function createDiscordCategory')) {
    const helper = `\nasync function createDiscordCategory(client, { name, guildId } = {}) {\n  const safeName = String(name || '').trim().slice(0, 80);\n  if (!safeName) throw new Error('Informe o nome da categoria.');\n  if (!client?.guilds?.cache?.size) throw new Error('Bot Discord indisponível.');\n\n  const safeGuildId = String(guildId || '').trim();\n  const guild = safeGuildId\n    ? (client.guilds.cache.get(safeGuildId) || await client.guilds.fetch(safeGuildId).catch(() => null))\n    : resolvePrimaryGuild(client);\n\n  if (!guild?.channels?.create) throw new Error('Servidor não encontrado para criar categoria.');\n\n  const existing = Array.from(guild.channels.cache.values()).find((channel) =>\n    channel?.type === ChannelType.GuildCategory &&\n    String(channel.name || '').toLowerCase() === safeName.toLowerCase()\n  );\n\n  if (existing) {\n    return {\n      success: true,\n      reused: true,\n      category: { id: existing.id, name: existing.name, guildId: guild.id, guildName: guild.name, kind: 'category' },\n      message: 'Categoria já existia no servidor.'\n    };\n  }\n\n  const category = await guild.channels.create({\n    name: safeName,\n    type: ChannelType.GuildCategory,\n    reason: 'Void Arena: categoria criada pelo painel de configurações'\n  });\n\n  return {\n    success: true,\n    reused: false,\n    category: { id: category.id, name: category.name, guildId: guild.id, guildName: guild.name, kind: 'category' },\n    message: 'Categoria criada no Discord.'\n  };\n}\n`;
    src = src.replace('\nasync function sendDiscordMessage', `${helper}\nasync function sendDiscordMessage`);
  }

  const marker = "// VOID_ARENA_CATEGORY_CREATE_ROUTE";
  if (!src.includes(marker)) {
    const route = `\n\n  ${marker}\n  app.post('/internal/discord/categories', async (req, res) => {\n    try {\n      const result = await createDiscordCategory(client, req.body || {});\n      return res.json(result);\n    } catch (error) {\n      return res.status(400).json({ success: false, message: error.message });\n    }\n  });\n`;
    src = src.replace('  app.use(requireInternalToken);', `  app.use(requireInternalToken);${route}`);
  }

  fs.writeFileSync(file, src, 'utf8');
}

patchStorage();
patchInternalApi();
console.log('Patch aplicado: validação usa nome do evento e categoria Discord pode ser criada pelo painel.');
