# Persistência e backups do Void Arena

Este projeto usa o BOT como dono do banco central. O SITE separado chama a API interna do BOT para ler e salvar usuários, times, perfis, eventos, inscrições, resultados, chats e configurações.

## Objetivo

Garantir que as informações continuem salvas entre deploys, correções e atualizações:

- login/contas de usuário;
- perfil público do usuário;
- redes sociais e conexões;
- times criados;
- perfil público dos times;
- jogadores/reservas dos times;
- inscrições em eventos;
- eventos criados/editados;
- resultados, chats, análises e permissões.

## Fluxo de segurança

1. O BOT inicia.
2. O Deploy Guard lê o banco atual.
3. Se o banco estiver vazio, corrompido ou inacessível, ele restaura o backup latest do GitHub.
4. Se o banco estiver saudável, ele tenta salvar um backup de boot.
5. Depois do boot, o BOT agenda backups automáticos a cada 15 minutos por padrão.
6. O sistema de backup bloqueia sobrescrita perigosa quando o banco atual parece vazio/incompleto e o latest do GitHub tem dados melhores.

## Variáveis obrigatórias no Render do BOT

```env
DATA_DIR=/var/data
GITHUB_BACKUP_TOKEN=ghp_xxx
GITHUB_BACKUP_REPO=brenodasilva0099-png/Void-Arena-BACKUPS
GITHUB_BACKUP_BRANCH=main
GITHUB_BACKUP_PREFIX=void-arena
GITHUB_BACKUP_AUTO_RESTORE=true
GITHUB_BACKUP_SCHEDULED=true
GITHUB_BACKUP_INTERVAL_MINUTES=15
```

## Variáveis importantes no SITE

```env
BOT_API_URL=https://void-arena-bot.onrender.com
BOT_API_KEY=mesma_chave_do_bot
SESSION_SECRET=uma_chave_grande_e_fixa
```

A `SESSION_SECRET` deve ser fixa. Se mudar a cada deploy, os cookies antigos deixam de validar e o usuário precisa logar de novo.

## Regra operacional

Antes de alterar SITE ou BOT, o backup latest deve representar o estado atual do banco. Depois do deploy, se o Render subir com banco vazio, o BOT puxa o latest automaticamente.

## O que não deve acontecer

- Não salvar banco real dentro do repositório do SITE.
- Não usar banco separado no SITE.
- Não substituir latest por backup vazio.
- Não usar `GITHUB_BACKUP_BASELINE_PATH` fixo salvo para sempre, exceto em restauração emergencial específica.

## Emergência

Se uma versão quebrar dados, use o fluxo de backups do BOT para listar/restaurar um backup anterior do repositório `Void-Arena-BACKUPS`.
