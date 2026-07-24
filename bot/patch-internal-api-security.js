const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) process.exit(0);

let src = fs.readFileSync(file, 'utf8');
let changed = false;

function replaceOnce(from, to) {
  if (!src.includes(from)) return false;
  src = src.replace(from, to);
  changed = true;
  return true;
}

if (!src.includes("const { markManualSend } = require('./outboundMessageGuard');")) {
  replaceOnce(
    "const { extractDiscordMessageAttachments } = require('./discordClient');",
    "const { extractDiscordMessageAttachments } = require('./discordClient');\nconst { markManualSend } = require('./outboundMessageGuard');"
  );
}

replaceOnce(
  "  if (!INTERNAL_TOKEN) return next();",
  "  if (!INTERNAL_TOKEN) {\n    return res.status(503).json({\n      success: false,\n      code: 'INTERNAL_TOKEN_NOT_CONFIGURED',\n      message: 'A API interna do BOT está bloqueada porque BOT_API_KEY/INTERNAL_API_TOKEN não foi configurado.'\n    });\n  }"
);

replaceOnce(
  "async function sendDiscordMessage(client, { discordChannelId, content, allowedMentions } = {}) {",
  "async function sendDiscordMessage(client, { discordChannelId, content, allowedMentions, manual = false } = {}) {"
);

replaceOnce(
  "async function editDiscordMessage(client, { discordChannelId, discordMessageId, content, allowedMentions } = {}) {",
  "async function editDiscordMessage(client, { discordChannelId, discordMessageId, content, allowedMentions, manual = false } = {}) {"
);

replaceOnce(
  "  const sent = await channel.send({\n    content: String(content || '').slice(0, 2000),\n    allowedMentions: allowedMentions || { parse: ['users', 'roles'] }\n  });",
  "  const payload = {\n    content: String(content || '').slice(0, 2000),\n    allowedMentions: allowedMentions || { parse: ['users', 'roles'] }\n  };\n  const sent = await channel.send(manual === true ? markManualSend(payload) : payload);"
);

replaceOnce(
  "  await message.edit({\n    content: String(content || '').slice(0, 2000),\n    allowedMentions: allowedMentions || { parse: ['users', 'roles'] }\n  });",
  "  const payload = {\n    content: String(content || '').slice(0, 2000),\n    allowedMentions: allowedMentions || { parse: ['users', 'roles'] }\n  };\n  await message.edit(manual === true ? markManualSend(payload) : payload);"
);

if (!src.includes("app.get('/public/status'")) {
  const anchor = "  app.get('/public/maintenance', (_req, res) => {";
  const block = `  app.get('/public/status', async (_req, res) => {\n    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');\n    const database = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));\n    const backupConfig = githubBackups.getConfig();\n    return res.json({\n      success: true,\n      service: 'Void Arena Bot',\n      online: Boolean(client?.user),\n      guilds: client?.guilds?.cache?.size || 0,\n      database: {\n        users: Number(database?.users || 0),\n        teams: Number(database?.teams || 0),\n        events: Number(database?.events || 0),\n        messages: Number(database?.messages || 0),\n        persistent: Boolean(database?.persistent),\n        error: database?.error || null\n      },\n      backup: {\n        configured: Boolean(backupConfig.token && backupConfig.repo),\n        repositoryConfigured: Boolean(backupConfig.repo),\n        scheduled: String(process.env.GITHUB_BACKUP_SCHEDULED || 'true').toLowerCase() !== 'false',\n        mutation: String(process.env.GITHUB_BACKUP_ON_MUTATION || 'true').toLowerCase() !== 'false'\n      },\n      internalApi: {\n        protected: Boolean(INTERNAL_TOKEN)\n      },\n      build: '2026-07-24-data-safety-v2'\n    });\n  });\n\n`;
  if (src.includes(anchor)) {
    src = src.replace(anchor, block + anchor);
    changed = true;
  }
}

if (changed) fs.writeFileSync(file, src, 'utf8');

const finalSource = fs.readFileSync(file, 'utf8');
new Function(finalSource);
for (const marker of [
  "code: 'INTERNAL_TOKEN_NOT_CONFIGURED'",
  'manual = false',
  'manual === true ? markManualSend(payload) : payload'
]) {
  if (!finalSource.includes(marker)) throw new Error(`Proteção da API interna incompleta: ${marker}`);
}

console.log(changed
  ? '[Security/Data] API interna fechada; canais protegidos só aceitam envio com marcação manual explícita.'
  : '[Security/Data] Proteções da API interna e modo manual explícito já estavam aplicados.');