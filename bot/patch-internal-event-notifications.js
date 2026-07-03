const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, 'internalApi.js');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

const importLine = "const { notifyEventCaptains } = require('./eventNotifications');";
if (!source.includes(importLine)) {
  source = source.replace(
    "const { syncResultHubsForBracket } = require('./matchResults');",
    "const { syncResultHubsForBracket } = require('./matchResults');\n" + importLine
  );
  changed = true;
}

const routeBlock = `
  app.post('/internal/events/notify-captains', async (req, res) => {
    try {
      const result = await notifyEventCaptains(client, req.body || {});
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
`;

if (!source.includes("/internal/events/notify-captains")) {
  source = source.replace(
    "  app.post('/internal/event-registration-requests/create', async (req, res) => {",
    routeBlock + "\n  app.post('/internal/event-registration-requests/create', async (req, res) => {"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, 'utf8');
  console.log('Patch aplicado: endpoint /internal/events/notify-captains registrado no BOT.');
} else {
  console.log('Patch ignorado: endpoint /internal/events/notify-captains ja estava registrado.');
}
