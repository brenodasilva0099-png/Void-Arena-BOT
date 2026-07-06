const fs = require('node:fs');
const path = require('node:path');

try {
  require('./patch-placar-result-form-safe');
} catch (error) {
  console.error('Patch formulário placar falhou:', error.message);
}

try {
  const placarFile = path.join(__dirname, 'placarSystem.js');
  if (fs.existsSync(placarFile)) {
    let placarSrc = fs.readFileSync(placarFile, 'utf8');
    placarSrc = placarSrc.replace("if (action === 'result') return handleResultButton(interaction, value);", "if (action === 'result') return;");
    placarSrc = placarSrc.replace("if (action === 'result') return interaction.showModal(resultModal(value));", "if (action === 'result') return;");
    fs.writeFileSync(placarFile, placarSrc, 'utf8');
  }
} catch (error) {
  console.error('Patch dono do botão de placar falhou:', error.message);
}

const file = path.join(__dirname, 'discordClient.js');
let src = fs.readFileSync(file, 'utf8');

if (!src.includes("require('./placarDebugCommand')")) {
  src = src.replace(
    "const { registerPlacarSystem } = require('./placarSystem');",
    "const { registerPlacarSystem } = require('./placarSystem');\nconst { registerPlacarDebugCommand } = require('./placarDebugCommand');"
  );
}

if (!src.includes("require('./placarAttachmentResult')")) {
  src = src.replace(
    "const { registerPlacarDebugCommand } = require('./placarDebugCommand');",
    "const { registerPlacarDebugCommand } = require('./placarDebugCommand');\nconst { registerPlacarAttachmentResult } = require('./placarAttachmentResult');"
  );
}

if (!src.includes("require('./placarFormPreviewCommand')")) {
  src = src.replace(
    "const { registerPlacarDebugCommand } = require('./placarDebugCommand');",
    "const { registerPlacarDebugCommand } = require('./placarDebugCommand');\nconst { registerPlacarFormPreviewCommand } = require('./placarFormPreviewCommand');"
  );
}

if (!src.includes("require('./rematchRolePanel')")) {
  src = src.replace(
    "const { registerLegalCommands } = require('./legalCommands');",
    "const { registerLegalCommands } = require('./legalCommands');\nconst { registerRematchRolePanel } = require('./rematchRolePanel');"
  );
}

if (!src.includes('registerPlacarAttachmentResult(client);')) {
  src = src.replace(
    '  registerPlacarSystem(client);',
    '  registerPlacarAttachmentResult(client);\n  registerPlacarSystem(client);'
  );
}

if (!src.includes('registerPlacarDebugCommand(client);')) {
  src = src.replace(
    '  registerPlacarSystem(client);',
    '  registerPlacarSystem(client);\n  registerPlacarDebugCommand(client);'
  );
}

if (!src.includes('registerPlacarFormPreviewCommand(client);')) {
  src = src.replace(
    '  registerPlacarDebugCommand(client);',
    '  registerPlacarDebugCommand(client);\n  registerPlacarFormPreviewCommand(client);'
  );
}

if (!src.includes('registerRematchRolePanel(client);')) {
  src = src.replace(
    '  registerLegalCommands(client);',
    '  registerLegalCommands(client);\n  registerRematchRolePanel(client);'
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: comandos preview, formulário placar por anexo e painel de cargos Rematch registrados.');
