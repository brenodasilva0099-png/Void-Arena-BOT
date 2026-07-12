const storage = require('../server/storage');

async function main() {
  const now = new Date().toISOString();
  const events = await storage.readEvents().catch(() => []);
  const existing = events.find((event) => {
    const key = String(event.id || event.name || event.title || '').toLowerCase();
    return key.includes('nexus-cup') || key.includes('nexus cup');
  }) || null;

  const description = [
    'Inscrições abertas até 18/07/2026 às 13:30 — Horário de Brasília.',
    'As premiações serão com base no total de times inscritos até a data do evento.',
    'Para mais detalhes como regras e reunião com líderes, entre no servidor.'
  ].join('\n\n');

  const event = await storage.saveTournamentEvent({
    ...(existing || {}),
    id: existing?.id || 'nexus-cup-1-edicao',
    name: 'Nexus cup 1ª Edição',
    title: 'Nexus cup 1ª Edição',
    mode: 'Rematch',
    matchFormat: 'MD3',
    structure: existing?.structure || 'groups_playoffs',
    teamLimit: 32,
    minimumTeams: Number(existing?.minimumTeams || 4) || 4,
    startAt: '2026-07-18T19:30',
    status: existing?.status || 'open',
    description,
    registrations: Array.isArray(existing?.registrations) ? existing.registrations : [],
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });

  console.log('[Eventos] Nexus cup 1ª Edição garantido no banco:', event.id);
}

main().catch((error) => {
  console.error('[Eventos] Falha ao garantir Nexus cup 1ª Edição:', error.message);
  process.exitCode = 0;
});
