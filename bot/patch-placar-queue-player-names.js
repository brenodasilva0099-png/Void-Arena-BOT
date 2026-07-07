const fs = require('node:fs');
const path = require('node:path');

function replaceFunction(src, name, replacement) {
  const asyncNeedle = `async function ${name}`;
  const plainNeedle = `function ${name}`;
  let start = src.indexOf(asyncNeedle);
  if (start < 0) start = src.indexOf(plainNeedle);
  if (start < 0) return src;
  const braceStart = src.indexOf('{', start);
  if (braceStart < 0) return src;
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(0, start) + replacement + src.slice(i + 1);
    }
  }
  return src;
}

function source(fn, targetName) {
  return fn.toString().replace(fn.name, targetName);
}

function queuePlayerMentionReplacement(player = {}, index = 0) {
  const id = String(player.discordId || player.id || '').trim();
  if (id && id.length >= 8 && id.length <= 25 && id.split('').every((ch) => ch >= '0' && ch <= '9')) return `<@${id}>`;
  const raw = player.name || player.displayName || player.username || player.globalName || '';
  const cleaned = String(raw || '')
    .split('\n').join(' ')
    .split('\r').join(' ')
    .split('\t').join(' ')
    .split('@').join('')
    .split('#').join('')
    .split('`').join('')
    .split('*').join('')
    .split('_').join('')
    .split('~').join('')
    .split('>').join('')
    .split('|').join('')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 24) || `Jogador ${index + 1}`;
}

function queueNamesLineReplacement(queue = [], max = 10) {
  if (!Array.isArray(queue) || !queue.length) return '— ninguém na fila ainda';
  const names = queue.slice(0, max).map((player, index) => `${index + 1}. ${queuePlayerMention(player, index)}`);
  const extra = queue.length > max ? `\n+${queue.length - max} jogador(es)` : '';
  return names.join('\n') + extra;
}

async function queuePanelEmbedReplacement() {
  const data = await placar.getFullScoreboard();
  const queue3 = data.queues['3v3'] || [];
  const queue5 = data.queues['5v5'] || [];
  const q3 = queue3.length;
  const q5 = queue5.length;
  return new EmbedBuilder()
    .setTitle('☕ Fila Café com Leite Rematch')
    .setColor(0x22d3ee)
    .setDescription([
      'Entre aqui na fila 3x3 ou 5x5. Quando fechar jogadores suficientes, o bot sorteia os times, cria a call privada e avisa os participantes por DM.',
      '',
      `**Fila 3x3:** ${q3}/6 jogadores`,
      queueNamesLine(queue3),
      '',
      `**Fila 5x5:** ${q5}/10 jogadores`,
      queueNamesLine(queue5),
      '',
      `Esse canal é só para fila e resultado da partida. O ranking/placar/patentes fica separado no canal <#${PLACAR_CHANNEL_ID}>.`
    ].join('\n'))
    .setFooter({ text: 'Void Arena • Fila Café com Leite' })
    .setTimestamp(new Date());
}

const file = path.join(__dirname, 'placarSystem.js');
if (fs.existsSync(file)) {
  let src = fs.readFileSync(file, 'utf8');
  const helpers = source(queuePlayerMentionReplacement, 'queuePlayerMention') + '\n\n' + source(queueNamesLineReplacement, 'queueNamesLine') + '\n\n';
  if (!src.includes('function queuePlayerMention') && !src.includes('function queueNamesLine')) {
    src = src.replace('\nasync function queuePanelEmbed', '\n' + helpers + 'async function queuePanelEmbed');
  } else {
    if (!src.includes('function queuePlayerMention')) src = src.replace('\nfunction queueNamesLine', '\n' + source(queuePlayerMentionReplacement, 'queuePlayerMention') + '\n\nfunction queueNamesLine');
    src = replaceFunction(src, 'queueNamesLine', source(queueNamesLineReplacement, 'queueNamesLine'));
  }
  src = replaceFunction(src, 'queuePanelEmbed', source(queuePanelEmbedReplacement, 'queuePanelEmbed'));
  fs.writeFileSync(file, src, 'utf8');
}

console.log('Patch aplicado: painel da fila mostra menções clicáveis dos jogadores.');
