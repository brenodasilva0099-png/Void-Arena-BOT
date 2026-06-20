# v4.4_eventos_screens_persistente

- Tela inicial dos jogadores agora usa inscrições reais do evento Coliseu Void Arena.
- Lista "Times inscritos" valida o cadastro em `events.registrations`, não mais exemplo fixo.
- Adicionada seção pública "Times cadastrados" com perfis públicos dos times.
- Botão lateral "Times" renomeado para "Screens".
- Modal antigo de chat entre dois times trocado para sistema de screen/direct entre usuários cadastrados.
- Perfil público do jogador ganhou botão "Abrir screen".
- Botão duplicado "Cadastrar time" removido do topo; cadastro fica na tela inicial/evento.
- Botão "Música" removido da lateral.
- Guia "Inscrição guiada" movido para "Como usar".
- Modal "Regras" deixado em branco por enquanto.
- Chat do torneio renomeado para "Chat".
- Estatísticas e Chat importam até 100 mensagens antigas do Discord ao vincular canal.
- Mantido uso de `DATA_DIR=/var/data` no Render para preservar times/dados entre deploys.

# Registro de versões — Void Arena / Abyss Tourment Game

## v3.8 — Base funcional
- Chat do torneio com ponte Discord ↔ Site.
- Chat entre times.
- Banco central JSON.
- Painel de música.
- Sidebar com Como usar, Chat, Times, Estatísticas, Música e Termos.
- Times/chaveamento usando banco local.

## v3.9 — Mídias do Discord no site
- Corrige prints/imagens/anexos enviados no Discord que apareciam como mensagem vazia no site.
- Mantém renderização de imagem/anexo no Chat e em Estatísticas.
- Adiciona hidratação automática: se uma mensagem antiga foi salva sem anexo, o site tenta buscar a mensagem original no Discord pelo ID e preencher os anexos no banco.
- Mantém `.env` incluído no ZIP local quando fornecido pelo usuário.
- Mantém os times cadastrados no banco.
- Não altera o chaveamento.

## Padrão a partir daqui
- Usar versões cheias: v3.9, v4.0, v4.1...
- Evitar versões tipo v3.8.2 / v3.8.9.

## v4.0 — Correção robusta de imagens/anexos do Discord no site

- Base: v3.9.
- Mantém a sidebar H / Midnight Blend.
- Mantém Chat e Estatísticas vinculados ao Discord.
- Corrige captura de imagens/prints enviadas no canal vinculado.
- Captura anexos e também imagens vindas de embeds.
- Refaz a busca da mensagem no Discord alguns segundos depois para recuperar anexos que chegam atrasados.
- O site tenta hidratar mensagens vazias usando `discordMessageId` e `discordChannelId`.
- Se o Discord mandar payload vazio, o site mostra aviso de diagnóstico em vez de parecer mensagem quebrada.
- Inclui `.env` enviado pelo usuário na raiz do projeto local.

## v4.1_render_ready

- Base: v4.0.
- Preparado para Render com Persistent Disk.
- `DATA_DIR=/var/data` no Render.
- Banco JSON continua funcionando localmente e no Render.
- Adicionado `render.yaml`.
- Adicionado `/api/health`.
- Adicionado limite de times no modelo do torneio: 4, 8, 16 ou 32.
- Adicionada quantidade de grupos: 2, 4 ou 8.
- Adicionada prévia/organização da fase de grupos.
- Ao gerar chaveamento, o backend tenta criar canais privados no Discord para confrontos completos das oitavas.
- Canais privados recebem permissão apenas para bot + Discord IDs vinculados aos jogadores/capitães dos dois times.
- `.env` incluído no ZIP local conforme solicitação do usuário.

## v4.2_player_event_views_preview

- Base: v4.1_render_ready.
- Adicionada página de prévia para área dos jogadores/membros.
- Nova rota visual: `/pages/player-event-views.html`.
- Criadas 5 versões de layout para substituir o chaveamento para jogadores:
  1. Central de Eventos.
  2. Painel do Capitão.
  3. Agenda de Campeonatos.
  4. Lobby Competitivo.
  5. Inscrição Guiada.
- Não altera ainda o painel oficial de ADM.
- Não remove o chaveamento.
- Serve para testar visual/uso antes de escolher a versão final.

## v4.3_player_home_bracket_button

- Base: v4.2_player_event_views_preview.
- Removida a imagem gigante/solta do topo da página de prévia dos jogadores.
- A tela de eventos/participação foi implementada como tela inicial do painel.
- O chaveamento atual não foi removido; ele ficou em uma segunda tela acessada pelo botão `Chaveamento`.
- Adicionado botão `Ver chaveamento` na tela inicial.
- Adicionado botão `Voltar aos eventos` dentro da tela de chaveamento.
- Mantidas as funções atuais de times, ranking, chat, estatísticas, configuração do torneio e chaveamento.
