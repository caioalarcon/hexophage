# Quando compensa atacar no Hexophage?

Na comparação entre controladores, a troca das tarifas criou oportunidades de ataque. Com a mesma economia sugerida, o novo controlador comprou menos carimbos e dirigiu mais jogadas a um adversário específico. Um ataque contou apenas depois que o motor aceitou a compra. A comparação de dano usou o estado real da esfera.

## Controlador e economia

Foram 108 partidas frias de cinco aprendizes em F24 (5.762 células), até G8.192, com conflito por linhagem e crescimento livre. As nove regras e as sementes 19271, 38459 e 75109 são as mesmas em cada linha. O humano ficou fora. Cada par usa o mesmo motor, reserva, regras de colocação e intervalo mínimo de compra. O controlador antigo vem do commit de produção `2f2b3c8`. Nas linhas de tarifas antigas, “antigas” significa os preços originais de cada regra, inclusive o regime original de descoberto e a reserva sem custo quando o campo fica vazio. As sugestões incluem a carência de 512 gerações e a cobrança posterior.

| Tarifas | Controlador | Compras | Ataques dirigidos | Eliminados | Partidas decididas |
|---|---|---:|---:|---:|---:|
| Originais | Produção | 236 | 0 | 0 | 0 |
| Originais | Novo | 258 | 0 | 0 | 0 |
| Sugeridas | Produção | 1.352 | 60 | 5 | 0 |
| Sugeridas | Novo | 1.163 | 110 | 6 | 1 |

A única vitória aconteceu em B2/S245 na geração 98, antes da primeira compra dirigida. As outras eliminações também podem ser causadas pela própria economia. Em oito jogos adicionais de Bays, Andreen, Ashley 2015 e B2/S245 (F96, sementes 98101 e 44017, até G131.072), houve 1.855 ataques dirigidos, 0 eliminações e 0 vencedores. O número de partidas que chegam a ter vencedor continua sendo uma limitação do jogo.

O novo controlador testou posições de plantio ou ataque em 4.966 combinações de rodada e local. Das 1.163 compras, 757 ocorreram a mais de 60° do setor de origem do comprador, medidos entre os centros na esfera. O batedor amostra solo aberto no planeta e posições nas colônias dos adversários vivos. Em cada rodada de decisão, compara candidatos e a alternativa de esperar. A simulação mental usa discos de raio máximo 20 e um orçamento de visitas dividido entre os cinco bots. Nenhum desses números mede o ótimo global.

## O que a compra causou

Reconstituímos as partidas a partir de suas ordens pagas e conferimos o livro final de cada jogador. Para cada combinação de regra e semente, escolhemos até os três primeiros ataques dirigidos, inclusive os malsucedidos. Na geração da compra, ramificamos a esfera inteira. Um ramo espera, outro compra o carimbo efetivamente escolhido. Também testamos a rotação de 180° e atrasos de 1, 3 e 8 gerações quando legais. Os ramos usam o mesmo saldo inicial e evoluem sem compras adicionais. A tabela conta resultados em G+2.048. A vantagem é a diferença de reservas entre o comprador e o alvo, comparada ao ramo que esperou.

| Autômato | Ataques pareados | Menos células e menos caixa para o alvo | Atacante ganhou vantagem relativa |
|---|---:|---:|---:|
| Bays | 9 | 9 | 9 |
| Hex B2/S245 | 6 | 6 | 6 |
| Bays 245 | 8 | 8 | 4 |
| Andreen | 1 | 1 | 1 |
| HighHexLife | 6 | 6 | 6 |
| Ashley 2015 | 9 | 9 | 8 |
| Ashley 2016 | 9 | 9 | 3 |
| Callahan e Hex B2/S34 | 0 | — | — |
| **Total** | **48** | **48** | **37** |

Em HighHexLife, na semente 75109, o jogador 5 lançou o **Oscilador P4 · 3c · 9d2** na geração 681 contra o jogador 4. Em G+2.048, o atacante tinha gastado 1.216 créditos a mais e o defensor tinha 29.382,28 créditos e duas células a menos que no ramo de espera. A diferença de reserva entre os dois melhorou 28.166,28. É o maior prejuízo de caixa ao alvo nesta amostra. Com 27 rotações alternativas legais e distintas, a orientação escolhida foi melhor que a oposta em 16 e pior em 11.

Os resultados de fase com o mesmo alvo, posição, orientação e gerações diferentes estão no [ensaio de Ashley 2015](PHASE.md). O [experimento de aprendizagem](../decision-feedback/README.md) mede o confronto entre previsão e observação. A [calibração de preços](../economic-starts/README.md) inclui as esferas maiores, as aberturas humanas e o controle que passa todos os turnos.

## Reprodução

Use Node 22 ou superior e Python 3. Os replays usam `assert` para verificar cada compra e o livro final. O cache contém o histórico integral de ordens e pode ser removido para refazer tudo. O controlador antigo deve apontar para a revisão indicada.

```sh
git worktree add --detach /tmp/hex-prod 2f2b3c8cccb61e57947d6cd210c11a2e3f89eaa4
HEX_OLD_CHECKOUT=/tmp/hex-prod python3 experiments/tactical-learning/survey.py /tmp/hex-tapes --workers 4
node experiments/tactical-learning/replay.mjs /tmp/hex-tapes/highhex.suggested.new.24.8192.75109.json 3
node experiments/tactical-learning/match.mjs andreen suggested new 96 131072 98101
```

[Oito partidas longas](endurance.csv) · [108 partidas](matches.csv) · [Resultados de cada ramo](attacks.csv) · [Comparação de fases](phase-replays.csv)
