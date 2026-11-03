# Contexto

## Objetivo do jogo
Jogo web para adivinhar um Pokémon sorteado. O jogador vê a silhueta do Pokémon
e recebe dicas sobre suas características. A cada tentativa errada, uma nova dica
aparece e a imagem fica mais revelada. O jogo termina quando o jogador acerta
(vitória) ou esgota as tentativas (derrota). Depois aparece a opção "Jogar
novamente", que sorteia um Pokémon diferente.

## Mecânica
- Tentativas: 6 por rodada.
- Entrada: campo de texto com autocomplete da lista de nomes (vinda da API).
  Comparação sem diferenciar maiúsculas/minúsculas, acentos e hífens.
- Dicas (uma nova a cada erro, nesta ordem):
  1. Geração
  2. Tipo(s)
  3. Altura e peso
  4. Cor e habitat (pokemon-species)
  5. Uma habilidade
  6. Primeira letra + número de letras do nome
- Revelação da imagem: começa como silhueta (CSS `filter: brightness(0)` + blur)
  e a cada erro o brilho aumenta e o blur diminui. Ao terminar, a imagem aparece
  completa.
- Botão "Pular dica": revela a próxima dica, mas gasta uma tentativa.
- Pontuação: mais pontos quanto menos tentativas forem usadas. Streak de acertos
  seguidos; o recorde fica salvo no localStorage.
- Dificuldade: Fácil (Gen 1, 1–151), Médio (Gen 1–3, 1–386), Difícil (1–1025).
- Não repetir Pokémon já sorteados na sessão.

## Telas
1. Início: título, escolha de dificuldade, botão Jogar.
2. Jogo: imagem, dicas, campo de palpite, tentativas restantes, pontos.
3. Fim: vitória ou derrota, nome e imagem revelados, pontos, botão Jogar novamente.

## Requisitos
- HTML, CSS e JavaScript puros (index.html, style.css, script.js).
- Responsivo (mobile primeiro) e com design moderno.
- Publicado no GitHub Pages, com link público e commits no GitHub.
- Estado de carregamento enquanto a API responde e mensagem de erro se ela falhar.
- Textos da interface em português; tipos traduzidos (fire → Fogo etc.).

## API
PokeAPI:
- https://pokeapi.co/api/v2/pokemon/{id}: tipos, altura, peso, habilidades,
  imagem (`sprites.other['official-artwork'].front_default`)
- https://pokeapi.co/api/v2/pokemon-species/{id}: geração, cor, habitat
- https://pokeapi.co/api/v2/pokemon?limit=1025: lista de nomes para o autocomplete

## Visual: clima de programa de TV
O jogo deve passar a sensação de estar assistindo a um quadro de adivinhação na
TV, inspirado nas imagens da pasta `sources/` (Bulbasaur, Dugtrio).
- Moldura de televisão em volta da área de jogo (bordas arredondadas, leve efeito
  de linhas de varredura/scanlines e brilho de tela, feitos em CSS).
- Fundo dividido: explosão de raios em azul-claro atrás da silhueta (lado
  esquerdo) e raios em vermelho/laranja no restante da tela, feitos com
  `repeating-conic-gradient` em CSS e girando devagar.
- Silhueta preta grande no centro da explosão de raios.
- Um "?" grande, amarelo com contorno azul, ao lado da silhueta, com animação de
  pulsar.
- Título do jogo desenhado pelo próprio site em fonte grossa amarela com contorno
  azul (ex.: Google Font "Luckiest Guy" ou "Bangers"), com nome próprio do jogo,
  sem usar o logotipo oficial nem imagens copiadas da `sources/`.
- Revelação no final como na TV: flash branco rápido, a silhueta ganha cor e o
  nome do Pokémon aparece com animação de entrada.
- Vinheta de abertura curta (efeito de ligar a TV) ao iniciar cada rodada.
- No celular, a disposição vira vertical: silhueta em cima, "?" e dicas embaixo.

## Diretrizes técnicas: animações e responsividade
Divisão de papéis:
- CSS faz todos os efeitos visuais e animações.
- JavaScript só controla o jogo: busca os dados, troca classes/variáveis CSS e
  guarda a pontuação. Nada de animar estilos quadro a quadro pelo JS.

Animações eficientes e fiéis:
- Animar apenas `transform` e `opacity`, que rodam na placa de vídeo sem
  recalcular o layout. Nunca animar `width`, `height`, `top`, `left` ou `margin`.
- Raios girando: o gradiente cônico fica num elemento maior que a tela, e só esse
  elemento gira com `transform: rotate()`. O gradiente nunca é redesenhado.
- Revelação da silhueta: o nível de revelação fica numa variável CSS
  (`--reveal`, de 0 a 1) que o JS atualiza a cada erro; o `filter`
  (brightness/blur) é calculado com `calc()` e suavizado com `transition`.
- Flash branco e "ligar a TV": camadas próprias animadas só com
  `opacity`/`scaleY`.
- Usar `will-change: transform` apenas nos elementos que animam sem parar
  (raios e "?").
- Curvas de animação marcantes, no estilo do anime (ex.:
  `cubic-bezier(.34,1.56,.64,1)` para o nome "saltar" na tela).
- Respeitar `prefers-reduced-motion`: desligar giro, scanlines e flash para quem
  pediu menos movimento.
- Pausar as animações contínuas quando a aba não está visível
  (`visibilitychange`).

Responsividade:
- Mobile primeiro; layout com CSS Grid. Em telas largas, silhueta à esquerda e
  "?"/dicas à direita, como na TV; em telas estreitas, tudo empilhado.
- A "tela de TV" mantém proporção 4:3 com `aspect-ratio` e cabe na tela
  (`max-height: 100dvh`).
- Tamanhos fluidos com `clamp()` para fontes, "?" e silhueta; unidades
  `dvh`/`vw`/`rem`, sem tamanhos fixos em px para o layout.
- Botões e campo de palpite com no mínimo 44px de altura para toque.
- Testar em 360px, 768px e 1280px de largura, em pé e deitado.

Carregamento e desempenho:
- Pré-carregar a imagem do Pokémon (`new Image()` + `decode()`) antes de começar
  a rodada, para a silhueta não aparecer pela metade.
- Buscar `/pokemon/{id}` e `/pokemon-species/{id}` em paralelo
  (`Promise.all`); a lista de nomes é buscada uma vez e guardada no
  `sessionStorage`.
- Fontes do Google com `display=swap` e `preconnect`.
- Scripts com `defer`; nenhum framework nem biblioteca externa.

## Publicação (GitHub Pages)
- Repositório público no GitHub, com os arquivos na raiz:
  `index.html`, `style.css`, `script.js`, `README.md`.
- Commits pequenos e descritivos ao longo do desenvolvimento (estrutura, layout,
  animações, lógica, API, responsividade, ajustes).
- GitHub Pages ativado em Settings → Pages → "Deploy from a branch" →
  branch `main`, pasta `/ (root)`.
- Link público no formato `https://<usuario>.github.io/<repositorio>/`,
  colocado no README e na descrição do repositório.
- Todos os caminhos de arquivos relativos (`./style.css`, não `/style.css`),
  porque o site fica dentro da subpasta `/<repositorio>/`.
- A pasta `sources/` não é publicada (fica no `.gitignore`), já que as imagens
  de referência não fazem parte do site.
- Depois de publicar, testar o link no computador e no celular.

## Referências
A pasta `sources/` mostra a composição a ser seguida (fundo de raios azul e
vermelho, silhueta preta, "?" amarelo). Todos os elementos visuais são recriados
em HTML/CSS; as imagens da pasta e o logotipo oficial não entram no site.
