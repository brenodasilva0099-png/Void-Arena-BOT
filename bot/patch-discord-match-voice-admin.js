const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("require('./runtimeLogs')")) {
  src = src.replace(
    "const { syncResultHubsForBracket } = require('./matchResults');",
    "const { syncResultHubsForBracket } = require('./matchResults');\nconst { getRuntimeLogs } = require('./runtimeLogs');"
  );
  changed = true;
}

if (!src.includes("app.get('/internal/logs'")) {
  const route = [
    '',
    "  app.get('/internal/logs', async (req, res) => {",
    '    const limit = Number(req.query?.limit || 120) || 120;',
    "    return res.json({ success: true, logs: getRuntimeLogs(limit), online: Boolean(client?.user), tag: client?.user?.tag || null, generatedAt: new Date().toISOString() });",
    '  });',
    ''
  ].join('\n');
  src = src.replace("\n  app.get('/internal/health', async (_req, res) => {", route + "\n  app.get('/internal/health', async (_req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: logs do BOT disponíveis em /internal/logs.' : 'Patch ignorado: logs do BOT já estavam ativos.');
