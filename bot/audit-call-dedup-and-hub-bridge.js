const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const packageJson = JSON.parse(read('package.json'));
const start = String(packageJson.scripts?.start || '');
const matchResults = read('bot/matchResults.js');
const dedupePatch = read('bot/patch-dedupe-match-voice-channels.js');
const disablePatch = read('bot/patch-disable-hub-site-results.js');

expect(start.includes('patch-dedupe-match-voice-channels.js'), 'start não aplica deduplicação de calls');
expect(start.includes('patch-disable-hub-site-results.js'), 'start não remove a ponte HUB→SITE');
expect(start.indexOf('patch-match-voice-channels.js') < start.indexOf('patch-dedupe-match-voice-channels.js'), 'deduplicação roda antes do patch-base das calls');
expect(start.indexOf('patch-dedupe-match-voice-channels.js') < start.indexOf('patch-disable-hub-site-results.js'), 'ponte HUB é removida antes da deduplicação terminar');

expect(matchResults.includes('const seenIds = new Set();'), 'runtime não deduplica times por ID');
expect(matchResults.includes('async function cleanupGeneratedDuplicateTeamVoices'), 'runtime não remove calls numéricas antigas');
expect(matchResults.includes('scheduleStoredVoiceDedup(client);'), 'limpeza das duplicatas não roda ao iniciar o BOT');
expect(!matchResults.includes("base.id + ':' + seen"), 'runtime ainda fabrica IDs duplicados por posição');
expect(!matchResults.includes("padStart(2, '0')"), 'runtime ainda cria sufixos 02/03 para o mesmo time');

expect(matchResults.includes("HUB_RESULT_SITE_BRIDGE_DISABLED = 'hnl-hub-result-site-bridge-disabled-v1'"), 'runtime não contém marcador da ponte removida');
expect(!matchResults.includes("callSite('/internal/results/submit'"), 'runtime ainda envia resultado ao SITE');
expect(!matchResults.includes("callSite('/internal/results/state'"), 'runtime ainda consulta resultado no SITE');
expect(matchResults.includes('function hubComponents() {\n  return [];'), 'HUB ainda mantém botão de envio');

expect(dedupePatch.includes('registeredNames.has(logicalName.toLowerCase())'), 'limpeza não protege nomes de times realmente cadastrados');
expect(dedupePatch.includes('remoção de call duplicada gerada pelo chaveamento'), 'limpeza não identifica o motivo da exclusão');
expect(disablePatch.includes("callSite('/internal/results/submit'"), 'patch não verifica a remoção do endpoint submit');
expect(disablePatch.includes("callSite('/internal/results/state'"), 'patch não verifica a remoção do endpoint state');

if (failures.length) {
  failures.forEach((failure) => console.error(`[Calls/HUB Audit] ${failure}`));
  throw new Error(`Auditoria de calls/HUB falhou com ${failures.length} pendência(s).`);
}

console.log('[Calls/HUB Audit] Uma call por time, duplicatas antigas saneadas e resultados HUB→SITE desativados.');