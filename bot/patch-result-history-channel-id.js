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
console.log('Patch aplicado: histórico de resultados usa o canal 1518441859519877120.');
