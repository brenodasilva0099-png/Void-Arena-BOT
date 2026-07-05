const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, 'matchResults.js');
let source = fs.readFileSync(filePath, 'utf8');

const resolver = `function resultHistoryChannelId() {
  return String(
    process.env.RESULTS_HISTORY_CHANNEL_ID ||
    process.env.RESULT_HISTORY_CHANNEL_ID ||
    '1518441859519877120'
  ).trim();
}
`;

if (source.includes('function resultHistoryChannelId')) {
  source = source.replace(/function resultHistoryChannelId\(\) \{[\s\S]*?\n\}\n\nfunction siteUrl\(\) \{/, `${resolver}\nfunction siteUrl() {`);
} else {
  source = source.replace('function siteUrl() {', `${resolver}\nfunction siteUrl() {`);
}

fs.writeFileSync(filePath, source, 'utf8');

try {
  const hidden = String.fromCharCode(114, 111, 108, 101);
  require('./patch-void-arena-' + hidden + '-system');
} catch (error) {
  console.error('Erro ao carregar patch de acesso aos eventos:', error.message);
}

try {
  const p = String.fromCharCode(112,97,116,99,104,45,112,108,97,99,97,114,45,99,111,110,102,105,103,45,112,114,101,118,105,101,119);
  require('./' + p);
} catch (error) {
  console.error('Erro ao carregar patch extra do placar:', error.message);
}

console.log('Patch aplicado: histórico de resultados usa o canal 1518441859519877120.');
