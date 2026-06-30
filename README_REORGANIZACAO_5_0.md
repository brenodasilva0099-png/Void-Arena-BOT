# Void Arena BOT 5.0 — Reorganização Base

Esta versão estabiliza o BOT para acompanhar o SITE 5.0.

## Estado atual

- `bot/controlPanel.js` contém o painel `.painel-controle` com:
  - Atualizar
  - Backup agora
  - Restaurar seguro
  - Backups
  - Formulários
  - Partidas
  - Resultados
  - Permissões
- `bot/matchResults.js` mantém a criação de HUBs de resultado.
- `bot/internalApi.js` expõe `/internal/results/sync-hubs` para o site.
- `server/storage.js` mantém `readRolePermissions`/`writeRolePermissions`.

## Próxima etapa

Mover o painel para arquivos menores dentro de `bot/panels/` sem alterar comportamento.

## 5.0.3
- HUB única por confronto.
- Série MD1/MD3/MD5 com placar por jogo.
- Avanço no chaveamento apenas quando a série fecha.
- Resultados aparecem no site com histórico por partida.
