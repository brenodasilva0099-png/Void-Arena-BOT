# Painéis do Bot

Etapa 5.0: o painel de controle principal ainda fica em `bot/controlPanel.js` para evitar quebrar runtime.

Próxima etapa segura: mover o código para módulos menores:

- `panels/controlPanel.view.js`
- `panels/controlPanel.permissions.js`
- `panels/controlPanel.backups.js`
- `panels/controlPanel.results.js`

O painel atual já possui botões de Resultados e Permissões.
