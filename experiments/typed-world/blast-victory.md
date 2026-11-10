# Quem sobrevive ao próprio disparo?

Na esfera F16, o patrocinador conseguiu vencer tanto com uma onda planetária quanto com uma onda que morreu sem alcançar a sua fazenda. O primeiro caso exige encerrar a partida na perda da última colônia adversária. No segundo, a fazenda continuou viva até G+768, mesmo deixando a simulação rodar depois da vitória.

## Troca de posição entre duas fazendas iguais

A nave P6 do patrocinador sempre ataca a mesma colônia de Bays. Há duas outras fazendas idênticas de B2/S245, uma a 22 arestas do centro do alvo e a outra a 42. Só trocamos quem é dono dessas fazendas. O patrocinador continua pagando o projétil, cada nascimento da onda, os cortes e a eventual venda de células. O terceiro jogador começa com 10.000 créditos, assim como o alvo de Bays.

Executamos 72 trajetórias até G+768 em F16. Foram seis saldos iniciais, três sementes (1, 43 e 211), dois pisos de proteção contra venda forçada (0 e 12) e as duas posições do patrocinador. Os tempos são relativos ao disparo. A partida segue sem novas compras ao medir o que acontece depois de cada possível encerramento.

Com **300 mil ou um milhão**, a onda visitou os 2.562 sítios em todas as 24 trajetórias. Nas 12 partidas em que o patrocinador ficou no lado oposto ao alvo, ele foi o último jogador com uma colônia convencional. Nas outras 12, a terceira facção venceu. Trocar os donos das duas fazendas inverteu o resultado no mesmo instante de cada par. Dependendo da semente, a última colônia adversária caiu em G+102, +161 ou +186. Proteger os 12 produtores da venda não os protegeu do impacto. Quando deixamos a simulação continuar, o patrocinador faliu nos 24 casos.

| Mesmo lançamento, semente 1 | Dono da fazenda mais distante | Última colônia convencional | Último dono de células, contando a onda | Caixa do patrocinador em G+768 |
|---|---|---|---|---:|
| 300.000, piso 0 | Terceiro jogador | Terceiro em G+161 | Patrocinador em G+183 | 0,09 |
| 300.000, piso 0 | Patrocinador | Patrocinador em G+161 | Patrocinador em G+161 | 1,71 |

Depois de cada uma dessas 24 ondas planetárias, fizemos uma cópia independente da posição em G+768 para cada carteira. Os dois adversários conseguiram comprar a fazenda de quatro células de B2/S245 no local da sua abertura, chegar a 12 produtores maduros e aumentar a reserva nas 64 gerações seguintes. O patrocinador não conseguiu pagar a recompra em nenhuma delas. Uma condição de vitória que admite recolonização pelo caixa dá aos derrotados em campo uma oportunidade concreta de voltar.

## Um disparo que preserva a própria economia

Na semente 43, com o patrocinador na posição mais distante, havia duas formas de vencer na mesma geometria. Com 16 mil, a onda destruiu a última colônia adversária em G+102. Dali em diante, a proteção dos 12 produtores mudou o futuro de quem disparou.

| Proteção contra venda | Venda da própria base | Extinção da onda | Sítios atingidos | Células próprias e caixa em G+768 |
|---:|---|---:|---:|---|
| 0 | 12 células a partir de G+105 | G+120 | 699 | 0 e 2,26 créditos |
| 12 | Nenhuma | G+115 | 697 | 12 e 6.551,14 créditos |

Com 64 mil, a mesma semente e a base protegida, o patrocinador também venceu em G+102, manteve 12 produtores e terminou com 5.973,38. Houve **dois casos em 72** com vitória convencional e patrocinador ainda solvente em G+768, ambos nessa geometria. Em outras sementes com a mesma reserva houve sobrevivência da terceira facção ou nenhum desfecho de última colônia. A geometria e a semente são amostras dirigidas, e os números representam frequências dessa matriz de testes.

[Reproduzir o disparo de 16 mil e continuar depois da vitória](./index.html?scene=engulf&bank=16000&sponsor=far&protect=12&seed=43&finish=observe) · [Comparar sem proteção](./index.html?scene=engulf&bank=16000&sponsor=far&protect=0&seed=43&finish=observe) · [Vitória planetária do patrocinador](./index.html?scene=engulf&bank=300000&sponsor=far&finish=field) · [Mesma onda com o terceiro jogador no lado oposto](./index.html?scene=engulf&bank=300000&sponsor=middle&finish=field)

## Reprodução

```sh
node experiments/typed-world/blast-victory.mjs > /tmp/blast-victory.csv
diff experiments/typed-world/blast-victory.csv /tmp/blast-victory.csv
```

O CSV usa 1 para o patrocinador, 2 para o alvo inicial e 3 para a terceira facção. As colunas de vencedor em branco indicam que mais de uma facção permaneceu até o horizonte. Nas colunas de recompra, `occupied` indica que havia campo em G+768, `rejected` que o motor rejeitou a compra e `productive` que a carteira pagou 32 créditos pela fazenda e voltou a ter pelo menos 12 células maduras e fluxo suficiente para superar o saldo imediatamente posterior à compra. Cada teste de recompra começa da mesma posição final e avança sozinho.

[Matriz de 72 trajetórias](blast-victory.csv) · [Runner](blast-victory.mjs) · [Regra de ignição, custos e ensaios de recuperação](blast.md)
