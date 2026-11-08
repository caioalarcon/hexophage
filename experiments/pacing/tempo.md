# Três relógios de Hexophage

A produção habilita uma compra. A posição dessa compra define o que ela ameaça. A velocidade da nave determina quanto tempo o adversário tem para perceber e reagir. Esses três intervalos podem diferir por ordens de grandeza.

## Referências de design

| Comparador | Escala de tempo efetivamente documentada | Decisão correspondente |
| --- | --- | --- |
| Offworld Trading Company | O designer descreve partidas competitivas de cerca de 30 min. O manual situa a primeira escolha de produzir, importar ou refinar aproximadamente 30 s após o início. Ambos são marcos de design. | Reivindicar um lote, especializar edifícios e reagir quando a produção dos rivais altera preços. |
| Legion TD 2, Ranked | A equipe descreveu em julho de 2024 uma distribuição-alvo centrada nas ondas 15–16, associada a média de 20 min e 95% entre 10 e 30 min. A razão entre 20 min e 15–16 ondas dá uma escala aproximada de 75–80 s por onda. | As unidades combatem sozinhas. Há oportunidade de comprar, renovar a defesa ou economizar para um ataque em cada onda. Uma janela pode reunir diversas ordens. |
| Ikariam | No guia da Gameforge, a academia de nível 1 leva 25 s, a de nível 2 leva 22 min 34 s e a de nível 8 leva 1 h 31 min. Expansões posteriores podem durar dias. A editora descreve sessões diárias curtas ao longo de semanas e meses. | Definir prioridades, deixar construção e pesquisa avançarem e contratar transporte com tempo real de viagem. |

Fontes da equipe de Offworld. [Entrevista de Soren Johnson, 2015](https://www.stardock.com/games/article/461015/gamewatcher-interview-with-soren-johnson-about-offworld-trading-company) · [Manual de gameplay](https://www.offworldgame.com/game/gameplay).

Fontes da equipe de Legion TD 2. [Design Philosophy — Game Balance, 25/07/2024](https://store.steampowered.com/news/posts/?appids=469600&enddate=1726138134&feed=steam_community_announcements) · [Manual do jogo](https://beta.legiontd2.com/manual/).

Guias da Gameforge, consultados em 08/11/2026. [Tempos por nível da academia](https://gameforge.com/en-GB/games/ikariam-basic-knowledge-game-start.html) · [Duração de processos e frequência de sessões](https://gameforge.com/en-GB/games/ikariam-what-is-that.html).

Um exemplo de tratamento do spam veio do próprio Offworld. Um protótipo premiava o centro de um grupo de sete edifícios com +300% de produção. Quando mudava o preço de um recurso, compensava demolir e reconstruir o grupo inteiro depressa. A equipe introduziu retornos decrescentes para a vizinhança. Três edifícios em triângulo passaram a obter +75% cada, e especializar o lote passou a competir com produzir outros bens. A intervenção mudou **o que era lucrativo repetir**. [Diário de desenvolvimento, 17/04/2016](https://www.designer-notes.com/otc-designer-notes-3-claims/).

## Relógio físico a 200 gerações/s

O script roda cada nave em um setor hexagonal da esfera e exige igualdade entre o conjunto vivo ao fim de um período e o conjunto original transladado. A distância é o número de passos entre centros de células. A tabela mostra velocidades médias por período e a distância equivalente em aproximação retilínea livre.

| Nave | Período | Passos por período | Passos por segundo | Distância para 5 s de aviso | Distância para 15 s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Glider P4 | 4 | 2 | 100 | 500 | 1.500 |
| Nave P15 | 15 | 1 | 13,33 | 67 | 200 |
| Nave P48 | 48 | 2 | 8,33 | 42 | 125 |

No f320 de 1.024.002 células, a busca em largura entre os seis pontos de partida mediu os 15 pares possíveis. A menor distância foi 427 arestas, a mediana 480, a média 539,93 e a maior 898. Um percurso livre de 480 arestas na velocidade do P4 equivale a 4,8 s. Esse cálculo dá a escala geométrica. A orientação de lançamento, os pentágonos e as colisões determinam a rota real. O jogo permite plantar muito mais perto que a separação entre bases.

Na [colisão P4 contra refletor P42](../economy/incoming-glider-replay.mjs), ambos os carimbos são legais. A primeira interferência na G22 acontece em **0,11 s**. Com 5.000 de reserva, a primeira erosão no ramo atacado ocorre em G136, **0,68 s** desde o início. Na G256, **1,28 s**, o defensor já está sem células. O controle tem 22 e 1.955 de reserva. Uma fundação economicamente viável pode, portanto, exigir defesa **antes** de uma ameaça particular aparecer. O teste abaixo compara ordens defensivas para essa mesma ameaça.

## Uma carimbada muda o resultado?

Na esfera f256, repetimos o ataque com um flipper P2 adicional de três células na defesa. Cada ordem aceita para o flipper custou exatamente 30 de energia. O critério para preservar o P42 foi recuperar, nas últimas 42 gerações até G256, a ocupação exata de um ciclo do refletor isolado. A comparação inclui as células vazias na vizinhança do refletor.

| Defesa contra o mesmo ataque | Geração da ordem | P42 preservado | Células do defensor em G256 | Reserva em G256 |
| --- | ---: | --- | ---: | ---: |
| Sem defesa | — | Não | 0 | 16 |
| Flipper na rota, em (−6, 0) | 0 | Sim | 25 | 2.178 |
| Flipper fora da rota, em (−6, 22) | 0 | Não | 3 | 122 |
| Flipper na rota, em (−6, 0) | 6 | Sim | 22 | 1.927 |
| Flipper na rota, em (−6, 0) | 20 | Não | 0 | 5 |

As duas ordens em G0 têm a mesma cadência e o mesmo preço. Sem o ataque, ambas as posições terminaram com 25 células e 2.181 de energia. Com o ataque, a escolha da rota preservou o ativo e deixou **2.056 de energia a mais** com o defensor. Na posição que protege o P42, G6 ainda funcionou (0,03 s), G8 foi recusada pela regra de ocupação ou proximidade e G20 foi legal, porém tardia (0,10 s). Com essa distância de lançamento e velocidade, faz sentido planejar a cobertura da rota antes do disparo. Outras disposições e outros ângulos exigem ensaios próprios.

## O que medir além de carimbos por minuto

- **Cadência observada.** Registrar compras voluntárias, períodos sem compra e quantas ordens cabem em uma rajada. O número de carimbos financiados por um bot é um teto econômico para aquela política, não uma observação de decisões humanas.
- **Janela de reação.** Medir o tempo entre informação acionável e perda que uma defesa preparada conseguiria evitar. A fase e a distância de um P4 importam mesmo se o jogador só puder comprar uma vez por minuto.
- **Valor da atenção.** Clonar o mesmo estado. Um ramo pode escolher a construção a cada 5 s, outro a cada 30 s, outro ao voltar após uma ausência. Permitir várias ordens na visita se a reserva as pagar. Comparar renda futura, compras disponíveis, viabilidade e tempo de recuperação a partir de condições idênticas.
- **Valor da escolha.** A partir do mesmo estado, comparar plantar uma farm, poupar para uma gun, defender uma rota e adiar. Uma escolha é particularmente informativa quando o melhor uso da próxima ordem muda com a ameaça ou o estado da economia. Em combate, registrar perda evitada contra a mesma ameaça; na economia, registrar o custo de oportunidade de abrir mão de outra construção.
- **Ritmo de partida.** A duração de um orçamento solvente é uma estatística econômica. A duração até a eliminação requer oponente, posicionamento e condição de vitória. O modelo financeiro estima o período de jogo economicamente ativo. O replay espacial investiga uma ameaça isolada.

A hipótese coerente com o motor atual é um RTS de **comando intermitente e simulação contínua**. O defensor pode escolher a disposição antes do disparo e as estruturas executam a defesa sozinhas. Para testar a hipótese assíncrona, comparar oito ou 24 h de ausência medindo o que o jogador traz economicamente ao voltar e se seus ativos sobrevivem a um rival que continua online. A economia isolada cobre apenas o primeiro eixo.

## Reproduzir

Comandos disponíveis na raiz do repositório.

- `node experiments/pacing/tempo.mjs 200` mede velocidades e distâncias.
- `node experiments/pacing/tempo-defense.mjs` compara posição e instante da defesa no f256. A opção `--search` explora 360 combinações de translação e orientação em uma esfera f32, com horizonte de 84 gerações. A tabela usa a verificação posterior no f256 até G256.
- `node experiments/economy/incoming-glider-replay.mjs` confirma a colisão, a erosão e a assinatura do crescedor no motor do jogo.
