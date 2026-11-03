# Adivinhe o Pokémon

Jogo web de adivinhação com clima de programa de TV: descubra o Pokémon sorteado
pela silhueta e pelas dicas. A cada erro surge uma nova dica e a imagem se revela
um pouco mais.

**Jogue aqui:** https://nathdomin.github.io/adivinhe-o-pokemon/

## Como jogar
1. Escolha a dificuldade e clique em **Jogar**.
2. Você começa com a silhueta e a primeira dica (a geração do Pokémon).
3. Digite o nome (o campo sugere nomes enquanto você escreve) e clique em **Chutar**.
4. Cada erro gasta uma das **6 tentativas**, libera a próxima dica e deixa a imagem
   mais clara. **Pular dica** também libera uma dica, mas custa uma tentativa.
5. Acertou ou as tentativas acabaram? O Pokémon é revelado e você pode jogar de novo.

| Dificuldade | Pokémon sorteados | Multiplicador de pontos |
|---|---|---|
| Fácil | Geração 1 (1–151) | 1x |
| Médio | Gerações 1 a 3 (1–386) | 1,5x |
| Difícil | Todos (1–1025) | 2x |

**Pontos:** 100 por acerto, menos 15 por tentativa gasta (mínimo 10), vezes o
multiplicador. O jogo conta a sequência de acertos e guarda o recorde no navegador.

## Tecnologias
- HTML, CSS e JavaScript puros, sem frameworks nem bibliotecas
- [PokeAPI](https://pokeapi.co/) para os dados e as imagens dos Pokémon
- Animações só em CSS (`transform` e `opacity`), com suporte a `prefers-reduced-motion`
- Layout responsivo: TV em 4:3 em telas grandes, layout vertical no celular

## Rodar localmente
Abra o `index.html` em um navegador (precisa de internet para acessar a PokeAPI).

## Aviso
Projeto educacional sem fins lucrativos. Pokémon e seus personagens pertencem a
Nintendo, Game Freak e The Pokémon Company. O site não usa o logotipo oficial.

O planejamento do jogo está em [contexto.md](contexto.md).
