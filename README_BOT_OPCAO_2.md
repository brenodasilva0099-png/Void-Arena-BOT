# Void Arena BOT v4.9 — Opção 2

Nesta versão o BOT é o dono do banco central JSON e expõe uma API interna protegida para o SITE.

## Variáveis principais

```env
BOT_API_PORT=3002
BOT_API_KEY=use-a-mesma-chave-do-site
DATA_DIR=/var/data
```

Localmente você pode usar outro DATA_DIR compartilhado/persistente.
No Render, use Disk persistente no serviço do BOT e configure `DATA_DIR=/var/data`.

## Rodar local

```bash
npm install
BOT_API_PORT=3002 BOT_API_KEY="sua-chave" DATA_DIR="$HOME/Downloads/VoidArena_BOT_DB" npm start
```

## Rotas internas

- `GET /internal/health`
- `POST /internal/storage/:method`
- rotas Discord já existentes, como canais, menções, enviar mensagem e importar histórico.
