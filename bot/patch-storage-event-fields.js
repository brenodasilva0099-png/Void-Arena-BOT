const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', 'server', 'storage.js');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

if (!source.includes('entryFee: String(raw.entryFee || raw.registrationFee')) {
  source = source.replace(
    "    description: String(raw.description || 'Campeonato principal da comunidade. Inscreva seu time, confira o limite de vagas e envie o comprovante pelo ticket do Discord.').trim().slice(0, 260),\n    logo:",
    "    description: String(raw.description || 'Campeonato principal da comunidade. Inscreva seu time, confira o limite de vagas e envie o comprovante pelo ticket do Discord.').trim().slice(0, 260),\n    reward: String(raw.reward || raw.prize || '').trim().slice(0, 180),\n    prize: String(raw.prize || raw.reward || '').trim().slice(0, 180),\n    entryFee: String(raw.entryFee || raw.registrationFee || '').trim().slice(0, 80),\n    registrationFee: String(raw.registrationFee || raw.entryFee || '').trim().slice(0, 80),\n    isFree: raw.isFree === true || !String(raw.entryFee || raw.registrationFee || '').trim(),\n    paymentInstructions: String(raw.paymentInstructions || '').trim().slice(0, 420),\n    logo:"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, 'utf8');
  console.log('Patch aplicado: campos reward/entryFee/F2P adicionados aos eventos.');
} else {
  console.log('Patch ignorado: campos extras de evento ja existem.');
}
