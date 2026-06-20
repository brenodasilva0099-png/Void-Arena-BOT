require('dotenv').config();

const { Client, GatewayIntentBits, Events } = require('discord.js');
const { createServer } = require('../server/app');
const { saveChatMessage, mergeChatMessageDiscordData, readChatBridgeSettings, readStatsBridgeSettings } = require('../server/storage');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const PORT = Number(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


function normalizeDiscordAttachmentForSite(attachment = {}) {
  return {
    url: attachment.url || '',
    proxyUrl: attachment.proxyURL || attachment.proxyUrl || '',
    name: attachment.name || 'arquivo',
    contentType: attachment.contentType || '',
    size: Number(attachment.size || 0) || 0,
    width: Number(attachment.width || 0) || 0,
    height: Number(attachment.height || 0) || 0
  };
}

function normalizeDiscordEmbedMediaForSite(embed = {}, index = 0) {
  const image = embed.image || embed.thumbnail || {};
  const url = image.url || image.proxyURL || image.proxyUrl || embed.url || '';

  if (!url) return null;

  return {
    url,
    proxyUrl: image.proxyURL || image.proxyUrl || '',
    name: embed.title || `embed-imagem-${index + 1}`,
    contentType: 'image/*',
    size: 0,
    width: Number(image.width || 0) || 0,
    height: Number(image.height || 0) || 0
  };
}

function extractDiscordMessageAttachments(message = {}) {
  const attachments = Array.from(message.attachments?.values?.() || [])
    .map(normalizeDiscordAttachmentForSite)
    .filter((attachment) => attachment.url || attachment.proxyUrl);

  const embedMedia = Array.from(message.embeds || [])
    .map(normalizeDiscordEmbedMediaForSite)
    .filter(Boolean);

  const seen = new Set();

  return [...attachments, ...embedMedia]
    .filter((attachment) => {
      const key = attachment.url || attachment.proxyUrl;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

async function refreshSavedDiscordMessage(savedMessageId, siteChannelId, discordChannelId, discordMessageId) {
  if (!savedMessageId || !siteChannelId || !discordChannelId || !discordMessageId || !client?.channels?.fetch) return;

  try {
    const channel = await client.channels.fetch(discordChannelId);
    const discordMessage = await channel?.messages?.fetch?.(discordMessageId);
    if (!discordMessage) return;

    const attachments = extractDiscordMessageAttachments(discordMessage);
    const nextContent = discordMessage.content || '';

    console.log(
      `[ponte] refresh ${discordMessageId}: content=${nextContent.length} attachments=${attachments.length}`
    );

    await mergeChatMessageDiscordData(savedMessageId, {
      content: nextContent,
      attachments
    }, {
      channelId: siteChannelId
    });
  } catch (error) {
    console.error('[ponte] Erro ao atualizar anexos da mensagem do Discord:', error.message);
  }
}


client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Bot online como ${readyClient.user.tag}`);

  if (CLIENT_ID) {
    console.log('🔗 Link para adicionar o bot no servidor:');
    console.log(
      `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=2147485696&integration_type=0&scope=bot`
    );
  }
});

client.on(Events.Error, (error) => {
  console.error('❌ Erro do Discord Client:', error);
});


client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const [chatBridge, statsBridge] = await Promise.all([
      readChatBridgeSettings(),
      readStatsBridgeSettings()
    ]);

    const bridges = [
      { label: 'chat', settings: chatBridge, fallbackChannelId: 'site-main' },
      { label: 'stats', settings: statsBridge, fallbackChannelId: 'stats-main' }
    ];

    const savedSiteChannels = new Set();

    for (const bridge of bridges) {
      const settings = bridge.settings || {};
      if (!settings.enabled || !settings.discordChannelId) continue;
      if (message.channelId !== settings.discordChannelId) continue;

      const siteChannelId = settings.siteChannelId || bridge.fallbackChannelId;
      if (savedSiteChannels.has(siteChannelId)) continue;
      savedSiteChannels.add(siteChannelId);

      const attachments = extractDiscordMessageAttachments(message);

      console.log(
        `[ponte] ${bridge.label}: mensagem ${message.id} content=${String(message.content || '').length} attachments=${attachments.length} embeds=${Array.from(message.embeds || []).length}`
      );

      const savedMessage = await saveChatMessage({
        channelId: siteChannelId,
        source: 'discord',
        authorId: message.author.id,
        authorName: message.member?.displayName || message.author.globalName || message.author.username,
        authorAvatar: message.author.displayAvatarURL({ size: 128 }),
        content: message.content || '',
        attachments,
        discordMessageId: message.id,
        discordChannelId: message.channelId,
        createdAt: message.createdAt?.toISOString?.() || new Date().toISOString()
      });

      // Algumas imagens chegam atrasadas no payload do Discord ou ficam vazias quando
      // o Message Content Intent não está ativo. Refazemos a busca pela mensagem
      // alguns segundos depois para recuperar attachments/embeds antes do site renderizar.
      setTimeout(() => {
        refreshSavedDiscordMessage(savedMessage.id, siteChannelId, message.channelId, message.id);
      }, 2500);
    }
  } catch (error) {
    console.error('❌ Erro ao salvar mensagem do Discord no banco:', error.message);
  }
});

const app = createServer({ client });

app.listen(PORT, () => {
  console.log(`🌐 Site Abyss Tourment rodando em: http://localhost:${PORT}`);
});

if (!TOKEN) {
  console.warn('⚠️ DISCORD_TOKEN não encontrado no .env.');
  console.warn('➡️ O site vai abrir normalmente, mas o bot não ficará online até preencher o token.');
} else {
  client.login(TOKEN).catch((error) => {
    console.error('❌ Falha ao conectar o bot no Discord:', error.message);
  });
}

process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não tratada:', error);
});
