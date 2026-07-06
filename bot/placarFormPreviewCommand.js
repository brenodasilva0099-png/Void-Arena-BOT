const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const pendingPreviewPrints = new Map();

function mode(raw) { return String(raw || '').toLowerCase().replace('x', 'v') === '5v5' ? '5v5' : '3v3'; }
function label(m) { return mode(m).toUpperCase().replace('V', 'x'); }
function total(m) { return mode(m) === '5v5' ? 10 : 6; }
function players(m) { return Array.from({ length: total(m) }, (_, i) => 'Jogador teste ' + (i + 1)); }
function template(m) { return players(m).map((name) => name + ' | gols=0 | defesas=0 | assist=0 | intercept=0 | passes=0').join('\n'); }
function key(channelId, userId) { return String(channelId || '') + ':' + String(userId || ''); }

function imageFromMessage(msg) {
  return Array.from(msg.attachments?.values?.() || []).find((file) => String(file.contentType || '').startsWith('image/') || String(file.name || '').match(/\.(png|jpg|jpeg|webp|gif)$/i))?.url || '';
}

function openEmbed(m) {
  return new EmbedBuilder()
    .setTitle('Formulario interativo de teste - ' + label(m))
    .setColor(0xf59e0b)
    .setDescription(['Clique no botao para abrir o formulario igual ao fluxo real.', 'Depois de enviar o formulario, mande a print como imagem/anexo no mesmo canal.', 'Esse teste nao soma pontos e nao muda ranking.'].join('\n'));
}

function rows(m) {
  return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('placar_form_preview:' + mode(m)).setLabel('Abrir formulario de teste').setEmoji('🧪').setStyle(ButtonStyle.Primary))];
}

function modal(m, userId) {
  return new ModalBuilder()
    .setCustomId('placar_form_preview_modal:' + mode(m) + ':' + userId)
    .setTitle('Teste placar ' + label(m))
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreA').setLabel('Gols do Time A').setPlaceholder('Ex: 3').setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scoreB').setLabel('Gols do Time B').setPlaceholder('Ex: 1').setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mvp').setLabel('MVP obrigatorio').setPlaceholder('Jogador teste 1').setRequired(true).setStyle(TextInputStyle.Short)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stats').setLabel('Stats por jogador').setValue(template(m)).setRequired(true).setStyle(TextInputStyle.Paragraph))
    );
}

function numberOf(line, name) {
  const found = String(line || '').match(new RegExp(name + '\\s*[=:]\\s*(\\d+(?:[.,]\\d+)?)', 'i'));
  return found ? Number(String(found[1]).replace(',', '.')) || 0 : 0;
}
function parseStats(raw) {
  return String(raw || '').split('\n').filter(Boolean).map((line) => ({
    name: line.split('|')[0].trim(),
    goals: numberOf(line, 'gols?'),
    defenses: numberOf(line, 'defesas?'),
    assists: numberOf(line, 'assist'),
    interceptions: numberOf(line, 'intercept'),
    passes: numberOf(line, 'passes?')
  }));
}

function resultEmbed(data, imageUrl) {
  const lines = parseStats(data.stats).map((s) => s.name + ' — G:' + s.goals + ' D:' + s.defenses + ' A:' + s.assists + ' INT:' + s.interceptions + ' P:' + s.passes + (String(s.name).toLowerCase() === String(data.mvp).toLowerCase() ? ' • MVP' : '')).join('\n');
  const embed = new EmbedBuilder().setTitle('Preview do envio de placar - ' + label(data.mode)).setColor(0x22c55e).setDescription(['Placar: Time A ' + data.scoreA + ' x ' + data.scoreB + ' Time B', 'MVP: ' + data.mvp, '', lines, '', 'Preview apenas: nada foi somado no ranking real.'].join('\n').slice(0, 3900)).setTimestamp(new Date());
  if (imageUrl) embed.setImage(imageUrl);
  return embed;
}

async function receivePreviewForm(interaction, m, userId) {
  if (String(userId || '') !== interaction.user.id) return interaction.reply({ content: 'So quem abriu o formulario pode enviar esse teste.', ephemeral: true });
  pendingPreviewPrints.set(key(interaction.channelId, interaction.user.id), {
    mode: m,
    scoreA: interaction.fields.getTextInputValue('scoreA'),
    scoreB: interaction.fields.getTextInputValue('scoreB'),
    mvp: interaction.fields.getTextInputValue('mvp'),
    stats: interaction.fields.getTextInputValue('stats'),
    createdAt: Date.now()
  });
  return interaction.reply({ content: '✅ Formulario recebido. Agora envie a print como **imagem/anexo neste mesmo canal** para concluir o preview.', ephemeral: true });
}

function registerPlacarFormPreviewCommand(client) {
  if (!client || client.__placarFormPreviewRegistered) return;
  client.__placarFormPreviewRegistered = true;
  client.on(Events.MessageCreate, async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const pending = pendingPreviewPrints.get(key(msg.channelId, msg.author.id));
    if (pending) {
      if (Date.now() - pending.createdAt > 15 * 60 * 1000) { pendingPreviewPrints.delete(key(msg.channelId, msg.author.id)); return; }
      const imageUrl = imageFromMessage(msg);
      if (imageUrl) {
        pendingPreviewPrints.delete(key(msg.channelId, msg.author.id));
        return msg.reply({ embeds: [resultEmbed(pending, imageUrl)] });
      }
    }
    const text = String(msg.content || '').trim();
    if (!text.toLowerCase().startsWith('!placar-form-preview') && !text.toLowerCase().startsWith('!placar-formulario-preview')) return;
    const m = mode(text.split(/\s+/)[1]);
    const channelId = String(process.env.PLACAR_CONFIG_CHANNEL_ID || '1518387894522216559').trim();
    const target = await msg.client.channels.fetch(channelId).catch(() => msg.channel);
    await target.send({ content: 'Preview interativo do formulario de atualizacao do placar ' + label(m), embeds: [openEmbed(m)], components: rows(m) });
    if (target.id !== msg.channelId) await msg.reply('Preview enviado no canal de config.');
  });
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton?.() && String(interaction.customId || '').startsWith('placar_form_preview:')) return interaction.showModal(modal(String(interaction.customId).split(':')[1] || '3v3', interaction.user.id));
    if (interaction.isModalSubmit?.() && String(interaction.customId || '').startsWith('placar_form_preview_modal:')) {
      const [, m, userId] = String(interaction.customId).split(':');
      return receivePreviewForm(interaction, m, userId);
    }
  });
}

module.exports = { registerPlacarFormPreviewCommand };
