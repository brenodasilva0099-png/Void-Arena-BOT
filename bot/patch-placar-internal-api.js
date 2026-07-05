const fs = require('node:fs');
const path = require('node:path');

function patchInternalApi() {
  const file = path.join(__dirname, 'internalApi.js');
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes("require('./placarStorage')")) {
    src = src.replace(
      "const { syncResultHubsForBracket } = require('./matchResults');",
      "const { syncResultHubsForBracket } = require('./matchResults');\nconst placarStorage = require('./placarStorage');"
    );
  }

  const marker = '// VOID_ARENA_PLACAR_ROUTES';
  if (!src.includes(marker)) {
    const routes = `\n\n  ${marker}\n  app.get('/internal/placar', async (_req, res) => {\n    try {\n      return res.json(await placarStorage.getFullScoreboard());\n    } catch (error) {\n      return res.status(500).json({ success: false, message: error.message });\n    }\n  });\n\n  app.get('/internal/placar/:mode', async (req, res) => {\n    try {\n      const data = await placarStorage.getLeaderboard(req.params.mode);\n      return res.json({ success: true, ...data });\n    } catch (error) {\n      return res.status(500).json({ success: false, message: error.message });\n    }\n  });\n`;
    src = src.replace('  app.use(requireInternalToken);', `  app.use(requireInternalToken);${routes}`);
  }

  fs.writeFileSync(file, src, 'utf8');
}

function patchPlacarSystem() {
  const file = path.join(__dirname, 'placarSystem.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');

  // A versão atual do placarSystem.js já separa corretamente:
  // - PLACAR_CHANNEL_ID: somente ranking/patentes
  // - QUEUE_CHANNEL_ID: filas e resultados do Café com Leite
  // O patch antigo fazia replace amplo e podia trocar o ranking para o canal de fila.
  // Mantemos apenas uma correção mínima para instalações antigas.
  if (src.includes('DEFAULT_PLACAR_CHANNEL_ID') && src.includes('pinPanelMessage') && src.includes('ensureRankingPanel')) {
    return;
  }

  if (!src.includes('QUEUE_CHANNEL_ID')) {
    src = src.replace(
      "const PLACAR_CHANNEL_ID = String(process.env.PLACAR_CHANNEL_ID || '1522782784987463801').trim();",
      "const PLACAR_CHANNEL_ID = String(process.env.PLACAR_CHANNEL_ID || '1522782784987463801').trim();\nconst QUEUE_CHANNEL_ID = String(process.env.PLACAR_QUEUE_CHANNEL_ID || process.env.CAFE_COM_LEITE_CHANNEL_ID || '1523063064658972833').trim();"
    );
  }

  src = src.replace(/function matchRows\(match\) \{[\s\S]*?\n\}/, `function matchRows(match) {\n  return [new ActionRowBuilder().addComponents(\n    new ButtonBuilder().setCustomId(\`placar:result:\${match.id}\`).setLabel('Reportar resultado').setEmoji('📝').setStyle(ButtonStyle.Primary)\n  )];\n}`);

  fs.writeFileSync(file, src, 'utf8');
}

patchInternalApi();
patchPlacarSystem();
console.log('Patch placar/internal API aplicado sem alterar canais modernos.');
