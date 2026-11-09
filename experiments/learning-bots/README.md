# Aprendizes por simulação local

Em **Painel de jogo → Partida e bots → Bots**, escolha **Aprendizes**. Cada bot compara fazer uma compra com esperar. As duas cópias têm os mesmos donos, idades, reservas e vizinhos ordenados do planeta real. O simulador usa a física, os preços e o tributo da partida. Ele congela o anel externo e a atividade fora do recorte. Marca medições que alcançam a borda e interrompe a previsão quando seria necessário erodir a colônia.

Os candidatos vêm dos carimbos da regra. O planejador experimenta regiões vazias, colônias próprias e frentes rivais, variando posição, carimbo e rotação. Um histórico ruim reduz a prioridade de um candidato em observações posteriores. O bot pode financiar um experimento de abertura antes de observar a maturação, desde que a estimativa de risco caiba na reserva. Ações táticas exigem efeito econômico rival previsto. A checagem final usa a geometria e a legalidade da compra no mundo atual.

## Custo em uma partida

A esfera F320 tem 1.024.002 células. Um recorte mental alcança até 20 anéis, ou 1.261 posições hexagonais. Carimbos que excedem o raio com margem ficam fora da busca. Os cinco bots compartilham um orçamento de 96 visitas a posições locais por geração real e um crédito inicial de 8.192. O custo da busca de candidatas, do reconhecimento local e da memória também entra no tempo medido abaixo.

Nos ensaios headless, o jogador humano paga a abertura padrão e depois espera. Os bots usam a semente 4751. Em Bays, gravamos as compras e reproduzimos as mesmas posições, gerações e jogadores sem planejamento. O script verifica o mesmo estado final dos seis jogadores e o pico de população. A segunda partida recebeu o histórico da primeira.

| Bays em F320 | Gerações | Ensaios mentais completos | Compras dos bots | Compras contra rivais | Com planejamento | Replay das compras |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Memória vazia | 360.000 | 684 | 112 | 23 | 9,67 s | 7,06 s |
| Com memória herdada | 360.000 | 714 | 116 | 30 | 8,75 s | 6,97 s |

A diferença foi de 0,0072 e 0,0049 ms por geração nesta máquina. Foram ensaios esparsos, com picos de 139 e 172 células vivas. A 200 gerações/s cada partida cobre 30 minutos de jogo. Ambas chegaram à G360.000 com os seis participantes ainda em jogo. O humano terminou sem células e com créditos. Pela regra da partida, a eliminação exige campo vazio e reserva esgotada.

**Callahan com os valores de produção.** Na mesma F320 e com a mesma semente aleatória, os aprendizes completaram 207 ensaios, fizeram sete compras, seis delas experimentais, e não executaram ataques. Em 183 comparações, o recorte ou seu limite externo impediu uma previsão confiável de longo prazo. O humano fez a abertura padrão e esperou. Na G360.000 tinha 5.738 células e 22.594.196 créditos. Quatro bots estavam eliminados. O quinto tinha zero células e aproximadamente 264 créditos, menos que o custo de plantar uma única célula (10.000). Sem células, também não conseguia obter renda. A condição de eliminação o mantinha vivo, e a partida continuava sem vencedor.

## O que a memória transferiu

Em F32, usamos a mesma regra B2/S035 e duas sementes legais. Uma permanece estática, a outra oscila. Inverter a economia troca a abertura rentável. Após três partidas de treino, oito sementes aleatórias inéditas por política foram disputadas duas vezes, com memória vazia e com memória herdada. Cada linha representa 40 oportunidades de abertura. O jogador humano planta uma célula e espera. O ensaio termina na G2048. Para calcular a média, quem ainda não abriu recebe G2049.

| Economia | Aberturas rentáveis, fria → herdada | Geração média da abertura | Sementes com maior ganho agregado de caixa na G2048 |
| --- | ---: | ---: | ---: |
| Maturação gera | 36/40 → 40/40 | 284 → 108 | 5 de 8 |
| Nascimento gera | 38/40 → 40/40 | 290 → 108 | 3 de 8 |

A memória acelerou a identificação da abertura nas duas economias. O desempenho financeiro posterior variou entre sementes e políticas. A observação de campo continua sujeita a intervenções dos demais jogadores.

## Interceptar um crescedor

Oferecemos ao avaliador um ponto de disparo conhecido, seis rotações do mesmo glider e a opção de esperar. Rodamos cada alternativa na esfera F320 para comparar a previsão com a consequência real. A busca autônoma pelo ponto de disparo é outra tarefa.

| Economia | Escolha com 64 gerações de simulação local | Comparação real |
| --- | --- | --- |
| Callahan de produção | Apenas a rotação 5 foi aprovada | A vantagem de caixa relativa recuperou o custo na G3922 e atingiu +6.785.884 na G360.000. |
| Maturação na G2, tarifa da madura 1 e carimbo 10 | Apenas a rotação 5 foi aprovada | Na G64 o rival tinha 1.230,43 créditos a menos e o atacante 54,30 a menos que se esperasse. |
| Células maduras custam 1, nascimentos rendem 0 e carimbo custa 10 | Esperar | O mesmo impacto ajudava o adversário. Na G1024 ele tinha 208.584,13 créditos a mais. |

A economia de produção ilustra o atraso da recompensa. Na G64 o ataque havia removido 48 células rivais e **aumentado** a reserva rival em 60,25, pois ele pagou menos nascimentos. O avaliador também estimou a renda que duas coortes persistentes poderiam gerar ao amadurecer. Essa hipótese mudou a escolha e o replay longo permitiu verificá-la. A partir da G128 a diferença física desse encontro alcançou a borda mental e a projeção de longo prazo desse recorte foi descartada.

## Reprodução

```sh
node experiments/learning-bots/match.mjs bays 360000 320 2
node experiments/learning-bots/match.mjs callahan 360000 320 1 single
node experiments/learning-bots/interception.mjs
node experiments/learning-bots/transfer.mjs
```

O modo `single` executa apenas a partida, até o horizonte ou até haver vencedor. Para um ensaio rápido de interceptação, passe `1024` como argumento. Os scripts imprimem JSON com os resultados, incluindo decisões, saldos e contadores.
