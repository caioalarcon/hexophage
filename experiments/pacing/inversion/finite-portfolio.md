# Carteiras com frentes de duração finita

O arquivo `finite-portfolio.mjs` usa as trajetórias individuais de F320 de `sphere-fronts.json` como fluxos de caixa. Cada célula nascida naturalmente que alcança idade 64 rende 129 uma única vez; cada nascimento natural custa 1. O fundador é grátis, tem 36 células e a reserva inicial é exatamente 376. As células carimbadas nunca recebem o prêmio.

As primeiras 63 gerações de cada frente reproduzem os débitos observados. Distribuímos a receita do trecho produtivo de forma uniforme até o último crédito medido, preservando exatamente o pico de caixa. O trecho entre o pico e a última observação preserva o total de créditos e nascimentos. Depois disso, aplicamos o custo médio do ciclo periódico observado. O fundador representativo das 30 orientações mais produtivas atingiu o último crédito na geração 7.680, com renda líquida acumulada de 691.101 (691.092 em 28 das 30). Os outros dois fundadores receberam seu último crédito em 1.736 e 612 gerações. Os débitos residuais são, respectivamente, 4⅔, 4⅓ e 4,733 por geração.

A primeira compra de uma nave manual usa o mesmo preço de um carimbo de seis células. O modelo cobra média de 5 nascimentos por geração durante sua vida presumida. Cada P20 paga a média da primeira janela (20,95 nascimentos por geração), mais o custo de um glider a cada 20 gerações, até substituir os que deixam o campo após 5 ou 60 segundos. Essa vida é uma hipótese de atrito em combate; o glider isolado medido em F320 pode seguir em órbita por tempo indefinido.

O experimento tem seis pares de preço celular e meia-vida de pressão: (350, 300s), (280, 300s), (100, 300s), (70, 300s), (350, 60s) e (70, 60s). A duplicação ocorre a cada duas unidades de três células. Replantar sempre carrega 376 de capital de giro adicional. As frentes seguintes percorrem os 32 locais/direções medidos com um deslocamento coprimo fixo, a partir do fundador escolhido. A política não sabe qual será a próxima colheita.

As seis políticas acumulam caixa, repõem uma frente assim que cessa seu prêmio, expandem assim que possível, preservam capital para a frente seguinte e lançam um P4, preservam capital e sustentação para uma P20, ou correm diretamente para a P20. A reserva militar do P4 cobre toda a sua vida; a da gun, um minuto de despesas de regime. A compra respeita preço e reserva; não há cooldown. O fluxo e a insuficiência de caixa são verificados a cada geração. As oportunidades de compra foram amostradas a cada segundo em 162 trajetórias e a cada 0,1 segundo em 27 repetições do preço 350/T300. O horizonte é de duas horas, com encerramento se o saldo fica negativo.

| Com fundador de duração mais comum, p=350, T=300s, decisão 0,1s | Novas frentes | Ataques comprados | Primeiro ataque | Primeiro déficit |
|---|---:|---:|---:|---:|
| Guardar | 0 | 0 | — | 12,99 min |
| Replantar depois do último crédito | 1 | 0 | — | 11,88 min |
| Expandir assim que puder | 1 | 0 | — | 11,64 min |
| Preservar renovação e lançar P4 com vida de 5s | 1 | 2 P4 | 18,4s | 7,65 min |
| Preservar renovação e lançar P4 com vida de 60s | 1 | 1 P4 | 21,4s | 9,97 min |

Nas 189 trajetórias, nenhuma carteira alcançou as duas horas sem déficit. A duração máxima observada entre essas políticas foi de 12,99 minutos. Com a regra 350/T300, nenhuma carteira conseguiu sequer o preço à vista de uma P20. Reduzir o preço para 100/T300 dá ao pior fundador condições de repor uma frente sem pressão anterior, mas a carteira de reposição acaba em 1,55 minuto nesse caso. Com a colheita mais comum, essa redução permite comprar uma P20 na geração 3.400 (17 segundos) e a tesouraria fica insolvente na geração 4.088 (20,44 segundos), antes que as hipóteses de 5s e 60s distingam as despesas da gun.

A duração máxima é uma observação destas políticas. O teste não otimiza decisões contínuas de adiamento da reposição, não elimina o resíduo depois de uma frente parar e não inclui interferência física entre carteiras. O primeiro déficit sinaliza a partir de quando a erosão precisa ser modelada. Uma partida real pode continuar. Para reproduzir, execute `node experiments/pacing/inversion/finite-portfolio.mjs` a partir da raiz. A saída é `finite-portfolio.json`.

## Memória de preço mais curta e reposição adiada

Uma análise terminal acrescentou 36 trajetórias para a abertura mais frequente, com preços 100 e 350, meia-vida de 3, 10 ou 20 segundos e vida da nave de 5 segundos. Além de expansão, reposição imediata, P4 e P20, uma nova política espera até o último instante pagável para substituir a frente. Ela estima se o saldo ainda cobrirá o preço em um segundo, incluindo o déficit inicial de 376 e 70 gerações de despesas dos resíduos já existentes. As 225 trajetórias, somadas as duas rodadas, terminaram em déficit antes das duas horas.

| Preço e meia-vida | Reposição imediata | Reposição adiada | Expansão assim que possível | P4 comprados / tempo até o déficit |
|---|---:|---:|---:|---:|
| 100 e 3s | 22,96 min | 43,17 min | 7,39 min | 313 / 13,03 min |
| 100 e 10s | 19,07 min | 43,10 min | 6,88 min | 76 / 13,02 min |
| 100 e 20s | 18,45 min | 40,60 min | 7,62 min | 18 / 10,58 min |
| 350 e 3s | 18,49 min | 34,39 min | 7,35 min | 103 / 11,86 min |
| 350 e 10s | 17,81 min | 33,54 min | 7,32 min | 19 / 11,78 min |
| 350 e 20s | 6,80 min | 28,42 min | 3,39 min | 2 / 4,84 min |

A melhor carteira em duração comprou 18 frentes, além do fundador, e adiantou zero ataques. Com o mesmo 100/3s, expandir sempre comprou 95 frentes e o plano naval comprou 313 P4 em 13,03 minutos (24,0 P4/min). Nenhuma das 225 carteiras pagou uma segunda P20. O modelo admite que um adversário que destrua resíduos, uma remoção deliberada ou uma política de renovação diferente modifiquem a despesa futura.
