const REMATCH_ANNOUNCEMENT_CHANNEL_ID = '1494883146116890697';
const VOID_ARENA_ROLE_ID = '1523438475716853851';
const CAPTAIN_ROLE_ID = '1500546857460564158';
const LOBBY_CHANNEL_ID = '1523440429167677511';
const ANNOUNCEMENT_MARKER = 'void-arena-login-cadastro-2026-07-10-v2';
let sendInProgress = false;

const ANNOUNCEMENT_PARTS = [
  [
    '📢 **Aviso importante — Void Arena / Cadastro no site**',
    '',
    '- Todos os jogadores e capitães devem usar o site da Void Arena logando com a própria conta do Discord:',
    '',
    '🔗 **Site:** https://hollow-nexus-league.onrender.com',
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
    'Esse cargo ajuda o site e a organização a identificar quem faz parte da Void Arena.'
  ].join('\n'),
  [
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
  ].join('\n')
];

async function alreadySent(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 75 });
    return messages.some((message) => (
      message.author?.id === channel.client.user?.id &&
      String(message.content || '').includes(ANNOUNCEMENT_MARKER)
    ));
  } catch (error) {
    console.warn('[Rematch Aviso] Não consegui verificar duplicata:', error.message);
    return true;
  }
}

async function sendRematchAnnouncement(client, options = {}) {
  if (sendInProgress) return { success: true, skipped: true, reason: 'in_progress' };
  sendInProgress = true;

  try {
    const channel = await client.channels.fetch(REMATCH_ANNOUNCEMENT_CHANNEL_ID).catch((error) => {
      console.error('[Rematch Aviso] Canal não encontrado:', error.message);
      return null;
    });

    if (!channel?.isTextBased?.()) {
      return { success: false, reason: 'invalid_channel' };
    }

    if (!options.force && await alreadySent(channel)) {
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    const sentMessages = [];
    for (const content of ANNOUNCEMENT_PARTS) {
      const message = await channel.send({
        content,
        allowedMentions: {
          roles: [VOID_ARENA_ROLE_ID, CAPTAIN_ROLE_ID],
          users: [],
          repliedUser: false
        }
      });
      sentMessages.push(message.id);
    }

    return { success: true, messageIds: sentMessages };
  } finally {
    sendInProgress = false;
  }
}

function installRematchAnnouncement(client) {
  if (!client || client.__voidArenaRematchAnnouncementInstalled) return client;
  client.__voidArenaRematchAnnouncementInstalled = true;
  console.log('[Rematch Aviso] Envio automático no boot desativado. O aviso só pode ser enviado por ação manual explícita.');
  return client;
}

module.exports = {
  installRematchAnnouncement,
  sendRematchAnnouncement
};
