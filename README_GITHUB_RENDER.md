# Void Arena BOT v4.11 — GitHub/Render

Este ZIP é a versão repo-ready do BOT separado.

## O que subir no GitHub

Suba esta pasta como repositório do BOT. Não suba `.env`, `node_modules`, `package-lock.json` nem `data/*.json`.

## Render — Web Service do BOT

- Build Command: `npm install`
- Start Command: `npm start`

Variáveis obrigatórias:

```env
DISCORD_TOKEN=token_do_bot
CLIENT_ID=application_id_do_bot
BOT_API_KEY=mesma-chave-secreta-do-site
DATA_DIR=/var/data
```

No Render, crie um Persistent Disk e monte em `/var/data` para o banco JSON não zerar nos redeploys.

O BOT é o dono do banco JSON e expõe a API interna protegida para o SITE.
