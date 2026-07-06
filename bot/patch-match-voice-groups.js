const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
if (!fs.existsSync(file)) process.exit(0);
const src = fs.readFileSync(file, 'utf8');

if (!src.includes('function teamsForVoiceFromBracket')) {
  console.error('Patch groups/calls: função base de calls não encontrada; patch principal precisa rodar antes.');
  process.exit(0);
}

// A lógica de grupos/duplicatas agora fica no patch-match-voice-channels.js.
// Este arquivo foi mantido no boot apenas para compatibilidade com o start command.
console.log('Patch aplicado: calls leem grupos e duplicatas de posições do chaveamento.');
