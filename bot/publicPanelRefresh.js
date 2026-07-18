const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits
} = require('discord.js');

const DEFAULT_SITE_URL = 'https://hollow-nexus-league.onrender.com';
const REFRESH_MARKER = 'hollow-nexus-public-panels-v2';
const OLD_SITE_RE = /https:\/\/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/i;
const OLD_SITE_REPLACE_RE = /https:\/\/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/gi;
const OLD_TITLE_RE = /Void Arena|Hollow Nexus Tournament|Hollow Nexus FRM|Federa[cç][aã]o/gi;

function cleanBaseUrl(value = '') {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';
  return raw;
}

function isOldSiteUrl(value = '') {
  return /void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/i.test(String(value || ''));
}

function siteBaseUrl() {
  const configured = cleanBaseUrl(
    process.env.CANONICAL_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_PUBLIC_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    ''
  );
  if (configured && !isOldSiteUrl(configured)) return configured;
  return DEFAULT_SITE_URL;
}

function siteUrl(pathname = '/') {
  const path = String(pathname || '/');
  return `${siteBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function isStaff(member) {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

function formPayload() {
  const embed = new EmbedBuilder()
    .setTitle('📋 Inscrição • Hollow Nexus League')
    .setDescription([
      'Painel oficial para jogadores enviarem inscrição e manterem o cadastro atualizado.',
      '',
      `🌐 **Formulários no site:** ${siteUrl('/pages/formularios.html')}`,
      `🧾 **Inscrição direta:** ${siteUrl('/pages/inscricao.html')}`,
      '',
      'Clique no botão abaixo para preencher pelo Discord.'
    ].join('\n'))
    .setColor(0x8b5cf6)
    .setFooter({ text: `HNL • Formulários • ${REFRESH_MARKER}` })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('hollowform:start')
        .setLabel('Preencher inscrição')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary)
    )]
  };
}

function trainingPayload() {
  const embed = new EmbedBuilder()
    .setTitle('🎥 Central de Partidas e Treinos')
    .setDescription([
      'Envie vídeos de treino/partidas para análise da equipe.',
      '',
      `🌐 **Área no site:** ${siteUrl('/pages/treinos.html')}`,
      '',
      'Clique no botão abaixo para abrir o formulário privado no Discord.'
    ].join('\n'))
    .setColor(0x8b5cf6)
    .setFooter({ text: `HNL • Partidas/Treinos • ${REFRESH_MARKER}` })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('training:open')
        .setLabel('Enviar partida/treino')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Primary)
    )]
  };
}

function detectPanel(message) {
  const text = [
    message.content || '',
    ...(message.embeds || []).flatMap((embed) => [
      embed.title || '',
      embed.description || '',
      embed.footer?.text || '',
      ...(embed.fields || []).flatMap((field) => [field.name || '', field.value || ''])
    ])
  ].join('\n');

  if (/Inscri[cç][aã]o Hollow Nexus|hollowform:start|Formul[áa]rios/i.test(text)) return 'form';
  if (/Central de Treinos|training:open|An[áa]lise de Partidas|Partidas\/Treinos/i.test(text)) return 'training';
  if (OLD_SITE_RE.test(text)) return 'old-link';
  return '';
}

function replaceOldText(value = '') {
  return String(value || '')
    .replace(OLD_SITE_REPLACE_RE, siteBaseUrl())
    .replace(OLD_TITLE_RE, (match) => {
      if (/Void Arena|Hollow Nexus Tournament|Hollow Nexus FRM/i.test(match)) return 'Hollow Nexus League';
      return 'Liga';
    });
}

async function updateKnownPanel(message, type) {
  if (!message?.editable) return false;
  if (type === 'form') {
    await message.edit(formPayload()).catch(() => null);
    return true;
  }
  if (type === 'training') {
    await message.edit(trainingPayload()).catch(() => null);
    return true;
  }
  if (type === 'old-link' && message.content) {
    await message.edit({ content: replaceOldText(message.content) }).catch(() => null);
    return true;
  }
  return false;
}

async function scanAndRefreshChannel(channel, client) {
  if (!channel?.messages?.fetch || !channel?.isTextBased?.()) return { checked: 0, updated: 0, deleted: 0 };
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const botMessages = Array.from(messages?.values?.() || []).filter((message) => message.author?.id === client.user?.id);
  let checked = 0;
  let updated = 0;
  let deleted = 0;
  const seenByType = new Set();

  for (const message of botMessages) {
    const type = detectPanel(message);
    if (!type) continue;
    checked += 1;

    if ((type === 'form' || type === 'training') && seenByType.has(type)) {
      await message.delete().catch(() => null);
      deleted += 1;
      continue;
    }

    if (type === 'form' || type === 'training') seenByType.add(type);
    const ok = await updateKnownPanel(message, type);
    if (ok) updated += 1;
  }

  return { checked, updated, deleted };
}

async function refreshPublicPanels(client, options = {}) {
  if (!client?.guilds?.cache || !client?.user) return { checked: 0, updated: 0, deleted: 0, channels: 0 };
  const targetChannelIds = new Set(String(
    options.channelIds ||
    process.env.PUBLIC_PANEL_CHANNEL_IDS ||
    process.env.PANEL_CHANNEL_IDS ||
    process.env.PLAYER_APPLICATION_PANEL_CHANNEL_ID ||
    process.env.APPLICATION_PANEL_CHANNEL_ID ||
    process.env.TRAINING_PANEL_CHANNEL_ID ||
    ''
  ).split(',').map((item) => item.trim()).filter(Boolean));

  const scanAll = String(process.env.PUBLIC_PANEL_SCAN_ALL || 'true').toLowerCase() !== 'false';
  let totals = { checked: 0, updated: 0, deleted: 0, channels: 0 };

  for (const guild of client.guilds.cache.values()) {
    const channels = Array.from(guild.channels.cache.values()).filter((channel) => (
      channel?.isTextBased?.() &&
      (scanAll || targetChannelIds.has(channel.id))
    ));

    for (const channel of channels) {
      const result = await scanAndRefreshChannel(channel, client).catch(() => ({ checked: 0, updated: 0, deleted: 0 }));
      if (result.checked || targetChannelIds.has(channel.id)) totals.channels += 1;
      totals.checked += result.checked || 0;
      totals.updated += result.updated || 0;
      totals.deleted += result.deleted || 0;
    }
  }

  console.log(`[Painéis] Refresh concluído: ${totals.updated} editado(s), ${totals.deleted} duplicado(s) apagado(s), ${totals.checked} mensagem(ns) checada(s).`);
  return totals;
}

function registerPublicPanelRefresh(client) {
  if (!client || client.__hollowPublicPanelRefreshRegistered) return client;
  client.__hollowPublicPanelRefreshRegistered = true;

  client.once(Events.ClientReady, () => {
    setTimeout(() => refreshPublicPanels(client).catch((error) => console.error('[Painéis] refresh:', error.message)), 9000).unref?.();
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      const content = String(message.content || '').trim().toLowerCase();
      if (!['.paineis-refresh', '.painéis-refresh', '.refresh-paineis', '.refresh-painéis'].includes(content)) return;
      if (!isStaff(message.member)) {
        await message.reply('❌ Apenas staff/admin pode atualizar os painéis públicos.');
        return;
      }
      const result = await refreshPublicPanels(client, { channelIds: message.channelId });
      await message.reply(`✅ Painéis revisados. Editados: **${result.updated}** • Apagados: **${result.deleted}** • Checados: **${result.checked}**.`);
    } catch (error) {
      await message.reply(`❌ Erro ao atualizar painéis: ${error.message}`).catch(() => null);
    }
  });

  return client;
}

module.exports = {
  registerPublicPanelRefresh,
  refreshPublicPanels,
  siteBaseUrl,
  siteUrl,
  formPayload,
  trainingPayload
};
