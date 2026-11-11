# Partida mista

[**Jogar contra cinco bots**](../../../index.html) · [Mesma semente com renda de atividade](../../../index.html?rule=mixed&economy=activity&seed=1) · [Laboratório de colisões](../index.html) · [Voto material e travessia](EXISTENCE.md)

A página principal abre em **Mundo misto · experimental**, com F128 (163.842 sítios) construído em segundo plano por padrão. A célula recebe a física do carimbo que a gerou. Um único jogador pode cultivar e armar as nove físicas na mesma esfera. A partida começa pausada. Você recebe a reserva integral e escolhe o primeiro carimbo, podendo colocá-lo antes ou depois de iniciar. Os bots começam com suas colônias compradas. Após o primeiro carimbo, perder a última célula convencional elimina a facção. A onda pode continuar se propagando enquanto a disputa entre as facções restantes estiver em curso.

## Jogar

- Escolha uma das 54 cartas à direita e clique em uma região livre do mapa. A barra de energia acompanha a reserva disponível para cada carta. Ao completar, fica verde e o desenho ganha brilho. A prévia no mapa fica coral enquanto a colocação estiver indisponível. No retrato, a mão fica embaixo e o painel de partida fica no alto. Arraste para navegar e use a roda para dar zoom. A inspeção 3D ocupa toda a tela.
- Clique no **nome** de uma facção para centralizar o conjunto de células mais próximo da visão atual. O triângulo à direita abre e fecha separadamente a ficha de campo, renda, gastos, nascimentos, mortes e combate.
- No lado esquerdo da área do carimbo ficam a prévia permanente e os botões de girar/espelhar. À direita ficam as listas de **Contato**, **Guarda**, **Travessia**, **Antimatéria** e o voto da linhagem. A escolha vale para a próxima colocação daquela carta. Os descendentes herdam a interação plantada. Uma posição comporta uma célula. Passe o cursor em **Voto da linhagem**, dê foco pelo teclado ou toque em **?** para ler a explicação dos quatro critérios.
- A barra abaixo da prévia reúne **Carimbo** (`V`), **Borracha** (`B`) e **Conta-gotas** (`I`). A borracha apaga suas células dentro de um círculo, inclusive ondas, com reserva zero. Arraste para pintar ou mantenha pressionado para reaplicar em cada geração. O controle **Raio** muda o tamanho. `Shift` + arrastar ou o botão do meio movem o mapa com a borracha selecionada; no toque, dois dedos navegam e dão zoom.
- O conta-gotas copia o padrão mais próximo do clique para o espaço selecionado do baralho. O desenho recebe o autômato, interação, voto e sensor observados, e fica salvo como carimbo personalizado. A prévia ciano mostra as células capturadas. A orientação acompanha a visão; a colocação seguinte pertence ao jogador e começa com idade 1.
- O padrão inicial decide a existência da matéria por maioria dos genótipos materiais presentes. Cada um avalia B no vazio e S quando há uma residente material. A cédula do carimbo decide como ele vota para atribuir a identidade. Uma travessia financiada pode substituir uma inimiga comum mesmo onde a matéria vetou vida. Uma guarda apoiada pode bloquear essa passagem. Em **Disputas em campo**, avance a partida para ver os votos e o ocupante final. [Exemplos reproduzidos na esfera](EXISTENCE.md)
- **Atlas** permite buscar nas nove físicas, criar ou editar uma cópia, testar gerações e guardar o desenho na barra. O clique direito em uma carta abre sua ficha técnica e permite substituí-la naquele espaço, inclusive por um desenho editado. A lista considera o rendimento na economia escolhida, o custo e as alternativas de ataque de cada física. Os 409 padrões nativos usam medições do atlas. Um novo desenho é medido localmente. O ensaio do editor acompanha evolução isolada e saldo.
- Em **⚙**, escolha esfera, semente, ritmo dos bots, preços, renda por maduras, nascimentos ou mortes, votação de existência e precedência de identidade. **Nova partida com estes ajustes** aplica a configuração e reclassifica o baralho. A matriz de precedência pode comparar pares de interações ou de autômatos.
- Em **⚙ → Ferramentas**, os padrões iniciais são raio máximo **12** e **1.024 células por carimbo**. **Aplicar ferramentas nesta partida** muda esses limites sem reiniciar campo, reserva ou geração e guarda a preferência para a próxima partida. O limite de carimbo vale também para compras dos bots e para o editor. As colônias de abertura dos bots fazem parte da preparação do cenário.

## Controles da sessão

A preparação mostra **Iniciar**. Durante a execução aparecem **Pausar** e **Parar**. Na pausa aparecem **Retomar**, **Parar** e **+1 geração**. Parar conserva o último campo para inspeção e oferece **Nova partida**, que volta à preparação com os ajustes atuais. A derrota do jogador humano pausa a sessão e oferece imediatamente **Nova partida**, inclusive enquanto a disputa global entre bots ainda está em aberto. Vitória e empate usam a mesma ação de reinício. O avanço manual só executa quando a sessão já começou e está pausada.

## Infestações e ferramentas

A borracha dá uma ação de controle ao jogador quando uma região consome a reserva. A remoção usa uma distância angular na esfera, em unidades do espaçamento local entre células. A prévia destaca exatamente as células próprias atingidas. O registro econômico separa essas remoções em **Células apagadas com borracha** e **Aplicações da borracha**. O campo, as maduras e a população convencional mudam imediatamente; a eliminação segue a liquidação normal da próxima geração. Apagar custa zero e rende zero: não produz renda de mortes, revenda ou crédito de combate.

O conta-gotas agrupa material do mesmo dono, regra, interação, voto, sensor e estado de onda, conectado por distâncias de até três passos. Essa vizinhança inclui a centelha separada de naves como a de Callahan. A captura respeita o componente completo: um componente acima do limite é recusado. Desenhos que atravessam uma deformação que impede o transporte consistente para uma grade hexagonal também são recusados. A onda fornece forma e atributos para um carimbo convencional novo; idade, proprietário e o estado transitório de onda não são transferidos. A medição econômica de uma captura avança em pequenos lotes enquanto a interface continua disponível.

Os bots usam a mesma borracha e os mesmos limites. Regiões com células jovens e custos altos sugerem uma investigação. O bot compara duas cópias do estado: **esperar** e **limpar com uma sequência de pinceladas**. A avaliação considera reserva futura, fluxo operacional, células maduras e sobrevivência da colônia. A sequência vencedora é reposicionada e validada novamente no campo corrente antes de cada corte. A pesquisa divide o orçamento por geração com os ensaios de compras e de capturas. Uma captura produtiva observada pode entrar no catálogo privado do bot e competir como compra paga.

O estado completo, a semente, a geração e as mesmas intervenções reproduzem a evolução determinística. Em campos grandes, a previsão usa uma região com margem espacial e conserva a contribuição exterior no valor observado; interferências posteriores e mudanças fora desse recorte exigem nova avaliação. O planejador refaz a validação antes de executar a ação. [Implementação do planejador](bot-tools.mjs) · [Testes de campo e captura](../../../src/mixed/field-tools.test.js) · [Gestos no navegador](../../../tests/field-tools-browser.cjs)

### Ensaio de recuperação

`node experiments/typed-world/game/tool-recovery.mjs` reproduz uma fazenda com 66 maduras e uma infestação B2/S245 iniciada por um triângulo de três células. Cada par parte do mesmo estado insolvente na geração 256. O tratamento recebe um bot com borracha e catálogo de compras vazio; o controle apenas evolui. Ambos avançam até a geração 384, com orçamento de quatro passos de pesquisa por geração.

| Semente | Raio máximo | Pinceladas | Reserva final, controle | Reserva final, bot | Maduras preservadas |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | 8 | 0,20 | 3.755,75 | 66 |
| 1 | 12 | 2 | 0,20 | 3.857,75 | 66 |
| 43 | 3 | 8 | 0,73 | 3.757,73 | 66 |
| 43 | 12 | 2 | 0,73 | 3.859,73 | 66 |
| 211 | 3 | 7 | 0,34 | 3.779,09 | 66 |
| 211 | 12 | 2 | 0,34 | 3.858,09 | 66 |

Os seis tratamentos terminaram com as 66 células da fazenda, zero nascimentos na última geração e toda a fazenda original preservada. Os testes também verificam uma colônia saudável, uma nave em movimento, uma captura que vira compra real, limites de ferramenta, determinismo e o orçamento de pesquisa. [Ensaio reproduzível](tool-recovery.mjs) · [Regressões dos bots](bot-tools.test.mjs)

Na configuração de estabilidade, o *stalk P8* e o Crescedor de Callahan estão entre as primeiras opções acessíveis. Ao recompensar eventos, sobem o canhão triplo Hawk de Ashley 2016 e o *glider gunship* P28 de Andreen. Cada física conserva pelo menos quatro cartas, entre elas uma nave. [Medições e ordenação](atlas-model.mjs)

O runner de comparação usa aberturas pagas para todos os participantes e compartilha as carteiras, compras, eliminação, previsão local e política do cliente. Em cada par, uma cópia do planeta recebe ordens dos bots e a outra evolui a mesma abertura sem compras adicionais. [Resultados dos bots e comparação das economias](BOTS.md)


### Recuperação sob intervenções concorrentes

`node experiments/typed-world/game/concurrent-tool-recovery.mjs` compara recuperação com e sem intervenções distantes de outra carteira a cada duas gerações. A amostra F48 começa insolvente em G256 e avança 160 gerações, com orçamento de um passo mental por geração. A amostra F128 usa cinco controladores, orçamento compartilhado de quatro passos e 256 gerações adicionais. O catálogo inicial de compras é vazio; captura e compra de padrões observados continuam habilitadas.

A invalidação da versão publicada em `538aec1` descartava a previsão inteira a cada ação. O motor agora notifica os comandos efetivamente aplicados a cada instância, e o planejador de limpeza acompanha dependências espaciais e carteiras participantes. Intervenções distantes de outras carteiras preservam o trabalho em andamento. Ações próximas, gasto das carteiras envolvidas e alterações de configuração invalidam as previsões relevantes. Cada pincelada continua sendo validada contra o estado corrente. Simulações privadas mantêm seus próprios observadores.

| Mundo / semente / controladores | Cortes antes | Cortes depois | Reserva antes | Reserva depois |
| --- | ---: | ---: | ---: | ---: |
| F48 / 1 / 1 | 0 | 2 | 0,43 | 4.082,35 |
| F48 / 43 / 1 | 0 | 2 | 0,74 | 4.487,69 |
| F48 / 211 / 1 | 0 | 3 | 0,23 | 4.454,91 |
| F128 / 43 / 5 | 0 | 3 | 0,03 | 5.183,92 |

Os quatro tratamentos preservaram as 66 células maduras originais e terminaram com zero nascimentos. A regressão também verifica invalidação por ação próxima, gasto próprio e configurações; a métrica `eraseInvalidated` registra previsões de limpeza descartadas.

#### Ressalvas e contrapontos

Estes são ensaios dirigidos de concorrência, com sementes e produtores conhecidos. A avaliação de partidas completas com o catálogo integral, combates diversos e infestações repetidas continua na issue #20. As dependências espaciais usam um horizonte finito; ações e evolução posteriores continuam exigindo revalidação.
