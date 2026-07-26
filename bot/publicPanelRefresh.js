const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits
} = require('discord.js');

const DEFAULT_SITE_URL = 'https://hollownexus.com.br';
const REFRESH_MARKER = 'hollow-nexus-public-panels-v7-canonical-audit';
const OLD_SITE_RE = /https:\/\/(?:void-arena-site(?:-[a-z0-9]+)?|hollow-nexus-league)\.onrender\.com/i;
const OLD_SITE_REPLACE_RE = /https:\/\/(?:void-arena-site(?:-[a-z0-9]+)?|hollow-nexus-league)\.onrender\.com/gi;
const OLD_TITLE_RE = /Void Arena|Hollow Nexus Tournament|Hollow Nexus FRM|Federa[cç][aã]o/gi;

function cleanBaseUrl(value = '') {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';
  return raw;
}

function isOldSiteUrl(value = '') {
  const raw = String(value || '');
  return /(?:void-arena-site(?:-[a-z0-9]+)?|hollow-nexus-league)\.onrender\.com/i.test(raw);
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
      'Você pode escolher como preencher:',
      '1️⃣ **Pelo Discord** — abre o formulário em etapas aqui no servidor.',
      '2️⃣ **Pelo navegador** — abre o formulário direto no site.',
      '',
      `🌐 **Formulários no site:** ${siteUrl('/pages/formularios.html')}`,
      `🧾 **Inscrição direta:** ${siteUrl('/pages/inscricao.html')}`
    ].join('\n'))
    .setColor(0x8b5cf6)
    .setFooter({ text: `HNL • Formulários • ${REFRESH_MARKER}` })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('hollowform:start')
        .setLabel('Preencher pelo Discord')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setLabel('Abrir no navegador')
        .setEmoji('🌐')
        .setURL(siteUrl('/pages/inscricao.html'))
        .setStyle(ButtonStyle.Link)
    )]
  };
}

function trainingPayload() {
  const embed = new EmbedBuilder()
    .setTitle('🎥 Central de Partidas e Treinos')
    .setDescription([
      'Envie vídeos de treino/partidas para análise da equipe.',
      '',
      `🌐 **Área no site:** ${siteUrl('/pages/analise-partidas.html')}`,
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

function componentText(message) {
  return (message.components || [])
    .flatMap((row) => row.components || [])
    .flatMap((component) => [
      component.customId || component.custom_id || '',
      component.label || '',
      component.url || ''
    ])
    .join('\n');
}

function detectPanel(message) {
  const text = [
    message.content || '',
    componentText(message),
    ...(message.embeds || []).flatMap((embed) => [
      embed.title || '',
      embed.description || '',
      embed.footer?.text || '',
      ...(embed.fields || []).flatMap((field) => [field.name || '', field.value || ''])
    ])
  ].join('\n');

  if (/Formul[áa]rio de Inscri[cç][aã]o|Inscri[cç][aã]o\s*(?:•|—|-)?\s*Hollow Nexus|Inscri[cç][aã]o Hollow Nexus|hollowform:start|Formul[áa]rios|Preencher inscri[cç][aã]o|Preencher pelo Discord|Abrir no navegador|Voc[eê] pode preencher pelo Discord/i.test(text)) return 'form';
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

function replaceOldValues(value) {
  if (typeof value === 'string') return replaceOldText(value);
  if (Array.isArray(value)) return value.map(replaceOldValues);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceOldValues(item)]));
}

function messageUsesCurrentPanel(message) {
  return (message.embeds || []).some((embed) => String(embed.footer?.text || '').includes(REFRESH_MARKER));
}

async function updateKnownPanel(message, type) {
  if (!message?.editable) return false;
  if (type === 'form') {
    if (messageUsesCurrentPanel(message)) return false;
    await message.edit(formPayload()).catch(() => null);
    return true;
  }
  if (type === 'training') {
    if (messageUsesCurrentPanel(message)) return false;
    await message.edit(trainingPayload()).catch(() => null);
    return true;
  }
  if (type === 'old-link') {
    const payload = {
      content: message.content || '',
      embeds: (message.embeds || []).map((embed) => embed.toJSON?.() || embed),
      components: (message.components || []).map((row) => row.toJSON?.() || row)
    };
    const updated = replaceOldValues(payload);
    if (JSON.stringify(updated) === JSON.stringify(payload)) return false;
    await message.edit(updated).catch(() => null);
    return true;
  }
  return false;
}

async function fetchRecentMessages(channel, maxMessages = 100) {
  const target = Math.max(1, Math.min(1000, Number(maxMessages || 100)));
  const messages = [];
  let before = '';

  while (messages.length < target) {
    const limit = Math.min(100, target - messages.length);
    const page = await channel.messages.fetch({ limit, ...(before ? { before } : {}) }).catch(() => null);
    const values = Array.from(page?.values?.() || []);
    if (!values.length) break;
    messages.push(...values);
    before = values[values.length - 1]?.id || '';
    if (values.length < limit || !before) break;
  }

  return messages;
}

async function scanAndRefreshChannel(channel, client, options = {}) {
  if (!channel?.messages?.fetch || !channel?.isTextBased?.()) return { checked: 0, updated: 0, deleted: 0 };
  const messages = await fetchRecentMessages(channel, options.maxMessages || 100);
  const botMessages = messages.filter((message) => message.author?.id === client.user?.id);
  let checked = 0;
  let updated = 0;
  let deleted = 0;
  const seenByType = new Set();
  const removeDuplicates = options.removeDuplicates !== false;

  for (const message of botMessages) {
    const type = detectPanel(message);
    if (!type) continue;
    checked += 1;

    if (removeDuplicates && (type === 'form' || type === 'training') && seenByType.has(type)) {
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
  const targetChannelIds = new Set(String(options.channelIds || '').split(',').map((item) => item.trim()).filter(Boolean));
  const allGuildChannels = options.allGuildChannels === true;
  if (!targetChannelIds.size && !allGuildChannels) {
    return { checked: 0, updated: 0, deleted: 0, channels: 0, skipped: true, reason: 'manual_channel_required' };
  }

  let totals = { checked: 0, updated: 0, deleted: 0, channels: 0 };

  for (const guild of client.guilds.cache.values()) {
    const channels = Array.from(guild.channels.cache.values()).filter((channel) => (
      channel?.isTextBased?.() && (allGuildChannels || targetChannelIds.has(channel.id))
    ));

    for (const channel of channels) {
      const result = await scanAndRefreshChannel(channel, client, options).catch(() => ({ checked: 0, updated: 0, deleted: 0 }));
      totals.channels += 1;
      totals.checked += result.checked || 0;
      totals.updated += result.updated || 0;
      totals.deleted += result.deleted || 0;
    }
  }

  console.log(`[Painéis/Manual] Refresh concluído: ${totals.updated} editado(s), ${totals.deleted} duplicado(s) apagado(s), ${totals.checked} mensagem(ns) checada(s).`);
  return totals;
}

function registerPublicPanelRefresh(client) {
  if (!client || client.__hollowPublicPanelRefreshRegistered) return client;
  client.__hollowPublicPanelRefreshRegistered = true;

  client.once(Events.ClientReady, (readyClient) => {
    const timer = setTimeout(() => {
      refreshPublicPanels(readyClient, {
        allGuildChannels: true,
        maxMessages: 300,
        removeDuplicates: false
      }).catch((error) => console.error('[Painéis/Auditoria] Falha ao revisar mensagens do BOT:', error.message));
    }, 12000);
    timer.unref?.();
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      const content = String(message.content || '').trim().toLowerCase();
      const [command, scope = ''] = content.split(/\s+/);
      if (!['.paineis-refresh', '.painéis-refresh', '.refresh-paineis', '.refresh-painéis', '.formulario-refresh', '.formulário-refresh', '.inscricao-refresh', '.inscrição-refresh'].includes(command)) return;
      if (!isStaff(message.member)) {
        await message.reply('❌ Apenas staff/admin pode atualizar os painéis públicos.');
        return;
      }
      const scanAll = ['all', 'todos', 'servidor'].includes(scope);
      const result = await refreshPublicPanels(client, scanAll
        ? { allGuildChannels: true, maxMessages: 500, removeDuplicates: false }
        : { channelIds: message.channelId, maxMessages: 500 });
      await message.reply(`✅ Painéis revisados manualmente em **${result.channels}** canal(is). Editados: **${result.updated}** • Apagados: **${result.deleted}** • Checados: **${result.checked}**.`);
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
