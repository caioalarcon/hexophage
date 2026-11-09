# Partida mista e bots

O modo misto começa com um jogador humano, cinco bots e uma carteira por facção. A regra pertence ao carimbo. A maioria das linhagens vizinhas vota sobre a existência do sítio, as cédulas herdadas resolvem a identidade entre candidaturas elegíveis e a travessia literal cobra a substituição de matéria inimiga. A última facção com células convencionais vence. Uma carteira que perdeu sua colônia fica impedida de replantar mesmo se tiver saldo ou uma onda financiada no mapa. A dupla extinção encerra a partida em empate. [Jogar](../../../index.html?rule=mixed) · [Motor da partida e aberturas](match.mjs)

## As quatro economias

A configuração inicial usa esfera F32, 640 créditos por facção, 8 por célula plantada, 1 por nascimento e 16 por substituição. Nas quatro economias cada lado começa pagando pela mesma estrutura de sua partida, em setores espalhados na esfera. O modo de estabilidade compra quatro células por 32 créditos e o precursor produz a fazenda B2/S245 de 12 células. Os modos que remuneram eventos compram o oscilador P2 de duas células de Bays por 16 créditos. Assim existe um fluxo de caixa antes da primeira decisão em cada política. A configuração permite modificar tarifas e recompensas.

| Economia | Renda por madura | Por nascimento pago | Por morte física |
|---|---:|---:|---:|
| Estabilidade | 1 | 0 | 0 |
| Nascimentos | 0 | 1,30 | 0 |
| Mortes | 0 | 0 | 1,30 |
| Atividade | 0 | 0,65 | 0,65 |

A maturidade começa aos 12 passos. A produção das maduras usa a saturação comum da carteira em escala 60. Os pagamentos por eventos são lineares e entram depois da liquidação da geração. Na economia de mortes, perder uma fazenda uma vez e manter um oscilador que produz mortes repetidamente são operações economicamente diferentes.

## Calibração do preço da estabilidade

Testamos **29 tarifas** em F32 até G512. A grade inicial cruzou maturidades 8 e 24, rendas por madura 0,5 e 1, plantios de 4 e 8 créditos e nascimentos de 1 e 2. Comparamos os 16 cruzamentos com o preço de referência, igual em plantio e nascimento aos outros três perfis. Depois testamos 12 cruzamentos intermediários com maturidade 8, rendas 0,65, 0,75 e 0,85, plantios 6 e 8 e nascimentos 0,75 e 1. Em cada combinação há três sementes e um controle sem ordens por semente. Quando uma partida termina cedo, o controle para no mesmo instante.

O preço intermediário **8 gerações, renda 0,75, plantio 8 e nascimento 1** preservou o custo de compra e a abertura em G19–20. Nas três sementes de calibração, subiu de 59 para 84 compras e de 10 para 13 ataques em relação ao padrão. O saldo por carteira na partida sem ordens em G512 caiu de 5.591,45 para 4.372,59 créditos, ou de 698 para 546 células de poder de compra. A menor renda de 0,5 com plantio 8 só estreou compras em G106–125. [Grade completa de partidas](tariff-tune.csv)

| Quatro sementes novas até G512 | Padrão 12 / 1 / 8 / 1 | Alternativa 8 / 0,75 / 8 / 1 |
|---|---:|---:|
| Compradores | 20/20 | 20/20 |
| Compras e ataques dirigidos | 80 e 15 | 94 e 17 |
| Mediana das quatro medianas de intervalo entre compras | 66,5 G | 85,5 G |
| Maior intervalo sem compra de uma carteira, incluindo abertura e fim | 430 G | 492 G |
| Carteiras ativas com mais dinheiro do que seu controle parado | 11/20 | 7/20 |
| Carteiras ativas com mais células convencionais do que seu controle parado | 20/20 | 20/20 |

**O padrão continua em 12 / 1 / 8 / 1.** A alternativa aumentou o volume de compras, mas deixou pausas mais longas e menos carteiras ativas à frente da própria renda passiva. O padrão também admite pausas prolongadas e o fundador estacionário continua gerando caixa enquanto permanecer vivo. A grade e a primeira verificação precederam a correção de busca descrita abaixo. Repetimos o confronto com a correção e **mais quatro sementes novas** (30119, 31481, 32707, 34847). Ambos fizeram 83 compras com 20 de 20 compradores. O padrão fez 12 ataques contra 14 da alternativa, e a maior pausa foi 422 contra 420 gerações. Cinco carteiras superaram o caixa passivo no padrão, contra uma na alternativa. [Primeira verificação](tariff-holdout.csv) · [Repetição com a busca corrigida](tariff-final.csv)

## Decisão de compra

O controlador consulta os rendimentos físicos medidos no PR #10 e a variação populacional medida para as 409 cartas. Ele alterna a exploração de famílias com propostas economicamente promissoras. Quando a colônia que produz por estabilidade fica maior, o bot reavalia a renda marginal em função do número de maduras da carteira, do custo de plantio e do prazo de retorno previsto.

Cada candidato legal gera duas cópias do mesmo disco, de raio 12 na esfera. Uma carteira compra o carimbo proposto e a outra espera. Ambas usam o motor completo de física mista, o resolvedor, a cédula, os preços e a regra de existência da partida. O bot observa o saldo depois de 16 gerações para investimentos ou 18 para ataques, e projeta a diferença de fluxo pela média dos quatro últimos passos. A projeção usual é de 48 gerações. Uma carteira estável que já investiu pode sustentar horizonte de amortização maior conforme o saldo. O bot guarda a utilidade de seus ensaios por carta durante a partida. A reposição do campo do alvo entra no valor estimado de um ataque.

Para atacar, o bot escolhe um rival vivo, reconhece um setor e usa o deslocamento medido de uma nave para testar posição, distância e orientação. Um ataque aprovado pode esperar até 18 gerações para reencontrar a configuração local de dono, física e resolvedor do alvo. Os planos defensivos também ensaiam guarda junto das próprias células. A compra definitiva volta a passar pelos testes reais de espaço, saldo e sobrevivência do jogador. O padrão, a orientação, a aquisição e o resolvedor constam no recibo.

O planejador desta partida é a extensão do piloto misto. O ranking físico vem do PR #10. O controle de fase, a comparação com espera e o orçamento compartilhado aplicam-se às nove físicas na esfera mista. O controlador original `createThinkingStrategy` continua exercitado separadamente no ensaio com quatro catálogos. [Controlador do jogo](bots.mjs) · [Comparação com o controlador original](../PILOTS.md)

## Calibração e partidas com sementes reservadas

Os cinco bots dividem **quatro pares de passos privados por geração**. Na calibração F32, em 12 partidas até G256, o ponto de partida fazia 251 compras e 19 ataques dirigidos. A configuração escolhida fez 295 compras e 31 ataques com o mesmo orçamento por geração. Nas quatro partidas de estabilidade de validação até G512, a cotação marginal e a busca após longas esperas elevaram as compras de 43 para 98. A mediana dos intervalos entre compras ficou entre 46 e 90 gerações por partida, contra 179 a 300 com a cotação congelada. Houve 14 ataques dirigidos de estabilidade em ambos os braços. [Ponto de partida](bot-baseline.csv) · [Calibração](bot-tuned.csv) · [Cotação congelada](bot-validation-static.csv) · [Validação](bot-validation.csv)

O teste final usou as sementes 991, 1933, 3011 e 4289, em F32 e F48. Para cada partida, executamos outra com a mesma malha, orçamento e fundadores, sem novas ordens até a mesma geração. O assento humano mantém sua abertura nas duas condições. Isso mede como os bots reagem às construções uns dos outros e não estima taxa de vitória contra humanos. Em cada linha abaixo há oito partidas ativas, oito controles e 40 carteiras de bots. A vantagem compara cada bot com o seu próprio assento no controle.

| Economia | Compraram | Compras | Ataques dirigidos | Mais caixa que o controle | Mais células convencionais que o controle |
|---|---:|---:|---:|---:|---:|
| Estabilidade | 39/40 | 194 | 33 | 4/40 | 38/40 |
| Nascimentos | 40/40 | 453 | 47 | 39/40 | 39/40 |
| Mortes | 40/40 | 427 | 59 | 40/40 | 39/40 |
| Atividade | 40/40 | 488 | 67 | 39/40 | 39/40 |

A primeira compra ocorreu em G19 nas 32 partidas e a mediana dos compradores fez seu primeiro pedido em G20. No total foram 1.562 compras e 206 ataques dirigidos. Nas três economias de eventos os bots compraram carimbos das nove físicas. Na de estabilidade compraram de oito. Ao longo da bateria apareceram contato, guarda, travessia e antimatéria. A maior pausa de uma carteira da estabilidade caiu de 493 para 324 gerações após a correção da busca. Nesse braço, fazer mais investimentos deixa a maioria com mais campo do que no controle, mas com menos caixa disponível. [Cada partida em F32](bot-holdout.csv) · [Cada partida em F48](bot-f48.csv)

**O primeiro ataque pago de cada partida foi reexecutado** em duas cópias da esfera inteira, uma com o ataque e outra sem ele. Durante as 48 gerações seguintes não entram ordens adicionais. Em 26 de 32 replays o alvo terminou com menos células convencionais. Em 18 o atacante terminou com melhor vantagem de caixa sobre o alvo. A previsão local congela o campo e a renda de maduras de fora do disco. Nascimentos, mortes e ataques futuros além da borda ficam fora da previsão. O bot também pode rejeitar uma tática cujo efeito só aparece depois do horizonte.

As 32 partidas de validação final continuavam abertas em G512. Em outras oito até G2048, com sementes 953 e 2933 em F32, cinco produziram vencedor entre G818 e G1247. As duas de estabilidade e uma de nascimentos continuavam abertas. O controle cronometra a primeira extinção convencional e o encerramento natural, sem desempate por caixa ao vencer o prazo. [Partidas longas](bot-endurance.csv)

## Por que dois jogadores pareciam travados

Na semente 991 em F48, o jogador 5 tinha 671 créditos em G20 e queria plantar 160 em um Crescedor. Sua posição havia ganhado dois contatos com vizinhos hostis durante a previsão. As duas compras seguintes tiveram retorno estimado negativo. Ele começou uma quarta investigação e foi eliminado em G75 com 1.062 créditos. Congelamos as demais ordens e repetimos o lançamento do Slider Ashley do jogador 6 em G63. Sem o lançamento, o alvo ainda tinha as 12 células da fazenda em G75. Com o lançamento, tinha zero. Foi a única carteira dos testes reservados que não fez uma compra além da abertura.

O jogador 2 da mesma partida continuava vivo e fazia pesquisas. Comprou em G19, terminou com 16.064 créditos, mas repetiu várias vezes uma semente Callahan que seus próprios ensaios já haviam desaconselhado. Em G256 tinha 165 maduras e 7.109 créditos. Reavaliamos as cartas de melhor amortização em um disco desocupado no vértice 697. Quatro das nove colocações legais tinham cotação positiva. O replay de esfera inteira da fazenda B2/S245 de 10 células, sem outras ordens nos dois braços, terminou 128 gerações depois com **113,71 créditos e 36 células a mais** do que guardar o dinheiro.

Depois de 96 gerações sem compra, o controlador agora investiga cartas rentáveis ainda não examinadas nesse período, alternando famílias, e compara até oito regiões legais para encontrar uma pouco ocupada. A proposta passa pela mesma comparação com esperar e pelo mesmo orçamento de simulação. O jogador 2 passou a comprar novamente em G169. Controlando a mudança apenas nesse jogador, ele passou de uma para oito compras e de 193 para 929 células em G512. Com todos os bots corrigidos, fez sete compras, terminou com 800 células e 3.415 créditos. Sua maior pausa passou de **493 para 150 gerações**. [Execução original e contrafactuais](bot-stall-off.json) · [Somente jogador 2 corrigido](bot-stall-seat2.json) · [Todos corrigidos](bot-stall-all.json)

## Tempo e reprodução

Em Chromium headless, para a semente 991 em F32, o percentil 95 de custo **dos cinco bots juntos** foi 2,1 ms por geração na estabilidade e 2,2 ms na atividade. O percentil 95 de motor mais bots ficou em 6,1 ms e 5,3 ms, respectivamente. O maior valor entre as 1.024 gerações foi 15,7 ms. Essa medição exclui desenho e manipulação do DOM. [Tempos coletados](bot-timing.csv) · [Medição no navegador](bot-timing.mjs)

```sh
node --test experiments/typed-world/game/bots.test.mjs
node experiments/typed-world/game/bot-survey.mjs tune 256 32 4 64 18 0 0 '' '' 0
node experiments/typed-world/game/bot-survey.mjs tune 256 32
node experiments/typed-world/game/bot-survey.mjs validation 512 32 4 48 16 18 0 '' '' 0
node experiments/typed-world/game/bot-survey.mjs validation 512 32
node experiments/typed-world/game/bot-survey.mjs holdout 512 32
node experiments/typed-world/game/bot-survey.mjs holdout 512 48
node experiments/typed-world/game/bot-survey.mjs endurance 2048 32
node experiments/typed-world/game/bot-timing.mjs
python -B experiments/typed-world/game/tariffs.py tune
python -B experiments/typed-world/game/tariffs.py tariff-holdout 8,0.75,8,1
python -B experiments/typed-world/game/tariffs.py tariff-final 8,0.75,8,1
node experiments/typed-world/game/bot-stall.mjs off
node experiments/typed-world/game/bot-stall.mjs seat2
node experiments/typed-world/game/bot-stall.mjs all
```
