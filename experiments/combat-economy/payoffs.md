# Quanto deve render a perda de uma célula em combate?

No replay de 256 gerações, o disparo na ponta do crescedor reduziu o fluxo operacional acumulado do defensor de **31.275 para 7.596 energias** sob a inversão simples S−B. Foi a mesma semente contra o mesmo glider fora da rota. Em toda a trajetória do acerto houve uma morte direta e a célula pertencia ao **atacante**. Uma transferência de uma energia por morte pagaria o defensor. Outro disparo na mesma rota, atrasado em 16 gerações, reduziu a arrecadação da colmeia para 9.912 e a única morte direta passou a ser do defensor. O impacto econômico da posição já existe antes de instituir uma recompensa.

## Quatro regras de liquidação

O experimento de caixa congela a trajetória física de cada confronto. A conta operacional e o preço do carimbo são medidos separadamente. As cotações simples abaixo usam o preço linear de 10 por célula e 60 pela compra manual de um P4.

| Regra | Quem paga ao ocorrer uma morte direta | Incentivo relevante |
| --- | --- | --- |
| Prêmio emitido | O jogo cria energia para o causador | Dois aliados conseguem fabricar energia fazendo suas máquinas se tocar para sempre. |
| Transferência | O dono da célula perdida paga ao causador, dentro do seu saldo disponível | Um confronto pode retirar renda do adversário continuamente. Guardar pouco saldo ou gastá-lo antes do contato reduz a pilhagem. |
| Indenização | O causador paga ao dono da célula perdida, dentro do seu saldo disponível | É possível lançar algo descartável numa estrutura passiva e cobrar do dono dela. Atribuição causal não identifica quem quis o combate. |
| Sucata pré-financiada pelo jogador | Uma fração (25% aqui) do preço efetivamente pago pelos carimbos fica reservada como espólio | Matar descendentes gratuitos não cria nova dotação. Um atrito recorrente pode consumir a dotação que a vítima financia com gastos em outra frente. |

Na liquidação de uma geração, cada devedor paga no máximo seu saldo **antes** de receber dos outros. Se duas facções tiverem créditos sobre ele, dividem a quantia proporcionalmente à atribuição causal. Os testes cobrem as duas direções no mesmo turno, saldo zero, divisão entre credores e conservação. O saldo de partida pode já refletir a receita e as despesas normais dessa geração. O imposto não gera dívida nem erosão extra por si só. Na inversão, as despesas operacionais dos turnos seguintes ainda podem erodir células se a reserva ficar pequena.

Também medimos a opção de limitar a recuperação a uma fração do custo daquela **vida individual** (o intervalo entre o carimbo ou nascimento e a morte). Ela distingue a morte de uma célula recém-paga da de um descendente produzido gratuitamente. Na economia onde nascimentos são cobrados, um custo de nascimento efetivamente pago pode compor esse valor. Uma célula sempre perde seu direito na primeira morte. Um nascimento em dinheiro insuficiente não credita um custo que o dono deixou de pagar. O [experimento de sucata no local](salvage-trials.mjs) avalia ainda quem volta a ocupar fisicamente a posição.

## Quanto um disparo consegue devolver

Em 1.548 lançamentos legais de P4 contra padrões do atlas, com variações de rota e fase, houve 26 mortes diretamente atribuídas do lado atacante e 54 do lado defensor. Só **32 casos** deram saldo líquido favorável ao atirador na regra de transferência. Nenhuma dessas 80 vidas vinha ininterruptamente do carimbo original. Uma sucata ligada exclusivamente ao custo do carimbo devolveria zero em todos os 1.548 confrontos. Se cada nascimento natural tiver efetivamente custado uma energia, a recuperação de 25% seria de 0,25 por vida elegível.

| Tarifa por morte | Maior saldo líquido do atirador | Disparos que cobriram o preço de 60 |
| ---: | ---: | ---: |
| 1 | 3 | 0 |
| 2,5 | 7,5 | 0 |
| 5 | 15 | 0 |
| 10 | 30 | 0 |
| 20 | 60 | 1 |
| 60 | 180 | 32 |

As duas últimas colunas assumem que ambos podem pagar e que há caixa suficiente para cada morte. Conta-se somente a recompensa pelo combate. O valor de atingir uma usina, bloquear uma rota, poupar energia de voo ou habilitar uma futura vitória fica fora. Essas trajetórias são uma busca de configurações, sem pretensão de estimar a frequência de cada rota numa partida.

## Três máquinas de renda reproduzíveis

Pesquisamos pares de osciladores do catálogo próximos uns dos outros. Os exemplos abaixo passaram pelo plantio legal na esfera f64. O script verifica igualdade exata dos conjuntos de posições vivas e dos seus donos na fronteira do ciclo e ao fim de outra volta. Em cada posição, as mortes diretamente atribuíveis e os bloqueios de nascimento foram calculados retirando os vizinhos rivais no contrafactual local. Cada peça sozinha gera zero mortes de combate.

| Par de osciladores | Geração inicial do ciclo / duração | Mortes diretas por volta, donos 1/2 | Idades das vítimas recorrentes | Nascimentos dos donos 1/2 impedidos por volta | Energia emitida a tarifa 1 em 2 h por morte direta |
| --- | ---: | ---: | --- | ---: | ---: |
| C9 P6-1 + C10 P2-3 | 0 / 12 | 1 / 0 | 2 | 15 / 15 | 120.000 |
| C10 P2-6 + C11 P2-14 | 18 / 6 | 0 / 1 | 1 | 1 / 1 | 239.997 |
| C8 P2-1 + C12 P2-6 | 19 / 14 | 0 / 2 | 9 e 9 | 4 / 8 | 205.712 |

O preço de fundar o primeiro par foi 90 + 100. Ele manteve os mesmos padrões por duas horas virtuais, sem nenhum outro carimbo. Com prêmio emitido de 1, seriam **120 mil adicionais**. Com transferência, 100 disponíveis após o plantio e sem nenhuma renda extra, o dono 1 só perde os seus 100. Na inversão S−B, os fluxos operacionais por volta são +50 e +58, respectivamente. Ambos suportam a tarifa de 1. Nesse cenário o dono 2 consegue desviar 120 mil da renda do dono 1. O total das duas carteiras se conserva na liquidação. Com 25% dos carimbos segregados em dotação e sem novos gastos, o máximo extraível do dono 1 é 22,5. Se for obrigatório recuperar o custo pago **pela vida específica que morreu**, somente nascimentos pagos alimentariam a recompensa desse ciclo. Para nascimento pago de uma energia e recuperação de 25%, no máximo 30 mil seriam devolvidos em duas horas, provenientes de desembolsos já ocorridos.

O filtro de idade também muda o sentido econômico do combate. O terceiro par produz duas mortes de células de idade nove por volta, portanto um corte mínimo de oito ainda permite fabricar prêmio sem ordens adicionais. Todos esses saldos extrapolam ciclos verificados a 200 gerações/s. No controle B−S (escala original), os três pares têm fluxo operacional negativo. Precisariam de reserva ou renda auxiliar para repetir durante duas horas. Na inversão S−B, os três tiveram fluxo positivo em ambos os lados e continuariam solventes com 100 iniciais após o plantio nos ensaios de tarifa 1, 2,5 e 10.

## Pagar pela perda de um nascimento

No primeiro par, cada lado bloqueia 15 nascimentos rivais por ciclo de 12. Se cada bloqueio emitisse uma energia, isso geraria **500 energias/s**, ou **3,6 milhões em duas horas**. A transferência com os dois lados solventes teria saldo líquido zero em cada volta. O terceiro par impede 4 e 8 nascimentos respectivamente para os donos 1 e 2. Sob uma transferência de 1 do dono impedido para o bloqueador, o dono 1 recebe **57,14 por segundo líquidos** nesse ciclo. Ambas as peças continuam inteiras em suas órbitas. Uma célula cujo nascimento foi impedido nunca teve um custo real pago naquela vida. Esse evento pode ser muito informativo para avaliar um tiro, mas atribuir-lhe uma indenização é criar uma nova obrigação.

Em contraste, duas P20 de frente uma para a outra também formaram um circuito de fogo permanente. Em uma das rotas testadas, cada lado sofreu duas mortes diretas por período de 20 gerações. O prêmio de uma energia emitiria 40 por segundo entre ambos. Com fundos suficientes e tarifa por transferência, o resultado líquido é zero ao fim do ciclo. Outro deslocamento formou um ciclo de 60 com duas mortes diretamente atribuídas apenas do lado 1. O desvio líquido passa a 6,67 por segundo. [Confrontos entre guns](gun-crossfire.json).

## Quando a transferência muda o próprio campo

Em 28 ensaios na esfera f128, ligamos a liquidação de volta ao motor. Em cada geração o autômato resolve as mortes naturais, o detector registra os responsáveis, a conta operacional invertida S−B paga despesas e executa a erosão prevista pelo jogo e, por último, são transferidas as energias disponíveis. O campo e a reserva assim obtidos alimentam a geração seguinte. Usamos a semente de aleatoriedade 18427, o primeiro par da tabela e 30 ou 100 energias por jogador após o plantio. Em metade dos ensaios o dono 1 sustentou também um P4 lançado em outro ponto da esfera.

| Mecanismo, 30 na reserva após plantar e P4 adicional | Primeira erosão | Eliminação do dono 1 | Transferido do dono 1 | Reservas finais 1/2 |
| --- | ---: | ---: | ---: | ---: |
| Sem prêmio | Nenhuma até G512 | Nenhuma | 0 | 370 / 2.505 |
| Transferência de 1 | Nenhuma até G512 | Nenhuma | 43 | 327 / 2.548 |
| Transferência de 10 | G139 | G147 | 119 | 0 / 863 |
| Transferência de 60 | G7 | G15 | 31 | 0 / 137 |
| Recompensa emitida de 60 | Nenhuma até G512 | Nenhuma | 0 (2.580 emitidas) | 370 / 5.085 |

O par sozinho continuou na mesma órbita até G512 mesmo com tarifa de 60. O dono 1 chegou a esse instante com dez energias. Acrescentar a despesa de voo tornou o mesmo cerco suficiente para eliminá-lo. Com tarifa de 60, a única cobrança ocorreu em G6, quando havia 31 disponíveis. Quem retirou fisicamente a primeira célula foi a erosão operacional na G7. Com tarifa de dez, o dono 1 ainda tinha 16 células na G512 do controle e foi eliminado na G147 da intervenção. Essa distinção impede creditar ao atacante as células que o motor remove depois para tratar dívida. A unidade de tempo é a geração, com 200 gerações/s. [Trajetórias acopladas](coupled.json).

## Reprodução

```sh
node --test experiments/combat-economy/payoffs.test.mjs
node experiments/combat-economy/recurring-contact.mjs
node experiments/combat-economy/payoff-study.mjs
node experiments/combat-economy/coupled.mjs
```

[Liquidação e atribuição dos fluxos](payoffs.mjs) · [Dados completos das cotações](payoff-study.json) · [Posições, orientações, controles e duas voltas de cada máquina](recurring-contact.json)
