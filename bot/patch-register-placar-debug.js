const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'discordClient.js');
let src = fs.readFileSync(file, 'utf8');

if (!src.includes("require('./placarDebugCommand')")) {
  src = src.replace(
    "const { registerPlacarSystem } = require('./placarSystem');",
    "const { registerPlacarSystem } = require('./placarSystem');\nconst { registerPlacarDebugCommand } = require('./placarDebugCommand');"
  );
}

if (!src.includes('registerPlacarDebugCommand(client);')) {
  src = src.replace(
    '  registerPlacarSystem(client);',
    '  registerPlacarSystem(client);\n  registerPlacarDebugCommand(client);'
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: comando !placar-preview registrado.');
