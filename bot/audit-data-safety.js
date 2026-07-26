const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const CANONICAL_SITE_URL = 'https://hollownexus.com.br';
const LEGACY_SITE_URLS = [
  'https://hollow-nexus-league.onrender.com',
  ['https://void-arena', 'site.onrender.com'].join('-')
];

const packageJson = JSON.parse(read('package.json'));
const start = String(packageJson.scripts?.start || '');
const dev = String(packageJson.scripts?.dev || '');
const index = read('bot/index.js');
const storage = read('server/storage.js');
const internalApi = read('bot/internalApi.js');
const playerApplications = read('bot/playerApplications.js');
const eventFieldsPatch = read('bot/patch-storage-event-fields.js');
const eventDmSync = read('bot/eventDmSync.js');
const announcement = read('bot/oneTimeRematchAnnouncement.js');
const outboundGuard = read('bot/outboundMessageGuard.js');
const githubBackups = read('server/githubBackups.js');
const exactRestore = read('bot/restore-latest-exact-if-incomplete.js');
const teamIdentityPatch = read('bot/patch-storage-team-identity.js');
const teamDedupe = read('bot/dedupe-team-records.js');
const linksPatch = read('bot/patch-site-link-and-public-panels.js');
const internalSecurityPatch = read('bot/patch-internal-api-security.js');
const recoveryPatch = read('bot/patch-player-application-recovery.js');
const recoveryScript = read('bot/recover-skzada-application.js');
const backupConfirmationPatch = read('bot/patch-player-application-backup-confirmation.js');

for (const [label, command] of [['start', start], ['dev', dev]]) {
  expect(!command.includes('ensure-nexus-cup-event.js'), `${label} ainda grava/atualiza evento durante deploy`);
  expect(!command.includes('predeploy-backup.js'), `${label} ainda exporta backup implicitamente antes do boot`);
  expect(!command.includes('patch-discord-data-backup.js'), `${label} ainda instala backup/restauração por canal Discord`);
  expect(!command.includes('recover-protected-data-union.js'), `${label} ainda executa a união emergencial em todo boot`);
  expect(command.includes('patch-storage-data-purity.js'), `${label} não aplica fidelidade do banco antes do BOT`);
  expect(command.includes('patch-storage-team-identity.js'), `${label} não protege a identidade canônica dos times`);
  expect(command.includes('patch-internal-api-security.js'), `${label} não fecha a API interna antes do BOT`);
  expect(command.includes('patch-player-application-recovery.js'), `${label} não instala recuperação identificada de formulário`);
  expect(command.includes('patch-player-application-backup-confirmation.js'), `${label} não instala backup imediato de formulários`);
  expect(command.includes('restore-latest-exact-if-incomplete.js'), `${label} não prepara banco ausente antes do BOT`);
  expect(command.includes('dedupe-team-records.js'), `${label} não consolida duplicatas de time existentes`);
  expect(command.includes('recover-skzada-application.js'), `${label} não executa a recuperação autorizada do SKzada`);
  expect(command.indexOf('patch-storage-team-identity.js') < command.indexOf('restore-latest-exact-if-incomplete.js'), `${label} instala a identidade de time tarde demais`);
  expect(command.indexOf('restore-latest-exact-if-incomplete.js') < command.indexOf('dedupe-team-records.js'), `${label} deduplica antes de preparar o banco-base`);
  expect(command.indexOf('dedupe-team-records.js') < command.indexOf('recover-skzada-application.js'), `${label} recupera formulário antes de estabilizar times`);
  expect(command.indexOf('recover-skzada-application.js') < command.indexOf('audit-data-safety.js'), `${label} audita antes de concluir as recuperações autorizadas`);
  expect(command.includes('audit-data-safety.js'), `${label} não executa auditoria final de dados`);
}

for (const forbidden of ['autoRestoreLatestBackup(', 'restoreLatestBackupFromGitHub(', 'restoreBackupFromGitHubPath(', 'runDeployDatabaseGuard(', 'importDatabaseBackup(']) {
  expect(!index.includes(forbidden), `bot/index.js ainda executa operação automática proibida: ${forbidden}`);
}

expect(exactRestore.includes("RESTORE_AUTHORIZATION = '2026-07-24-user-approved-exact-latest-v1'"), 'restauração exata não contém autorização explícita');
expect(exactRestore.includes('activeDatabaseIsIncomplete'), 'restauração exata não valida banco incompleto');
expect(exactRestore.includes('teams || 0) === 0'), 'restauração exata pode substituir banco com times');
expect(exactRestore.includes('before-exact-restore'), 'restauração exata não preserva cópia anterior');
expect(!exactRestore.includes('importDatabaseBackup('), 'restauração exata usa importador normalizado');

expect(teamIdentityPatch.includes('teamsRepresentSameClub'), 'patch de identidade não compara clubes semanticamente');
expect(teamIdentityPatch.includes('leadershipOverlap && (sameName || sameTag)'), 'patch de identidade pode unir times apenas por nome/tag parcial');
expect(teamIdentityPatch.includes('id: current.id || team.id'), 'saveTeam não preserva o ID canônico');
expect(teamIdentityPatch.includes('validStoredTeamImage'), 'saveTeam não rejeita logo inválida');
expect(storage.includes('function teamsRepresentSameClub'), 'storage final não contém proteção contra duplicação');

expect(teamDedupe.includes("AUTHORIZATION = '2026-07-25-user-approved-team-dedup-v1'"), 'deduplicação não contém autorização explícita');
expect(teamDedupe.includes('function sameClub'), 'deduplicação não possui identidade semântica');
expect(teamDedupe.includes('before-team-dedup'), 'deduplicação não preserva cópia do banco');
expect(teamDedupe.includes('remapIds'), 'deduplicação não remapeia IDs antigos');
expect(teamDedupe.includes('chooseLogo'), 'deduplicação não seleciona logo válida mais recente');
expect(teamDedupe.includes('novaRage'), 'deduplicação não registra diagnóstico do Nova Rage');
expect(teamDedupe.includes("reason: 'team-dedup-and-logo-validation-2026-07-25'"), 'deduplicação não salva snapshot pós-correção');
expect(!teamDedupe.includes('recover-protected-data-union'), 'deduplicação ainda depende da união emergencial');

expect(!eventFieldsPatch.includes("require('./patch-discord-data-backup')"), 'patch de evento ainda instala backup oculto pelo Discord');
expect(!storage.includes('Array.isArray(rawEvents) && rawEvents.length ? rawEvents : DEFAULT_TOURNAMENT_EVENTS'), 'leitura ainda injeta evento padrão');
expect(!storage.includes('normalized.unshift(normalizeTournamentEvent(DEFAULT_TOURNAMENT_EVENTS[0]))'), 'leitura ainda força Coliseu');
expect(!storage.includes('religa os times já cadastrados do arquivo legado teams.json'), 'readTeams ainda restaura times durante leitura');
expect(!/async function readTeams\(\)[\s\S]{0,1000}await updateDatabase/.test(storage), 'readTeams ainda escreve no banco');
expect(storage.includes("const rawJson = await fs.readFile(DB_FILE, 'utf8');"), 'backup não exporta arquivo bruto');
expect(storage.includes('O arquivo foi preservado e nenhuma restauração automática foi executada.'), 'banco corrompido ainda pode ser substituído automaticamente');
expect(storage.includes('playerApplications: Array.isArray(db.playerApplications)'), 'resumo ignora formulários');
expect(storage.includes('eventRegistrationRequests: Array.isArray(db.eventRegistrationRequests)'), 'resumo ignora inscrições de evento');

expect(recoveryPatch.includes('async function recoverPlayerApplication(payload = {})'), 'patch de formulário não cria recuperação isolada');
expect(recoveryPatch.includes('alreadyPresent: true'), 'recuperação de formulário não evita duplicata');
expect(recoveryScript.includes("TARGET_NAME = 'skzada'"), 'recuperação de formulário não está limitada ao SKzada');
for (const forbidden of ['saveUser(', 'saveTeam(', 'deleteTeam(', 'saveTournamentEvent(', 'importDatabaseBackup(']) {
  expect(!recoveryScript.includes(forbidden), `recuperação do SKzada tenta alterar outro setor: ${forbidden}`);
}

expect(backupConfirmationPatch.includes("flushBackupAfterMutation('player-application-site-create')"), 'formulário do site não aguarda snapshot');
expect(backupConfirmationPatch.includes("flushBackupAfterMutation('player-application-discord-create')"), 'formulário Discord não aguarda snapshot');
expect(internalApi.includes("code: 'INTERNAL_TOKEN_NOT_CONFIGURED'"), 'API interna permite acesso sem token');
expect(internalApi.includes("app.get('/public/status'"), 'diagnóstico público do BOT ausente');
expect(internalApi.includes('manual = false'), 'API interna não diferencia envio manual');
expect(internalApi.includes('manual === true ? markManualSend(payload) : payload'), 'API interna não exige marcação manual');
expect(!internalApi.includes('channel.send(markManualSend({'), 'API interna marca todo envio como manual');
expect(!internalApi.includes('message.edit(markManualSend({'), 'API interna marca toda edição como manual');
expect(internalSecurityPatch.includes('manual = false'), 'patch de segurança não preserva modo manual');

expect(eventDmSync.includes(CANONICAL_SITE_URL), 'DM de evento não usa o domínio oficial');
for (const legacy of LEGACY_SITE_URLS) {
  expect(!eventDmSync.includes(legacy), `DM de evento ainda contém domínio antigo: ${legacy}`);
}
expect(linksPatch.includes("!name.startsWith('patch-')") && linksPatch.includes("!name.startsWith('audit-')"), 'patch de links pode alterar auditorias');
expect(announcement.includes('Envio automático no boot desativado'), 'aviso Rematch pode voltar no boot');
expect(outboundGuard.includes("'1529298839121428592'") && outboundGuard.includes("'1524621308682436740'"), 'canais protegidos ausentes');
expect(githubBackups.includes("DEFAULT_BACKUP_REPO = 'brenodasilva0099-png/Void-Arena-BACKUPS'"), 'repositório de backup padrão ausente');
expect(githubBackups.includes('const backup = await storage.exportDatabaseBackup();'), 'GitHub backup não usa exportador do banco');

if (failures.length) {
  failures.forEach((failure) => console.error(`[Data Safety Audit] ${failure}`));
  process.exitCode = 1;
  throw new Error(`Auditoria de segurança dos dados falhou com ${failures.length} pendência(s).`);
}

console.log('[Data Safety Audit] Dados protegidos, domínio oficial aplicado nas DMs e links antigos bloqueados.');
