# Void Arena BOT v4.8 — separado do site

Este ZIP contém apenas o bot Discord do Void Arena.

## O que pertence ao BOT

- `bot/index.js` — inicializador do bot + API interna.
- `bot/discordClient.js` — client Discord, intents e eventos.
- `bot/internalApi.js` — ponte interna usada pelo site para listar canais/cargos, enviar mensagens e importar histórico.
- `server/storage.js` — acesso ao banco JSON compartilhado.
- `data/` — seed/base local do banco.

## Como o BOT conversa com o SITE

O bot abre uma API interna em:

```env
BOT_API_PORT=3002
```

O site usa:

```env
BOT_API_URL=http://localhost:3002
```

## Banco compartilhado

Use o mesmo `DATA_DIR` no site e no bot:

```env
DATA_DIR=../VoidArena_SHARED_DB
```

Assim mensagens, eventos, times e configurações ficam no mesmo banco JSON local.

## Rodar local em Bash

```bash
cd "$HOME/Downloads/Void_Arena_BOT_v4.8" && npm install && DATA_DIR="$HOME/Downloads/VoidArena_SHARED_DB" BOT_API_PORT=3002 npm start
```

## Segurança da API interna

Opcionalmente defina o mesmo token nos dois `.env`:

```env
INTERNAL_API_TOKEN=uma-chave-grande-aqui
```

## Render

Se SITE e BOT forem serviços separados no Render, o banco JSON com disco local NÃO será compartilhado entre serviços. Para produção 100% separada, use banco externo real ou mantenha os dois runtimes no mesmo serviço combinado.
