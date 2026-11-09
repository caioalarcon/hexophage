# Treinamento dos bots por regra

Cada partida usa o motor esférico do jogo e os cinco aprendizes de produção. O assento humano fica eliminado desde a abertura. Todos os bots começam com o campo vazio, 820.000 créditos, intervalo de 10 gerações e pesquisa em 8×. As posições iniciais da esfera são determinísticas. A semente varia as decisões dos cinco aprendizes. Cada regra recebe a mesma sequência de sementes.

Fixamos em todas as partidas a economia **estabilidade** de produção. Cada célula carimbada custa 10.000 créditos, cada nascimento custa 1 e cada célula viva desde pelo menos 256 gerações rende 0,02 por geração, com saturação por dono na escala de 8.000 células. Uma morte de combate atribuída pode transferir 0,25 crédito. A classificação por regra física usa esses mesmos valores até para perfis que abrem com outra política na interface.

## Protocolo

- **Baralho aberto**. Em F32 (10.242 posições) rodamos até G16.384 com as sementes 4751, 8329 e 1049 em sequência. O histórico de treino passa de uma partida à seguinte dentro da regra. Depois repetimos a semente 1049 sem histórico. Essa quarta partida é o controle pareado para a terceira. As três primeiras usam sementes distintas e a repetição fica identificada nas planilhas. Em F96 (92.162 posições) e F320 (1.024.002 posições, tamanho padrão da interface), cada partida usa a semente 4751 sem histórico, até a mesma G16.384. Estendemos a partida fria de F32 com a mesma semente até a vitória ou G360.000. Uma extensão repete o mesmo início da partida curta e permite observar o que sobrevive mais tarde.
- **Oferta de uma carta**. Em F32 os cinco aprendizes recebem o mesmo carimbo como única carta, com semente 4751, histórico limpo e horizonte G4.096. Repetimos para cada forma com RLE distinta que cabe no laboratório mental. Isso dá uma oportunidade aos carimbos que raramente entram na amostra do baralho aberto. O bot pode esperar, gastar ou repetir a compra. A alternativa de emergência de uma célula continua disponível nas condições do jogo.
- **Limites do bot**. O laboratório de produção aceita carimbos com raio axial centrado até 17 (reserva três anéis dentro de um recorte de raio máximo 20). Formas que excedem esse limite têm `thinkable=false` e medidas em branco. Uma abertura com mais de 82 células não cabe no saldo inicial, mesmo quando é simulável. Na partida de carta única ela não pode financiar a própria compra. O ensaio conserva essas duas condições.

## Ler os resultados

- [matches.csv](./matches.csv) contém uma linha por partida aberta. `tactics` conta compras dirigidas a um rival, `tributePaid` soma as transferências de combate efetivamente pagas e `operatingCashDelta` soma receitas menos pagamentos dos bots antes do custo dos carimbos. `stampSpending` informa esse custo à parte. `peakLiving` inclui células neutras. `positiveFinalFlow` conta bots com média móvel de fluxo positiva no encerramento, arredondada a três decimais.
- [stamp-trials.csv](./stamp-trials.csv) discrimina compras e número de compradores por carimbo, partida e regra. As colunas de `empty`, `own` e `rival` contam os ensaios mentais concluídos e dão a utilidade média normalizada de colocar a carta naquele contexto em relação a esperar. As de `field/` são observações posteriores à compra e podem refletir outras ações simultâneas. As cartas sem tentativa ou compra naquela partida são omitidas.
- [auditions.csv](./auditions.csv) inclui oferta e adesão, compras, fluxo final combinado, população, erosão, tributos e variação do caixa dos cinco bots até G4.096. `sumCashDelta` já desconta os carimbos comprados. `sumFinalFlow` mede as receitas e despesas em atividade no fim. Uma alta adesão pode coexistir com fluxo negativo, pois os bots também financiam experimentos.

## Escolhas no baralho aberto

São as quatro partidas curtas de F32, incluindo o controle frio. A última coluna conta cartas que, oferecidas sozinhas, deixaram ao menos um aprendiz com fluxo positivo em G4.096.

| Regra | Compras | Cartas mais compradas em F32 | Cartas com fluxo positivo na oferta individual |
|---|---:|---|---:|
| B2/S245 | 203 | Fazenda 4 → 12 (119), Fazenda 10 → 36 (76) | 5 |
| Callahan | 40 | Stalk P8 de Bagley (18), Crescedor de colmeia (17) | 1 |
| Andreen | 14 | Broken kaleidoscope P6 (4), Half c P4 (4) | 0 |
| Bays B2/S35 | 10 | Oscilador P2 de 6 células `3fdc` (10) | 0 |
| B2/S34 | 10 | Oscilador P2 `3fdc` (7), Tree P5 (3) | 0 |
| Bays 245 | 10 | Oscilador P2 de 4 células `2fb8` (4), Static triangle (3), P2 `3fdc` (3) | 0 |
| HighHexLife | 10 | Oscilador P2 `3fdc` (10) | 0 |
| Ashley 2016 | 10 | Gull P4 (6), Fly P2 (4) | 0 |
| Ashley 2015 | 0 | Os aprendizes esperaram em todas as partidas | 0 |

A adição de quatro precursores em B2/S245 permite uma comparação mantendo física, economia e sementes iguais. Na semente 1049, os aprendizes treinados fizeram zero compras com as 20 cartas iniciais e 63 com as 24 finais. No controle frio dessa mesma semente, passaram de cinco para 50. Todos os cinco terminaram as quatro partidas curtas do catálogo ampliado com fluxo positivo. Na oferta individual, 10 → 36 alcançou o maior fluxo combinado, +22,37 créditos por geração, e 4 → 12 foi comprado mais vezes, 49.

No ensaio longo do catálogo ampliado, cinco bots ainda produziam em G360.000. Carimbaram 48 vezes e encerraram com reservas entre 1,73 e 2,25 milhões de créditos. Nas 63 partidas abertas do catálogo final, o contador de compras deliberadamente dirigidas a rivais ficou em zero. Na versão anterior do catálogo de B2/S245 houve uma dessas compras, com efeito causal mensurável.

## Um ataque que os bots descobriram

Antes de acrescentar as quatro sementes de fazenda, em B2/S245, na G269.570, um aprendiz carimbou um oscilador P2 de três células junto à fazenda P1 de 12 células de outro aprendiz. Reproduzimos as seis ordens da partida e verificamos que os cinco jogadores terminaram com os mesmos saldos, fluxos, células, nascimentos e mortes. Depois retiramos somente o ataque, a última ordem da partida.

| G360.000 | Com ataque | Sem ataque | Diferença |
|---|---:|---:|---:|
| Células da vítima | 3 | 12 | −9 |
| Fluxo da vítima por geração | −1,980 | +0,240 | −2,220 |
| Caixa da vítima | 585.230 | 785.941 | −200.712 |
| Caixa do atacante | 756.012 | 786.016 | −30.004 |
| Tributo pago pela vítima | 0 | 0 | 0 |

A fazenda passou de 12 células para três em cinco gerações. O ataque melhorou a posição relativa do atacante em 170.708 créditos até o horizonte. A vítima passou a bancar nascimentos recorrentes no lugar da renda passiva. Os outros três jogadores terminaram com resultados idênticos nos dois cenários. [Ver os dois mundos lado a lado](./attack-view.html) · [Ordens e controle](./attack-replay.json) · [Script](./attack-replay.mjs) · [Catálogo congelado das 20 cartas](./attack-catalog.json) · [Partidas antes dos precursores](./pre-precursor/matches.csv)

## Reproduzir

A partir da raiz do repositório, substitua `callahan` pelo ID do perfil desejado. Os quatro baralhos abertos podem produzir arquivos grandes com as estatísticas por carta.

```sh
mkdir -p /tmp/hex-rule-matches
node experiments/rule-survey/matches.mjs callahan 16384 32 open > /tmp/hex-rule-matches/callahan.open.jsonl
node experiments/rule-survey/matches.mjs callahan 16384 96 single > /tmp/hex-rule-matches/callahan.large.jsonl
node experiments/rule-survey/matches.mjs callahan 16384 320 single > /tmp/hex-rule-matches/callahan-prod.large.jsonl
node experiments/rule-survey/matches.mjs callahan 360000 32 single > /tmp/hex-rule-matches/callahan-long.large.jsonl
node experiments/rule-survey/matches.mjs callahan 4096 32 audition > /tmp/hex-rule-matches/callahan.audition.csv
python3 experiments/rule-survey/collect-matches.py /tmp/hex-rule-matches experiments/rule-survey
```
