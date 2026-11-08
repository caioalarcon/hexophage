# Crescedor e cerco

A partida começa com 370.000 de reserva por jogador. O crescedor inicial tem 36 células e custa 360.000. Os 10.000 restantes financiam seu crescimento. Carimbar custa 10.000 por célula, cada nascimento natural custa 1, e uma morte diretamente provocada por vizinhos rivais pode transferir até 0,25 da reserva da vítima. A atribuição usa a transição anterior à erosão por dívida. O controle de tributo aceita zero.

Uma célula com 256 gerações consecutivas de vida começa a participar da produção. Com S células maduras do próprio jogador na mesma geração, a receita bruta é 0,02 × S / (1 + S/1.500). Um núcleo pequeno ganha perto de 0,02 por célula madura. Com 1.500 células a receita total é 15 por geração e, para qualquer tamanho, é inferior a 30. A redução se aplica à produção agregada de todas as estruturas da facção. A energia já guardada continua disponível.

## Comparação das 160 sementes

A simulação isolada mantém todas as sementes financiadas por pelo menos 1.200 gerações e termina em uma janela completa de oscilação ou emissão. **Só o crescedor apresentou resultado operacional positivo na última janela.** A ordenação integral fica em [ranking.json](ranking.json).

| Padrão | Preço | Saldo/geração no primeiro ciclo ou janela | Saldo/geração na última janela medida | Função na barra |
| --- | ---: | ---: | ---: | --- |
| Crescedor de colmeia | 360.000 | −6,05 | +3,95 | Fundação e produção |
| Glider P4 | 60.000 | −5,00 | −5,00 | Incursão |
| Refletor P42 | 170.000 | −6,10 | −5,86 | Desvio dependente de posição e fase |
| Gun P42 | 640.000 | −19,74 | −159,03 | Cerco com uma emissão a cada 42 gerações |
| Gun P20 | 520.000 | −20,95 | −315,42 | Assalto com uma emissão a cada 20 gerações |
| Flipper P2 | 30.000 | −2,00 | −1,98 | Disponível no atlas |
| Gun P200 | 1.000.000 | −31,33 | −55,40 | Alternativa tardia no atlas |

A vida livre de todos os projéteis faz crescer a despesa das guns na última coluna financeira. O flipper tem o menor déficit constante observado, seguido pelo P2 C6-1 (−2,88) e pelo P2 C5-1 (−2,94). A função militar foi avaliada separadamente do rendimento.

## O que o fundador precisa financiar

Testamos oito parametrizações, quatro tamanhos de esfera e seis pontos iniciais por mundo, nas orientações 0 e leste local quando distintas. No f320 foram onze ensaios de posição/orientação. O mesmo campo esparso foi cotejado por 1.200 gerações com o motor headless em uma trajetória por tamanho. Cada ensaio de fundador foi medido por 12.000 gerações, o equivalente a um minuto a 200/s.

Com os parâmetros escolhidos, as onze colocações isoladas no f320 obtiveram saldo médio positivo na janela de 24 gerações encerrada em G720, recuperaram a despesa de operação acumulada em G1524–1525 e precisaram de até 2.648 de capital de giro. Recuperar o preço de compra de 360.000 levou **110,39 s** na posição de maior rendimento e **197,32 s** na de menor rendimento. No campo típico estabilizado, 5.734 células maduras e 14 nascimentos a cada três gerações deram +19,11 por geração. Com a regra linear de referência (0,025 por célula, sem saturação, limiar 128) a mesma posição rendeu +138,68 por geração.

Dobrar esse campo típico, supondo duas estruturas independentes do mesmo jogador, reduz a renda líquida conjunta para **+17,20**. A terceira cópia a reduz a **+13,59**. A segunda ponta pode ter utilidade em outra região do mapa ou ao substituir a primeira. A simples duplicação do núcleo já produtivo tem um custo operacional mensurável.

No ensaio com as seis fundações pagas **no mesmo campo**, sem novas ordens, os seis jogadores estavam vivos e sem erosão no f320 aos 30 s. O caixa variou de 53.963 a 66.307, frente aos 60.000 necessários para um P4. No f20, os encontros durante a abertura cortaram o crescimento de várias facções antes que pudessem financiar outro carimbo. O mapa padrão é f320. [Calibração do terreno](founders.json) · [Abertura simultânea](match-opening.json)

## Teste de duas horas a 200 gerações/s

Projetamos os ciclos finais medidos em dois campos do f320. Antes de usar o período de três gerações, o script verifica retorno exato das posições vivas e repetição de nascimentos e células maduras. Cada simulação acompanha 1.440.000 gerações econômicas ou para no primeiro déficit que exigiria erosão. A política de gliders separa caixa para a operação de cada projétil até o impacto hipotético. Ataques podem ser comprados juntos se houver dinheiro. Na política de guns, compra-se uma única gun ao poder preservar mais 60.000 de caixa para operação.

| Política | Campo típico de 5.738 células vivas | Campo menor de 1.290 células vivas |
| --- | ---: | ---: |
| Gliders com voo de 5 s, em duas horas | 422 (3,52/min) | 210 (1,75/min) |
| Gliders com voo de 60 s, em duas horas | 228 (1,90/min) | 114 (0,95/min) |
| Poupar por dez minutos | 2.241.588 na reserva | 1.135.806 na reserva |
| Poupar por duas horas | 27.470.363 na reserva | 13.687.260 na reserva |

Na posição típica, a primeira incursão com voo de 5 s foi financiada aos 29,60 s. A P20 com 60.000 extras foi financiada aos 2 min 45 s. Atingiu o primeiro déficit 3,48 s depois. A P42 foi comprada aos 3 min 17 s e chegou ao primeiro déficit 5,11 s depois. Essas duas guns entraram em dívida antes mesmo da hipótese de cinco segundos de voo dos primeiros projéteis mudar o resultado. Uma campanha de cerco precisa de reserva maior ou de alvos que interrompam os voos mais cedo.

No comparativo físico da esfera f256, um glider pago acertou a ponta de uma colmeia jovem e interrompeu seu crescimento. Aos 30 s o defensor havia sofrido erosão de 21 células e tinha caixa e campo zerados. O ataque fora da rota deixou o defensor com 1.034 células e 45.516 de reserva. O tiro certo gastou aproximadamente 60.100 para o atacante e transferiu 0,25 ao defensor. O cenário compara posição e fase com um atacante que já possui o orçamento do disparo. [Orçamentos](portfolios.json) · [Impacto no motor da partida](strike.json)

## Ataque a uma colmeia já produtiva

No f96, o defensor comprou a colmeia da abertura. Na geração 720, um rival com 700.000 de caixa fez um único carimbo. Em cada caso testamos seis direções, mirando a ponta que ainda nascia ou o núcleo já maduro. Mantivemos a erosão, a propriedade e o tributo reais. Foram 31 posições legais dentre 36. Doze segundos depois do disparo, o controle sem ataque tinha 1.706 células e 25.088 de saldo.

| Ataque | Disparos legais | Disparos que reduziram a reserva rival | Maior redução na reserva rival | Menor campo rival | Gasto efetivo do atacante, plantio e operação |
| --- | ---: | ---: | ---: | ---: | ---: |
| Glider P4 | 11 | 3 | 9.159 | 585 | 60.033–60.130 |
| Gun P20 | 10 | 3 | 8.403 | 598 | 569.504–583.992 |
| Gun P42 | 10 | 3 | 8.268 | 612 | 669.290–696.237 |

Nesse conjunto de linhas de tiro o glider avulso produziu a maior redução por um gasto muito menor. Em todos os 11 lançamentos o P4 se dissipou. As guns ainda tinham células próprias em todas as 20 colocações. Nenhum dos três ataques eliminou por completo a fundação já produtiva nesse intervalo. [Posição, fase e resultado de cada ataque](armed-raids.json).

As taxas de compra são condicionais à sobrevida, espaço e política de investimento. O saldo cresce durante uma longa poupança e permite concentrar carimbos numa ofensiva. Os resultados de isolamento medem rentabilidade e sustentação. O vencedor de uma partida depende das demais ordens e colisões.

## Reprodução

Na raiz do repositório, executar `node experiments/grower-siege/catalog.mjs`, `node experiments/grower-siege/founders.mjs`, `node experiments/grower-siege/portfolios.mjs`, `node experiments/grower-siege/match-opening.mjs`, `node experiments/grower-siege/strike.mjs` e `node experiments/grower-siege/armed-raids.mjs`.
