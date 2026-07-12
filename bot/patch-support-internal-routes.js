const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) {
  console.log('[Suporte] internalApi.js nao encontrado para patch de rotas.');
  process.exit(0);
}

let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("app.get('/internal/support/tickets'")) {
  const routes = `
  app.get('/internal/support/tickets', async (req, res) => {
    try {
      const { readSupportTickets } = require('./supportSystem');
      const tickets = await readSupportTickets({ limit: 500, status: req.query?.status || '' });
      return res.json({ success: true, tickets });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/support/tickets', async (req, res) => {
    try {
      const { saveSupportTicket } = require('./supportSystem');
      const ticket = await saveSupportTicket(req.body || {});
      return res.json({ success: true, ticket });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.patch('/internal/support/tickets/:id/status', async (req, res) => {
    try {
      const { updateSupportTicketStatus } = require('./supportSystem');
      const ticket = await updateSupportTicketStatus(req.params.id, req.body?.status || 'open', req.body || {});
      return res.json({ success: true, ticket });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.delete('/internal/support/tickets/:id', async (req, res) => {
    try {
      const { deleteSupportTicket } = require('./supportSystem');
      const result = await deleteSupportTicket(req.params.id);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

`;
  const marker = '  app.post(\'/internal/results/sync-hubs\', async (req, res) => {';
  const idx = src.indexOf(marker);
  if (idx >= 0) {
    src = src.slice(0, idx) + routes + src.slice(idx);
    changed = true;
  } else {
    console.log('[Suporte] Marcador de rotas internas nao encontrado.');
  }
}

if (changed) {
  fs.writeFileSync(file, src, 'utf8');
  console.log('[Suporte] Rotas internas de suporte aplicadas.');
} else {
  console.log('[Suporte] Rotas internas de suporte ja estavam aplicadas.');
}
