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

if (!src.includes("require('./rematchRolePanel')")) {
  src = src.replace(
    "const { registerLegalCommands } = require('./legalCommands');",
    "const { registerLegalCommands } = require('./legalCommands');\nconst { registerRematchRolePanel } = require('./rematchRolePanel');"
  );
}

if (!src.includes('registerPlacarDebugCommand(client);')) {
  src = src.replace(
    '  registerPlacarSystem(client);',
    '  registerPlacarSystem(client);\n  registerPlacarDebugCommand(client);'
  );
}

if (!src.includes('registerRematchRolePanel(client);')) {
  src = src.replace(
    '  registerLegalCommands(client);',
    '  registerLegalCommands(client);\n  registerRematchRolePanel(client);'
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: comandos preview e painel de cargos Rematch registrados.');
