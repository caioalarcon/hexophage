# Teste adversarial de carteiras e carimbos compostos

**428 trajetórias** combinaram 107 estratégias com quatro regras de preço em sessões de 120 minutos, a 200 gerações/s. As rendas e populações vêm dos perfis do catálogo. A reserva inicial em cada regra compra um P2. As políticas consultam o saldo a cada geração e fazem todas as compras que podem pagar naquele instante. As naves rendem por 60 segundos. O autômato foi usado apenas para validar os carimbos compostos. A projeção econômica interrompe a contabilidade no primeiro déficit, quando a remoção de células dependeria da geometria.

O conjunto reúne 11 repetições especializadas, oito planos com tamanhos de lote diferentes e 88 carteiras de semente reproduzível. As carteiras procuram renda por célula, combinam geradores, usam naves com vida econômica limitada ou assumem o risco de crescedores. Dois terços das carteiras sorteadas reservam o capital de giro medido para os emissores. As frequências abaixo descrevem esse ensaio deliberadamente adversarial. Não estimam a distribuição entre jogadores.

## A embalagem altera a expansão?

Cada pacote contém 2, 4 ou 8 cópias separadas do P2. O teste verifica que o desenho cabe no editor, aceita um único carimbo no motor e, após oito gerações, reproduz o mesmo conjunto de células e rende exatamente oito vezes a quantidade de cópias em energia. A cotação marginal integrada também foi verificada em quatro níveis de pressão. No mesmo instante, plantar oito P2 custa exatamente o mesmo que plantar o pacote de oito. Ao longo do tempo, carimbos pequenos podem começar a render enquanto o comprador do lote ainda poupa.

| Regra | Só P2 avulsos, ativos financiados | Só pacotes de oito após a fundação, ordens / ativos | 40 P2 adicionais e depois guns, avulsos / pacotes, ordens em 2 h | Células vivas finais, avulsos / pacotes |
| --- | ---: | ---: | ---: | ---: |
| Exponencial, p=350, duplicação a cada 2 unidades, meia-vida 300 s | 330 | 38 / 297 | 64 / 27 | 89.885 / 83.155 |
| Exponencial, p=1.500, duplicação a cada 3 unidades, meia-vida 165 s | 648 | 73 / 577 | 101 / 61 | 236.102 / 217.588 |
| Quadrática, p=2.500, escala 14, meia-vida 4.800 s | 371 | 45 / 353 | 258 / 216 | 855.659 / 826.781 |
| Quadrática, p=1.750, escala 3, meia-vida 120 s | 1.217 | 131 / 1.041 | 687 / 561 projetadas | Ambas ultrapassam o mapa |

Os quarenta P2 depois da fundação são obtidos em quarenta compras individuais ou em cinco pacotes de oito. Depois disso cada compra é uma gun P20 com capital de giro. O jogador que agrupa P2 economiza ordens e sacrifica parte da produção inicial. No modelo exponencial de p=350, a concentração posterior em guns leva a quase 90 mil células vivas com 64 ordens. Repetir o P2 avulso leva a 990 células vivas com 330 ordens. A contribuição dos descendentes muda o significado estratégico de cada carimbo.

## O que quebra em duas horas?

| Regra | Carteiras com déficit | Alcançaram o mapa inteiro | Maior frequência de ordens / ativos por minuto na segunda hora | Maior frequência de ordens para outros padrões por minuto | Maior campo final entre trajetórias válidas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Exponencial p=350 | 23/107 | 0 | 2,83 / 2,85 | 1,75 | 89.885 |
| Exponencial p=1.500 | 23/107 | 0 | 5,97 / 5,97 | 3,70 | 236.102 |
| Quadrática p=2.500 | 29/107 | 0 | 5,18 / 9,80 | 3,12 | 855.659 |
| Quadrática p=1.750 | 24/107 | 8/107 | 12,77 / 43,70 | 8,38 | 798.168 |

Os máximos são independentes, entre carteiras solventes até a última geração e abaixo de 1.024.002 células em toda a trajetória. Um ativo conta cada cópia de P2 do lote e conta uma unidade para cada outro padrão comprado. Os descendentes naturais entram no campo vivo. A coluna de outros padrões exclui todas as compras de P2, avulsas ou compostas. Ela mostra quantas compras usam outro padrão, incluindo repetições do mesmo padrão. O valor de decisões táticas pode ser medido com [ordens de custo igual em posições diferentes](tempo.md).

- **Expansão precoce.** Com a exponencial p=350, a estratégia dos quarenta P2 avulsos seguidos de guns ocupou o equivalente a 0,8%, 3,3% e 8,8% do f320 aos 30, 60 e 120 minutos. Com a quadrática longa, os mesmos três momentos equivaleram a 25,8%, 46,8% e 83,6%.
- **Pressão territorial.** Na exponencial p=350 nenhuma carteira válida passou de um sexto do f320 no final. Na exponencial p=1.500, seis passaram. Na quadrática longa, 16 passaram. Um sexto é uma referência de escala para seis participantes. Uma frente pode se encontrar em frações bem menores e o espaço acessível varia com o posicionamento.
- **Aberturas frágeis.** Com a exponencial p=350, três políticas não puderam comprar uma segunda peça em duas horas, entre elas tentar passar diretamente do P2 inicial para uma gun P42. O primeiro déficit entre as estratégias de risco ocorreu aos 3,41 min. Com a quadrática curta, o primeiro campo maior que o f320 surgiu aos 70,22 min. Os valores acima dessa área são um diagnóstico de quebra da hipótese de espaço livre.

A exponencial p=350 conteve a produção de carimbos mesmo quando procuramos renda superior e quando trocamos ações individuais por lotes. A quadrática longa passou em um teste superficial de cadência e projetou um só jogador ocupando mais de quatro quintos do mapa. Os valores são condicionais à retenção de naves e à sobrevivência das estruturas. As 88 carteiras são sequências periódicas e as 19 políticas dirigidas não esgotam as estratégias que um jogador pode inventar.

## Reprodução

Executar `node experiments/pacing/policy-stress.mjs experiments/pacing/policy-stress-results.json` a partir da raiz. O JSON contém todas as 107 sequências, a configuração, o primeiro déficit, a primeira ultrapassagem da área f320, as compras e os ativos, o campo e fluxo ao término de cada trajetória, além de amostras em 5, 30, 60 e 120 minutos. Um terceiro argumento de linha de comando pode substituir as quatro regras por outro array JSON.

## Sensibilidade à duração das naves

A abertura de 40 flippers adicionais seguidos de guns P20 muda de escala quando seus gliders sobrevivem mais tempo. Os mesmos preços permitem que as gerações automáticas continuem a aumentar o campo.

| Regra | Vida das naves de 6 s, campo final | Vida de 60 s | Vida de 600 s | Primeiro instante acima do mapa com 600 s |
| --- | ---: | ---: | ---: | ---: |
| Exponencial p=350 | 7.670 · 0,75% | 89.885 · 8,78% | 1.027.028 projetadas · 100,30% | 119,74 min |
| Exponencial p=1.500 | 19.211 · 1,88% | 236.102 · 23,06% | 2.750.593 projetadas · 268,61% | 59,47 min |

A confirmação independente está em `node experiments/pacing/feedback.mjs`. O script inclui planos que consultam renda, caixa e preços presentes a cada segundo. Nos dois preços, o comprador que sempre escolhe entre as opções já financiáveis e maximiza o rendimento previsto por energia acabou repetindo o P2. A estratégia deliberada de poupar para a gun teve impacto populacional muito maior. A projeção depois da primeira ultrapassagem da área serve para localizar a quebra da hipótese de espaço livre.
