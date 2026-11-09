# Como os aprendizes descobrem o puffer

Na prévia anterior, o seletor de investimentos voltava assim que encontrava um carimbo rentável entre os já medidos. Uma primeira abertura barata podia impedir o estudo econômico do restante do catálogo durante toda a partida. A outra busca de lances, por amostragem, ainda selecionava o puffer de vez em quando. Em 12 partidas frias de Ashley 2015, cada uma chegou a simular o puffer em algum contexto, mas somente quatro o compraram até G8.192.

O estudo curto já conseguia distinguir as estruturas em terreno livre. Com a economia de atividade, nas gerações 11 a 18 a média do puffer foi 17,5 nascimentos por geração por um carimbo de cinco células. O rotor, também de cinco células, teve 6,25. Ao fim da projeção, a trajetória do puffer tinha alcançado um raio axial de 13, além do recorte de 11 que o investimento normalmente recebia quando a área livre não podia ser certificada.

## Critério de decisão

- A física de um carimbo em vazio é determinística. Cada bot escolhe em privado o carimbo que quer estudar. Se outro bot já mediu aquele carimbo, reutiliza-se o cálculo físico após o pedido independente. O valor calculado, o interesse pelo padrão e os resultados das compras permanecem na memória privada até a próxima partida.
- Depois que existe uma opção rentável, cada bot reserva uma em cada duas decisões de **pesquisa de investimento** para experimentar uma alternativa ainda não medida e que o jogador pode pagar. A busca prioriza experiências herdadas, em seguida o kit e o restante do catálogo. Uma compra rentável pode avançar enquanto outra medição entra na fila. A primeira abertura continua disponível antes de concluir o baralho. O orçamento total de visitas por geração permanece o mesmo.
- O bot compara plantar com esperar na posição real. A projeção econômica usa fluxo marginal, custo de implantação, risco durante maturação e o horizonte de retorno do bot. O recorte local passou a incluir, sempre que cabe no limite mental existente de 20 anéis, o alcance observado da estrutura. A escolha tática de posição, orientação e adversário continua sendo avaliada separadamente.
- **Nova partida** publica as experiências e encerra a sessão dos cinco aprendizes. Na próxima abertura com a mesma configuração, o arquivo compartilhado orienta quais hipóteses testar primeiro. As escolhas e os retornos de campo de cada bot permanecem privados durante a própria partida. Também se registra uma estimativa econômica quando termina o estudo da semente, mesmo se a partida encerrar antes da compra. Essa pista prioriza uma nova simulação na partida seguinte. O jogador humano ocupa o sexto assento e suas jogadas não alimentam esse arquivo.

## Partidas com os orçamentos do jogo

A tabela soma as três partidas frias F320 de Ashley 2015, com 16.384 gerações cada, economia de atividade, herança por time e um assento humano vazio. A ordem das sementes é 1049, 4751 e 8329.

| Medida | Prévia anterior | Nova pesquisa, física original | Nova pesquisa, contenção padrão |
|---|---:|---:|---:|
| Geração da primeira compra do puffer | 10.570 / nenhuma / 4.360 | 30 / 450 / 540 | **30 / 560 / 630** |
| Aprendizes que compraram o puffer | 9 de 15 | 15 de 15 | **15 de 15** |
| Compras do puffer | 43 | 192 | **107** |
| Compras de todos os carimbos | 541 | 390 | 322 |
| Caixa operacional realizado dos cinco bots, somado nas três partidas | 22.292.974 | 81.434.464 | 68.710.962 |
| Caixa final total, após as compras | 13.572.974 | 75.754.464 | 67.020.962 |

O caixa operacional é a variação conjunta das reservas depois de somar de volta o custo dos carimbos efetivamente plantados. É uma medida de partida inteira. No mapa compacto, o resultado foi diferente. Nas 12 partidas frias F40 até G8.192, o caixa operacional conjunto passou de 16,33 milhões na prévia anterior a 15,40 milhões com contenção. O caixa final passou de 21,75 milhões a 37,80 milhões porque os bots gastaram menos nas compras.

Para testar a memória, em cada repetição reiniciamos os jogadores, desserializamos o arquivo em uma sessão nova e usamos uma semente diferente. Repetimos essa nova semente sem histórico como controle. Em F40, as 12 partidas com contenção tiveram primeira compra do puffer na mediana G310 quando começaram do zero. Na rodada seguinte a mediana foi **G10 com memória contra G575** no controle frio da mesma semente. Em F320, as três partidas herdadas compraram em **G10**, contra mediana **G1.350** nos controles frios. Os cinco bots podiam decidir esperar.

O CSV também inclui Callahan/F96 e B2/S245/F32 sob estabilidade. As três versões receberam o mesmo catálogo, orçamento, tarifas, regulação de conflito e sequência de sementes dentro de cada comparação. A coluna de contenção usa o limiar padrão de 384 nascimentos no mesmo componente por geração. O número de estudos físicos da prévia anterior inclui solicitações repetidas por aprendizes diferentes. Na nova versão cada conclusão representa uma carta distinta, incluindo as que foram descartadas pelo orçamento mental.

## Reproduzir

Salve a revisão `52212557c8175d3aecec3ffdea4a9a604aa6e7b9` em um checkout separado. O script a compara ao código atual com os dois ajustes de crescimento. A ordem e as sementes de todas as 189 partidas estão em [learning-results.py](./learning-results.py). [Resultados por partida](./learning.csv)

```sh
python3 experiments/outbreak/learning-results.py /caminho/para/checkout-anterior
```
