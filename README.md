# Abyss Tourment Game v0.2.21

Sistema separado do Abyss principal para torneios/campeonatos/copa do jogo **Rematch**.

## Mudanças desta versão

- Ajuste visual do chaveamento para ficar maior e mais legível.
- Remoção do fundo com círculos/linhas concêntricas no chaveamento.
- Ajuste dos conectores para reduzir linhas tortas e atravessando slots.
- Final central com ícone de troféu + bola entre os dois finalistas.
- Botão **Limpar chaveamento** adicionado, mantendo os times cadastrados.
- Modal **Editar posições** agora permite editar oitavas, quartas, semifinais e final.
- Removido o contador solto de times cadastrados da barra de ações.
- Removida a mensagem lateral do painel de controle das equipes.
- Mantido banco local persistente em `data/abyss-tournament-db.json`.

## Como rodar

```bash
npm install
npm start
```

Depois abra:

```txt
http://localhost:3000
```

## Importante sobre dados

Para não perder times, usuários e chaveamentos ao atualizar versão, copie a pasta `data/` da versão antiga para dentro da versão nova antes de rodar.


## O que mudou na v0.2.21

- Corrigido o corte das oitavas do lado direito do chaveamento.
- Aumentado o respiro horizontal do painel do chaveamento.
- Em telas menores, o chaveamento agora usa rolagem horizontal em vez de cortar os slots.
- Organizada a área central da final com finalistas, troféu e bola.
- Ajustado o alinhamento da final para ficar mais limpo visualmente.


## O que mudou na v0.2.22

- Modal **Editar posições** redesenhado com visual mais Abyss.
- Seções de **Oitavas, Quartas, Semifinais e Final** agora ficam em cards separados.
- Campos de seleção receberam aparência mais escura/premium e melhor contraste.
- Adicionadas legendas rápidas para deixar a lógica do editor mais clara.

## v0.2.23
- Adicionado indicador visual de partida atual (1/3, 2/3, 3/3) no final das caixinhas dos times dentro do chaveamento.

## v0.3
- Indicadores 1/x ligados ao formato MD selecionado no modelo do torneio.
- Editor manual agora permite ajustar o jogo atual de cada vaga/time.
- Botão de ações mudou de "Editar posições" para "Editar".
- Limpar chaveamento agora limpa direto, sem confirmação.
- Chaveamento ampliado para dar mais espaço aos nomes e indicadores.
- Exibição do formato MD abaixo do nome do torneio no chaveamento.

## v0.4
- Perfil/nome do bot atualizados dinamicamente pelo Discord.
- Rankings de times e jogadores carregam os cadastros atuais.
- Jogadores com conta vinculada usam avatar/nome do perfil Discord e podem abrir tela de perfil.

## v0.5
- Corrigido perfil do jogador para mostrar apenas times onde o usuário joga.
- Ranking de times agora abre perfil público do time.
- Perfil do jogador recebeu redes sociais e removeu exibição do ID do Discord.
- Redes sociais do usuário agora sincronizam no perfil do site.

## v0.6
- Perfil do usuário redesenhado com preview, informações pessoais, informações de jogo, Steam/região/posições e redes sociais públicas.
- Perfil público do jogador melhorado com bio, informações competitivas, redes e times vinculados corretos.

## v0.7
- Entrada do site atualizada para identidade Hollow Nexus.
- Banner do perfil agora pode ser alterado por upload ou URL e aparece no perfil público do jogador.

## v0.8
- Corrigido banner do perfil para ficar atrás da foto.
- Upload do banner agora aceita arquivo, URL, arrastar imagem e colar com Ctrl+V.

## v0.9
- Removidos os botões sobrepostos de Trocar/Remover do banner no preview do perfil.
- O banner continua editável pelo seletor de arquivo, URL, arrastar/soltar e colar imagem.

## v1.0
- Removido o badge “Jogador” que ficava sobre o nome no perfil público.
- Removida a vírgula sobrando no texto da área de colar/arrastar banner.

## v1.1
- Perfil agora tenta puxar o banner do Discord, inclusive GIF animado de Nitro, junto com avatar/nome.
- Quem não tiver Nitro continua podendo usar banner manual por arquivo, URL, colar imagem ou arrastar.
- Upload de banners animados em GIF continua aceito.

## v1.2
- Botão de selecionar banner abre o explorador de arquivos no PC/mobile.
- Perfil público mostra o nome do usuário no topo do modal.
- Banner do perfil público expandido por toda a área superior onde ficam avatar e nome.

## v1.3
- Perfil público do jogador agora abre acima do perfil do time quando acionado pelo elenco.
- Preview do perfil nas configurações usa o banner expandido no fundo, com avatar e informações sobrepostos.

## v1.4
- Preview de foto/banner nas configurações do perfil agora fica centralizado no topo, no mesmo estilo do perfil público.
- Formulário de configurações fica abaixo do banner e avatar.
- Mantidas as correções de z-index do perfil público sobre o perfil do time.

## v1.5
- Ajustado preview das configurações do perfil: avatar ficou à esquerda, fora da área do banner.
- Nome e meta do jogador agora ficam em cima, no mesmo estilo visual do perfil público.
- Mantidas as demais correções da v1.4.

## v1.6
- Tela de configurações do perfil expandida quase em tela cheia, como uma janela normal.
- Mantido o bloco de banner/foto/nome da v1.5.
- Reduzido o aperto visual e o excesso de scroll.

## v1.7
- Corrigido layout expandido da tela de perfil.
- Avatar ficou à esquerda, fora da área do banner.
- Nome e informações ficam em cima.
- Botão Salvar deixou de cobrir os campos.

## v1.8
- Removidos os textos Steam não vinculada e Região não definida do preview superior do perfil.

## v1.9
- Removido definitivamente Steam não vinculada e Região não definida do preview superior.
- Removido texto Banner do perfil sobre o banner.

## v2.0
- O banner do preview de perfil agora ocupa toda a área superior, servindo de fundo para o nome e a foto do perfil.

## v2.1
- Adicionado Steam ID / Perfil Steam no perfil do usuário.
- O perfil público mostra a conexão Steam como link clicável para steamcommunity.com/profiles/{steamId}.
- Funciona sem login Steam, sem API e sem autorização Valve.

## v2.2
- Perfil público agora mostra um card de Conexões com Steam clicável no estilo de conexão do Discord.
- O card usa o Steam ID salvo e abre o perfil Steam público.
- O perfil público do usuário atual também lê fallback local se o perfil foi salvo no navegador.

## v2.3
- Corrigida leitura do Steam ID no perfil público do próprio usuário.
- O perfil público agora busca o Steam ID no servidor, cache local e campo atual do formulário.
- Ao salvar o perfil, o usuário também é atualizado na lista usada pelo ranking/perfil público.


## Banco de dados local

A versão 3.1 centraliza os dados em `data/abyss-tournament-db.json`. Esse arquivo guarda usuários, perfis, redes sociais, times, chaveamento, configurações do torneio, configuração da ponte Discord ↔ Site e mensagens do chat.

O bot também consegue salvar mensagens de um canal Discord configurado no banco, usando `settings.chatBridge.discordChannelId`.


## v3.2 — Atalhos e chats do painel

- Adicionada barra lateral esquerda com botões Como usar, Chat e Times.
- Chat do torneio usa o banco central e mantém ponte preparada para Discord ↔ Site.
- Chat entre times cria conversas por par de equipes e salva mensagens no banco.
- Mensagens antigas são compactadas em `messageArchives` para manter o painel fluido.
