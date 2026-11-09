# Aprendizagem na quarta partida

Ensaio headless do Hexophage em Callahan com as tarifas da produção. Quatro partidas consecutivas na mesma esfera F320 (1.024.002 células), cada uma com semente aleatória distinta e 12.000 gerações. O humano compra a abertura padrão e espera. Os cinco bots herdam as observações das partidas anteriores. Repetimos a quarta semente com a memória vazia e com o arquivo das três primeiras partidas da versão anterior.

O relógio do jogo está a 200 gerações/s. G1.000 equivale a cinco segundos e G12.000 a um minuto. Consideramos o início da produção rentável como a primeira de 64 gerações seguidas de fluxo médio positivo do bot. Os saldos do grupo abaixo são os observados no jogo.

## O que mudou

- O bot consulta primeiro o que funcionou em partidas anteriores. As compras recentes e as situações locais de cada bot continuam privadas durante o jogo. O formato de armazenamento é compatível com a primeira prévia.
- Uma simulação curta mede nascimentos, persistência e deslocamento das cartas disponíveis. A trajetória isolada pode ser reaproveitada sobre um recorte livre, regular e compatível com a física. Nos demais casos o bot compara o carimbo com esperar em cópias da região. O preço e o rendimento marginal são recalculados para a colônia do comprador.
- O aprendizado distingue custo de aquisição e rendimento operacional. Para atribuir rendimento real por exemplar, o bot exige uma composição conhecida. A saturação da produção continua entrando no cálculo. Ao sondar frentes rivais, o bot também pode mirar no sentido de avanço medido do carimbo e localizar células recém-nascidas sem percorrer a colônia inteira.
- O esforço padrão passou de 1× para 8×, com limite por fatia de cálculo. O controle **Ritmo de pesquisa** funciona durante a partida. A comparação no mesmo orçamento mede separadamente o efeito do algoritmo.
- Sem células e sem reserva suficiente para uma célula, o jogador é eliminado depois da liquidação de renda, erosão e tributos. Uma célula sobrevivente ou o saldo exato para carimbar uma mantém a elegibilidade. Se carimbar é gratuito, saldo zero basta.

## Comparação com o histórico da prévia anterior

Os mesmos cinco aprendizes começaram com as mesmas 154 observações antigas, semente 6203 e tarifas padrão. Na versão anterior, retirar a memória resultou nas mesmas sete compras, nas mesmas gerações e no mesmo caixa final. O novo ranking recuperou experiências úteis que anteriormente perdiam para cartas pouco testadas.

| Resultado dos cinco bots | Versão anterior (1×) | Nova (1×) | Nova (8×) |
| --- | ---: | ---: | ---: |
| Última das cinco primeiras compras | G280 | G170 | G30 |
| Bots que já tinham alcançado fluxo positivo sustentado na G1.000 | 0 | 5 | 5 |
| Compras na G12.000 | 7 | 5 | 15 |
| Células na G12.000 | 4.627 | 11.568 | 17.538 |
| Fluxo agregado na G12.000, créditos/g | +36,15 | +153,26 | +170,29 |
| Reserva agregada na G12.000 | 2.848.433 | 3.808.915 | 455.803 |

O último bot a abrir na versão nova a 8× colocou sua primeira estrutura na G30 (0,15 s). Os cinco haviam comprado uma segunda até a G90. O menor caixa na coluna de 8× inclui o custo de financiar mais estruturas.

## Quatro partidas da versão nova

| Partida | Experiências herdadas | Último bot a abrir | Último bot a comprar a segunda estrutura | Compras dos cinco na G12.000 | Bots com fluxo positivo |
| --- | ---: | ---: | ---: | ---: | ---: |
| Primeira | 0 | G140 | G470 | 15 | 5 |
| Segunda | 776 | G30 | G470 | 13 | 5 |
| Terceira | 1.289 | G30 | G440 | 14 | 5 |
| Quarta | 1.772 | G30 | G90 | 15 | 5 |
| Mesma quarta semente, memória vazia | 0 | G110 | G680 | 14 | 5 |

A quarta partida com memória terminou o primeiro minuto com 17.137 células e fluxo de +163,86/g. A repetição com memória vazia terminou com 18.988 células e +183,46/g. A memória adiantou a abertura e o reinvestimento. Posições diferentes produziram campos diferentes depois da compra.

## Jogo aberto e custo

Em outra partida de Callahan, F320, semente 4751, os cinco aprendizes fizeram 22 compras em 32.000 gerações. Não executaram ataques autônomos nesse ensaio. Em Bays, com a mesma esfera e semente, fizeram 2.546 compras, incluindo 127 intervenções dirigidas a rivais, em 360.000 gerações (30 minutos a 200/s). O replay reproduziu as mesmas compras e o estado final. A quantidade de intervenções mede compras executadas, e não dano confirmado.

Em Chromium, carregando a memória antiga na nova prévia, o teste de abertura em Callahan/F320 manteve 199,8 gerações/s por oito segundos, com ritmo 8× e dez compras. Em um segundo teste, no campo já desenvolvido com aproximadamente 28 mil células vivas, duas janelas de 4,5 segundos a 8× entregaram 191 e 195 gerações/s e uma janela a 1× entregou 183. Outro ensaio sob carga simultânea mediu 149 gerações/s. Essas janelas incluem a simulação e a renderização. O desempenho no aparelho do jogador pode variar.

## Reprodução

```sh
node experiments/learning-bots/four-matches.mjs --export /tmp/hexophage-after-three.json
node experiments/learning-bots/four-matches.mjs --budget 96
node experiments/learning-bots/four-matches.mjs --inherit /tmp/hexophage-after-three.json
node experiments/learning-bots/match.mjs callahan 32000 320 1 single
node experiments/learning-bots/match.mjs bays 360000 320 1
```

Para reproduzir a migração, execute o primeiro comando com o mesmo script em um checkout de `0c110f1`, depois passe o arquivo gerado à versão nova com `--inherit`. O JSON de cada rodada informa as primeiras compras, a geração da segunda compra, o primeiro fluxo positivo sustentado, saldo, população e intervenções contra rivais.
