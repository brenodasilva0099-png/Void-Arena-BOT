const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'placarSystem.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');

if (!src.includes('function previewPlacarMatch')) {
  const helpers = [
    '',
    'function previewPlacarMatch(mode = "3v3") {',
    '  const safeMode = placar.normalizeMode(mode);',
    '  const total = safeMode === "5v5" ? 10 : 6;',
    '  const players = Array.from({ length: total }, (_, i) => ({ discordId: `preview${i + 1}`, name: `Jogador teste ${i + 1}` }));',
    '  const size = safeMode === "5v5" ? 5 : 3;',
    '  return { id: `preview_${safeMode}`, mode: safeMode, teamA: players.slice(0, size), teamB: players.slice(size), status: "preview" };',
    '}',
    '',
    'async function handlePreviewPlacarButton(interaction, mode) {',
    '  return interaction.showModal(resultModal(previewPlacarMatch(mode), interaction.user.id));',
    '}',
    '',
    'async function handlePreviewPlacarModal(interaction, mode) {',
    '  const match = previewPlacarMatch(mode);',
    '  const scoreA = parseScoreValue(interaction.fields.getTextInputValue("scoreA"), "Gols do Time A");',
    '  const scoreB = parseScoreValue(interaction.fields.getTextInputValue("scoreB"), "Gols do Time B");',
    '  const mvpPlayer = resolveMatchPlayer(match, interaction.fields.getTextInputValue("mvp")) || match.teamA[0];',
    '  const stats = parseStatsBlock(match, interaction.fields.getTextInputValue("stats"));',
    '  const proofUrl = validProofUrl(interaction.fields.getTextInputValue("proof"));',
    '  const lines = allPlacarPlayers(match).map((p) => `${mentionPlayer(p)} — G:${stats.goals[p.discordId] || 0} A:${stats.assists[p.discordId] || 0} D:${stats.defenses[p.discordId] || 0} INT:${stats.interceptions[p.discordId] || 0} P:${stats.passes[p.discordId] || 0}${p.discordId === mvpPlayer.discordId ? " • MVP" : ""}`).join("\\n");',
    '  const embed = new EmbedBuilder().setTitle(`🧪 Preview de envio do placar • ${modeLabel(mode)}`).setColor(0xf59e0b).setDescription([`**Placar:** Time A ${scoreA} x ${scoreB} Time B`, `**MVP:** ${mentionPlayer(mvpPlayer)}`, "", lines, "", "Preview apenas: nada foi somado no ranking real."].join("\\n")).setImage(proofUrl).setTimestamp(new Date());',
    '  return interaction.reply({ embeds: [embed], ephemeral: true });',
    '}',
    ''
  ].join('\n');
  src = src.replace('\nfunction registerPlacarSystem(client) {', helpers + '\nfunction registerPlacarSystem(client) {');
}

if (!src.includes("scope === 'placar-preview'")) {
  src = src.replace("if (scope !== 'placar') return;", "if (scope === 'placar-preview' && action === 'result') return handlePreviewPlacarButton(interaction, value);\n        if (scope !== 'placar') return;");
}

src = src.replace(
  "const [, , matchId, reporterId] = interaction.customId.split(':');\n        return handleResultModal(interaction, matchId, reporterId);",
  "const [, , matchId, reporterId] = interaction.customId.split(':');\n        if (matchId?.startsWith('preview_')) return handlePreviewPlacarModal(interaction, matchId.replace('preview_', ''));\n        return handleResultModal(interaction, matchId, reporterId);"
);

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: preview interativo do formulário do placar.');
