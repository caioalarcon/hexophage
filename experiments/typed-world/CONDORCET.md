# Qual resolutor deixa a última colônia viva?

Em F48, com 768 créditos para cada lado e 24 por apagamento, **a travessia venceu os outros três resolutores entre as pistas que distinguiram o par**. Contra contato, foram seis pistas a favor, nenhuma contra e 30 empatadas. Contra guarda, só quatro das 36 pistas distinguiram os resolutores. Contra antimatéria, 30 distinguiram. Não apareceu ciclo de vitórias. Nenhum resolutor venceu todos os rivais por maioria absoluta das 36 pistas.

## Critério da partida

O jogo inicia a contagem depois da compra da nave, quando as duas facções têm células convencionais. A primeira geração em que uma facção perde todas elas encerra o duelo. Se ambas as perdem nessa geração, há empate real. Se as duas sobrevivem até o horizonte, a partida segue em aberto. Um projétil de antimatéria conta enquanto é portador. Depois da ignição, as células da onda ficam fora da contagem, mesmo que a carteira ainda tenha saldo.

Cada pista tem ida e volta. Por exemplo, travessia ataca contato e, repetindo a mesma pista, contato ataca travessia. O resolutor com mais vitórias nas duas partidas recebe um voto. Uma vitória para cada lado empata a pista. Uma vitória e uma dupla eliminação dão o voto ao vencedor. A pista permanece aberta se alguma perna ainda não terminou. Isso impede transformar uma liderança de saldo ou de população em vitória por eliminação.

O ensaio repetiu as quatro combinações de padrões da liga em nove pistas por combinação. As esferas F32 e F48 têm orientações, sementes e preparação diferentes. Foram 864 partidas, 432 por esfera, com condições pareadas. O mesmo jogador ocupa o mesmo lado nas duas pernas da pista e os resolutores trocam de papel. O alvo compra seu padrão e amadurece antes de receber o projétil. O atacante compra apenas a nave. Nenhum lado recebe reforços ou uma segunda colônia remota. A arbitragem do vazio usa apoio local. Guarda custa o mesmo que contato nesta bateria.

## Validação em F48 até G+384

Nas 432 partidas, 422 terminaram com um vencedor e dez com dupla eliminação. As colunas de pista resumem os votos depois das duas pernas. As de partida mostram quem ganhou cada perna, incluindo os empates reais. Em todas as linhas, as 72 partidas terminaram.

| Par (esquerda × direita) | Pistas da esquerda | Pistas empatadas | Pistas da direita | Vitórias da esquerda | Duplas eliminações | Vitórias da direita |
|---|---:|---:|---:|---:|---:|---:|
| Contato × travessia | 0 | 30 | 6 | 30 | 1 | 41 |
| Contato × guarda | 0 | 36 | 0 | 35 | 2 | 35 |
| Contato × antimatéria | 30 | 6 | 0 | 63 | 3 | 6 |
| Travessia × guarda | 4 | 32 | 0 | 39 | 1 | 32 |
| Travessia × antimatéria | 30 | 6 | 0 | 66 | 0 | 6 |
| Guarda × antimatéria | 30 | 6 | 0 | 63 | 3 | 6 |

Os seis votos da travessia contra contato vieram de três pistas de nave Andreen × oscilador Bays, duas de Slider Ashley × fazenda e uma de glider Bays × Slider Ashley. No confronto glider Bays × crescedor Callahan, **as nove pistas empataram** na ida e volta desse par. O glider pode atingir o crescedor e ainda perder pela condição do jogo. Uma nave que detona sendo o único campo do atacante também pode perder no próprio instante da ignição. O cenário de [antimatéria com fazenda patrocinadora](blast-victory.md) mede outra abertura.

Em G+96, 31 das 432 partidas de validação continuavam abertas. Já em G+384 a tabela não depende de como se tratariam partidas censuradas. Na exploração F32, a G+384, nove partidas continuavam abertas, três no confronto contato × travessia e seis em travessia × guarda. Essas partidas ficaram sinalizadas no CSV. Os dados descrevem as pistas escolhidas. As 36 pistas reutilizam quatro pares de padrões e não são 36 amostras aleatórias de partidas com compra livre.

## Reprodução

A partir da raiz do repositório, com Node e Python 3.10 ou mais recente:

```sh
python3 -B experiments/typed-world/condorcet.py 4
```

[Resultado, geração e campos no encerramento de cada perna](condorcet-legs.csv) · [Votos por par em G+96 e G+384](condorcet-matrix.csv) · [Runner e agregação](condorcet.py)
