const { Events } = require('discord.js');

const REMATCH_ANNOUNCEMENT_CHANNEL_ID = '1494883146116890697';
const VOID_ARENA_ROLE_ID = '1523438475716853851';
const CAPTAIN_ROLE_ID = '1500546857460564158';
const LOBBY_CHANNEL_ID = '1523440429167677511';
const ANNOUNCEMENT_MARKER = 'void-arena-login-cadastro-2026-07-10';

const ANNOUNCEMENT_CONTENT = [
  '📢 **Aviso importante — Void Arena / Cadastro no site**',
  '',
  '- Todos os jogadores e capitães devem usar o site da Void Arena logando com a própria conta do Discord:',
  '',
  '🔗 **Site:** https://void-arena-site.onrender.com',
  '',
  'O login com Discord é importante porque libera mais benefícios e deixa tudo mais fácil de usar, como:',
  '',
  '• perfil público do jogador;',
  '• vínculo correto com o time;',
  '• notificações de recrutamento;',
  '• convites para entrar em times;',
  '• aceite ou recusa de convites pelo próprio site;',
  '• participação em eventos, rankings e organização da competição.',
  '',
  '---',
  '',
  '🏷️ **Cargo Void Arena**',
  '',
  `Todos os jogadores e capitães precisam resgatar o cargo **<@&${VOID_ARENA_ROLE_ID}>** no chat lobby:`,
  '',
  `➡️ **Lobby:** <#${LOBBY_CHANNEL_ID}>`,
  '',
  'Esse cargo ajuda o site e a organização a identificar quem faz parte da Void Arena.',
  '',
  '---',
  '',
  '🛡️ **Capitães de Times**',
  '',
  `Os capitães com o cargo **<@&${CAPTAIN_ROLE_ID}>** devem cadastrar o time no site.`,
  '',
  'No site, façam assim:',
  '',
  '1. Entrem com a conta do Discord.',
  '2. Abram a página **Times**.',
  '3. Cliquem em **Abrir cadastro**.',
  '4. Coloquem:',
  '   • nome do time;',
  '   • tag do time;',
  '   • diretor/dono do time;',
  '   • capitão;',
  '   • titulares;',
  '   • reservas;',
  '   • logo/escudo;',
  '   • conexões do time, se tiver.',
  '',
  '⚠️ Importante: os membros do time e os capitães precisam estar logados/registrados no site com a conta do Discord.',
  '',
  'Quando um jogador cadastrado for selecionado para entrar no time, ele não entra automaticamente. Ele recebe um convite nas notificações do site e também pode receber DM no Discord. O jogador precisa aceitar o convite para ser vinculado ao elenco.',
  '',
  '---',
  '',
  '✅ **Resumo:**',
  '',
  `• Jogadores: entrem no site com Discord e resgatem o cargo Void Arena **<@&${VOID_ARENA_ROLE_ID}>**.`,
  '• Capitães: entrem no site, cadastrem o time e adicionem titulares/reservas corretamente.',
  '• Todos os membros dos times precisam estar registrados no site.',
  `• O cargo **<@&${CAPTAIN_ROLE_ID}>** identifica os capitães responsáveis pelos cadastros.`,
  '',
  'Qualquer dúvida, chamem a organização.',
  '',
  `-# ${ANNOUNCEMENT_MARKER}`
].join('\n');

async function alreadySent(channel) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return false;
  return messages.some((message) => (
    message.author?.id === channel.client.user?.id &&
    String(message.content || '').includes(ANNOUNCEMENT_MARKER)
  ));
}

async function sendRematchAnnouncement(client) {
  const channel = await client.channels.fetch(REMATCH_ANNOUNCEMENT_CHANNEL_ID).catch((error) => {
    console.error('[Rematch Aviso] Canal não encontrado:', error.message);
    return null;
  });

  if (!channel?.isTextBased?.()) {
    console.error('[Rematch Aviso] Canal inválido ou sem suporte a texto.');
    return { success: false, reason: 'invalid_channel' };
  }

  if (await alreadySent(channel)) {
    console.log('[Rematch Aviso] Aviso já enviado anteriormente. Pulando duplicata.');
    return { success: true, skipped: true, reason: 'already_sent' };
  }

  const message = await channel.send({
    content: ANNOUNCEMENT_CONTENT,
    allowedMentions: {
      roles: [VOID_ARENA_ROLE_ID, CAPTAIN_ROLE_ID],
      users: [],
      repliedUser: false
    }
  });

  console.log(`[Rematch Aviso] Aviso enviado no canal ${REMATCH_ANNOUNCEMENT_CHANNEL_ID}: ${message.id}`);
  return { success: true, messageId: message.id };
}

function installRematchAnnouncement(client) {
  if (!client || client.__voidArenaRematchAnnouncementInstalled) return;
  client.__voidArenaRematchAnnouncementInstalled = true;

  client.once(Events.ClientReady, () => {
    setTimeout(() => {
      sendRematchAnnouncement(client).catch((error) => {
        console.error('[Rematch Aviso] Falha ao enviar aviso:', error.message);
      });
    }, 12000).unref?.();
  });
}

module.exports = {
  installRematchAnnouncement,
  sendRematchAnnouncement
};
