const { Events, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const placar = require('./placarStorage');

const HISTORY_ID = '1518441859519877120';
const pending = new Map();
const rankRoles = {
  abyssal: '1494779368969470083', mestre: '1494779378087886928', diamante: '1494779977743339582',
  platina: '1494780148212568090', ouro: '1494780420447928422', prata: '1494780533572632586', bronze: '1494780591303037019'
};

function modeLabel(m) { return placar.normalizeMode(m).toUpperCase().replace('V', 'x'); }
function key(ch, user) { return String(ch || '') + ':' + String(user || ''); }
function players(match) { return [...(match.teamA || []), ...(match.teamB || [])]; }
function mention(p) { return p.discordId ? '<@' + p.discordId + '>' : String(p.name || 'Jogador'); }
function template(match) { return players(match).map((p) => mention(p) + ' | gols=0 | defesas=0 | assist=0 | intercept=0 | passes=0').join('\n').slice(0, 3500); }
function imageFrom(msg) { return Array.from(msg.attachments?.values?.() || []).find((a) => String(a.contentType || '').startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(String(a.name || a.url || '')))?.url || ''; }
function number(line, name) { const m = String(line || '').match(new RegExp(name + '\\s*[=:]\\s*(\\d+(?:[.,]\\d+)?)', 'i')); return m ? Number(String(m[1]).replace(',', '.')) || 0 : 0; }
function resolve(match, raw) {
  const text = String(raw || '').trim();
  const id = text.replace(/\D/g, '');
  const low = text.toLowerCase();
  return players(match).find((p) => (id && p.discordId === id) || low.includes(String(p.name || '').toLowerCase()) || low.includes('<@' + p.discordId + '>') || low.includes('<@!' + p.discordId + '>'));
}
function parseStats(match, raw) {
  const stats = { goals: {}, assists: {}, defenses: {}, interceptions: {}, passes: {} };
  const seen = new Set();
  for (const line of String(raw || '').split('\n').map((x) => x.trim()).filter(Boolean)) {
    const p = resolve(match, line.split('|')[0] || line);
    if (!p?.discordId) continue;
    seen.add(p.discordId);
    stats.goals[p.discordId] = number(line, 'gols?');
    stats.defenses[p.discordId] = number(line, 'defesas?');
    stats.assists[p.discordId] = number(line, 'assist');
    stats.interceptions[p.discordId] = number(line, 'intercept');
    stats.passes[p.discordId] = number(line, 'passes?');
  }
  const missing = players(match).filter((p) => !seen.has(p.discordId));
  if (missing.length) throw new Error('Faltou preencher stats de: ' + missing.map((p) => p.name || p.discordId).join(', '));
  return stats;
}
function parseScore(v, label) { const n = Number(String(v || '').replace(',', '.')); if (!Number.isFinite(n) || n < 0) throw new Error(label + ' inválido.'); return Math.round(n * 10) / 10; }
function modal(match, userId) {
  return new ModalBuilder().setCustomId('placar_attachment_result:' + match.id + ':' + userId).setTitle('Atualizar placar ' + modeLabel(match.mode)).addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreA').setLabel('Gols do Time A').setPlaceholder('Ex: 3').setRequired(true).setStyle(TextInputStyle.Short)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreB').setLabel('Gols do Time B').setPlaceholder('Ex: 1').setRequired(true).setStyle(TextInputStyle.Short)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mvp').setLabel('MVP obrigatorio').setPlaceholder('@jogador ou ID').setRequired(true).setStyle(TextInputStyle.Short)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stats').setLabel('Stats por jogador').setValue(template(match)).setRequired(true).setStyle(TextInputStyle.Paragraph))
  );
}
async function updateRoles(guild, ids, m) {
  const board = await placar.getLeaderboard(m);
  const byId = new Map(board.players.map((p) => [p.discordId, p]));
  const all = Object.values(rankRoles);
  for (const id of ids) {
    const p = byId.get(id); const member = await guild.members.fetch(id).catch(() => null); if (!p || !member) continue;
    const target = rankRoles[p.rankKey];
    const remove = all.filter((roleId) => roleId !== target && member.roles.cache.has(roleId));
    if (remove.length) await member.roles.remove(remove, 'Void Arena Placar').catch(() => null);
    if (target && !member.roles.cache.has(target)) await member.roles.add(target, 'Void Arena Placar').catch(() => null);
  }
}
function deltaLines(match, deltas) {
  const byId = new Map(deltas.map((d) => [d.discordId, d]));
  return players(match).map((p) => { const d = byId.get(p.discordId); const s = d?.stats || {}; return mention(p) + ' — ' + (d ? ('**' + d.before + ' → ' + d.after + ' VAP** +' + d.delta + ' • ' + d.rankEmoji + ' ' + d.rankName + ' • G:' + s.goals + ' A:' + s.assists + ' D:' + s.defenses + ' INT:' + s.interceptions + ' P:' + s.passes + (s.mvp ? ' • MVP' : '')) : 'sem cálculo'); }).join('\n');
}
async function finish(client, msg, item, imageUrl) {
  const result = await placar.finishMatch(item.matchId, { ...item.payload, proofUrl: imageUrl, reportedBy: msg.author.id });
  await updateRoles(msg.guild, item.ids, item.mode);
  const match = result.match;
  const embed = new EmbedBuilder().setTitle('✅ Placar atualizado • ' + modeLabel(match.mode)).setColor(0x22c55e).setDescription(['**Resultado:** Time A ' + match.scoreA + ' x ' + match.scoreB + ' Time B', '**MVP:** <@' + match.result.mvpId + '>', '', deltaLines(match, result.deltas)].join('\n').slice(0, 3900)).setImage(imageUrl).setTimestamp(new Date());
  await msg.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  const hist = await client.channels.fetch(HISTORY_ID).catch(() => null);
  if (hist?.send) await hist.send({ embeds: [embed.setTitle('📊 Histórico Café com Leite • ' + modeLabel(match.mode))], allowedMentions: { parse: [] } }).catch(() => null);
  const ch = await client.channels.fetch(match.textChannelId).catch(() => null);
  const original = await ch?.messages?.fetch?.(match.discordMessageId).catch(() => null);
  if (original?.editable) await original.edit({ components: [] }).catch(() => null);
}
function registerPlacarAttachmentResult(client) {
  if (!client || client.__placarAttachmentResult) return;
  client.__placarAttachmentResult = true;
  client.on(Events.InteractionCreate, async (i) => {
    try {
      if (i.isButton?.() && String(i.customId || '').startsWith('placar:result:')) {
        const matchId = String(i.customId).replace('placar:result:', '');
        const match = await placar.getMatch(matchId);
        if (!match) return i.reply({ content: 'Partida não encontrada.', ephemeral: true });
        const ids = players(match).map((p) => p.discordId);
        if (!ids.includes(i.user.id)) return i.reply({ content: 'Só jogador dessa partida pode atualizar.', ephemeral: true });
        const locked = await placar.claimMatchReporter(matchId, i.user.id);
        return i.showModal(modal(locked, i.user.id));
      }
      if (i.isModalSubmit?.() && String(i.customId || '').startsWith('placar_attachment_result:')) {
        const [, matchId, userId] = String(i.customId).split(':');
        if (userId !== i.user.id) return i.reply({ content: 'Só quem abriu o formulário pode enviar.', ephemeral: true });
        const match = await placar.getMatch(matchId);
        const ids = players(match).map((p) => p.discordId);
        if (!ids.includes(i.user.id)) return i.reply({ content: 'Só jogador dessa partida pode atualizar.', ephemeral: true });
        const mvp = resolve(match, i.fields.getTextInputValue('mvp'));
        if (!mvp) return i.reply({ content: 'MVP precisa ser jogador da partida.', ephemeral: true });
        pending.set(key(i.channelId, i.user.id), { matchId, mode: match.mode, ids, createdAt: Date.now(), payload: { scoreA: parseScore(i.fields.getTextInputValue('scoreA'), 'Gols do Time A'), scoreB: parseScore(i.fields.getTextInputValue('scoreB'), 'Gols do Time B'), mvpId: mvp.discordId, stats: parseStats(match, i.fields.getTextInputValue('stats')) } });
        return i.reply({ content: '✅ Agora envie a print como imagem/anexo neste mesmo canal. Quando a imagem chegar, o bot atualiza o placar.', ephemeral: true });
      }
    } catch (e) { const p = { content: '❌ ' + e.message, ephemeral: true }; if (i.replied || i.deferred) return i.followUp(p).catch(() => null); return i.reply(p).catch(() => null); }
  });
  client.on(Events.MessageCreate, async (msg) => {
    try {
      if (!msg.guild || msg.author.bot) return;
      const k = key(msg.channelId, msg.author.id); const item = pending.get(k); if (!item) return;
      if (Date.now() - item.createdAt > 15 * 60 * 1000) { pending.delete(k); return; }
      const image = imageFrom(msg); if (!image) return;
      pending.delete(k); await finish(client, msg, item, image);
    } catch (e) { await msg.reply('❌ Erro ao validar print: ' + e.message).catch(() => null); }
  });
}
module.exports = { registerPlacarAttachmentResult };
