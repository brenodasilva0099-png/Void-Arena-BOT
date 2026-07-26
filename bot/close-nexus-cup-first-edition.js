'use strict';

const storage = require('../server/storage');

function key(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isFirstNexusCup(event = {}) {
  const value = key(`${event.name || ''} ${event.title || ''} ${event.id || ''}`);
  return value.includes('nexus cup') && /(?:^|\s)(?:1|1a|primeira)(?:\s|$)/.test(value);
}

async function main() {
  const events = await storage.readEvents();
  const event = (events || []).find(isFirstNexusCup);

  if (!event) {
    console.warn('[Nexus Cup] Evento da 1ª edição não encontrado; nenhum registro foi alterado.');
    return;
  }

  if (event.status === 'finished') {
    console.log(`[Nexus Cup] ${event.name || event.title || event.id} já está encerrada.`);
    return;
  }

  await storage.saveTournamentEvent({
    ...event,
    status: 'finished'
  });
  console.log(`[Nexus Cup] ${event.name || event.title || event.id} encerrada com sucesso.`);
}

main().catch((error) => {
  console.error('[Nexus Cup] Falha ao encerrar a competição:', error);
  process.exitCode = 1;
});
