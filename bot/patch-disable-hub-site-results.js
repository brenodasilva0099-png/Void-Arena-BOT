const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
let changed = false;

function replaceBlock(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source && !source.includes(replacement.trim().split('\n')[0])) {
    throw new Error(`[Resultados/HUB] Não foi possível remover ${label}.`);
  }
  if (next !== source) {
    source = next;
    changed = true;
  }
}

replaceBlock(
  /async function fetchResultState\(match\) \{[\s\S]*?\n\}\n\nasync function embedFor/,
  `async function fetchResultState() {
  return null;
}

async function embedFor`,
  'a consulta de resultados no SITE'
);

replaceBlock(
  /function hubComponents\(match\) \{[\s\S]*?\n\}\n\nasync function findExistingHub/,
  `function hubComponents() {
  return [];
}

async function findExistingHub`,
  'o botão de envio da HUB'
);

replaceBlock(
  /async function submitToSite\(interaction, raw, match\) \{[\s\S]*?\n\}(?=\n\n(?:async function runStoredVoiceDedup|function registerMatchResultHandlers))/,
  `async function submitToSite(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);
  }
  const message = 'O envio de resultados pela HUB para o site foi removido. Registre e valide o resultado somente pelo fluxo atual definido pela administração.';
  if (interaction.deferred || interaction.replied) return interaction.editReply(message).catch(() => null);
  return interaction.reply({ content: message, ephemeral: true }).catch(() => null);
}`,
  'o envio de resultados ao SITE'
);

source = source
  .replace('🏁 Série concluída. O site já pode avançar o vencedor.', '🏁 Série concluída no Discord.')
  .replace('Série finalizada, resultado validado e chaveamento atualizado no site.', 'Envio de resultados ao site desativado.')
  .replace("// Void Arena 5.0.3: uma HUB interativa por confronto, série MD1/MD3/MD5 e avanço só ao fechar a série.", "// HUB informativa: integração de resultados com o SITE desativada por decisão administrativa.\nconst HUB_RESULT_SITE_BRIDGE_DISABLED = 'hnl-hub-result-site-bridge-disabled-v1';");

if (source.includes("callSite('/internal/results/submit'")) {
  throw new Error('[Resultados/HUB] A chamada /internal/results/submit ainda está ativa.');
}
if (source.includes("callSite('/internal/results/state'")) {
  throw new Error('[Resultados/HUB] A chamada /internal/results/state ainda está ativa.');
}
if (!source.includes("const HUB_RESULT_SITE_BRIDGE_DISABLED = 'hnl-hub-result-site-bridge-disabled-v1';")) {
  throw new Error('[Resultados/HUB] Marcador de desativação ausente.');
}
if (!source.includes('function hubComponents() {\n  return [];')) {
  throw new Error('[Resultados/HUB] Os componentes antigos da HUB continuam ativos.');
}

if (changed) fs.writeFileSync(file, source, 'utf8');
new Function(fs.readFileSync(file, 'utf8'));
console.log('[Resultados/HUB] Envio e consulta de resultados no SITE desativados; HUB sem botão de submissão.');
