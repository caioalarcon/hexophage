# Como sustentar duas horas de Hexophage

**O que melhor separou energia de mana foi dar ao núcleo vivo capacidade de armazenamento e fazer o preço em energia reagir ao plantio recente do jogador.** Na carteira mista, esse arranjo permitiu 1.172 carimbadas em duas horas. Depois de poupar nos dez minutos finais, a mesma reserva comprava dez flippers ou três guns P20 de uma vez. Sem a bateria, comprava dez de qualquer um dos dois. Em ambos os casos, os disparos saem na mesma geração.

[Laboratório econômico](https://raw.githack.com/caioalarcon/hexophage/dev/experiments/economy/lab.html) · [Replay da colisão](https://raw.githack.com/caioalarcon/hexophage/dev/experiments/economy/colisao.html) · [Resultados das estratégias em CSV](resultados.csv) · [Varredura dos 160 padrões em CSV](catalogo.csv)

## Por que só aumentar o preço falha

Um flipper de três células ganha uma energia líquida por geração com as regras padrão. A 200/s, ele paga outro carimbo de 30 em 0,15 s. Os dois juntos pagam o próximo em metade do tempo médio. Reinvestindo toda a reserva assim que o preço permite, chegamos a 10.000 carimbos em 1,49 s. Cobrar **100 pelo carimbo inteiro** adia o marco para 4,92 s. Cobrar **100 por célula** dá 14,70 s. Até a 1.000 por célula, chega lá em 2 min 27 s. O custo é constante e cada compra aumenta a produção seguinte.

Um jogador que simplesmente conserva o primeiro flipper por duas horas acumula **1.440.000 de energia**, suficiente para 48.000 carimbos de 30 na mesma geração, antes de receber qualquer renda das compras. Esse cálculo também explica por que testamos a poupança além do reinvestimento.

## Treze regras com a mesma abertura

Todos começam com três células de poder de compra. Em regimes de mana o jogador recebe uma carga para o flipper inicial. A carteira mista repete *glider, flipper P2, glider, flipper P4*. Na segunda coluna, ela compra durante duas horas. Na terceira, a política de guns começa com quatro flippers e passa a comprar P20, reservando também as 829 unidades de capital de giro observadas para uma gun isolada. A quarta coluna repete a política mista guardando os dez minutos finais. A rajada recalcula o preço de cada nova ordem.

| Regra | Carimbadas mistas | Carimbadas com política de guns | Rajada final de flippers |
|---|---:|---:|---:|
| Linear atual | 10.000 em 1,22 s | 10.000 em 8,13 s | limite atingido cedo |
| Preço marginal dobra a cada 6 células no mesmo carimbo | 10.000 em 1,32 s | 10.000 em 54,21 s | limite atingido cedo |
| Preço em energia dobra a cada 8 ordens anteriores | 143 | 212 | 1 |
| Preço marginal dobra a cada 24 células vivas próprias | 191 | 5 | 3 |
| Manutenção extra do núcleo, C(C−1)/24 por geração | déficit na G381 | déficit na G460 | déficit |
| Uma mana por ordem, produção linear do núcleo | 10.000 em 4 min 33 s | 10.000 em 36,93 s | limite atingido cedo |
| Custo em mana dobra a cada 4 ordens anteriores | 42 | 68 | 1 |
| Preço pelo campo + mana linear | 191 | 5 | 3 |
| Mana produzida e armazenada pelo núcleo, com retorno decrescente | 1.172 | 2.250¹ | 10 |
| Mesma mana + preço por população viva, dobra a cada 96 células | 730 | 6 | 9 |
| Mesma mana + preço por plantio recente, dobra a cada 96 células | 1.172 | 677¹ | 10 |
| Mesma regra + bateria de energia no núcleo | 1.172 | 140 | 10 |
| Preço pelo campo (24) + mana linear + reservas com meia-vida de 5 min | 185 | 5 | 1 |

¹ A população potencial ultrapassa a capacidade total de uma esfera f320 antes das duas horas. Esses números descrevem o incentivo econômico em espaço livre. O laboratório indica quando o cenário cruza essa referência.

Apenas encarecer os carimbos grandes deixa intacto o reinvestimento no menor. Cobrar por todas as células vivas contém a plantação de flippers, mas também cobra pelos filhos das guns. No cenário de campo + mana linear, quatro flippers e **uma única gun** terminaram com cerca de 2,98 bilhões de energia e sem poder financiar a próxima gun. A taxa sobre o núcleo produz outro desvio. A plantação de flippers estabilizou em 25. Com um flipper inicial seguido de osciladores rotativos de núcleo zero, foram 10.000 carimbadas em 17,05 s.

O preço por histórico resolve o volume de ordens à custa de ritmo e recuperação. Das 143 compras mistas sob o preço progressivo em energia, apenas oito aconteceram na segunda hora. Perder a base também não reduz o preço da reconstrução nessa regra. Mana linear favorece composições diferentes, mas o primeiro flipper produz as duas moedas necessárias para reproduzir a si mesmo.

## Candidato para um playtest

No preset **Núcleo com reserva de energia e mana**, cada ordem consome **uma mana**. O consumo de energia depende da quantidade de células novas que o jogador está plantando e de quanto ele já plantou recentemente. O núcleo (C) é estimado pelas posições que permanecem ocupadas, e (H) representa células pagas recentemente. Os coeficientes abaixo são escolhas experimentais.

| Quantidade | Regra usada |
|---|---|
| Energia gerada e manutenção | Nascimentos menos a manutenção das células continuamente vivas, como no jogo |
| Mana gerada por turno | `log2(1 + C) / 9000` |
| Capacidade de mana | `1 + log2(1 + C)` |
| Capacidade de energia | `30 + 1000 × log2(1 + C)`, com preço base de 10 |
| Preço marginal de energia | `10 × 2^(max(0, H − 3) / 96)` por célula |
| Memória de plantio | Cada célula paga acrescenta um a H. A parcela correspondente cai à metade a cada cinco minutos |

A cotação soma o preço marginal sobre todo o trecho de H até H+s, por integração. Assim plantar seis células em duas ordens consecutivas custa a mesma energia que plantar seis em uma, se a geração for a mesma. A ordem dividida ainda gasta duas manas. As células nascidas pelo autômato não aumentam H. Uma bateria cheia descarta excedentes, e poupar permite várias ações simultâneas.

A primeira compra após a fundação ocorre em **45 s** na carteira mista. Houve 13 carimbadas até 5 min, 188 até 30 min, 481 até 1 h e 1.172 até 2 h. No último minuto foram 12. A bateria praticamente não muda o número de compras pequenas nessa carteira. Ela muda a composição da rajada. Depois da poupança, **9.072 de energia e 10,04 manas** financiam 10 flippers ou 3 P20, somente para plantá-las. Sem o limite de energia eram **567 milhões de energia**, com as mesmas 10,04 manas. Essa diferença permite que energia importe quando se escolhe uma estrutura grande. Existe uma desvantagem mensurável. Reinvestindo por duas horas, a carteira mista descartou **574,86 milhões de energia** por falta de armazenamento. Sua produção bruta continuou abundante. Se o jogador sente que gerar mais energia raramente muda suas decisões, a bateria apenas deslocou o gargalo para a mana. No playtest, vale observar quantas compras desejadas ele adia por cada moeda e se ainda tem motivo para proteger um corredor de gliders.

Se uma ação a cada cinco segundos no fim ainda for rápida demais, ajustar o denominador de mana de 9.000 para **18.000** reduz a mesma carteira de 1.172 para **481 compras**, com uma rajada de **8** e 90 s até a segunda compra. A política de guns passa de 140 para 137. Naquela estratégia o limitante é outro. A sensibilidade também revelou um limite inferior ruim para a bateria. Com 600 de energia por unidade logarítmica do núcleo, a política conservadora de quatro flippers nunca juntou a cotação da primeira gun **mais** seu capital de giro.

### O que o crescedor oferece

A cada geração de idade, um crescedor adiciona em média cerca de 0,75 célula ao seu núcleo e 0,75 de manutenção ao custo recorrente por turno. A P20 adiciona cerca de 0,175 de renda líquida por turno a cada geração de idade, enquanto as emissões sobrevivem. Em espaço livre, **cinco P20** têm inclinação de produção suficiente para acompanhar a inclinação da despesa de um crescedor. Os custos iniciais e a reserva para atravessá-los continuam relevantes.

No ensaio pareado com oito flippers, cinco P20 e depois gliders, acrescentar um único crescedor ao portfólio de bateria levou ao primeiro déficit na G56.908, cerca de 4 min 45 s de jogo, quando cada nave durava um minuto. Sem o crescedor, a mesma política terminou as duas horas com 1.127 carimbadas. Se as naves permanecessem produtivas pela partida inteira, o ramo com o crescedor atingiria 2.190 carimbadas e ultrapassaria a área do f320 por volta de 39 min. Sua utilidade como fonte de mana é real no modelo e depende da capacidade de manter as rotas de gliders produtivas. A raridade de energia aparece precisamente quando essa sustentação falha.

## Uma colisão que transfere o problema ao adversário

O relato de Paul Callahan contém uma síntese de crescedor com três gliders e outra com dois gliders e um flipper P2. A propriedade é uma questão adicional do Hexophage. No replay de dois gliders atacantes contra o flipper defensor, as 172 células vivas na G256 eram neutras. Na busca específica de um disparo, apareceu uma reação diferente. [Descrição de Callahan](https://conwaylife.com/forums/viewtopic.php?p=176808)

**Um glider P4 contra um oscilador refletor P42 espelhado e orientado na fase correta cria um crescedor do defensor.** Ambos são carimbos legais na esfera f256. A primeira interferência ocorre na G22. Com recursos suficientes, 416 eventos de nascimento e morte na ponta durante 64 gerações coincidiram com a ponta do crescedor do atlas, após rotação e translação. Na G768 as 568 células eram do defensor, com manutenção de 563 naquela geração.

| Reserva inicial do defensor | Com o glider | Controle com o mesmo refletor |
|---|---|---|
| 5.000 | Primeira erosão na G136. Nenhuma célula em G256 | Primeira erosão na G430. Na G256 tinha 22 células e 1.955 de energia |
| 1 bilhão | Na G256 tinha 186 células e pagava 179 de manutenção | Na G256 tinha 22 células e pagava 15 |

O refletor já tinha saldo negativo isoladamente. O controle mede o prejuízo adicional provocado pelo disparo. O replay usa as regras oficiais de nascimento, propriedade e erosão. [Abrir replay lado a lado](https://raw.githack.com/caioalarcon/hexophage/dev/experiments/economy/colisao.html)

## Alcance das simulações

- Os 160 padrões foram calibrados com o atlas. O custo corrente usa idade mínima 2. O núcleo de mana usa a interseção de células ocupadas na janela do mecanismo, com zero para naves em translação. Uma implementação de jogo poderia usar idade 100 como aproximação local. Há medições de aquecimento, erros e janelas posteriores à calibração em [Calibração dos padrões](PROFILES.md).
- Depois da calibração, cada geração soma a produção e o custo dos grupos de estruturas plantados juntos, usando médias por fase e inclinações para crescedores/emissores. A sobrevida padrão das naves é **12.000 gerações, um minuto**. Foram testados também 6 s, 10 min e sobrevida ilimitada. Uma nave que sai deixa de gerar energia. O modelo não presume a geometria da morte.
- Foram **321 execuções de cenários, controles e sensibilidades** e outras **320** em que, após o primeiro flipper, o jogador tenta repetir um dos 160 tipos, primeiro com a regra atual e depois com a bateria. Há configurações de referência repetidas entre os lotes. Com a regra atual, 22 dessas 160 políticas chegaram a 10 mil ordens. Com a bateria, nenhuma chegou. A mais ativa foi a de flippers P8, com 1.573. No entanto, 137 políticas da bateria chegaram ao primeiro déficit. Repetir indefinidamente um padrão que precisa de suporte pode consumir a reserva rapidamente.
- Todos os ensaios têm horizonte de 1.440.000 gerações. Primeiro déficit encerra a trajetória porque a erosão alteraria o padrão. Dez mil ordens é o limite de medição de uma expansão descontrolada. O laboratório pode mostrar a poupança **artificial** depois dessa marca, identificada separadamente. Não existe atraso mínimo entre ordens. As carteiras fazem compras assim que têm condições, independentemente da velocidade dos dedos do jogador.
- A energia líquida e o poder de compra são métricas diferentes. A viabilidade econômica em duas horas também difere do tempo até um vencedor. Pressão militar, bloqueio territorial, destruição das naves, abandono de estruturas e reação humana exigem partidas de teste.

## Referências de design

A comparação entre custo exponencial e produção cumulativa segue o método apresentado por Anthony Pecorella para jogos incrementais. Aqui, variamos deliberadamente o expoente entre histórico de ordens, campo vivo e células pagas recentemente. As curvas e os resultados numéricos foram calculados para Hexophage. [The Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i)

A distinção entre fonte, gasto e capacidade de armazenamento inspirou os testes separados de cunhagem de mana e de bateria. A separação entre simulação dos fluxos e simulação do tabuleiro também segue a abordagem de prototipar a economia antes de incorporá-la à partida. [Daniel Cook, Value Chains](https://lostgarden.com/2021/12/12/value-chains/) · [Joris Dormans, Simulating Mechanics to Study Emergence in Games](https://ojs.aaai.org/index.php/AIIDE/article/view/12477)

## Reproduzir

A partir da raiz do repositório, com Node 22+ e as dependências de desenvolvimento instaladas:

```sh
node experiments/economy/run.js /tmp/hex-runs.json
node experiments/economy/supply-study.js /tmp/hex-supply.json
node experiments/economy/scan-catalog.js /tmp/hex-catalog.json
node experiments/economy/export-results.js /tmp/hex-runs.json /tmp/hex-supply.json /tmp/hex-catalog.json
node --test "experiments/economy/*.test.js"
node experiments/economy/build-lab.js
node experiments/economy/lab/browser.test.js
node experiments/economy/incoming-glider-replay.mjs
```

Em `lab.html`, **Montar minha sequência** permite variar o número de flippers de abertura e alternar quaisquer dois padrões do atlas. A interface aceita ajustes nos coeficientes da regra escolhida. O experimento e o replay funcionam offline.
