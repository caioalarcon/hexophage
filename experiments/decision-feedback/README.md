# Aprender com uma jogada executada

O aprendiz registra o que previu ao comparar uma compra com esperar. Depois da compra, observa o mesmo setor do planeta até a geração prevista, medindo separadamente os seus próprios resultados e os do jogador que mirou. Em cada configuração, a observação é privada durante a partida e pode ser consultada como experiência herdada na próxima.

O mundo informa quantas células de cada lado existem no setor, quantas nasceram e quantas atingiram a maturidade. O bot calcula o fluxo dos dois lados com as mesmas tarifas, saturação e contribuição externa usadas pela previsão. Assim, um investimento em outra parte do planeta não vira automaticamente mérito deste ataque. Quando o orçamento permite, o bot acompanha todos os passos e contabiliza o resultado operacional acumulado. O registro distingue esse resultado, o custo inicial e a diferença de fluxo no fim da janela. Os números operacionais cobrem nascimentos e maturação. O motor da partida também liquida tributos e erosão.

A ação escolhida acontece de fato. O controle de esperar continua sendo a projeção armazenada antes da compra. É possível verificá-lo fora do jogo com um segundo planeta, como no ensaio abaixo.

## Crédito e orçamento

- Cada um dos cinco bots pode ter uma observação ativa. O acompanhamento usa o mesmo orçamento de visitas da mente e aproveita a lista de células de um jogador quando ela é menor que o setor. Em regiões movimentadas pode medir só a fase final ou descartar a observação.
- Uma ordem posterior, inclusive de um terceiro jogador, cancela o registro se puder atingir aquele setor antes do prazo. O teste usa um limite conservador da distância que uma influência pode percorrer ao longo das arestas da esfera. Previsões recortadas, projeções insolventes, compras realocadas e observações que perdem o prazo não treinam a correção.
- O efeito relativo observado alimenta a escolha de futuras sondagens. O bot também guarda o erro assinado de previsão por carimbo e por contexto local orientado, incluindo fase do alvo, orientação e distância relativa do carimbo. Cada repetição testa **em sombra** se a correção sugerida teria previsto melhor o resultado que se concretizou. A correção numérica só influencia o próximo lance depois de pelo menos duas validações com saldo favorável no contexto. Seu tamanho é limitado pela magnitude da interação prevista.
- Avaliações longas de fazendas usam um portfólio de um único carimbo e suspendem a atribuição individual quando há outras compras na janela. Os mesmos princípios valem para os nove catálogos e para fórmulas B/S personalizadas.

## Experimento com controle causal

Em Bays B2/S35, no centro de uma esfera F32, o alvo e o carimbo comprado são pares de duas células. Uma terceira nave P5 começa fora dos cinco anéis que a mente consegue ver nesse ensaio. Comparamos até G+64 o lance pago com uma esfera idêntica em que o mesmo jogador aguardou. Os dois mundos reais incluem a nave externa. O fluxo recebido por nascimento é 1, a implantação custa 20 por célula e a tarifa de combate é zero para isolar o efeito em produção.

| Grandeza na posição de treino | Previsão física | Medida com o controle no planeta |
|---|---:|---:|
| Fluxo adicional próprio menos fluxo adicional do alvo nas oito gerações finais | +1,25/g | −0,75/g |
| Diferença operacional acumulada em 64 gerações | +83 | +29 |
| Diferença após cobrar 40 pela compra | +43 | −11 |

Após três execuções observadas, a previsão de fluxo da **próxima** tentativa passou para −0,083/g. Após seis foi para −0,417/g. Cada tentativa reabre a memória e o controlador consulta apenas as observações anteriores. Transportamos então a geometria a seis sítios novos, mudando também a orientação, e bloqueamos nova aprendizagem entre as seis avaliações. O erro absoluto médio contra os controles esféricos caiu de **2,792 para 2,424 créditos/g**. Três poses melhoraram e três pioraram. Ao retirar a nave oculta, a previsão bruta de +1,25/g voltou a estar correta e a correção herdada piorou o resultado. O teste identifica aprendizado de um erro recorrente e seu limite diante de uma condição oculta que mudou. [Resultados por pose](./field.csv)

## Partidas livres

Seis partidas frias F32 até G16.384 combinaram as sementes 4751, 8329 e 1049 com Ashley 2015 e Bays B245/S3. Para auditar o mecanismo sob o mesmo preço, usamos atividade, carimbo a 300 e reserva equivalente a 82 células em ambos. Os aprendizes tiveram liberdade para comprar ou esperar. Essas tarifas são as do ensaio de feedback e diferem das sugestões específicas de cada regra.

Ao todo houve **264 compras e 249 observações alinhadas** ao horizonte da previsão, 53 sobre alvos rivais. 193 desses registros incluíram todo o resultado operacional desde a compra. Os contextos observados nessas seis partidas curtas não acumularam evidência suficiente para ativar uma correção numérica nos lances executados. O valor relativo medido ainda alimentou a seleção de alternativas. Antes da validação em sombra, aplicar a média dos erros anteriores sem conferir a confiabilidade aumentava o erro absoluto de fluxo nas seis partidas do piloto. [Métricas de compras observadas](./live.csv)

As extensões a G131.072 usam as mesmas sementes e incluem os prefixos dos ensaios curtos. Das **1.419 compras**, 572 miraram rivais e 1.356 tiveram a previsão confrontada com o planeta, incluindo 519 com alvo rival. Houve 1.103 séries operacionais completas. Nenhuma das compras observadas passou a usar correção numérica nas seis partidas. O acompanhamento consumiu 2.833.517 das 604.001.787 visitas da mente (0,47%). A redução de erro da tabela controlada ainda precisa se repetir em posições que ocorram espontaneamente em partidas.

A coluna `checked` conta observações concretizadas, `complete` conta séries com acompanhamento em todas as gerações, e `adjusted` conta previsões de compras com correção numérica efetivamente aplicada. A coluna de censura inclui compras que não geraram um registro e observações descartadas posteriormente.

## O que muda nas compras quando o bot usa a observação?

Seis pares de partidas F32 chegaram a G32.768 com os cinco bots vivos, usando as economias sugeridas de Bays e Ashley 2015, crescimento clássico e conflito por linhagem. Cada par começa com a mesma semente, o mesmo jogador focal e memórias vazias. Os outros quatro jogadores mantêm o aprendizado completo nos dois braços. Para o braço silencioso, o script copia o código a um diretório temporário e desliga somente a gravação da utilidade relativa de curto prazo em `field/` e a aplicação da correção numérica nos lances do jogador focal. A observação, o gasto de visitas, a estimação em sombra e a aprendizagem econômica de longo prazo continuam ativos nos dois braços. Reservas, campos e pagamentos evoluem livremente depois que as escolhas divergem.

| Regra | Semente | Focal | Primeiras compras iguais do focal | Ataques do focal com sinal / silencioso | Efeito na vantagem de reserva¹ |
|---|---:|---:|---:|---:|---:|
| Ashley 2015 | 4751 | 2 | 5 | 10 / 17 | −24.058 |
| Ashley 2015 | 8329 | 3 | 8 | 10 / 7 | −453.696 |
| Ashley 2015 | 1049 | 4 | 10 | 9 / 16 | −276.516 |
| Bays B2/S35 | 4751 | 2 | 10 | 2 / 1 | −27.656 |
| Bays B2/S35 | 8329 | 3 | 13 | 4 / 3 | +1.738 |
| Bays B2/S35 | 1049 | 4 | 19 (todas iguais) | 0 / 0 | 0 |

¹ Reserva do focal menos a maior reserva adversária em G32.768, braço com sinal menos braço silencioso, em créditos arredondados. A condição de vitória do jogo é sobreviver. Nenhuma partida terminou nestes seis pares.

O focal mudou uma compra em cinco dos seis pares. Na semente 1049 de Ashley, por exemplo, na 11ª compra o focal com sinal escolheu o carimbo `scan-bfc24a` em G15.562. No braço silencioso, comprou `scan-9d2e25` em G12.597 contra o mesmo adversário. Em outros pares, a primeira diferença foi só o instante de implantação. O placar de reserva relativo melhorou em um par, caiu em quatro e empatou em um. As diferenças de compra comprovam que a experiência recente chega à seleção natural de carimbos, locais e instantes. Essa amostra não demonstra vantagem competitiva da ponderação atual. [Dados das seis comparações](./ablation.csv)

## Teste isolado de experiência específica por pose

Em uma terceira cópia, alteramos apenas a ponderação do jogador focal. Nas propostas ofensivas removemos o bônus geral do carimbo. No lance concreto, consultamos o carimbo, a orientação, a folga, a vizinhança orientada e a fase do alvo. Exigimos duas compras observadas naquela pose para ajustar o valor do lance, com peso de `0,22 × soma das utilidades / (amostras + 4)`. Nas propostas de ocupação, uma utilidade geral precisa de três registros com apuração operacional completa e recebe a mesma suavização. Os critérios físicos de elegibilidade e financiamento continuam iguais. Nos três braços, o sistema pode aplicar a correção de erro validada em sombra, exceto para o jogador focal no braço silencioso.

Fixamos os parâmetros nos seis pares acima e repetimos o ensaio com três novas sementes por regra (607, 2371 e 9901, nas cadeiras focais 2, 3 e 4, respectivamente). Os números comparam a vantagem de reserva final do focal em G32.768.

| Amostra | Política por pose contra a política ampla | Política por pose contra silêncio | Avaliações com pose repetida |
|---|---|---|---:|
| Exploração, seis pares | 4 melhores, 1 pior, 1 empate | 6 empates | 2 |
| Confirmação, seis pares inéditos | 2 melhores, 3 piores, 1 empate | 1 pior, 5 empates | 2 |

Na confirmação, o único saldo diferente do braço silencioso foi **117 créditos pior** em Bays, semente 9901. Nesse jogo nenhuma pose ofensiva alcançou o limiar de uso. As outras cinco diferenças de reserva foram zero até o centavo. A correção proposta mobilizou pouquíssimas poses naturais e não repetiu a melhora observada na primeira amostra. O tratamento continua restrito ao experimento. [Resultados por semente e braço](./pose.csv)

```sh
node experiments/decision-feedback/ablation.mjs ashley15 4751 2 32768 silent
node experiments/decision-feedback/ablation.mjs bays 9901 4 32768 pose
node experiments/decision-feedback/field.mjs
node experiments/decision-feedback/live.mjs ashley15 activity 32 16384 4751
node --test src/bots/brain/feedback.test.js
```

Os braços da auditoria isolam a aprendizagem com guarda gratuita da reserva sem campo. A cobrança opcional por campo vazio tem seu próprio [ensaio pareado](../economic-starts/README.md).
