# Partidas com os cinco aprendizes

Rodamos **423 partidas esféricas com a economia de estabilidade**, num total de 7.723.641 gerações. Todas começaram com os mesmos aprendizes de produção, memória vazia, 820.000 créditos por bot, pesquisa 8× e intervalo de dez gerações. O sexto assento, sem jogador, ficou fora desde o início. As nove regras foram testadas com a resolução original, o desempate por linhagem e o veto a nascimentos mistos. [Dados por partida](./matches.csv)

## O que acontece espontaneamente

Nas 171 partidas sem intervenção, nenhum bot comprou um carimbo mirando deliberadamente um adversário. Houve mortes atribuídas a rivais com pagamento em 14 partidas. Duas colônias podem se encontrar por crescimento ou movimento depois de uma colocação econômica. Entre as 54 partidas F320 até G8.192, não houve pagamento por morte atribuída nem eliminação. As partidas F24 de maior duração produziram vencedores em Callahan e Bays B245/S3. Uma partida também pode terminar por esgotamento econômico próprio.

| Esfera e horizonte | Partidas | Com morte atribuída e paga | Partidas com vencedor |
|---|---:|---:|---:|
| F16, até G32.768, nove regras, três sementes, três políticas | 81 | 6 | 0 |
| F320, até G8.192, nove regras, duas sementes, três políticas | 54 | 0 | 0 |
| F24, até G131.072, seis regras, duas sementes, três políticas | 36 | 8 | 9 |

Na F24, cada política produziu dois vencedores em Callahan e um em Bays B245/S3. Em B2/S245, os aprendizes conseguiram financiar produção sem disputar um único ponto observado do mapa nem pagar tributo nas seis partidas longas. Em Ashley 2015, os três ensaios F16 com linhagem terminaram sem um único carimbo nem população. Cinco jogadores que ainda têm dinheiro podem continuar legalmente na partida mesmo com o tabuleiro vazio.

## Nove regras em condições iguais

A tabela compara três partidas por célula de resultado, com o desempate por linhagem. Na abertura experimental, dois dos cinco bots recebem uma ordem paga cada um, a formação do perfil e a nave mais barata apontada para ela. B2/S245 usa a fazenda 10 → 36 como alvo. Os cinco continuam a tomar suas decisões normalmente. Cada regra encontra um par de padrões diferente.

| Regra | F16 livre, partidas com tributo | F32 com nave apontada, partidas com tributo | Pico de células vivas nessas três partidas F32 |
|---|---:|---:|---:|
| Callahan | 2/3 | 2/3 | 1.424 |
| Bays B2/S35 | 0/3 | 0/3 | 20 |
| Hexagonal Life B2/S34 | 0/3 | 0/3 | 54 |
| B2/S245 | 0/3 | 3/3 | 3.914 |
| Bays B245/S3 | 2/3 | 3/3 | 51 |
| Andreen | 0/3 | 0/3 | 53 |
| HighHexLife | 1/3 | 0/3 | 29 |
| Ashley 2015 | 0/3 | 3/3 | 21 |
| Ashley 2016 | 0/3 | 3/3 | 562 |

**Bays B245/S3** apresentou situações de contato pago nas três aberturas dirigidas sem tomar o planeta. Na F16 livre também houve contato pago em duas das três corridas. **Ashley 2016** deu um exemplo de decisão de ataque com consequências econômicas. Em F32, lançar o Slider de seis células contra o canhão Hawk do defensor, em comparação a aguardar naquela mesma posição de partida, melhorou a diferença de caixa atacante menos defensor em 74.095, 147.902 e 323.193 créditos até G1.536. O defensor terminou com 153 a 351 mil créditos a menos que no controle. Apontar a mesma nave 180 graus para longe produziu zero tributo nas três corridas. O controle inclui a reação e as compras posteriores dos cinco bots. Esta situação demonstra uma escolha disponível ao jogador. Os aprendizes não fizeram essa compra espontaneamente.

## O choque que toma o mapa em B2/S245

Na F32 há 10.242 posições. A fazenda 10 → 36 e a nave P6 de nove células ocupam duas posições de lançamento legalmente separadas. Uma compra usa dez células e a outra usa nove. A primeira célula cinzenta das três partidas com política original apareceu já na G3, antes da primeira compra autônoma. Na G1.536, as três tinham **zero células de jogador**, 3.704–3.766 cinzentas e cinco jogadores ainda vivos pelo saldo. A mesma política em uma abertura com a nave desviada também chegou ao campo cinzento nas três sementes, mas o primeiro nascimento cinzento foi posterior. Na abertura sem a nave houve cinzentas em uma das três até o mesmo horizonte.

| Após o choque dirigido até G16.384 | Original | Linhagem | Veto a nascimentos mistos |
|---|---:|---:|---:|
| Células cinzentas finais | 3.678–3.768 | 0 | 0 |
| Células de jogadores finais | 0 | 3.715–3.790 | 3.681–3.751 |
| Facções com campo | 0 | 1–2 | 3–5 |
| Jogadores eliminados por partida | 0 | 1–3 | 0 |
| Tributo acumulado pago na partida | 0 | 24.999–50.116 | 1.018–1.071 |

Linhagem e veto eliminaram a proliferação **anônima** neste caso. A proliferação física continuou grande nos dois modos. Com linhagem, em G1.536 já havia 8.496 a 9.322 posições observadas sob mais de uma facção no decorrer da partida. Em G16.384 pelo menos um dono da massa viva tinha reserva zero em cada corrida. Ficar sem caixa remove células por erosão. No preço de produção, uma célula removida cobre até 10.000 créditos de déficit naquela geração, enquanto o nascimento custa um. A massa pode repor células vivas mais rápido que a erosão as retira. Uma expansão acompanhada de muitas mortes e transferências pode assim representar perda de controle ou falência.

## Medidas e reprodução

- `aimed` registra compras direcionadas pelos próprios aprendizes a rivais. O jogo cobra as ordens de abertura prescritas. O CSV registra sua quantidade à parte. `tribute` mede pagamentos reais por mortes que a política de combate atribuiu a adversários. A métrica não contabiliza todo prejuízo econômico causado por uma colisão, e uma vítima sem caixa pode não pagar.
- `activeBots` conta quem ainda tem células. `eliminated` usa a regra real da partida, campo vazio e saldo insuficiente para comprar uma célula. `winner` usa o encerramento real do jogo. `gen` pode ser inferior ao horizonte solicitado em partidas com vencedor.
- `sharedSites` conta posições observadas sob pelo menos duas facções ao longo do tempo. `sampledTouch` conta amostras com células de facções diferentes diretamente vizinhas. Pais a distância dois podem disputar um nascimento sem serem diretamente vizinhos. A amostragem espacial ocorre a cada geração até G32, depois a cada 32 gerações e no final. O pico cinzento, o primeiro cinzento, eliminações e pagamentos são medidos a cada geração.
- Usamos sementes 4751, 8329 e 1049 no conjunto de três repetições, e as duas primeiras no conjunto de duas. A sequência é fria e repetida nas duas ou três políticas. Na F24 longa entraram Callahan, as duas Bays, B2/S245, Andreen e Ashley 2016. A F32 teve 243 partidas até G1.536, com as nove regras, três políticas, três sementes e três aberturas, mais nove extensões dirigidas de B2/S245 até G16.384. Os grupos `hold`, `outbound` e `inbound` significam defensor sozinho, defensor mais nave apontando para longe e defensor mais nave apontando para o alvo. Na esfera um disparo inicialmente para longe pode voltar a encontrar um adversário.
- Os números medem ação deliberada, troca territorial, contato, efeito econômico e resolução da partida. A escolha da nave mais barata e de um defensor por regra representa um tipo de abertura. Os ensaios com outros pares, fases e posições estão no levantamento de colisões.

Exemplo a partir da raiz do repositório, gravando uma saída JSON por combinação e reunindo-as em CSV:

```sh
mkdir -p /tmp/hex-conflict-matches
node experiments/conflict-survey/matches.mjs hex-b2s245 lineage inbound 32 16384 4751 stability > /tmp/hex-conflict-matches/example.json
python3 experiments/conflict-survey/matches-collect.py /tmp/hex-conflict-matches /tmp/matches.csv
```
