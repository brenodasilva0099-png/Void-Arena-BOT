const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'discordClient.js');
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("require('./voidArenaRoleSystem')")) {
  src = src.replace(
    "const { registerLegalCommands } = require('./legalCommands');",
    "const { registerLegalCommands } = require('./legalCommands');\nconst { registerVoidArenaRoleSystem } = require('./voidArenaRoleSystem');"
  );
  changed = true;
}

if (!src.includes('registerVoidArenaRoleSystem(client)')) {
  src = src.replace(
    '  registerLegalCommands(client);',
    '  registerLegalCommands(client);\n  registerVoidArenaRoleSystem(client);'
  );
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: sistema do cargo Void Arena registrado.' : 'Patch ignorado: sistema do cargo Void Arena já estava registrado.');
