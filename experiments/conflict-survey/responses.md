# O defensor pode interceptar depois do disparo?

Dois ensaios com a economia de estabilidade e herança por linhagem produziram defesas pagas. Em ambos, o projétil já estava em movimento. O alvo original conservou em cada geração todas as células previstas no controle sem ataque, até G+512. [Replay lado a lado](./responses-view.html)

| Confronto F32 | Primeira perda sem resposta | Ação em G+2 | Detalhe em G+512 |
|---|---:|---|---|
| B2/S245, nave P6 de nove células contra a Fazenda 4 → 12, disparo longo | G+20 | P2 de duas células, 20.000 créditos | Com resposta, restaram exatamente as 12 células da fazenda. Sem resposta, nenhum dos 12 sítios originais pertencia ao defensor e havia 3.710 células no planeta. O defensor terminou com 189.129,80 créditos a mais ao responder, já descontada a compra. |
| Andreen, glider simétrico de cinco células contra Toggle Pair | G+10 | Segundo glider simétrico, 50.000 créditos | Os dois gliders desapareceram e o oscilador original continuou sua trajetória. Sem resposta o campo ficou vazio. Preservar o alvo custou ao defensor 52.026,54 créditos adicionais em relação a esperar até G+512. |

**A distância do disparo fez diferença em B2/S245.** Na colisão curta que produziu a expansão cinzenta, a primeira célula da fazenda foi perdida em G+8. Nenhuma das 3.900 respostas legais testadas em G+2 protegeu todas as fases do alvo até G+160. Recuamos a nave duas translações de seu período (12 gerações de aviso adicional), mantendo linha e fase de impacto. Em 44 de 4.522 respostas legais, a fazenda inteira sobreviveu a G+160. Para a resposta escolhida, a população máxima durante as 512 gerações foi 25. O controle sem resposta atingiu 3.863. No modo de bloqueio, a fazenda sobreviveu a ambas as distâncias sem necessidade de defesa.

Em Andreen, 32 de 2.512 respostas legais passaram na amostra. O bloqueio também neutralizou o disparo sem intervenção. Em Ashley 2015, testamos o glider P3 contra o rotor P126 em dois alcances. Nenhuma das 824 e 1.110 respostas legais por linhagem protegeu o ciclo inteiro. Na aproximação curta, o projétil já havia alterado a fase do alvo em G+1, primeira oportunidade de resposta do ensaio. A avaliação exige conservar toda a trajetória, portanto uma defesa parcial ou uma reparação posterior podem produzir outros resultados.

## Método

Esfera F32, seis assentos com regras econômicas de produção. Apenas dois assentos recebem ordens. O defensor paga pelo alvo e o deixa evoluir 16 gerações. Em G+0 o atacante paga por uma nave em uma posição legal. Testamos as três políticas de conflito. O script varre respostas de até seis padrões pré-selecionados, seis rotações e centros num disco de oito anéis. Cada alternativa representa uma decisão independente na mesma partida. Eliminamos posições repetidas e qualquer carimbo que invadisse a união dos sítios do alvo em sua trajetória sem ataque. A checagem de ocupação, vizinhança e preço usa o comando de carimbo do jogo.

Comparamos os sítios e seus proprietários a cada geração com o alvo evoluindo sozinho. Um resultado entra na contagem quando todas as células previstas em **todas** as fases até G+160 estão presentes e pertencem ao defensor. Uma fase do rotor ou do Toggle Pair pode ocupar lugares diferentes da fase anterior. Entre os êxitos escolhemos a resposta de menor custo, desempatando pela menor população mundial em G+160. Verificamos esse lance até G+512 e repetimos com defesa sozinha e ataque sozinho contra o alvo. O patamar observado de população se refere a esse horizonte. Ataques e respostas são lances dirigidos, sem bots. Os denominadores são poses legais únicas da busca.

```sh
node experiments/conflict-survey/responses.mjs > experiments/conflict-survey/responses.json
node experiments/conflict-survey/responses-view.mjs
```

[Dados de todos os confrontos e controles](./responses.json) · [Busca de respostas](./responses.mjs)
