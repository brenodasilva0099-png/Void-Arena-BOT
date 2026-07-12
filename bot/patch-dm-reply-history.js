const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'discordClient.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (src.includes("const { Client, GatewayIntentBits, Events } = require('discord.js');")) {
  src = src.replace("const { Client, GatewayIntentBits, Events } = require('discord.js');", "const { Client, GatewayIntentBits, Events, Partials } = require('discord.js');");
  changed = true;
}

if (!src.includes('GatewayIntentBits.DirectMessages')) {
  src = src.replace('GatewayIntentBits.GuildVoiceStates', 'GatewayIntentBits.GuildVoiceStates,\n      GatewayIntentBits.DirectMessages');
  changed = true;
}

if (!src.includes('partials: [Partials.Channel]')) {
  src = src.replace('    intents: [', '    partials: [Partials.Channel],\n    intents: [');
  changed = true;
}

if (!src.includes('voidarena_dm_log') || !src.includes('direction: \'inbound\'')) {
  const marker = '  client.on(Events.MessageCreate, async (message) => {\n    try {\n      if (!message.guild || message.author.bot) return;';
  const replacement = `  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild && !message.author?.bot) {
        const createdAt = message.createdAt?.toISOString?.() || new Date().toISOString();
        const discordId = message.author?.id || '';
        const attachments = extractDiscordMessageAttachments(message);
        await saveChatMessage({
          channelId: 'voidarena-dm-' + discordId,
          source: 'discord-dm',
          authorId: discordId,
          authorName: message.author?.globalName || message.author?.username || discordId || 'Jogador',
          authorAvatar: message.author?.displayAvatarURL?.({ size: 128 }) || '',
          content: JSON.stringify({
            type: 'voidarena_dm_log',
            direction: 'inbound',
            discordId,
            text: String(message.content || '').slice(0, 1800),
            deliveredToDiscord: true,
            discordChannelId: message.channelId || '',
            discordMessageId: message.id || '',
            meta: { type: 'player_dm_reply' },
            createdAt
          }),
          attachments,
          discordMessageId: message.id || '',
          discordChannelId: message.channelId || '',
          createdAt
        });
        return;
      }

      if (!message.guild || message.author.bot) return;`;
  if (src.includes(marker)) {
    src = src.replace(marker, replacement);
    changed = true;
  }
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: respostas de DM passam a entrar no histórico.' : 'Patch ignorado: histórico de respostas de DM já ativo.');
