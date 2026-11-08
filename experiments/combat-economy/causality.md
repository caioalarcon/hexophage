# O que uma morte mede numa colisão

No fim de cada geração física, o motor conserva a ocupação anterior e a atual. Para cada célula de jogador que morreu e tinha vizinhos adversários, repetimos **apenas aquela transição**, mantendo posições próprias e neutras e retirando os vizinhos dos outros jogadores. Se a célula sobreviver nessa avaliação, a presença dos rivais causou sua morte imediata. A avaliação usa o arranjo circular verdadeiro dos cinco ou seis vizinhos e a tabela de sobrevivência da regra escolhida. A erosão econômica é contabilizada depois da transição física.

Na regra de Callahan, a demonstração é curta. Um sobrevivente isolado dos inimigos tem 3 ou 4 vizinhos, ou 2 separados por um lado no anel. Se adicionarmos rivais a um desses conjuntos, o total passa por 3 e 4, que sustentam a vida, e só deixa de sustentá-la ao chegar a 5 ou 6. Portanto, **toda morte atribuída por esse critério exige superlotação local**. Uma estrutura também pode se desmontar quando uma nova célula deixa de nascer e falta apoio no turno seguinte.

Se houver vários inimigos, restauramos seus vizinhos um jogador de cada vez ou em combinações, sobre o mesmo fundo próprio e neutro. Guardamos cada conjunto mínimo de jogadores que já bastaria para a morte. Isso distingue uma ação conjunta, dois rivais que seriam suficientes individualmente e um terceiro que estava por perto sem precisar participar. `attackers` reúne os participantes das combinações mínimas. Dividir uma unidade igualmente entre esses participantes seria uma convenção de pagamento. O registro conserva as combinações para avaliar outras convenções. Uma morte física permanece uma única morte, inclusive se houver mais de um conjunto suficiente.

## O que se perdeu na ponta da colmeia

Os ensaios mantêm as estruturas financiadas, as regras físicas reais e os robôs ociosos. Comparamos uma colmeia defensora atingida por P4 na esfera f256 com um lançamento fora da rota. Avaliamos a origem de cada evento até G256. O lançamento direcionado na G0 deixou **36 células do defensor contra 228** na trajetória fora da rota. O próprio glider desapareceu.

| Efeito direto acumulado para a peça do defensor | Acerto na G0 | Mesma rota, lançamento na G16 | Fora da rota |
| --- | ---: | ---: | ---: |
| Células do defensor mortas pela presença do rival | 0 | 1 | 0 |
| Células do defensor que a presença do rival manteve vivas | 2 | 4 | 0 |
| Nascimentos do defensor impedidos em posição antes vazia | 1 | 3 | 0 |
| Nascimentos do defensor impedidos por um rival já ocupando a posição | 1 | 1 | 0 |

Na outra direção houve uma morte direta do atacante no acerto da G0 e zero no lançamento da G16. Para o lançamento da G0, só **3 dos 151 nascimentos neutros** vieram diretamente de dois pais de jogadores diferentes. Outros 49 tiveram um pai neutro e um de um jogador, e 99 vieram de dois pais neutros. A perda da renda futura do crescedor envolve todas as gerações seguintes. Não há um jogador único inscrito nas células neutras que permita entregar a ele uma taxa por cada reação posterior.

O teste da P4 contra o refletor P42 mostra outro resultado. Para cada lado, o adversário impediu duas células de nascerem em posições vazias. Surgiu uma única célula neutra de pais rivais. Não houve nenhuma morte imediata diretamente atribuível a jogador em nenhum dos lados. O desenvolvimento subsequente acaba produzindo um crescedor do defensor quando há capital para manter o campo. [Reprodução da reação do refletor](../economy/incoming-glider-replay.mjs).

## Frequências na varredura

Repetimos a medição para 1.548 lançamentos legais contra cinco padrões na esfera f48. O controle é a evolução do mesmo defensor sozinho, com correspondência exata entre posições de sua propriedade, geração por geração durante 96 gerações. Em 573 casos a trajetória do defensor mudou.

| Sinal observado ao menos uma vez | Entre as 573 defesas alteradas | Entre as 975 inalteradas |
| --- | ---: | ---: |
| Rival matou diretamente uma célula do defensor | 47 | 0 |
| Rival impediu um nascimento do defensor numa posição antes vazia | 456 | 0 |
| Rival ocupava o local de um potencial nascimento do defensor | 33 | 0 |
| Rival manteve uma célula do defensor viva naquela geração | 300 | 0 |
| Surgiu um neutro diretamente de pais dos dois jogadores | 350 | 8 |
| Morte direta ou alguma das duas formas de impedimento de nascimento | 462 | 0 |

As categorias podem aparecer no mesmo lançamento. A proporção de 8,2% para morte direta e 79,6% para nascimento impedido descreve esse conjunto de posições e alvos. Toda nova célula neutra surgida diretamente de dois jogadores na regra de Callahan tem um pai de cada. Remover um deles deixaria a posição com apenas um vizinho, insuficiente para nascer. **Uma nova célula neutra de pais rivais não representa, nessa transição, um nascimento que seria de um dos jogadores.**

A cada geração, o ensaio também retira **somente** as células neutras numa segunda avaliação e mede os mesmos efeitos. Se um efeito aparecer nas duas intervenções, as contagens não podem ser somadas como créditos independentes. O ensaio de várias gerações mede o que ocorreu no controle sem disparo e no confronto, enquanto cada intervenção causal recomeça da situação real daquela geração.

## Transferir a despesa de nascimento evitada

Na economia invertida, o nascimento cobra energia. Uma opção é transferir ao rival uma fração dessa despesa quando sua presença impede um nascimento que teria dono. Para o caso medido usamos apenas casas que estavam vazias antes e permanecem vazias depois. Se o custo normal por nascimento é uma energia, o sinal bruto vale no máximo uma por nascimento e o pagamento efetivo ainda depende do caixa do pagador. Contamos direções pelo dono das duas células que teriam gerado o descendente. O lançamento do glider define o lado atacante.

Na regra de Callahan os dois pais próprios precisam ocupar posições adjacentes no anel. Se a casa está vazia, há esses dois pais e nenhum neutro, qualquer vizinho adicional de outra cor impede o nascimento. Havendo vários donos extras, cada um seria suficiente sozinho. Dividir uma unidade entre eles evita multiplicar a moeda transferida. A volta de duas cores sobre a mesma casa pode impedir um nascimento de cada lado. Mesmo na esfera, isso se testa localmente. [Detector para um turno](birth-denial.mjs) · [Teste exaustivo em 5.120 vizinhanças](birth-denial.test.mjs).

| Grupo de lançamentos | Transferências para o atacante | Para o defensor | Saldo do atacante positivo / zero / negativo |
| --- | ---: | ---: | ---: |
| Todos os 1.548 | 1.150 | 1.923 | 173 / 809 / 566 |
| 459 em que o defensor terminou menor que no controle | 990 | 1.044 | 149 / 91 / 219 |
| 132 que extinguiram uma defesa antes persistente | 261 | 268 | 32 / 25 / 75 |
| 52 em que o defensor terminou maior que no controle | 97 | 96 | 12 / 18 / 22 |

Neste contrafactual os lançamentos são financiados e as transferências são calculadas em tarifa unitária, sem realimentar o orçamento no motor. O sinal descreve o custo evitado para cada lado. Uma derrota militar do defensor pode deixá-lo como recebedor líquido porque a estrutura também impede nascimentos que ocorreriam na nave atacante. Se o objetivo é compensar o contato, a regra tem uma interpretação física. Como recompensa por vitória ela pagaria ao lado eliminado em 75 das 132 extinções estudadas. A redução da população final também é uma medida espacial e pode ser desejável economicamente para o dono.

Os dois tiros que cortaram o crescedor na G0 ou após o lançamento na G16 dariam ambos saldo +1 ao atacante, embora os números brutos sejam 1 contra 0 e 3 contra 2. A colisão do refletor daria saldo zero, com dois nascimentos impedidos para cada lado. Para comparação, somar a ocupação anterior de casas em que outro jogador nasceria adicionaria 46 unidades brutas para os atacantes e 110 para os defensores nos 1.548 lançamentos. Isso passaria a cobrar por permanecer no caminho. [Valores nos dois sentidos por posição, orientação e instante](birth-fee.json).

## Reprodução

```sh
node --test experiments/combat-economy/causality.test.mjs experiments/combat-economy/birth-denial.test.mjs
node experiments/combat-economy/contacts.mjs
node experiments/combat-economy/interaction-paths.mjs --survey
```

[Classificador local](causality.mjs) · [Medições dos confrontos](interaction-paths.json) · [Contagens por alvo e por resultado](interaction-survey.json)
