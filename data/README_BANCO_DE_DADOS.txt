BANCO DE DADOS LOCAL — ABYSS TOURMENT GAME

Arquivo principal:
- data/abyss-tournament-db.json

Este arquivo agora centraliza os dados do bot e do site:
- usuários/login
- perfis públicos
- redes sociais
- times cadastrados
- chaveamento
- configurações do torneio
- configurações da ponte Discord ↔ Site
- mensagens do chat

Arquivos antigos mantidos como espelho/backup:
- data/users.json
- data/teams.json
- data/bracket.json

Configuração da ponte de chat:
- settings.chatBridge.enabled
- settings.chatBridge.siteChannelId
- settings.chatBridge.discordChannelId

Observação:
Este é um banco local em JSON para desenvolvimento e testes. Para deploy público com muito acesso, o próximo passo ideal é migrar o mesmo esquema para PostgreSQL/SQLite gerenciado.
