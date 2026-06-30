# Void Arena BOT 5.0.1

Esta versão acompanha o SITE 5.0.1.

## Garantido nesta etapa

- Painel `.painel-controle` com botões de Resultados e Permissões.
- HUBs de resultado mantidas e sincronizáveis pelo SITE.
- Endpoints de backup GitHub disponíveis para o SITE:
  - `GET /internal/backup/github/latest`
  - `POST /internal/backup/github/export`
  - `POST /internal/backup/github/restore-latest`
- API interna de saúde mantida em `GET /internal/health`.

## Regra

O BOT continua dono do banco/backup. O SITE apenas consulta e aciona pelo token interno.
