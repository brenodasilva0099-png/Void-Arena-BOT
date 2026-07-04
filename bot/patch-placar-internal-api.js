const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
let src = fs.readFileSync(file, 'utf8');

if (!src.includes("require('./placarStorage')")) {
  src = src.replace(
    "const { syncResultHubsForBracket } = require('./matchResults');",
    "const { syncResultHubsForBracket } = require('./matchResults');\nconst placarStorage = require('./placarStorage');"
  );
}

const marker = "// VOID_ARENA_PLACAR_ROUTES";
if (!src.includes(marker)) {
  const routes = `\n\n  ${marker}\n  app.get('/internal/placar', async (_req, res) => {\n    try {\n      return res.json(await placarStorage.getFullScoreboard());\n    } catch (error) {\n      return res.status(500).json({ success: false, message: error.message });\n    }\n  });\n\n  app.get('/internal/placar/:mode', async (req, res) => {\n    try {\n      const data = await placarStorage.getLeaderboard(req.params.mode);\n      return res.json({ success: true, ...data });\n    } catch (error) {\n      return res.status(500).json({ success: false, message: error.message });\n    }\n  });\n`;

  src = src.replace("  app.use(requireInternalToken);", `  app.use(requireInternalToken);${routes}`);
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch placar/internal API aplicado.');
