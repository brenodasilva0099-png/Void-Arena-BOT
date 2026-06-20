# Void Arena v4.4 — Eventos + Screens + persistência

Esta versão parte da `v4.3_player_home_bracket_button`.

## Alterações principais

- A tela inicial dos jogadores mantém o Coliseu como evento em destaque, mas agora a lista de inscritos é validada pelo banco de dados.
- `Times inscritos` mostra somente times realmente inscritos no evento `coliseu-void-arena`.
- Criada área pública `Times cadastrados`, mostrando todos os times cadastrados no site.
- O botão lateral `Times` virou `Screens`.
- A antiga criação de chat escolhendo dois times foi substituída por conversa direta entre usuários cadastrados, semelhante a direct.
- O perfil público do jogador ganhou botão `Abrir screen`.
- O botão duplicado `Cadastrar time` do topo foi removido; o cadastro fica na área inicial dos eventos.
- O botão `Música` foi removido da lateral.
- O guia de participação foi movido para `Como usar`.
- `Regras` fica em branco por enquanto.
- `Chat do torneio` virou apenas `Chat`.
- Ao vincular canal em `Chat` ou `Estatísticas`, o sistema tenta importar até 100 mensagens antigas do canal Discord.

## Persistência no Render

O `render.yaml` já mantém disco persistente:

- `DATA_DIR=/var/data`
- disk `void-arena-data`

Assim, os times, eventos, inscrições, chats e perfis ficam preservados entre deploys, desde que o serviço Render continue usando o mesmo disco.

## Comando único local

```bash
cd "$HOME/Downloads" && rm -rf "Abyss_Tourment_Game_v4.4_eventos_screens_persistente" && unzip -q "Abyss_Tourment_Game_v4.4_eventos_screens_persistente.zip" && cd "Abyss_Tourment_Game_v4.4_eventos_screens_persistente/Abyss Tourment Game" && npm install && npm start
```
