# Economia celular e iluminação

Experimento jogável em `index.html?experiment=local`. A esfera, os carimbos do
Atlas, os desenhos do editor e as regras de autômato continuam sendo os mesmos.
Cada célula mantém seu próprio saldo. O raio de luz determina onde o jogador
consegue construir e quais adversários entram em sua observação.

## Regras do ensaio

| Parâmetro | Valor inicial |
| --- | ---: |
| Visão | 6 arestas da malha |
| Capacidade por célula | 256 |
| Carga transportada pelo carimbo | 32 por célula |
| Carga transferida a nascimento natural | 2 por célula |
| Vizinhança que pode financiar nascimento | raio 1 |
| Alcance da herança de energia | raio 2 |
| Maturação da produção | 12 gerações de vizinhança estável |
| Produção de célula qualificada | 1 por geração, até sua capacidade |
| Taxa material do carimbo | 8 por célula |
| Taxa de nascimento natural | 1 por célula |

O carimbo de quatro células custa 32 de material e transporta 128 de combustível:
160 precisam estar disponíveis nas células que iluminam sua posição. A carga
transferida continua existindo no campo. Nascimentos pagam sua taxa e recebem
carga dos vizinhos; células que desaparecem distribuem o saldo restante entre
herdeiros próximos do mesmo tipo, respeitando a capacidade. O livro contábil
separa consumo, energia transferida, perda física e excesso de capacidade.

A estabilidade exige que a célula e o tipo de seus vizinhos permaneçam iguais.
Uma célula fixa dentro de uma oscilação pode manter idade alta enquanto sua
vizinhança muda; sua maturação econômica acompanha essas mudanças. Nascimentos
e mortes têm renda zero neste experimento. A taxa por tipo é configurável por
regra/resolvedor; nenhum reconhecedor de forma participa da economia.

O jogador escolhe sua semente inicial. Um ensaio real de 64 gerações verifica
sobrevivência e produção. A preparação carrega o capital inicial nessa semente,
e sua luz já cobre posições livres ao redor. O mapa guarda o que foi explorado;
construção exige a área atualmente iluminada, incluindo todas as células do
carimbo. A evolução natural pode atravessar a fronteira iluminada e abrir caminho.

## Reprodução

```sh
node --test experiments/typed-world/spatial.test.mjs experiments/typed-world/game/spatial-bots.test.mjs
node experiments/local-economy/survey.mjs experiments/local-economy/results.json
```

`results.json` registra 51 cenários no motor usado pela partida:

* 18 combinações de economia, posição da infestação e semente, por 64 gerações;
* 27 combinações de padrão e economia, por até 128 gerações;
* 6 partidas com três jogadores, duas políticas de bots e três sementes,
  por até 256 gerações.

As sementes de isolamento são 1, 7 e 43. Os bots usam 7, 41 e 109. A malha é F32.
Nos ensaios de padrões e infestações, cada célula inicial recebe 160 de capital
bruto, dos quais 8 pagam material. Assim, a base inicia com a mesma carga em
ambos os braços; adicionar o triângulo também adiciona o capital explícito das
três células desse triângulo. O ensaio compara a colônia produtora e registra
separadamente os saldos totais de cada cenário.

## Resultado: infestação distante

Semente 1, 64 gerações:

| Economia e cenário | Células finais | Reserva total | Energia da região da base | Pico de células |
| --- | ---: | ---: | ---: | ---: |
| Compartilhada, base limpa | 12 | 1.111,45 | — | 12 |
| Compartilhada, triângulo distante | 25 | 14,45 | — | 192 |
| Celular, base limpa | 12 | 1.208 | 1.208 | 12 |
| Celular, triângulo distante | 12 | 1.208 | 1.208 | 51 |
| Celular, triângulo adjacente | 0 | 0 | 0 | 45 |

Nas três sementes, a base da variante celular terminou com exatamente o mesmo
estado econômico no controle e com infestação distante. O triângulo gastou seu
combustível e se extinguiu. O teste de regressão do estudo compara a região da
base inteira, com suas células, estabilidade e energia. O triângulo adjacente
continua tendo efeito físico sobre a base.

## Resultado: padrões computacionais e combustível

O controle `native` usa a mesma física e preços zero. O controle `legacy` usa a
economia compartilhada. Na economia celular, com 160 de capital bruto por
célula inicial, os resultados após 128 gerações foram:

| Padrão | Células iniciais | Células finais | Renda | Posições exploradas |
| --- | ---: | ---: | ---: | ---: |
| Farm 4→12 | 4 | 12 | 1.380 | 211 |
| Farm 18→66 | 18 | 66 | 7.500 | 439 |
| Oscilador Callahan P2 | 3 | 3 | 0 | 167 |
| Glider Callahan | 6 | 6 | 0 | 1.297 |
| Glider Andreen | 5 | 5 | 0 | 1.284 |
| Gun Callahan P20 | 52 | 6 | 139 | 1.571 |
| Stalk Callahan P8 | 20 | 19 | 340,50 | 397 |

O saldo herdado conserva a capacidade dos gliders de transportar combustível.
A carga inicial do carimbo tem um controle separado da carga dos nascimentos.
Essa separação surgiu de um ensaio: com apenas 2 de carga inicial por célula, a
farm 4→12 desaparecia na geração 2. Com carga 32, chega a 12 células e mantém
produção durante as 128 gerações; o glider Callahan dura 36 gerações, e o Andreen
38. Com carga 64, os gliders duram 73 e 71 gerações, respectivamente.

Para reproduzir essa calibração isolada, importe `patternTrial` de `survey.mjs`
e passe `perCell: 10`, `40` ou `72`: a taxa inicial de material é 8, restando
cargas 2, 32 e 64. Esse estado inicial reproduz a carga de um carimbo lançado
longe de outras colônias; o ensaio completo de bots também verifica colocações
pagas em regiões iluminadas.

## Bots e informação disponível

O controlador espacial começa pela observação `forkObserved(owner)`. Seleciona
posições livres dentro da luz, considera carimbos por seus dados e resultados,
e compara construir com esperar em duas cópias da mesma região. O objetivo
combina saldo, produção futura, território descoberto, proteção de células
produtoras e dano a adversários observados. Os carimbos baratos com produção
medida ajudam a criar novos orçamentos locais. A evidência das previsões altera
a preferência do controlador para decisões seguintes.

Os dois bots fizeram 18, 19 e 20 ordens nas três partidas celulares de 256
gerações. Partiram de 187–190 posições exploradas e terminaram com 1.037–1.305
posições por bot. Todas as ordens respeitaram luz e pagamento; o trabalho de
previsão ficou em no máximo quatro passos pareados por geração.

O teste contrafactual altera a quantidade de células inimigas escondidas e
executa uma compra inimiga invisível. As decisões, ordens e células próprias
permanecem exatamente iguais. Outro teste usa uma chave de carimbo criada pelo
usuário e comprova que o controlador consegue comprá-lo. O planejamento mantém
o mesmo limite global de trabalho para todos os jogadores.

## Conexão com pesquisa

[MAP-Elites](https://arxiv.org/abs/1504.04909) oferece um caminho para a futura
busca assistida por IA: guardar estruturas boas em várias dimensões de
comportamento. Aqui, as dimensões podem ser alcance explorado, carga necessária,
produção, resistência e capacidade de fabricar descendentes. O arquivo resultante
pode oferecer repertórios diversos aos humanos e bots.

As observações do
[artigo AlphaStar](https://storage.googleapis.com/deepmind-media/research/alphastar/AlphaStar_unformatted.pdf)
removem unidades sob névoa e especificam quais informações cada agente recebe.
O teste de informação oculta deste experimento aplica essa preocupação ao
motor do Hexophage.

## Ressalvas e contrapontos

Este estudo mede 51 cenários finitos. Ele não demonstra equilíbrio geral,
ausência de toda estratégia parasita nem qualidade humana dos bots. Os bots são
planejadores com orçamento de simulação, sem treino por partidas humanas.
Nas três partidas F32 medidas, os bots espaciais ainda não produziram ataques
registrados como raids; seu avanço observado foi principalmente econômico e
territorial. Combate e busca de planos completos continuam sendo alvos de teste.

Os padrões grandes têm exigências de transporte de energia que ainda precisam
ser investigadas. A Gun P20 terminou com seis células, enquanto seu controle
físico tinha 96; o Stalk ficou com 19 contra 114. A economia local muda quais
construções conseguem manter sua dinâmica com o combustível disponível. Um
ensaio de sobrevivência não estabelece equivalência computacional ou preservação
do comportamento de uma máquina maior.

O puffer Andreen incluído no estudo também se extingue no controle de física
gratuita nessa malha/rotação: o resultado não pode ser atribuído integralmente
à economia. Universalidade demonstrada em Conway não constitui prova para as
regras hexagonais combinadas deste projeto.
