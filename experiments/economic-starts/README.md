# Economia de abertura por autômato

Cinco aprendizes começaram com o mapa vazio e pagaram cada carimbo. A comparação mantém a esfera hexagonal, a ocupação por linhagem e o crescimento físico livre. Comparamos a tarifa histórica de cada regra com o pacote de preços selecionado para ela. As duas condições usam o mesmo controlador dentro de cada comparação.

## Tarifas selecionadas no treino

Os créditos iniciais equivalem a 48 células do carimbo em oito regras. Hex B2/S245 começa com o equivalente a 24. Na estabilidade, cada nascimento natural aceito custa um crédito, exceto em Hex B2/S245, onde custa oito. O orçamento limita os nascimentos aceitos. Em Ashley 2015 cada nascimento paga um crédito e células maduras exigem manutenção. A escala controla a saturação da produção ou da manutenção madura do jogador, somando todos os seus campos.

| Regra | Política | Maturidade (G) | Crédito por madura | Escala | Preço por célula do carimbo | Tributo por morte |
|---|---|---:|---:|---:|---:|---:|
| Andreen, Ashley 2016 | Estabilidade | 4 | 3 | 48 | 240 | 40 |
| Bays, HighHexLife | Estabilidade | 12 | 6 | 32 | 400 | 25 |
| Bays 245, Hexagonal Life B2/S34 | Estabilidade | 24 | 2 | 64 | 400 | 25 |
| Callahan | Estabilidade | 8 | 8 | 12 | 200 | 40 |
| Hex B2/S245 | Estabilidade | 12 | 1 | 16 | 80 | 32 |
| Ashley 2015 | Atividade | 6 | 1 | 60 | 800 | 32 |

O atlas e a abertura automática humana usam o preço da partida e a distribuição de idades medida para cada carimbo. Uma compra manual já feita é respeitada. O plantio automático só é usado para o jogador humano. O aprendiz escolhe e paga suas próprias aberturas nas partidas.

## Viabilidade dos carimbos

Cada um dos 409 carimbos cadastrados passou por 1.024 gerações isoladas, com a regra física correspondente. Cotamos os eventos em cada geração com os preços antigos e selecionados. Um padrão entra nas duas últimas colunas se cabe na reserva, conserva o saldo não negativo durante toda a trajetória e tem fluxo positivo nas últimas 128 gerações. A última coluna também exige recuperar o investimento até G1.024. O retorno da abertura na tabela é a primeira geração em que o caixa alcança o saldo de quem guardou todo o dinheiro.

| Regra | Carimbos | Abertura automática padrão | Retorno (G) | Carimbos viáveis | Recuperam o investimento |
|---|---:|---|---:|---:|---:|
| Callahan | 205 | Stalk by a collision of 2 gliders and eater | 78 | 182 | 181 |
| Bays | 30 | poly-3fdc3dd6 | 191 | 1 | 1 |
| Hexagonal Life B2/S34 | 43 | Triangle Growth Remnant P10 | 277 | 5 | 5 |
| Hex B2/S245 | 24 | Fazenda 4→12 | 73 | 4 | 4 |
| Bays 245 | 19 | poly-3fdc3dd6 | 925 | 3 | 1 |
| Andreen | 32 | Toggle Pair | 825 | 4 | 1 |
| HighHexLife | 35 | poly-3fdc3dd6 | 191 | 1 | 1 |
| Ashley 2015 | 8 | puff30 | 170 | 8 | 7 |
| Ashley 2016 | 13 | scan-b1cf68 | 774 | 1 | 1 |

Nenhum padrão que satisfazia o teste de viabilidade sob a sua tarifa antiga recuperou o investimento até G1.024. Com a tarifa nova, a fazenda 18→66 de Hex B2/S245 custa 1.440 dos 1.920 créditos disponíveis e entra em déficit em G3 durante o crescimento inicial. Ela pode servir como expansão depois de acumular capital. A fazenda 4→12 custa 320, paga sua formação e gera cerca de 6,86 créditos por geração quando isolada. Bays e HighHexLife têm uma só abertura de retorno verificado no acervo atual. A projeção isolada não inclui adversários, interações entre fazendas nem curvatura.

## Desenho do ensaio

- **Escolha de preços.** 244 partidas em F20, horizonte G4.096, quatro sementes de treino (8273, 1193, 19711, 30047). Cada regra recebeu a tarifa histórica, quatro opções de estabilidade e uma de atividade. Hex B2/S245 recebeu quatro opções extras e Callahan, três. A seleção exigiu médias de pelo menos 3,5 dos cinco bots com compra até G1.024 e 3,5 com recompra, presença de campo em pelo menos 50% das observações jogador/tempo e pico de ocupação de no máximo 30% da esfera em cada semente. Entre os pacotes que passaram, a seleção favoreceu estabilidade, caixa final médio entre 0,25 e oito vezes a reserva inicial, ataques deliberados, tributos e diversidade. Os desempates completos estão em `select.py`.
- **Confirmação.** As tarifas ficaram fixas antes da confirmação. Três sementes fora do treino (9181, 16921, 41597), com os mesmos pares de tarifa e semente, foram testadas em F32/G16.384, F96/G8.192 e F320/G16.384. Estendemos os jogos F32 a G65.536. O teste longo reaproveita as mesmas trajetórias iniciais. As sementes representam três realizações por regra e condição, independentemente de quantos horizontes são tabulados.
- **Medições.** Uma compra dirigida é aquela que o bot executa com um alvo rival. Um tributo é uma transferência registrada pelo motor por morte em contato e pode ocorrer por colisão espontânea. A eliminação requer campo vazio e saldo insuficiente para comprar uma célula. A partida só elege um vencedor quando resta um único jogador. Os totais agregam as nove regras com o mesmo peso. A média de caixa pode ser dominada por poucos campos muito ricos.
- **Comparador passivo.** Outras 54 partidas F32/G16.384 tiveram quatro aprendizes e um assento que permanece em espera. O assento passivo muda conforme a semente. Cada aprendiz é comparado ao caixa real do passivo na mesma partida, já descontadas todas as compras. O saldo líquido do passivo fica exatamente na reserva inicial.
- **Observação experimental de campo vazio.** Um lote independente usa sementes novas (593, 8087, 33703) para testar uma cobrança somente depois de 512 gerações consecutivas sem campo. O custo é um preço de célula a cada 64 gerações, debitado proporcionalmente por geração. Recuperar campo reinicia a carência. O ensaio liga a opção no motor da partida e na simulação mental do bot. A comparação de preços acima mantém essa cobrança desligada nos dois braços para medir o benefício de investir mesmo quando esperar é gratuito. O cenário de perda tardia remove o campo de um assento em G4.096 para medir se ele consegue plantar novamente.

## Resultado das partidas com aprendizes

Cada linha compara 27 partidas de preços antigos a 27 partidas das tarifas selecionadas. São 135 assentos em cada condição. O denominador das vitórias é o número de partidas.

| Esfera e horizonte | Abriram até G1.024 | Fizeram recompra | Compras | Compras dirigidas | Partidas com tributo | Eliminações | Vitórias |
|---|---:|---:|---:|---:|---:|---:|---:|
| F32 · G16.384 | 103 → 135 | 80 → 130 | 361 → 1.972 | 0 → 223 | 9 → 23 | 17 → 1 | 3 → 0 |
| F96 · G8.192 | 102 → 135 | 65 → 131 | 432 → 1.340 | 0 → 111 | 3 → 17 | 5 → 0 | 0 → 0 |
| F320 · G16.384 | 102 → 135 | 72 → 135 | 713 → 2.013 | 0 → 177 | 5 → 22 | 0 → 0 | 0 → 0 |
| F32 · G65.536 | 103 → 135 | 113 → 131 | 523 → 4.619 | 4 → 854 | 9 → 26 | 23 → 4 | 5 → 0 |

Em F32/G16.384, Hex B2/S245 passou de 78 para 740 compras, das quais 98 foram dirigidas. Ashley 2015 saiu de zero compras para 159, com 56 dirigidas. As quatro opções reforçadas de estabilidade para Ashley 2015 continuaram com zero compras no treino. Mudar o pagamento para nascimentos abriu uma linha de jogo para seus padrões móveis.

**Callahan** concentra o ganho em poucas estruturas. Em F32/G16.384 as compras caíram de 54 para 27, sem ações dirigidas nos dois braços. Com a sugestão, a reserva final média atingiu cerca de 130 vezes a inicial em F320, também sem ataque dirigido. Hexagonal Life B2/S34 igualmente teve zero compras dirigidas em F32/G16.384. O campo cresceu e os jogadores sobreviveram sem converter essa vantagem em pressão sobre o adversário.

**Confronto com a espera.** Nas 54 partidas que incluíram um jogador passivo, 108 de 108 aprendizes fecharam acima da carteira intacta do passivo com as tarifas selecionadas. Com as antigas foram 10 de 108, todos em Bays. Em Hex B2/S245, os 12 ativos superaram o passivo por uma mediana de 4.048 créditos. Em todos os casos o passivo permaneceu solvente sem campo com a taxa desligada.

**Vitória.** As cinco vitórias antigas em F32/G65.536 aconteceram em jogos sem uma única compra dirigida. Nas tarifas selecionadas houve mais jogos com ataques e quatro eliminações até esse horizonte, mas sob essas condições sobraram pelo menos dois jogadores em todas as 27 partidas. O experimento mede incentivos e decisões observáveis. Ainda não demonstrou que a partida de crescimento livre converge para um vencedor.

## Custo de manter só a carteira

No ensaio independente de G65.536, usamos as tarifas selecionadas e ligamos ou desligamos apenas a cobrança de campo vazio. A simulação mental do bot recebe a mesma regra que a partida. A tabela mostra os dois braços na ordem sem taxa → com taxa.

| Cenário | Partidas por braço | Observação |
|---|---:|---|
| Quatro aprendizes e um passivo | 27 | Passivos eliminados 0 → 27. Os ativos fizeram 4.320 compras, com 898 dirigidas, em ambos os braços. |
| Cinco aprendizes livres | 27 | Eliminações 4 → 4. Compras 4.598 → 4.589. Compras dirigidas 894 → 894. Só duas partidas cobraram algum jogador. |
| Campo de um aprendiz removido em G4.096 | 9 | Reconstruções 9 → 9. Um desses jogadores foi depois eliminado em cada braço. A maior demora até replantar foi de 2.534 → 8.944 gerações. |

A taxa retira da disputa o jogador permanentemente vazio em G1.985 com a reserva B2/S245 ou G3.521 com a reserva das outras oito regras. Um jogador com uma única célula no mundo conserva a carteira. Os nove ensaios de recuperação cobrem Callahan, Ashley 2015 e Hex B2/S245. Em Callahan a reconstrução chegou a demorar 8.944 gerações com a taxa e a maior reserva acumulada permite longos períodos sem campo. Nenhuma das 126 partidas dessa comparação acabou com um único sobrevivente. A configuração sugerida ativa a cobrança nas nove regras e permite desligá-la na partida.

## Colisão entre o P6 e a fazenda

O atacante pagou o P6 e o defensor pagou a fazenda 4→12. Ambos usaram a carteira normal. Em F320, na mesma direção e pista, cotamos o par de preços e o requisito de financiar nascimentos independentemente. A observação do campo e das carteiras continuou até o horizonte mesmo após uma eliminação.

| Preços | Financiamento dos nascimentos | Pico de células vivas | Células em G+1.024 | Situação dos dois donos em G+1.024 |
|---|---|---:|---:|---|
| Antigos | Permite descoberto | 67.134 | 66.938 | Ambos com campo e caixa zero |
| Antigos | Exige saldo | 13.394 | 0 | Ambos eliminados |
| Selecionados | Permite descoberto | 12.278 | 12.278 | Ambos com campo e caixa zero |
| Selecionados | Exige saldo | 42 | 0 | Ambos eliminados já em G+128 |

Em outra trajetória conhecida de F32, um P6 sem resposta destruiu as 12 células da fazenda e os dois se eliminaram. Um P2 de duas células plantado pelo defensor em G+2 custou 160 créditos e preservou os 12 locais originais até G+1.024. O defensor terminou com 8.349,51 créditos, contra 8.557,51 sem ataque nem defesa e zero quando recebeu o ataque sem responder. A defesa reutiliza uma posição conhecida e é paga pelo motor. A precisão espontânea dos bots é medida nos ensaios táticos separados.

## Reprodução

Execute no diretório do projeto com Node e Python 3. Os CSVs têm uma linha por partida, por jogador, por condição experimental ou por carimbo, conforme o arquivo. O piloto de preços precede a última revisão de atribuição do erro de previsão e do faseamento dos tiros. Para repetir a seleção exatamente, aplique `training-controller.patch` **num checkout separado** com `git apply experiments/economic-starts/training-controller.patch` antes de rodar as duas primeiras linhas. Rode a confirmação no checkout publicado e confira que `selection.csv` é a seleção registrada.

```sh
python3 experiments/economic-starts/run.py /tmp/hex-prices train
python3 experiments/economic-starts/select.py
python3 experiments/economic-starts/run.py /tmp/hex-prices validation
python3 experiments/economic-starts/run.py /tmp/hex-prices long
python3 experiments/economic-starts/run.py /tmp/hex-prices production
python3 experiments/economic-starts/summary.py
node experiments/economic-starts/openings.mjs
node experiments/economic-starts/birth-finance.mjs
node experiments/economic-starts/wait-control.mjs
python3 experiments/economic-starts/vacancy.py
```
