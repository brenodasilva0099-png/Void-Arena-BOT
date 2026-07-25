const fs = require('node:fs');
const path = require('node:path');

const files = {
  internalApi: path.join(__dirname, 'internalApi.js'),
  playerApplications: path.join(__dirname, 'playerApplications.js'),
  autoMutation: path.join(__dirname, 'autoMutationBackup.js')
};

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }

let internalApi = read(files.internalApi);
if (!internalApi.includes("flushBackupAfterMutation('player-application-site-create')")) {
  const from = `async function createPlayerApplicationFromInternal(client, payload = {}) {
  const application = await storage.savePlayerApplication(payload);
  const log = await notifyPlayerApplicationLog(client, application);
  return { success: true, application, log };
}`;
  const to = `async function createPlayerApplicationFromInternal(client, payload = {}) {
  const application = await storage.savePlayerApplication(payload);
  const log = await notifyPlayerApplicationLog(client, application);
  const backup = typeof storage.flushBackupAfterMutation === 'function'
    ? await storage.flushBackupAfterMutation('player-application-site-create')
    : null;
  if (backup?.success === false) {
    console.error('[Formularios/Backup] Inscrição salva, mas o snapshot imediato falhou:', backup.error || backup.message || 'erro desconhecido');
  }
  return { success: true, application, log, backupProtected: backup?.success !== false, backup };
}`;
  if (!internalApi.includes(from)) throw new Error('Fluxo de criação de formulário via SITE não encontrado.');
  internalApi = internalApi.replace(from, to);
  write(files.internalApi, internalApi);
}

let playerApplications = read(files.playerApplications);
if (!playerApplications.includes("flushBackupAfterMutation('player-application-discord-create')")) {
  const from = `  const saved = await storage.savePlayerApplication(finalData);
  await notifyApplicationLog(interaction.client, saved);
  sessions.delete(key);`;
  const to = `  const saved = await storage.savePlayerApplication(finalData);
  await notifyApplicationLog(interaction.client, saved);
  const backup = typeof storage.flushBackupAfterMutation === 'function'
    ? await storage.flushBackupAfterMutation('player-application-discord-create')
    : null;
  if (backup?.success === false) {
    console.error('[Formularios/Backup] Inscrição Discord salva, mas o snapshot imediato falhou:', backup.error || backup.message || 'erro desconhecido');
  }
  sessions.delete(key);`;
  if (!playerApplications.includes(from)) throw new Error('Fluxo de criação de formulário pelo Discord não encontrado.');
  playerApplications = playerApplications.replace(from, to);
  write(files.playerApplications, playerApplications);
}

let autoMutation = read(files.autoMutation);
if (!autoMutation.includes("  'recoverPlayerApplication',")) {
  const anchor = "  'savePlayerApplication',\n";
  if (!autoMutation.includes(anchor)) throw new Error('Lista de mutações de formulário não encontrada.');
  autoMutation = autoMutation.replace(anchor, "  'recoverPlayerApplication',\n" + anchor);
  write(files.autoMutation, autoMutation);
}

for (const file of Object.values(files)) new Function(read(file));
for (const marker of [
  "flushBackupAfterMutation('player-application-site-create')",
  "flushBackupAfterMutation('player-application-discord-create')",
  "'recoverPlayerApplication'"
]) {
  const found = Object.values(files).some((file) => read(file).includes(marker));
  if (!found) throw new Error(`Proteção de backup de formulário incompleta: ${marker}`);
}

console.log('[Formularios/Backup] Novas inscrições e recuperações aguardam snapshot imediato no GitHub.');