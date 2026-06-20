# Void Arena v4.1_render_ready — Deploy no Render

## Objetivo

Esta versão prepara o site + bot para rodar online no Render usando Persistent Disk.

Local:
- banco em `data/`

Render:
- banco em `/var/data`
- configurar `DATA_DIR=/var/data`
- disco persistente montado em `/var/data`

## Render Web Service

Configuração recomendada:

- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Persistent Disk:
  - name: `void-arena-data`
  - mount path: `/var/data`
  - size: `1 GB` para começar

## Variáveis no Render

Configure em Environment:

```txt
NODE_ENV=production
DATA_DIR=/var/data
PORT=10000
SESSION_SECRET=troque-por-uma-chave-grande
DISCORD_TOKEN=token-do-bot
CLIENT_ID=application-id
DISCORD_CLIENT_ID=application-id
DISCORD_CLIENT_SECRET=client-secret
DISCORD_CALLBACK_URL=https://SEU-SERVICO.onrender.com/auth/discord/callback
```

## Discord Developer Portal

Em OAuth2 > Redirects, adicione:

```txt
https://SEU-SERVICO.onrender.com/auth/discord/callback
```

Em Bot > Privileged Gateway Intents, ative:

```txt
Server Members Intent
Message Content Intent
```

## Banco persistente

Na primeira inicialização no Render, se `/var/data/abyss-tournament-db.json` não existir, o sistema copia a base local de `data/abyss-tournament-db.json` para o disco persistente.

Depois disso, times, configs, chats e chaveamento passam a ser salvos no disco persistente do Render.
