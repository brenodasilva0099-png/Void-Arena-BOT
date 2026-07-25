const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
if (!fs.existsSync(file)) process.exit(0);
const src = fs.readFileSync(file, 'utf8');

if (!src.includes('function teamsForVoiceFromBracket')) {
  console.error('Patch groups/calls: função base de calls não encontrada; patch principal precisa rodar antes.');
  process.exit(0);
}

// A leitura de grupos fica no patch principal. A deduplicação final por ID de time
// é aplicada logo depois por patch-dedupe-match-voice-channels.js.
console.log('Patch aplicado: calls leem grupos e serão deduplicadas por ID de time.');