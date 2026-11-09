# Colisões, autoria e decisões de jogo

**Ashley 2015 com nascimentos remunerados e herança por time é a combinação que eu levaria para um playtest.** Em três partidas F320 os aprendizes escolheram 38 ataques até G65.536. Reproduzimos cada compra e medimos o que ela mudou em relação a esperar. B2/S245, apesar das excelentes fazendas, transforma quase qualquer tiro bem apontado contra elas numa expansão maciça. A autoria decide a quem a expansão pertence. [Resultados por partida](./activity.csv) · [Efeito individual dos ataques](./attacks.csv)

## O campo cinzento

Na versão anterior, dois pais de times diferentes empatavam ao produzir um nascimento B2. O filho recebia o proprietário 7, neutro. Esses filhos continuam vivos, influenciam seus vizinhos e podem ter descendência neutra. Esse proprietário não tem reserva, não paga nascimentos e não passa por erosão por insolvência. O contador de células dos jogadores podia chegar a zero enquanto a esfera permanecia cheia de vida.

Repetimos as 3.132 posições do primeiro estudo e confirmamos as contagens e saldos registrados para os dois jogadores. Entre os 540 contatos legais de B2/S245, **367 já produziam ao menos 256 neutras**. Dos 30 casos em que o primeiro relatório dizia que a P6 eliminava a fazenda de 12 células, 28 deixavam pelo menos 256 neutras. A medição de perda do defensor escondia o que aconteceu com o resto do tabuleiro. [Auditoria do ensaio anterior](./contacts-retrospective.csv)

Com os bots desligados bastaram uma nave P6 de nove células e uma fazenda 4 → 12 de um rival. Na F32, seis gerações após o disparo, havia duas neutras. Em G+512 as 3.768 vivas eram todas neutras. Com a herança por time, as mesmas 3.768 posições pertenciam ao atacante (2.381) e ao defensor (1.387). Repetimos em três tamanhos de esfera, com e sem liquidação econômica. Sem erosão, a ocupação binária foi idêntica a cada passo até G+1.024 entre o conflito original, a herança e o controle com as duas estruturas do mesmo time. [Replay sincronizado](./replay.html) · [Contagens, controles e efeito dos pentágonos](./contacts.md)

## Qual nascimento permitir

O menu **Partida e bots → Nascimento em disputa** aplica a escolha a partir do próximo passo. A geração, as células existentes e os saldos são preservados. Para comparar políticas desde o primeiro contato, use a mesma posição inicial. A simulação mental usa os mesmos identificadores globais de célula que o planeta. As experiências dos bots são separadas por política. Um nascimento sem pais, em B0, continua neutro.

| Opção | Resolução | Consequência |
|---|---|---|
| **Maioria · herdar de um time** (padrão) | Entre os pais jogadores vence o time mais numeroso. Em empate, uma ordenação determinística dos sítios pais em relação ao sítio do nascimento escolhe um dos empatados. Cada sobrevivente mantém o dono. | Conserva a física binária dos padrões enquanto muda a autoria. Em uma partida comum iniciada pelos jogadores, um confronto não cria uma facção sem orçamento. O desempate não favorece o número do jogador. |
| **Empate neutro · original** | Mantém a resolução histórica do perfil. Em B2, um pai de cada time gera um neutro fértil. | Permite observar crescimento independente dos times e reproduzir as partidas anteriores. |
| **Bloquear nascimento misto** | Um nascimento com pais de dois ou mais times jogadores é vetado, inclusive se um tem maioria. Um único time presente pode herdar mesmo com vizinhos neutros. | A disputa altera a ocupação do tabuleiro. Pode poupar o alvo ou impedir uma reação útil. Em B2/S245 ainda houve expansão de pelo menos 256 células em 774 das 864 posições dirigidas. |

A herança majoritária tem precedente no Immigration Game. Ali há duas cores e três pais, portanto sempre há maioria. Os nascimentos B2 do Hexophage exigem uma regra expressa para empates. Há também sistemas em que a disputa cria uma cor diferente da dos pais, como o Quad-Life. No Hexophage a combinação entre uma terceira facção fértil e ausência de custos para ela tem um efeito competitivo mensurável. [Peter Turney, estudo sobre o Immigration Game](https://doi.org/10.1162/ARTL_A_00334) · [Mark Niemiec, variantes multicoloridas](https://conwaylife.com/ref/mniemiec/color.htm)

## O que diferencia as candidatas

Comparamos decisões que surgem sem ordens impostas, consequências em relação a esperar, possibilidade de resposta do defensor, propagação pelo mapa e eliminação de jogadores. Um ataque é uma compra executada após mirar um rival. O dano econômico e a sobrevivência da estrutura são medidos separadamente. Uma explosão pode gerar muitas mortes e movimentações de caixa mesmo sem outra decisão de jogador.

| Regra | Ataques espontâneos com nascimentos remunerados¹ | Partidas com morte rival atribuída e paga¹ | Comportamento observado |
|---|---:|---:|---|
| Callahan | 0 | 2/3 | Colônias podem colidir depois de um investimento. Com estabilidade houve vencedores nas partidas compactas longas. |
| Bays B2/S35 | 2 | 2/3 | O glider eliminou a formação P2 em 31 de 36 posições dirigidas com linhagem sem atingir 256 células nessas poses. |
| Hexagonal Life B2/S34 | 2 | 0/3 | A decisão de mirar um rival e o tributo podem divergir. |
| B2/S245 | 0 | 2/3 | A expansão ligada ao choque continuou sob linhagem. Houve milhares de posições mudando de dono sem nenhuma compra mirando rival nessas partidas. |
| Bays B245/S3 | 2 | 3/3 | Com a economia de estabilidade, duas de três partidas compactas também tiveram mortes rivais pagas. Nas três aberturas dirigidas F32 com linhagem houve contato pago e o pico foi 51 vivas. |
| Andreen | 0 | 0/3 | Um glider de cinco células do defensor interceptou o glider inimigo e salvou o oscilador Toggle Pair, apesar de a defesa custar mais do que rendeu até G+512. |
| HighHexLife | 3 | 3/3 | Em F320 com atividade, os cinco aprendizes somaram 18 compras mirando rivais em três partidas de 65.536 gerações. |
| Ashley 2015 | 9 | 3/3 | Em F320 foram 38 ataques em 65.536 gerações. O pico foi de 694 a 1.893 vivas em 1.024.002 posições. |
| Ashley 2016 | 0 | 3/3 | Em F32 com estabilidade, o jogador pôde melhorar sua diferença de caixa em 74 a 323 mil lançando o Slider na direção do canhão rival. Isso foi uma intervenção imposta ao experimento. |

¹ Soma de compras ou contagem de partidas em três sementes independentes, F16, linhagem e horizonte G32.768. Os ataques são dos cinco aprendizes partindo de um campo vazio. As colunas não são uma tentativa de ordenar nove regras por diversão.

**Respostas dirigidas.** Em B2/S245 encontramos uma intervenção de duas células que salva toda a fazenda depois que a nave é lançada. A distância inicial foi decisiva. No lançamento com aviso maior, 44 de 4.522 poses de resposta preservaram o alvo em todas as gerações observadas. No curto, nenhuma das 3.900 poses testadas conseguiu isso. A intervenção foi ordenada em G+2. Andreen também permitiu interceptação depois do disparo. A 400 gerações por segundo, duas gerações duram 5 ms. O ritmo de jogo determina se uma pessoa consegue usar essa defesa a tempo. [Replay da defesa e do controle](./responses-view.html) · [Critério de proteção por geração](./responses.md)

## Os ataques de Ashley 2015 fizeram diferença?

Com a política que remunera nascimentos, cada nascimento paga 1 e as células maduras custam a taxa saturada já configurada na produção. A mudança de política vale também para naves e osciladores que produzem nascimentos. As tarifas, o alcance dos bots e o preço dos carimbos permaneceram fixos nos ensaios. Com a política de estabilidade, nas 171 partidas livres em nove regras não houve compras mirando rivais, embora em 14 tenha ocorrido dano atribuído e pago por contato físico. [Ensaios de estabilidade](./MATCHES.md)

Em F320 cada semente recebeu o mesmo planeta e 65.536 gerações. Os bots fizeram 13, 14 e 11 compras dirigidas. Reproduzimos **todas as ordens pagas**, validando os saldos e as populações da partida original. Para cada ataque abrimos duas cópias no instante da compra. Uma comprou o carimbo real, a outra esperou e as duas evoluíram sem ordens posteriores. O resultado mede o efeito causal daquele lance na posição encontrada pelo bot, inclusive seu preço.

| Horizonte do controle | F40 | F320 |
|---|---:|---:|
| Compras dirigidas em três partidas até G65.536 | 25 | 38 |
| Alvo com menos caixa **e** menos células após 4.096 gerações | 24/25 | 37/38 |
| Atacante com melhora de caixa relativo após 4.096 gerações | 1/25 | 0/38 |
| Primeiro ataque de cada semente com melhora relativa após 32.768 gerações | 3/3 | 3/3 |

Nos três controles longos de F320, os primeiros ataques melhoraram a diferença de caixa entre atacante e alvo em **45.559, 84.687 e 101.078 créditos**. Optamos previamente pelo primeiro ataque de cada semente. O horizonte longo cobre somente esses três lances. A atual condição de eliminação também depende da reserva. Zerar o campo de um rival pode deixá-lo apto a voltar.

**Duração de battle royale.** Prolongamos as mesmas três sementes F320 até G360.000. Os bots fizeram 56, 53 e 62 compras mirando rivais, respectivamente nas sementes 1049, 4751 e 8329. Nas três partidas, os cinco terminaram com células e reservas de 30,0 milhões a 246,9 milhões cada, ante 820 mil iniciais. Reduzir a renda futura de um rival não garante esgotar o caixa já acumulado. A maior população vivente em qualquer momento foi 3.075, cerca de 0,30% do planeta. Há combate repetido e dano que depende da escolha, mas estas partidas ainda não produziram um último sobrevivente. O jogo também admite sobreviver sem campo enquanto a reserva comporta uma célula. Isso ocorreu no teste da avalanche neutra.

## Reprodução

- [Contatos](./contacts.md) inclui os comandos dos ensaios dirigidos, os controles em isolamento e a varredura F32. Foram 1.944 poses legais nas nove regras, avaliadas nas três políticas e com controles isolados. Fases e poses vizinhas são casos dirigidos, não 1.944 partidas independentes.
- [Partidas](./MATCHES.md) cobre 423 ensaios de estabilidade, livres e com abertura imposta. As 126 partidas de atividade usam o mesmo motor, a mesma carteira inicial, um assento humano vazio e cinco aprendizes frios. Três sementes por configuração servem para triagem experimental.
- Os CSV registram cada [partida de atividade](./activity.csv), [compra reproduzida](./attacks.csv) e [partida de estabilidade](./matches.csv). Regenerar os resultados de atividade a partir da raiz:

```sh
python3 experiments/conflict-survey/activity-study.py /tmp/hex-activity-study
```
