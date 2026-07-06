const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'storage.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('function discordBackupEnabled')) {
  const helpers = `
function discordBackupEnabled() {
  return Boolean(process.env.DISCORD_TOKEN && process.env.DATA_BACKUP_CHANNEL_ID);
}

function discordBackupConfig() {
  return {
    token: process.env.DISCORD_TOKEN || '',
    channelId: process.env.DATA_BACKUP_CHANNEL_ID || '',
    fileName: process.env.DATA_BACKUP_FILE_NAME || 'void-arena-db-backup.json'
  };
}

async function discordApi(pathname, options = {}) {
  const cfg = discordBackupConfig();
  const response = await fetch('https://discord.com/api/v10' + pathname, {
    ...options,
    headers: {
      Authorization: 'Bot ' + cfg.token,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Discord backup API falhou: ' + response.status);
  return data;
}

async function readDiscordDatabaseBackup() {
  if (!discordBackupEnabled()) return null;
  const cfg = discordBackupConfig();
  try {
    const messages = await discordApi('/channels/' + cfg.channelId + '/messages?limit=30');
    const list = Array.isArray(messages) ? messages : [];
    const found = list.find((msg) => Array.isArray(msg.attachments) && msg.attachments.some((att) => att.filename === cfg.fileName));
    const attachment = found?.attachments?.find((att) => att.filename === cfg.fileName);
    if (!attachment?.url) return null;
    const response = await fetch(attachment.url);
    const raw = await response.text();
    return normalizeDatabase(JSON.parse(raw || '{}'));
  } catch (error) {
    console.error('[discord-data] restore:', error.message);
    return null;
  }
}

let lastDiscordBackupAt = 0;
async function writeDiscordDatabaseBackup(db) {
  if (!discordBackupEnabled()) return false;
  const minInterval = Number(process.env.DATA_BACKUP_MIN_INTERVAL_MS || 15000) || 15000;
  if (Date.now() - lastDiscordBackupAt < minInterval) return false;
  lastDiscordBackupAt = Date.now();
  const cfg = discordBackupConfig();
  const normalized = normalizeDatabase(db);
  const payload = Buffer.from(JSON.stringify(normalized, null, 2), 'utf8');
  const boundary = '----VoidArenaBackup' + Date.now();
  const meta = JSON.stringify({ content: '💾 Backup automático do banco Void Arena • ' + new Date().toISOString() });
  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n' + meta + '\r\n'),
    Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="files[0]"; filename="' + cfg.fileName + '"\r\nContent-Type: application/json\r\n\r\n'),
    payload,
    Buffer.from('\r\n--' + boundary + '--\r\n')
  ]);
  await discordApi('/channels/' + cfg.channelId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
    body
  });
  return true;
}
`;
  src = src.replace('\nasync function readJsonIfExists', helpers + '\nasync function readJsonIfExists');
  changed = true;
}

if (!src.includes('const discordDatabase = await readDiscordDatabaseBackup();')) {
  src = src.replace(
    "  try {\n    await fs.access(DB_FILE);\n  } catch {\n    const seedDatabase = await readJsonIfExists(SEED_DB_FILE, null);",
    "  try {\n    await fs.access(DB_FILE);\n  } catch {\n    const discordDatabase = await readDiscordDatabaseBackup();\n    if (discordDatabase) {\n      discordDatabase.meta = { ...(discordDatabase.meta || {}), restoredFrom: 'discord-channel-backup', dataDir: DATA_DIR, updatedAt: new Date().toISOString() };\n      await writeDatabase(discordDatabase, { mirrorLegacy: true, skipDiscordBackup: true });\n      return;\n    }\n    const seedDatabase = await readJsonIfExists(SEED_DB_FILE, null);"
  );
  changed = true;
}

if (!src.includes('writeDiscordDatabaseBackup(normalized)')) {
  src = src.replace(
    "  return normalized;\n}\n\nasync function updateDatabase(updater)",
    "  if (!options.skipDiscordBackup) {\n    await writeDiscordDatabaseBackup(normalized).catch((error) => console.error('[discord-data] backup:', error.message));\n  }\n\n  return normalized;\n}\n\nasync function updateDatabase(updater)"
  );
  changed = true;
}

if (!src.includes('discordChannelBackup: discordBackupEnabled()')) {
  src = src.replace(
    "persistent: Boolean(process.env.DATA_DIR),",
    "persistent: Boolean(process.env.DATA_DIR),\n    discordChannelBackup: discordBackupEnabled(),"
  );
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: backup do banco em canal Discord ativado quando DATA_BACKUP_CHANNEL_ID existir.' : 'Patch ignorado: backup Discord já estava ativo.');
