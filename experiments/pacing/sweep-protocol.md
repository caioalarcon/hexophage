# Protocolo do ensaio de ritmo
Ponto de partida: 200 gerações/s, 120 minutos, uma fundação P2, sem adversários, espaço livre. Taxa é a de carimbos financiados, separada dos cliques ou do APM. Metas de projeto declaradas antes da busca, não médias observadas de jogos comerciais.

- Segunda colocação após 15–90 s (carteira mista).
- Na carteira mista, financiar em média 1–6 colocações/min tanto na fase intermediária (5–30 min) quanto em cada metade posterior (30–60 e 60–120 min). Centro de preferência 2,5/min.
- Depois de 10 min de poupança ao fim da sessão, permitir uma rajada instantânea de 2–12 flippers.
- Na estratégia de quatro flippers seguidos de guns P20 financiadas inclusive na partida, primeiro emissor entre 4 e 25 min. Abertura repetindo flippers permanece financeiramente viável e sob 10 compras/min nos últimos 60 min.
- Evitar expansão de guns além da área f320, compras triviais por milhares, zeragem por déficit; favorecer atividade sustentada nos últimos 60 min e preço imune à subdivisão.
- São envelopes experimentais. Ritmo do combate, diversão e tempo até eliminação não são saídas deste modelo econômico.

Família pesquisada: custo inicial de um carimbo de s células = 3p(s/3)^(1+β) × 2^(H/d). H soma uma unidade por ordem paga e cai à metade a cada T segundos. A energia não vence, não tem teto e não se usa mana. Várias ordens na mesma geração são permitidas e reprecificadas. Uma política não tem acesso a rendas futuras para transações correntes.

## Busca e validação

O primeiro lote varre 262.144 vetores distintos, por sequência de Halton determinística. O preço por célula de abertura varia de 5 a 2.500, d de 0,18 a 35 ordens, a meia-vida de 15 a 2.400 s. Cada tripla é ensaiada uma vez com β=0 e outra com curvatura positiva até 1,6. Tais domínios podem ser ampliados em nova pesquisa. Os controles têm a mesma abertura, financiada por três vezes o preço por célula. Portanto, p mede a escala econômica do turno inicial, incluindo a quantidade de energia inicial, e não apenas o custo das ordens seguintes.

Para confrontar o incentivo a unir ou dividir o desenho, acrescentamos duas famílias que cobram a integral do preço marginal da massa plantada. Seja x=s/3. H acumula x por carimbo, e a cotação é 3p[F(H+x)−F(H)]/F(1). Primeiro testamos F(h)=2^(h/d)−1. Depois testamos F(h)=h+h^(a+1)/((a+1)K^a), com a de 1 a 3. A primeira família de massa teve 131.072 vetores; a segunda teve 196.608, com K entre 0,02 e 40 e meias-vidas entre 2 min e 12 h, mais uma subamostra de memória permanente. Ao mesmo turno, somar ordens parciais dá exatamente a cotação do conjunto.

Cada candidato roda cinco trajetórias com 200 gerações por segundo e sobrevida de naves de 12.000 gerações. As políticas de compra são repetição de flippers, flipper inicial seguido de gliders, carteira mista (glider/flipper/glider/P4), quatro flippers seguidos de guns P20, e uma segunda trajetória mista que poupa dos 110 aos 120 min. Uma gun nova requer guardar também 829 de margem para sustentar seu arranque. A semente é contabilizada na primeira janela das cinco. O total da ampla busca é **589.824 × 5 = 2.949.120** trajetórias econômicas, determinísticas e com políticas compartilhadas; não há 2,95 milhões de políticas distintas.

Na triagem, o orçamento avança em blocos de 1.000 gerações (5 segundos), por soma exata das rendas constantes ou afins em cada bloco. Quando as naves expiram, as taxas mudam. O investimento só é reavaliado no término do bloco e pode consumir várias compras. Esse calendário é uma aproximação numérica; os vencedores foram reavaliados em blocos de 1 segundo e depois em **cada geração**. Não foram duplicados os resultados da reexecução do primeiro lote no total de 2.949.120. `results-search.json` detalha o número avaliado em cada fase, e `results-finalists.csv` registra os resultados precisos (um finalista pode aparecer em mais de um critério ou refinamento).

No escore inicial, qualquer distância às faixas pré-especificadas recebe peso 12 e encerramento por insolvência/censura recebe peso 100. Dentro do envelope, as distâncias logarítmicas favorecem 2,5 ordens/min para a média das três janelas mistas (peso 0,24), seis ordens de rajada (0,23), segunda compra em 40 s (0,16), primeira gun aos 10 min (0,15), 2,5 compras/min tardias de guns (0,12) e de flippers (0,10). Estes pesos expressam uma preferência de projeto. O código em `sweep.cpp` contém as funções. Com as regras por ordem, **1.340** vetores atenderam às restrições observadas na triagem, dos quais **181** com preço linear no tamanho. Com as duas famílias por massa, nenhum vetor passou em todas as restrições nessa triagem. Isso não é uma prova de impossibilidade global. Reavaliar todos os não finalistas em resolução de uma geração pode alterar a contagem marginal.

O segundo ranking usa os benchmarks em `benchmarks.md`. Comparamos os cinco primeiros intervalos de cinco minutos pela média dos cinco erros absolutos entre colocações do Hexophage e medianas de instalações + pesquisas do AoE II (0,8 / 1,8 / 2,2 / 2,2 / 3,7 por minuto). Com a duração curta, exigimos abertura mista entre 15–90 s, primeira gun entre 4–25 min, 1–6 colocações/min entre 5 e 40 min e área de guns ainda inferior a f320 até 40 min. O ranking longo mantém as restrições de 120 min e testa também a relaxação da rajada de 12 para 20. Os benchmarks vieram depois da varredura de ritmo; não retroativamente redefinimos as 1.340 aprovações. As ordens são proxy de oportunidades econômicas; uma construção no replay, uma decisão humana e um clique são unidades diferentes.

| Configuração representativa | Colocações mistas 0–40 / 0–120 min | Primeira gun | Rajada aos 120 min após poupar dez | Observação |
| --- | ---: | ---: | ---: | --- |
| Pressão por ordem, 450 por célula, cada ordem multiplica o preço por 5, meia-vida 135 s | 42 / 141 | 5,04 min | 6 | Cumpre as faixas; incentiva agrupar padrões em um só carimbo |
| Massa exponencial, p=1.500, d=3, T=165 s | 92 / 331 | 20,53 min | 30 | Candidato para ritmo de 40 min; MAE 0,58 colocação/min nos cinco intervalos comparados |
| Massa exponencial, p=350, d=2, T=300 s | 57 / 176 | 23,00 min | 20 | Aproxima o envelope longo com rajada maior e abertura de gun demorada |
| Massa polinomial, p=1.750, K=3, a=2, T=120 s | 112 / 509 | 23,30 min | 59 | MAE 0,58 na abertura; a extensão a duas horas acumula grande poder de compra |
| Massa polinomial, p=2.500, K=14, a=2, T=4.800 s | 71 / 153 | 6,39 min | 18 | Guns acessíveis; começa mais rápida e desacelera, com 60 compras na última hora |

Se a cotação for invariante ao agrupamento, um jogador que consegue pagar uma P20 de 52 células também consegue pagar **17 flippers de 3 células** nesse mesmo instante, nas mesmas condições. O teste de rajada descreve uma carteira específica após uma poupança específica. Ele não institui um máximo universal. Na regra por ordem, o defeito oposto é que o jogador economiza ao reunir várias fábricas num desenho. Com β>0 existe também incentivo a encomendar desenhos grandes em partes. Portanto, usar o menor escore sem testar o editor favoreceria regras exploráveis.

Os perfis nativos utilizados são os quatro perfis calibrados do laboratório, com o mesmo ajuste de meio de janela para iniciar a produção afim da P20. Seguem as mesmas regras de propriedade da renda e sobrevida do experimento anterior. O C++ registra o pico da área com população média subcíclica. A projeção do campo só serve para detectar uma extrapolação além da área total; regiões reais podem colidir muito antes. `sweep-verify.mjs` confirmou onze configurações contra a implementação de referência JS geração a geração, confrontando as contagens por carteira e por marcos, as gerações da segunda compra e da primeira gun, o saldo e a rajada nas trajetórias de poupança.

## Reprodução a partir da pasta deste estudo

```sh
g++ -O3 -std=c++17 -fopenmp sweep.cpp -o /tmp/hex-sweep
export OMP_NUM_THREADS=6
/tmp/hex-sweep 262144 1000 > /tmp/hex-orders-age.csv
HEX_SWEEP_MASS=1 /tmp/hex-sweep 131072 1000 > /tmp/hex-mass-age.csv
HEX_SWEEP_POLY=1 /tmp/hex-sweep 196608 1000 > /tmp/hex-poly-age.csv
python3 sweep-refine.py /tmp/hex-sweep /tmp/hex-orders-age.csv /tmp/hex-refined
python3 sweep-age.py /tmp/hex-sweep /tmp/hex-orders-age.csv /tmp/hex-mass-age.csv /tmp/hex-agefit
python3 sweep-age.py /tmp/hex-sweep /tmp/hex-orders-age.csv /tmp/hex-mass-age.csv /tmp/hex-polyfit /tmp/hex-poly-age.csv
python3 sweep-collate.py /tmp/hex-refined /tmp/hex-agefit /tmp/hex-polyfit
node --test sweep-reference.test.js
node sweep-verify.mjs
```

Na análise de sensibilidade variamos p, d ou K, e T individualmente em ±20%, mantendo os demais no valor proposto. Na opção por massa exponencial de 40 min (1.500, 3, 165 s), o total misto aos 40 min variou de 74 a 111, e o acesso à primeira gun de 13,30 a 42,60 min. É uma vulnerabilidade concreta do ajuste: pequenas mudanças no preço marginal de um desenho de 52 células afetam fortemente sua abertura. Na opção polinomial longa (2.500, K14, a2, 4.800 s), o total misto aos 120 min variou de 123 a 184; a rajada ficou entre 14 e 20 e o acesso à primeira gun entre 5,12 e 7,77 min. Trata-se de sensibilidade local em perfis determinados, não de intervalos de confiança. A primeira faixa empírica inclui o flipper fundador no Hexophage; removê-lo como decisão compulsória reduz somente a primeira média em 0,2 colocação/min.

```sh
python3 sweep-sensitivity.py /tmp/hex-sweep
```

Na opção exponencial longa p=350, d=2, T=300 s, a mesma variação individual de ±20% produz 46–68 carimbadas mistas aos 40 min, 141–216 aos 120 min, rajada de 16–24 e primeira gun entre **12,29 e 73,93 min**. Isso mostra a fragilidade do acesso inicial às guns ao alterar d. A grade nativa completa por ordem consumiu aproximadamente 136 MiB de memória residente em seis threads (o pós-processamento tabular é separado). Uma varredura das 589.824 linhas largas não encontrou NaN ou infinito no escore, pico de população, reserva de poupança ou rajada. O maior saldo observado nas carteiras mistas após poupar foi 903.238.130. O relógio exato verifica a integridade do preço pela identidade de divisão dos lotes; os índices de pressão são calculados em base 2 e os termos pequenos usam expm1/log1p.
