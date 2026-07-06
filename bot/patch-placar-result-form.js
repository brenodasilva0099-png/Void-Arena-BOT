const fs = require('node:fs');
const path = require('node:path');

function replaceBetween(src, startPattern, endPattern, replacement) {
  const start = src.search(startPattern);
  if (start < 0) return src;
  const after = src.slice(start);
  const endMatch = after.match(endPattern);
  if (!endMatch) return src;
  const end = start + endMatch.index + endMatch[0].length;
  return src.slice(0, start) + replacement + src.slice(end);
}

function patchSystem() {
  const file = path.join(__dirname, 'placarSystem.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('PLACAR_RANK_ROLE_IDS')) {
    src = src.replace(
      "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();",
      [
        "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();",
        "const HISTORY_CHANNEL_ID = String(process.env.RESULTS_HISTORY_CHANNEL_ID || process.env.RESULT_HISTORY_CHANNEL_ID || '1518441859519877120').trim();",
        "const PLACAR_RANK_ROLE_IDS = { abyssal: '1494779368969470083', mestre: '1494779378087886928', diamante: '1494779977743339582', platina: '1494780148212568090', ouro: '1494780420447928422', prata: '1494780533572632586', bronze: '1494780591303037019' };"
      ].join('\n')
    );
  }

  src = src.replace('Reportar resultado', 'Atualizar placar');
  src = src.replace('Quando acabar, um participante clica em **Reportar resultado**.', 'Quando acabar, um participante clica em **Atualizar placar**. Só quem clicar primeiro consegue enviar/validar esse placar.');

  if (!src.includes('function allPlacarPlayers')) {
    const helpers = [
      '',
      'function allPlacarPlayers(match = {}) { return [...(match.teamA || []), ...(match.teamB || [])]; }',
      'function mentionPlayer(player = {}) { return player.discordId ? `<@${player.discordId}>` : String(player.name || "Jogador"); }',
      'function statsTemplate(match = {}) { return allPlacarPlayers(match).map((p) => `${mentionPlayer(p)} | gols=0 | defesas=0 | assist=0 | intercept=0 | passes=0`).join("\\n").slice(0, 3500); }',
      'function parseScoreValue(value, label) { const parsed = Number(String(value || "").replace(",", ".")); if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) throw new Error(`${label} inválido.`); return Math.round(parsed * 10) / 10; }',
      'function resolveMatchPlayer(match, input = "") {',
      '  const raw = String(input || "").trim();',
      '  const id = raw.replace(/\\D/g, "");',
      '  const lower = raw.toLowerCase();',
      '  return allPlacarPlayers(match).find((p) => (id && p.discordId === id) || [`<@${p.discordId}>`, `<@!${p.discordId}>`, p.discordId, String(p.name || "").toLowerCase()].some((token) => lower === String(token).toLowerCase() || lower.includes(String(token).toLowerCase())));',
      '}',
      'function pickStatNumber(line, keys = []) {',
      '  for (const key of keys) {',
      '    const regex = new RegExp(`${key}\\\\s*[=:]\\\\s*(\\\\d+(?:[.,]\\\\d+)?)`, "i");',
      '    const match = String(line || "").match(regex);',
      '    if (match) return Math.max(0, Number(String(match[1]).replace(",", ".")) || 0);',
      '  }',
      '  return 0;',
      '}',
      'function parseStatsBlock(match, raw = "") {',
      '  const stats = { goals: {}, assists: {}, defenses: {}, interceptions: {}, passes: {} };',
      '  const lines = String(raw || "").split("\\n").map((line) => line.trim()).filter(Boolean);',
      '  const seen = new Set();',
      '  for (const line of lines) {',
      '    const player = resolveMatchPlayer(match, line.split("|")[0] || line);',
      '    if (!player?.discordId) continue;',
      '    seen.add(player.discordId);',
      '    stats.goals[player.discordId] = pickStatNumber(line, ["gols?", "gol"]);',
      '    stats.defenses[player.discordId] = pickStatNumber(line, ["defesas?", "def"]);',
      '    stats.assists[player.discordId] = pickStatNumber(line, ["assist(?:encias|ências)?", "assists?", "assist"]);',
      '    stats.interceptions[player.discordId] = pickStatNumber(line, ["intercept(?:acoes|ações)?", "intercepta(?:coes|ções)?", "intercept"]);',
      '    stats.passes[player.discordId] = pickStatNumber(line, ["passes?", "passe"]);',
      '  }',
      '  const missing = allPlacarPlayers(match).filter((p) => !seen.has(p.discordId));',
      '  if (missing.length) throw new Error(`Preencha uma linha de estatísticas para todos os jogadores. Faltou: ${missing.map((p) => p.name || p.discordId).join(", ")}`);',
      '  return stats;',
      '}',
      'function validProofUrl(url = "") { const clean = String(url || "").trim(); if (!/^https?:\\/\\//i.test(clean)) throw new Error("Cole um link válido do print da partida. O modal do Discord não aceita upload direto de arquivo."); return clean; }',
      'function resultDeltaLines(match, deltas = []) {',
      '  const byId = new Map(deltas.map((item) => [item.discordId, item]));',
      '  const line = (p) => { const d = byId.get(p.discordId); if (!d) return `${mentionPlayer(p)} — sem cálculo`; const s = d.stats || {}; return `${mentionPlayer(p)} — **${d.before} → ${d.after} VAP** (+${d.delta}) • ${d.rankEmoji} ${d.rankName} • G:${s.goals} A:${s.assists} D:${s.defenses} INT:${s.interceptions} P:${s.passes}${s.mvp ? " • MVP" : ""}`; };',
      '  return ["**Time A**", ...(match.teamA || []).map(line), "", "**Time B**", ...(match.teamB || []).map(line)].join("\\n");',
      '}',
      'async function sendPlacarHistory(client, match, deltas, reporterId, proofUrl) {',
      '  const channel = await client.channels.fetch(HISTORY_CHANNEL_ID).catch(() => null);',
      '  if (!channel?.send) return null;',
      '  const embed = new EmbedBuilder().setTitle(`📊 Placar Café com Leite atualizado • ${modeLabel(match.mode)}`).setColor(0x22c55e).setDescription([`**Partida:** \\`${match.id}\\``, `**Resultado:** Time A ${match.scoreA} x ${match.scoreB} Time B`, `**Enviado por:** <@${reporterId}>`, `**MVP:** <@${match.result?.mvpId}>`, "", resultDeltaLines(match, deltas)].join("\\n").slice(0, 3900)).setTimestamp(new Date());',
      '  if (proofUrl) embed.setImage(proofUrl);',
      '  return channel.send({ embeds: [embed], allowedMentions: { parse: [] } });',
      '}',
      ''
    ].join('\n');
    src = src.replace('\nfunction resultModal(matchId) {', helpers + '\nfunction resultModal(matchId) {');
  }

  const newResultModal = [
    'function resultModal(match, reporterId) {',
    '  return new ModalBuilder()',
    '    .setCustomId(`placar:result-modal:${match.id}:${reporterId}`)',
    '    .setTitle(`Atualizar placar ${modeLabel(match.mode)}`)',
    '    .addComponents(',
    '      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("scoreA").setLabel("Gols do Time A").setPlaceholder("Ex: 3").setRequired(true).setStyle(TextInputStyle.Short)),',
    '      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("scoreB").setLabel("Gols do Time B").setPlaceholder("Ex: 1").setRequired(true).setStyle(TextInputStyle.Short)),',
    '      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mvp").setLabel("MVP obrigatório").setPlaceholder("@jogador ou ID do jogador da partida").setRequired(true).setStyle(TextInputStyle.Short)),',
    '      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("stats").setLabel("Stats: gols/defesas/assist/intercept/passes").setValue(statsTemplate(match)).setRequired(true).setStyle(TextInputStyle.Paragraph)),',
    '      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("proof").setLabel("Print obrigatório: cole o link da imagem").setPlaceholder("https://...png / link do print da estatística").setRequired(true).setStyle(TextInputStyle.Short))',
    '    );',
    '}'
  ].join('\n');
  src = replaceBetween(src, /function resultModal\([^)]*\) \{/, /\n\}/, newResultModal);

  if (!src.includes('async function handleResultButton')) {
    const buttonFn = [
      '',
      'async function handleResultButton(interaction, matchId) {',
      '  const match = await placar.getMatch(matchId);',
      '  if (!match) return interaction.reply({ content: "Partida não encontrada.", ephemeral: true });',
      '  const participantIds = new Set(allPlacarPlayers(match).map((p) => p.discordId));',
      '  if (!participantIds.has(interaction.user.id)) return interaction.reply({ content: "Só jogadores dessa partida podem atualizar o placar.", ephemeral: true });',
      '  const locked = await placar.claimMatchReporter(matchId, interaction.user.id);',
      '  return interaction.showModal(resultModal(locked, interaction.user.id));',
      '}',
      ''
    ].join('\n');
    src = src.replace('\nasync function handleResultModal', buttonFn + '\nasync function handleResultModal');
  }

  const newHandle = [
    'async function handleResultModal(interaction, matchId, reporterId) {',
    '  if (String(reporterId || "") !== interaction.user.id) return interaction.reply({ content: "Só quem abriu o formulário pode enviar essa validação.", ephemeral: true });',
    '  const match = await placar.getMatch(matchId);',
    '  if (!match) return interaction.reply({ content: "Partida não encontrada.", ephemeral: true });',
    '  const participantIds = new Set(allPlacarPlayers(match).map((p) => p.discordId));',
    '  if (!participantIds.has(interaction.user.id)) return interaction.reply({ content: "Só jogadores dessa partida podem atualizar o placar.", ephemeral: true });',
    '  const scoreA = parseScoreValue(interaction.fields.getTextInputValue("scoreA"), "Gols do Time A");',
    '  const scoreB = parseScoreValue(interaction.fields.getTextInputValue("scoreB"), "Gols do Time B");',
    '  const mvpPlayer = resolveMatchPlayer(match, interaction.fields.getTextInputValue("mvp"));',
    '  if (!mvpPlayer) return interaction.reply({ content: "MVP obrigatório: mencione ou informe o ID/nome de um jogador da partida.", ephemeral: true });',
    '  const stats = parseStatsBlock(match, interaction.fields.getTextInputValue("stats"));',
    '  const proofUrl = validProofUrl(interaction.fields.getTextInputValue("proof"));',
    '  const result = await placar.finishMatch(matchId, { scoreA, scoreB, mvpId: mvpPlayer.discordId, stats, proofUrl, reportedBy: interaction.user.id });',
    '  await updateRankRoles(interaction.guild, Array.from(participantIds), match.mode);',
    '  const finished = result.match;',
    '  const summary = new EmbedBuilder().setTitle(`✅ Placar atualizado • ${modeLabel(finished.mode)}`).setDescription([`**Time A:** ${finished.scoreA}`, `**Time B:** ${finished.scoreB}`, `**Vencedor:** ${finished.result?.winner === "draw" ? "Empate" : `Time ${finished.result?.winner}`}`, `**MVP:** <@${finished.result?.mvpId}>`, "", "Patentes, VAP e placar individual atualizados no bot/site.", "", resultDeltaLines(finished, result.deltas)].join("\\n").slice(0, 3900)).setColor(0x22c55e).setImage(proofUrl).setTimestamp(new Date());',
    '  await interaction.reply({ embeds: [summary], allowedMentions: { parse: [] } });',
    '  await sendPlacarHistory(interaction.client, finished, result.deltas, interaction.user.id, proofUrl).catch((error) => console.error("[placar] histórico:", error.message));',
    '  await ensureRankingPanel(interaction.client).catch(() => null);',
    '  if (interaction.message?.editable) await interaction.message.edit({ embeds: [matchEmbed({ ...finished })], components: [] }).catch(() => null);',
    '}'
  ].join('\n');
  src = replaceBetween(src, /async function handleResultModal\([^)]*\) \{/, /\n\}/, newHandle);

  const rankFn = [
    'async function updateRankRoles(guild, playerIds = [], mode = "3v3") {',
    '  const leaderboard = await placar.getLeaderboard(mode);',
    '  const byId = new Map(leaderboard.players.map((p) => [p.discordId, p]));',
    '  const allRankRoleIds = Object.values(PLACAR_RANK_ROLE_IDS).filter(Boolean);',
    '  for (const id of playerIds) {',
    '    const player = byId.get(id);',
    '    if (!player) continue;',
    '    const member = await guild.members.fetch(id).catch(() => null);',
    '    if (!member) continue;',
    '    const targetId = PLACAR_RANK_ROLE_IDS[player.rankKey];',
    '    const removeIds = allRankRoleIds.filter((roleId) => roleId !== targetId && member.roles.cache.has(roleId));',
    '    if (removeIds.length) await member.roles.remove(removeIds, "Void Arena Placar: atualização de patente").catch(() => null);',
    '    if (targetId && !member.roles.cache.has(targetId)) await member.roles.add(targetId, "Void Arena Placar: atualização de patente").catch(() => null);',
    '  }',
    '}'
  ].join('\n');
  src = replaceBetween(src, /async function updateRankRoles\([^)]*\) \{/, /\n\}/, rankFn);

  src = src.replace('if (action === \'result\') return interaction.showModal(resultModal(value));', 'if (action === \'result\') return handleResultButton(interaction, value);');
  src = src.replace('const matchId = interaction.customId.replace(\'placar:result-modal:\', \'\');\n        return handleResultModal(interaction, matchId);', 'const [, , matchId, reporterId] = interaction.customId.split(\':\');\n        return handleResultModal(interaction, matchId, reporterId);');

  fs.writeFileSync(file, src, 'utf8');
}

function patchDebug() {
  const file = path.join(__dirname, 'placarDebugCommand.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('!placar-form-preview')) return;
  src = src.replace("const { Events, EmbedBuilder } = require('discord.js');", "const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');");
  const helper = [
    '',
    'function previewFormRows(mode) {',
    '  const safe = normalizeModeArg(mode);',
    '  return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`placar-preview:result:${safe}`).setLabel("Abrir formulário de teste").setEmoji("🧪").setStyle(ButtonStyle.Primary))];',
    '}',
    'function previewFormEmbed(mode) {',
    '  const safe = normalizeModeArg(mode);',
    '  return new EmbedBuilder().setTitle(`🧪 Formulário interativo de teste - ${label(safe)}`).setColor(0xf59e0b).setDescription(["Clique no botão abaixo para abrir o formulário real de atualização do placar.", "Esse teste não soma pontos e não altera o ranking.", "", "Use link de imagem no campo do print, porque modal do Discord não aceita upload direto."].join("\\n"));',
    '}',
    ''
  ].join('\n');
  src = src.replace('\nfunction registerPlacarDebugCommand(client) {', helper + '\nfunction registerPlacarDebugCommand(client) {');
  src = src.replace('const isQueue = lower.startsWith(\'!placar-preview\');\n    const isResult = lower.startsWith(\'!placar-resultado-preview\');\n    if (!isQueue && !isResult) return;', 'const isQueue = lower.startsWith(\'!placar-preview\');\n    const isResult = lower.startsWith(\'!placar-resultado-preview\');\n    const isForm = lower.startsWith(\'!placar-form-preview\') || lower.startsWith(\'!placar-formulario-preview\');\n    if (!isQueue && !isResult && !isForm) return;');
  src = src.replace('const embeds = isResult ? await buildResultPreviewEmbeds(mode) : await buildEmbeds(mode);\n    const channelId', 'if (isForm) {\n      const channelId = String(process.env.PLACAR_CONFIG_CHANNEL_ID || \'1518387894522216559\').trim();\n      const target = await msg.client.channels.fetch(channelId).catch(() => msg.channel);\n      await target.send({ content: \'Preview interativo do formulário de atualização do placar \' + label(mode), embeds: [previewFormEmbed(mode)], components: previewFormRows(mode) });\n      if (target.id !== msg.channelId) await msg.reply(\'Preview enviado no canal de config.\');\n      return;\n    }\n    const embeds = isResult ? await buildResultPreviewEmbeds(mode) : await buildEmbeds(mode);\n    const channelId');
  fs.writeFileSync(file, src, 'utf8');
}

patchSystem();
patchDebug();
console.log('Patch aplicado: formulário validado de atualização do placar Café com Leite.');
