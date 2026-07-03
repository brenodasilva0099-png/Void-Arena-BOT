const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, 'matchResults.js');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

const channelResolver = `function resultHistoryChannelId() {
  return String(
    process.env.RESULTS_HISTORY_CHANNEL_ID ||
    process.env.RESULT_HISTORY_CHANNEL_ID ||
    process.env.HISTORY_CHANNEL_ID ||
    process.env.MATCH_HISTORY_CHANNEL_ID ||
    process.env.RESULTS_CHANNEL_ID ||
    process.env.EVENT_VALIDATION_CHANNEL_ID ||
    process.env.VALIDATION_CHANNEL_ID ||
    '1518441859519877120'
  ).trim();
}
`;

if (source.includes('function resultHistoryChannelId')) {
  const next = source.replace(/function resultHistoryChannelId\(\) \{[\s\S]*?\n\}\n\nfunction siteUrl\(\) \{/, `${channelResolver}\nfunction siteUrl() {`);
  if (next !== source) {
    source = next;
    changed = true;
  }
} else {
  source = source.replace('function siteUrl() {', `${channelResolver}\nfunction siteUrl() {`);
  changed = true;
}

if (!source.includes('async function mirrorProofToHistory')) {
  source = source.replace(
    'async function submitToSite(interaction, raw, match) {',
    `async function mirrorProofToHistory(client, payload = {}, result = {}) {
  const channelId = resultHistoryChannelId();
  const proofUrl = payload.proof?.url || payload.proof?.proxyUrl || '';
  if (!channelId || !proofUrl || !client?.channels?.fetch) return { sent: false, reason: channelId ? 'no_proof' : 'no_history_channel' };
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.send) return { sent: false, reason: 'invalid_history_channel' };
  const match = payload.match || {};
  const teamA = match.teamA?.name || match.teamA?.tag || 'Time A';
  const teamB = match.teamB?.name || match.teamB?.tag || 'Time B';
  const embed = new EmbedBuilder()
    .setTitle('📌 Histórico de resultado')
    .setDescription([
      \`**Confronto:** \${teamA} x \${teamB}\`,
      \`**Rodada:** \${match.roundLabel || payload.roundKey || '-'}\`,
      \`**Jogo:** \${payload.gameNumber || '-'}\`,
      \`**Placar enviado:** \${payload.scoreA} x \${payload.scoreB}\`,
      \`**Enviado por:** \${payload.authorName || payload.authorDiscordId || 'Capitão'}\`,
      '',
      'Print preservada para auditoria caso exista divergência nos pontos.'
    ].join('\\n'))
    .setImage(proofUrl)
    .setColor(0x38bdf8)
    .setTimestamp(new Date());
  const sent = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  return { sent: true, channelId: sent.channelId, messageId: sent.id };
}

async function submitToSite(interaction, raw, match) {`
  );
  changed = true;
}

if (!source.includes('mirrorProofToHistory(interaction.client, payload')) {
  source = source.replace(
    "  const data = await callSite('/internal/results/submit', payload);\n  await updateHubAfterSubmit(interaction.client, match, data.result || null);",
    "  const data = await callSite('/internal/results/submit', payload);\n  await mirrorProofToHistory(interaction.client, payload, data.result || null).catch((error) => console.error('Erro ao enviar print para histórico:', error.message));\n  await updateHubAfterSubmit(interaction.client, match, data.result || null);"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, 'utf8');
  console.log('Patch aplicado: prints de resultados serão espelhadas no canal de histórico/validação.');
} else {
  console.log('Patch ignorado: histórico de resultados ja estava configurado.');
}
