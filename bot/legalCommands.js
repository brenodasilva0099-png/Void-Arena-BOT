const { EmbedBuilder, Events } = require('discord.js');

const SITE_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '');

function legalEmbed() {
  return new EmbedBuilder()
    .setTitle('📜 Termos e Privacidade • Void Arena')
    .setColor(0x22d3ee)
    .setDescription([
      'Use os links abaixo para consultar as regras de uso do site, bot, eventos, rankings, filas, validações e tratamento de dados.',
      '',
      `📜 **Termos de Uso:** ${SITE_URL}/pages/termos.html`,
      `🔐 **Política de Privacidade:** ${SITE_URL}/pages/privacidade.html`,
      '',
      '© 2026 Void Arena / Hollow Nexus. Todos os direitos reservados.',
      '',
      'A Void Arena / Hollow Nexus não é afiliada, patrocinada, endossada ou administrada pelo Discord, Steam, EA, Xbox, TikTok, Spotify, Riot, PlayStation Network ou outras plataformas citadas.'
    ].join('\n'))
    .setFooter({ text: 'Void Arena • Legal' })
    .setTimestamp(new Date());
}

function registerLegalCommands(client) {
  if (!client || client.__voidArenaLegalRegistered) return client;
  client.__voidArenaLegalRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      const content = String(message.content || '').trim().toLowerCase();
      if (!['.termos', '!termos', '.privacidade', '!privacidade', '.legal', '!legal'].includes(content)) return;
      await message.reply({ embeds: [legalEmbed()], allowedMentions: { parse: [] } });
    } catch (error) {
      console.error('❌ Erro ao enviar termos/privacidade:', error.message);
    }
  });

  return client;
}

module.exports = { registerLegalCommands, legalEmbed };
