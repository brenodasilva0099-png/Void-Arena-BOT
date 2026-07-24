const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const packageJson = JSON.parse(read('package.json'));
const start = String(packageJson.scripts?.start || '');
const dev = String(packageJson.scripts?.dev || '');
const index = read('bot/index.js');
const storage = read('server/storage.js');
const internalApi = read('bot/internalApi.js');
const eventFieldsPatch = read('bot/patch-storage-event-fields.js');
const eventDmSync = read('bot/eventDmSync.js');
const announcement = read('bot/oneTimeRematchAnnouncement.js');
const outboundGuard = read('bot/outboundMessageGuard.js');
const githubBackups = read('server/githubBackups.js');

for (const [label, command] of [['start', start], ['dev', dev]]) {
  expect(!command.includes('ensure-nexus-cup-event.js'), `${label} ainda grava/atualiza evento durante deploy`);
  expect(!command.includes('predeploy-backup.js'), `${label} ainda exporta backup implicitamente antes do boot`);
  expect(!command.includes('patch-discord-data-backup.js'), `${label} ainda instala backup/restauração por canal Discord`);
  expect(command.includes('patch-storage-data-purity.js'), `${label} não aplica fidelidade do banco antes do BOT`);
  expect(command.includes('patch-internal-api-security.js'), `${label} não fecha a API interna antes do BOT`);
  expect(command.includes('audit-data-safety.js'), `${label} não executa auditoria final de dados`);
}

for (const forbidden of [
  'autoRestoreLatestBackup(',
  'restoreLatestBackupFromGitHub(',
  'restoreBackupFromGitHubPath(',
  'runDeployDatabaseGuard(',
  'importDatabaseBackup('
]) {
  expect(!index.includes(forbidden), `bot/index.js ainda executa operação automática proibida: ${forbidden}`);
}

expect(!eventFieldsPatch.includes("require('./patch-discord-data-backup')"), 'patch de campos de evento ainda instala backup oculto pelo Discord');
expect(!storage.includes('Array.isArray(rawEvents) && rawEvents.length ? rawEvents : DEFAULT_TOURNAMENT_EVENTS'), 'leitura do banco ainda injeta evento padrão');
expect(!storage.includes('normalized.unshift(normalizeTournamentEvent(DEFAULT_TOURNAMENT_EVENTS[0]))'), 'leitura do banco ainda força Coliseu no conjunto de eventos');
expect(!storage.includes('religa os times já cadastrados do arquivo legado teams.json'), 'readTeams ainda importa e grava times legados durante leitura');
expect(!/async function readTeams\(\)[\s\S]{0,1000}await updateDatabase/.test(storage), 'readTeams ainda executa escrita no banco');
expect(storage.includes("const rawJson = await fs.readFile(DB_FILE, 'utf8');"), 'backup não exporta o arquivo bruto do banco');
expect(storage.includes('O arquivo foi preservado e nenhuma restauração automática foi executada.'), 'banco corrompido ainda pode ser substituído automaticamente');

expect(internalApi.includes("code: 'INTERNAL_TOKEN_NOT_CONFIGURED'"), 'API interna ainda permite acesso quando o token está ausente');
expect(internalApi.includes("app.get('/public/status'"), 'diagnóstico público seguro do BOT está ausente');
expect(internalApi.includes('markManualSend({'), 'envio manual da central não está explicitamente identificado');

expect(eventDmSync.includes('https://hollow-nexus-league.onrender.com'), 'DM de evento ainda contém domínio antigo');
expect(!eventDmSync.includes('https://void-arena-site.onrender.com'), 'DM de evento ainda contém domínio antigo da Void Arena');
expect(announcement.includes('Envio automático no boot desativado'), 'aviso Rematch pode voltar a ser enviado no boot');
expect(outboundGuard.includes("'1529298839121428592'") && outboundGuard.includes("'1524621308682436740'"), 'canais de avisos/regras não estão protegidos');

expect(githubBackups.includes('const backup = await storage.exportDatabaseBackup();'), 'GitHub backup não usa exclusivamente o exportador do banco');
expect(!githubBackups.includes("readFileSync(path.join(ROOT"), 'GitHub backup aparenta ler arquivos do sistema/código');

if (failures.length) {
  failures.forEach((failure) => console.error(`[Data Safety Audit] ${failure}`));
  process.exitCode = 1;
  throw new Error(`Auditoria de segurança dos dados falhou com ${failures.length} pendência(s).`);
}

console.log('[Data Safety Audit] Deploy somente de código; backup somente de dados; leituras sem escrita; API interna protegida; mensagens automáticas bloqueadas.');
