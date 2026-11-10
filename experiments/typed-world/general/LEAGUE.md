# Uma disputa local consegue decidir a partida?

Na esfera F16 de semente 7, três facções chegaram ao sítio 1312 em G4. Andreen de contato venceu Andreen de guarda em confronto direto, guarda venceu Ashley 2015 de travessia, e travessia venceu contato. Na disputa simultânea o desempate geométrico escolheu Ashley 2015 e a terceira carteira pagou o nascimento. Essa facção ficou com a última colônia em G25. Quando as mesmas regras locais foram aplicadas a todos os confrontos da liga, **o ciclo programado não produziu um ciclo de vitórias por última colônia**. [Transcrições de conflitos](league-witnesses.json) · [Pernas em F16](league-games-discovery.csv) · [F24](league-games-holdout.csv) · [F32](league-games-replication.csv)

## O que cada jogador e o mundo controlam

As partidas usam a mesma abertura que o cenário das nove físicas. Cada carteira paga pelas mesmas 18 cartas, uma base e um segundo padrão de cada autômato. Há 36 compras no duelo e 54 em três jogadores. Todas as nove físicas entram simultaneamente para cada jogador. As compras ocorrem em G0, por 936 créditos por carteira. O terreno e as posições são idênticos na ida e na volta. Não há compras adicionais. A abertura mistura os carimbos em regiões próximas para provocar contato. [Cartas e montagem das posições](scene.mjs)

- **Liga de resolvedores.** Um competidor imprime contato, guarda, travessia ou antimatéria em todas as suas 18 cartas. Na volta trocamos somente os resolvedores entre assentos. Apoio, maioria, maioria ecológica, dominante e ciclo são políticas globais distintas da arena. O árbitro dominante dá prioridade a contato na disputa elegível. O ciclo imposto estabelece contato acima de guarda, guarda acima de travessia, travessia acima de contato e os três acima de antimatéria.
- **Liga de cédulas.** O árbitro global passa a voto herdado. Conservamos os resolvedores associados aos carimbos e trocamos somente o critério de voto herdado de cada lado. As opções são apoio, idade, geometria e robustez. Nos jogos com três jogadores testamos todos os quatro trios e as seis maneiras de atribuir cada trio aos assentos. A regra de apuração dá um voto a cada genótipo candidato distinto.
- **Custos.** A reserva operacional depois das compras é 768 com tarifa de corte 4 ou 24, ou 4.096 com tarifa 24. As disputas tripartites usam tarifa 24 nos dois níveis de reserva. Os seis braços usam elegibilidade aberta a uma proposta inimiga financiada, sem habilitar o fogo amigo adicional entre tipos convencionais. A guarda tem o mesmo preço inicial que contato. Toda proposta precisa cumprir a física local antes de ser classificada pelo árbitro.

Foram oito sementes por bloco. F16 é a descoberta, F24 recebe sementes novas e rotações de outra paridade, F32 é a replicação com mais oito sementes. O horizonte fixo é G128. A última colônia convencional decide a partida na primeira geração em que sobra no máximo uma. Uma onda já detonada deixa de contar como colônia. Os campos marcados com `live` contabilizam eventos até a decisão, inclusive. Para avaliar território e dinheiro no mesmo instante em todos os confrontos, continuamos observando o motor até G128. Um campo vazio e uma carteira solvente são resultados distintos.

O conjunto tem **7.776 partidas**, das quais 5.184 foram duelos e 2.592 foram disputas entre três carteiras. Nas 4.091 trajetórias em que as nove físicas chegaram a contestar sítios contra outras carteiras, cada regra apareceu ao menos uma vez entre os candidatos dessas disputas. As outras aberturas também compraram e simularam todas as nove.

## Um ciclo espontâneo entre os critérios que os jogadores escolhem

Na liga de cédulas herdadas, com custo de corte 4 e 768 créditos disponíveis depois das compras, **apoio venceu idade, idade venceu robustez e robustez venceu apoio pela última colônia** em F24. Em cada aresta, de oito pistas completas, duas favoreceram o vencedor, uma o perdedor e cinco empataram depois da inversão de assentos. Não havia prioridade cíclica programada nem empate desfeito para desenhar uma aresta. São comparações do critério herdado de um portfólio inteiro, incluindo seus efeitos em muitas disputas locais.

| Votos na pista pareada | F16, descoberta | F24, validação | F32, replicação |
|---|---:|---:|---:|
| Apoio × idade | 1 × 0 | 2 × 1 | 0 × 1 |
| Idade × robustez | 1 × 2 | 2 × 1 | 1 × 0 |
| Robustez × apoio | 2 × 0 | 2 × 1 | 1 × 2 |

Nenhuma perna dessa tabela ficou aberta. Em F24, as 48 pernas dos três pares terminaram entre G7 e G9. Cada um dos nove votos que distinguiram um par veio de uma vitória e uma dupla extinção. Nenhum competidor venceu as duas pernas da mesma pista. O circuito surgiu na segunda amostra e se desfez na terceira. As sementes novas e a mudança da esfera variam juntas. Ele é uma configuração em que o fenômeno acontece, ainda sem demonstração de estabilidade entre mapas. Em F24 a mesma orientação também aparece no **saldo** a 4.096 créditos e corte 24. [Votos, empates e desfechos por confronto](league-matrix.csv)

## Votos locais antes do desempate

Os números abaixo contam sítios contestados por facções adversárias até o encerramento oficial. O árbitro compara pares de candidaturas e completa o confronto por geometria quando há empate em votos. Para verificar se o ciclo existe por votos próprios, reconstruímos o grafo do primeiro escrutínio, retiramos toda aresta resolvida só por desempate e procuramos circuito de **qualquer comprimento**. Repetimos exigindo mais da metade de **todo** o eleitorado em cada aresta. No modo maioria, geometria é um dos três votos declarados e também pode ser o critério final para desempatar o total. No modo ecológico, os votos declarados são apoio, idade e robustez.

| Árbitro da arena | Disputas entre donos | Circuitos com a regra de desempate aplicada | Circuitos com mais votos a favor que contra em toda aresta | Circuitos com maioria absoluta em toda aresta |
|---|---:|---:|---:|---:|
| Maioria (apoio, idade, geometria) | 122.298 | 30 | 0 | 0 |
| Maioria ecológica (apoio, idade, robustez) | 122.677 | 8 | 0 | 0 |
| Cédulas herdadas, um critério por facção | 415.899 | 23 | 0 | 0 |

Uma semente fora do torneio, com cédulas heterogêneas **dentro de cada carteira**, produz o contraste. Em F16, seed 33, caixa 16 mil, três donos distintos disputam o sítio 1781 em G14. B2/S245 vence HighHex, HighHex vence Bays245, e Bays245 vence B2/S245. Cada eleição fica **2 a 1, sem abstenção**. A abertura usa a arbitragem por cédulas e permite disputa entre tipos aliados. As regras e os votos completos do torneio estão disponíveis em [testemunhos locais](league-witnesses.json).

## O ciclo forçado e a preferência financiada

Nas partidas com o ciclo programado, a disputa local completou uma volta em **495 de 495** encontros aptos entre os três resolvedores, antes do fim da partida. Trocar o árbitro de apoio pelo ciclo modificou o último sobrevivente ou o estado de encerramento em 134 de 864 duelos e em 33 de 288 partidas tripartites de abertura igual. Em 14 dessas 33 partidas tripartites ocorreu um ciclo local. O tratamento também muda as preferências em disputas binárias, portanto essa diferença não isola a contribuição exclusiva de um encontro triangular.

O árbitro dominante preferiu contato nas **102.292 de 102.292** disputas em jogo nas quais contato e outro resolvedor eram candidatos de facções adversárias. Uma candidatura de contato efetivamente ocupou ou conservou o sítio em **73.830** delas. Competir pela posição, receber a primeira preferência e ter dinheiro para concretizá-la são três contagens diferentes. A mudança de apoio para dominante alterou 109 de 864 desfechos nos duelos e 33 de 288 nos trios.

## Votos de uma pista inteira

Cada semente vota depois de duas pernas. Um jogador que ganha as duas recebe um voto. Se cada resolvedor vence uma, a semente empata. Uma vitória e uma dupla extinção dão o voto ao vencedor. Em última colônia, uma perna ainda aberta deixa a semente aberta. Para caixa e campo, usamos o placar de G128 das duas pernas. A coluna `condorcet` exige mais votos favoráveis do que contrários contra **cada** adversário. A coluna `absolute` exige mais de quatro das oito sementes contra cada adversário. A busca examina todos os circuitos orientados de três e quatro concorrentes sem fabricar arestas entre empatados. [Todas as matrizes](league-matrix.csv) · [Vencedores e circuitos por bloco, tarifa e métrica](league-majorities.csv)

Com apoio global, tarifa de corte 24 e 4.096 créditos depois da abertura, travessia foi vencedora de Condorcet pela última colônia nos três blocos. A contagem abaixo mostra votos favoráveis e contrários à travessia. As demais sementes empataram nas duas pernas ou continuaram abertas.

| Oponente da travessia | F16 | F24 | F32 |
|---|---:|---:|---:|
| Contato | 7 × 0 | 4 × 0 | 4 × 1 |
| Guarda | 7 × 0 | 4 × 1 | 2 × 0 |
| Antimatéria | 8 × 0 | 8 × 0 | 8 × 0 |

Em F32, por exemplo, as oito sementes contra guarda deram duas favoráveis, zero contrárias, quatro empatadas e duas abertas. O resultado distingue as duas políticas em duas sementes. O competidor de antimatéria desta liga equipa **todo** o portfólio com estopim. O experimento de lançamento de uma única arma com produção convencional mede outra estratégia. [Ataque com fazenda patrocinadora](../blast-victory.md)

No conjunto das cinco arbitragens globais de resolvedores, três regimes de custeio e três blocos geométricos, **nenhuma das 45 matrizes de última colônia teve ciclo**. Travessia foi vencedora de Condorcet entre as pistas que decidiram os pares em 39 matrizes e por maioria absoluta das pistas em 16. Nas outras seis matrizes nenhum competidor superou todos os três rivais. A liga separada de cédulas fornece o contraexemplo macroscópico mostrado acima.

**O dinheiro produziu um ciclo espontâneo frágil.** Sob apoio, nos mesmos confrontos F24 com reserva 4.096 e tarifa 24, antimatéria venceu contato por 3 sementes a 2, contato venceu travessia por 2 a 0 e travessia venceu antimatéria por 2 a 1. Também apareceram antimatéria → guarda → travessia → antimatéria e o circuito de quatro antimatéria → guarda → contato → travessia → antimatéria. Esses circuitos desapareceram ao medir o número inteiro de células que cada saldo conseguia comprar a 8 créditos. Também não reapareceram em F32 com as oito sementes novas. A seta aponta do vencedor para o vencido. A tabela completa conserva os empates.

## Reprodução

```sh
python -B experiments/typed-world/general/league.py 5
node experiments/typed-world/general/league.mjs discovery 7 triple cycle 24
```

O segundo comando roda seis atribuições de assento na abertura da primeira disputa tripla descrita acima. Cada linha traz os nove tipos iniciais por construção, custos, cortes, pedidos recusados, último sobrevivente, geração de encerramento e carteira/população em G128. `activeNine` conta instantâneos com as nove físicas convencionais presentes no mundo, incluindo G0. O CSV informa quantas físicas distintas chegaram a disputar sítios contra outra carteira durante a trajetória.
