const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const LEGACY_SITE_URL = ['https://void-arena', 'site.onrender.com'].join('-');

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
const exactRestore = read('bot/restore-latest-exact-if-incomplete.js');
const linksPatch = read('bot/patch-site-link-and-public-panels.js');
const internalSecurityPatch = read('bot/patch-internal-api-security.js');

for (const [label, command] of [['start', start], ['dev', dev]]) {
  expect(!command.includes('ensure-nexus-cup-event.js'), `${label} ainda grava/atualiza evento durante deploy`);
  expect(!command.includes('predeploy-backup.js'), `${label} ainda exporta backup implicitamente antes do boot`);
  expect(!command.includes('patch-discord-data-backup.js'), `${label} ainda instala backup/restauração por canal Discord`);
  expect(command.includes('patch-storage-data-purity.js'), `${label} não aplica fidelidade do banco antes do BOT`);
  expect(command.includes('patch-internal-api-security.js'), `${label} não fecha a API interna antes do BOT`);
  expect(command.includes('restore-latest-exact-if-incomplete.js'), `${label} não executa a restauração exata autorizada antes do BOT`);
  expect(command.indexOf('restore-latest-exact-if-incomplete.js') < command.indexOf('audit-data-safety.js'), `${label} audita antes de aplicar a restauração exata`);
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

expect(exactRestore.includes("RESTORE_AUTHORIZATION = '2026-07-24-user-approved-exact-latest-v1'"), 'restauração exata não contém a autorização explícita registrada');
expect(exactRestore.includes('activeDatabaseIsIncomplete'), 'restauração exata não valida se o banco atual está incompleto');
expect(exactRestore.includes('users || 0) <= 1'), 'restauração exata não limita o banco atual a no máximo uma conta temporária');
expect(exactRestore.includes('teams || 0) === 0'), 'restauração exata pode substituir banco que já possui times');
expect(exactRestore.includes('events || 0) <= 1'), 'restauração exata não limita o scaffold de eventos');
expect(exactRestore.includes('before-exact-restore'), 'restauração exata não preserva cópia do estado anterior');
expect(exactRestore.includes('sha256(verifiedRaw) !== sha256(latest.raw)'), 'restauração exata não verifica integridade por hash');
expect(exactRestore.includes('await fs.writeFile(tempFile, latest.raw'), 'restauração exata não grava o JSON bruto do latest');
expect(!exactRestore.includes('importDatabaseBackup('), 'restauração exata ainda passa pelo importador normalizado');
expect(!exactRestore.includes('saveUser(') && !exactRestore.includes('saveTeam('), 'restauração exata tenta fazer merge de usuários ou times');

expect(!eventFieldsPatch.includes("require('./patch-discord-data-backup')"), 'patch de campos de evento ainda instala backup oculto pelo Discord');
expect(!storage.includes('Array.isArray(rawEvents) && rawEvents.length ? rawEvents : DEFAULT_TOURNAMENT_EVENTS'), 'leitura do banco ainda injeta evento padrão');
expect(!storage.includes('normalized.unshift(normalizeTournamentEvent(DEFAULT_TOURNAMENT_EVENTS[0]))'), 'leitura do banco ainda força Coliseu no conjunto de eventos');
expect(!storage.includes('religa os times já cadastrados do arquivo legado teams.json'), 'readTeams ainda importa e grava times legados durante leitura');
expect(!/async function readTeams\(\)[\s\S]{0,1000}await updateDatabase/.test(storage), 'readTeams ainda executa escrita no banco');
expect(storage.includes("const rawJson = await fs.readFile(DB_FILE, 'utf8');"), 'backup não exporta o arquivo bruto do banco');
expect(storage.includes('O arquivo foi preservado e nenhuma restauração automática foi executada.'), 'banco corrompido ainda pode ser substituído automaticamente');

expect(internalApi.includes("code: 'INTERNAL_TOKEN_NOT_CONFIGURED'"), 'API interna ainda permite acesso quando o token está ausente');
expect(internalApi.includes("app.get('/public/status'"), 'diagnóstico público seguro do BOT está ausente');
expect(internalApi.includes('manual = false'), 'API interna não diferencia envio manual de automático');
expect(internalApi.includes('manual === true ? markManualSend(payload) : payload'), 'API interna não exige marcação manual explícita para atravessar o guard');
expect(!internalApi.includes('channel.send(markManualSend({'), 'API interna ainda marca todo envio como manual automaticamente');
expect(!internalApi.includes('message.edit(markManualSend({'), 'API interna ainda marca toda edição como manual automaticamente');
expect(internalSecurityPatch.includes('manual = false'), 'patch de segurança não preserva distinção manual/automático');
expect(internalSecurityPatch.includes('manual === true ? markManualSend(payload) : payload'), 'patch de segurança pode reintroduzir bypass automático');

expect(eventDmSync.includes('https://hollow-nexus-league.onrender.com'), 'DM de evento ainda não usa o domínio atual');
expect(!eventDmSync.includes(LEGACY_SITE_URL), 'DM de evento ainda contém domínio antigo da Void Arena');
expect(linksPatch.includes("!name.startsWith('patch-')") && linksPatch.includes("!name.startsWith('audit-')"), 'patch de links ainda pode autoalterar patches ou auditorias');
expect(announcement.includes('Envio automático no boot desativado'), 'aviso Rematch pode voltar a ser enviado no boot');
expect(outboundGuard.includes("'1529298839121428592'") && outboundGuard.includes("'1524621308682436740'"), 'canais de avisos/regras não estão protegidos');

expect(githubBackups.includes("DEFAULT_BACKUP_REPO = 'brenodasilva0099-png/Void-Arena-BACKUPS'"), 'repositório oficial de backup não está definido como fallback');
expect(githubBackups.includes('const backup = await storage.exportDatabaseBackup();'), 'GitHub backup não usa exclusivamente o exportador do banco');
expect(!githubBackups.includes("readFileSync(path.join(ROOT"), 'GitHub backup aparenta ler arquivos do sistema/código');

if (failures.length) {
  failures.forEach((failure) => console.error(`[Data Safety Audit] ${failure}`));
  process.exitCode = 1;
  throw new Error(`Auditoria de segurança dos dados falhou com ${failures.length} pendência(s).`);
}

console.log('[Data Safety Audit] Backup somente de dados; restauração exata autorizada sem merge; API interna exige ação manual explícita; mensagens automáticas bloqueadas.');