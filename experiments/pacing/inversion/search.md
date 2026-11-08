# Busca numérica da economia invertida

A hipótese estrita paga 1 por célula própria sobrevivente em cada geração e cobra 1 por nascimento natural. Carimbar custa uma vez. O ensaio mantém 200 gerações por segundo e um horizonte de 1.440.000 gerações. Um fundador grátis inicia com saldo zero. O ensaio separado de abertura no catálogo testa a reserva real de 30.

## Experimento

- 65.536 configurações determinísticas em sequência de Halton, com 16.384 por família. Preço celular inicial de 5 a 50.000, nascimento de 0,35 a 3, recompensa de sobrevivência igual a 1. Há 5.461 configurações com nascimento exatamente igual a 1 por família.
- Preços lineares, preço exponencial integrado sobre massa recente, preço quadrático marginal integrado sobre a mesma massa e preço linear com aluguel progressivo da área viva `N(N−1)/K`. A massa em unidades de três células tem meia-vida entre 60 e 21.600 segundos. A compra de um grande carimbo integrado custa o mesmo que fracioná-lo na mesma geração.
- Dois fundadores, o C6-1 ou o crescedor de colmeias. Cada um segue cinco trajetórias: reinvestir sempre em crescedores, sempre em C6, sempre em P20, ou repetir a sequência C6/glider/C6/P2/C6/glider/C6/P20, com ou sem suspender compras nos últimos dez minutos. São 655.360 trajetórias econômicas, não partidas independentes de jogadores reais.
- A cada compra o saldo é debitado. O modelo soma o fluxo da população em progressão aritmética entre decisões. Usamos as médias e inclinações por fase do catálogo. O glider manual vive por 12.000 gerações; as emissões saem da frota após a mesma vida. O crescedor acrescenta 0,75 célula por geração. O P20 e os navios contabilizam seus custos futuros.
- O primeiro déficit marca o limite da simulação econômica, pois a erosão então mudaria o padrão. Exceder 1.024.002 células estimadas marca a invalidação pela área de F320; depois desse limite os números são extrapolações. Colisões e a trajetória física podem invalidar uma linhagem muito antes. A compra número 10.000 encerra a trajetória como censurada por escala. Reservas após censura, déficit ou saturação não são resultados jogáveis.
- A busca decide a cada 1.000 gerações (5 segundos), podendo comprar vários carimbos na mesma decisão. Recalculamos 21 configurações de referência/finalistas, com 210 trajetórias, decidindo a cada geração. Mesmo neste refinamento os fluxos são médias por fase. Os eventos físicos exatos de abertura estão nos ensaios independentes do catálogo.

## Critérios e resultado

O objetivo conjunto foi preservar as trajetórias de crescedores, civis e mista até 40 ou 120 minutos, financiar alguma defesa (glider, P2 ou gun) em até 90 segundos, o primeiro P20 misto entre 4 e 25 minutos e de 1 a 6 compras mistas por minuto nos minutos 30–40 ou 60–120. Medimos também quantos carimbos de 3 células poderiam ser pagos simultaneamente depois de guardar a renda dos últimos dez minutos; o intervalo exploratório era 2–12.

Com o fundador crescedor, 1.944 das 21.844 configurações estritas chegaram à marca dos 40 minutos e 13 delas tiveram o primeiro evento inválido exatamente no passo encerrado em 40:00. Entre as **1.931 que passaram desse passo**, todas da família exponencial, o maior ritmo misto foi 0,3/min entre 30 e 40 minutos e o P20 misto mais precoce saiu em 30,08 minutos. Incluindo as 13 na borda, o P20 mais precoce caiu para 27,83 minutos e o ritmo máximo permaneceu em 0,3/min. Nenhuma passou pelo objetivo conjunto. Nem com preço de nascimento variável houve configuração que atendesse aos critérios conjuntos em qualquer dos dois horizontes com qualquer dos dois fundadores. Esses critérios e intervalos de parâmetros são escolhas do experimento.

Na referência estrita com preço linear de 10, a linhagem de crescedores consegue pagar o primeiro clone na geração 12 e, sem restrições físicas, atinge 10 mil crescedores contando o fundador na geração 109. A linhagem puramente C6, fundada por C6, chega a 10 mil civis na geração 200. Já a política mista com fundador crescedor paga o primeiro P20 na geração 25 e perde solvência na 386. Cadências de compra são limites de poder econômico, não ações físicas já executadas.

A referência exponencial de preço celular 350, duplicação a cada duas unidades e meia-vida de 300 segundos financia 176 carimbos mistos contando o fundador em duas horas sem colisões. A população mista ultrapassa a capacidade de F320 em 105,40 minutos, e a especialização em crescedores, em 16,32 minutos. A configuração 26481, quase válida para 40 minutos na busca, perde a validade na geração 478.770 (39,90 minutos) com decisão por geração; seu primeiro P20 misto sai em 27,75 minutos. No fundador C6, 5.602 configurações estritas chegaram às duas horas sem os três alertas sob os três planos, mas nenhuma cumpriu o critério conjunto de ritmo e armamento.

A igualdade célula por célula deixa duas forças em disputa. Uma única linhagem sem colisões e sem novas compras gera renda crescente à medida que seu tronco se alonga. Seu saldo sem gastos aproxima-se de 7,78 × 10¹¹ em duas horas. Em contraste, um P20 duradouro acumula cerca de 600 gliders de despesa com vida média de um minuto nesse relógio. Aumentar só o preço de carimbar não substitui uma regra econômica para a sustentação dessas linhagens.

## Reprodução

A partir da raiz do projeto, com C++17, OpenMP, Python, pandas e NumPy:

```sh
cd experiments/pacing/inversion
g++ -std=c++17 -O3 -fopenmp search.cpp -o /tmp/hex-inversion-search
OMP_NUM_THREADS=4 /tmp/hex-inversion-search 65536 1000 > /tmp/hex-inversion-grid.csv
OMP_NUM_THREADS=4 python search-results.py /tmp/hex-inversion-grid.csv /tmp/hex-inversion-search
```

`search-summary.json` contém a contagem por filtro e os representantes aproximados mais próximos. `search-replay-input.csv` guarda as configurações reproduzidas e `search-replay.csv` suas trajetórias com decisão por geração. Os identificadores de família 0–3 representam linear, exponencial, quadrática e aluguel. Os fundadores 1 e 4 são o C6 e o crescedor. As políticas 0–3 são crescedores, C6, mista e guns. A coluna `save=1` suspende compras depois de 110 minutos. Os prefixos `g` indicam a geração do evento, e −1 indica que o evento não foi observado. As contagens de compras incluem o fundador grátis; `n5` etc. são observações de marco e zero significa que a trajetória terminou antes da marca.
