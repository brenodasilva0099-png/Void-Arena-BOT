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

if (!src.includes('partials: [Partials.Channel')) {
  src = src.replace('    intents: [', '    partials: [Partials.Channel, Partials.Message, Partials.User],\n    intents: [');
  changed = true;
} else if (src.includes('partials: [Partials.Channel]')) {
  src = src.replace('partials: [Partials.Channel]', 'partials: [Partials.Channel, Partials.Message, Partials.User]');
  changed = true;
}

if (!src.includes('__voidArenaDmReplyCaptureInstalled')) {
  const listener = [
    '',
    '  if (!client.__voidArenaDmReplyCaptureInstalled) {',
    '    client.__voidArenaDmReplyCaptureInstalled = true;',
    '    client.on(Events.MessageCreate, async (message) => {',
    '      try {',
    '        if (message.guild || message.author?.bot) return;',
    '        if (message.partial && typeof message.fetch === \'function\') {',
    '          try { message = await message.fetch(); } catch {}',
    '        }',
    '        const createdAt = message.createdAt?.toISOString?.() || new Date().toISOString();',
    '        const discordId = String(message.author?.id || \'\').trim();',
    '        if (!/^\\d{16,22}$/.test(discordId)) return;',
    '        const attachments = extractDiscordMessageAttachments(message);',
    '        await saveChatMessage({',
    "          channelId: 'voidarena-dm-' + discordId,",
    "          source: 'discord-dm',",
    '          authorId: discordId,',
    "          authorName: message.author?.globalName || message.author?.username || discordId || 'Jogador',",
    '          authorAvatar: message.author?.displayAvatarURL?.({ size: 128 }) || \'\',',
    '          content: JSON.stringify({',
    "            type: 'voidarena_dm_log',",
    "            direction: 'inbound',",
    '            discordId,',
    '            text: String(message.content || \'\').slice(0, 1800),',
    '            deliveredToDiscord: true,',
    '            discordChannelId: message.channelId || \'\',',
    '            discordMessageId: message.id || \'\',',
    "            meta: { type: 'player_dm_reply', capturedBy: 'dedicated_dm_listener' },",
    '            createdAt',
    '          }),',
    '          attachments,',
    '          discordMessageId: message.id || \'\',',
    '          discordChannelId: message.channelId || \'\',',
    '          createdAt',
    '        });',
    "        console.log('[DM] Resposta registrada de ' + discordId);",
    '      } catch (error) {',
    "        console.error('[DM] Falha ao registrar resposta:', error.message);",
    '      }',
    '    });',
    '  }',
    ''
  ].join('\n');

  src = src.replace('  client.on(Events.Error, (error) => {\n    console.error(\'❌ Erro do Discord Client:\', error);\n  });', '  client.on(Events.Error, (error) => {\n    console.error(\'❌ Erro do Discord Client:\', error);\n  });' + listener);
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: captura dedicada de respostas por DM ativa.' : 'Patch ignorado: captura dedicada de respostas por DM ja ativa.');
