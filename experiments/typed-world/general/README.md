# Quando nove autômatos disputam a mesma esfera

[Disputa real de três jogadores, com a votação aberta](../index.html?scene=all&arb=ballot&seed=33&g=14&site=1781) · [Matriz circular editável para as nove regras](../index.html?scene=all&arb=matrix&by=rule&edges=111100001111000111100111101111111111&seed=1&g=2&site=225) · [Coexistência sustentável de nove regras](../index.html?scene=coexist)

Na geração 14 da semente 33, a posição 1781 recebeu um nascimento B2/S245 em travessia, uma sobrevivência HighHex em guarda e um nascimento Bays 245 em guarda, cada um de uma carteira. Os três carimbos herdaram critérios de decisão diferentes. O do primeiro jogador preferia mais pais locais, o do segundo preferia a ordem geométrica dos sítios e o do terceiro preferia a idade. A disputa aconteceu numa partida que começou com as nove físicas em cada uma das três carteiras, após 54 carimbadas legais. [Transcrição completa dos votos](cycle-audit.json)

| Candidatura | Apoio | Idade usada no voto | Ordem geométrica entre as três |
|---|---:|---:|---:|
| A · B2/S245, nascimento | 2 | 1 | 1ª |
| B · HighHex, sobrevivência | 1 | 3 | 2ª |
| C · Bays 245, nascimento | 3 | 2 | 3ª |

A venceu B por apoio e geometria. B venceu C por idade e geometria. C venceu A por apoio e idade. Todas as arestas deram **2 a 1 sem abstenções**. A ordem geométrica é uma permutação reprodutível dos sítios, dependente da semente e da geração. Cada uma das três derrotou uma rival e perdeu da outra. O desempate final dentro do conjunto dominante selecionou A, e a carteira pagou. Na prévia, a célula tem contorno branco. **Por que venceu?** mostra as propostas e cada confronto.

### Ciclo pelas propriedades físicas de três carimbos do mesmo dono

Num ensaio dirigido em F32, as nove regras continuavam vivas em G11. Três tipos da mesma carteira disputaram o sítio 246. Usamos a maioria entre apoio, idade e robustez. Neste caso toda comparação pareada pode ser verificada diretamente na tabela.

| Candidatura | Apoio | Idade | Robustez |
|---|---:|---:|---:|
| Bays 245 | 2 | 1 | 2 |
| Andreen | 1 | 6 | 1 |
| HighHex | 0 | 4 | 4 |

Bays 245 vence Andreen por apoio e robustez. Andreen vence HighHex por apoio e idade. HighHex vence Bays 245 por idade e robustez. As três arestas são **2 a 1**. A chave geométrica só entra depois para escolher o ocupante entre os três membros do ciclo. Andreen ficou com o sítio. O cenário foi encontrado por busca dirigida, reduzido a nove carimbadas locais legais e reproduzido com nove bases distantes. Seu objetivo é demonstrar possibilidade, sem estimar prevalência. [Abrir a célula em G11](../index.html?scene=physical&g=11&site=246) · [Ordens pagas e transcrição de cada voto](ecology-witness.json)

## O contrato de uma geração

1. **Herança e percepção.** O genótipo contém dono, autômato, interação, cédula e indicador de onda. Contato e guarda enxergam os vizinhos materiais. Travessia e onda consultam a própria linhagem. Duas travessias do mesmo dono com cédulas distintas formam linhagens distintas. Ao detonar, o projétil transmite o dono e a cédula à carga B2/S245.
2. **Propostas físicas.** Todas as linhagens leem o mesmo instante. A residente usa sua tabela de sobrevivência S e cada tipo presente com um pai local usa sua própria tabela de nascimento B. A ignição pode fazer uma proposta adicional. Uma regra sem candidato fica fora da disputa.
3. **Admissão.** Em *Vetos originais*, bloqueios de ocupação e guarda restringem os nascimentos, e a sobrevivente é a alternativa de reserva. Em *Sobrevivente e nascimentos*, a residente fisicamente viável disputa com as recém-chegadas. A opção de substituição aliada permite que dois tipos da mesma carteira também disputem uma posição ocupada. Uma onda pode apagar aliados nos dois modos.
4. **Arbitragem.** Uma ordem simples escolhe diretamente. Um árbitro pareado forma o grafo de preferências entre as candidaturas presentes. Um vencedor de Condorcet vence todas as demais em confronto direto. Se o topo for cíclico, o motor considera o menor conjunto que vence todo candidato externo (conjunto de Smith em um torneio estrito) e usa a ordem geométrica dentro dele. Nos votos, os critérios podem se abster em igualdade e a chave geométrica completa arestas empatadas. A inspeção distingue ganhar por maioria de ganhar por esse desempate. [Brandt, Brill e Harrenstein, *Tournament Solutions*](https://doi.org/10.1017/CBO9781107446984.004)
5. **Financiamento.** A sobrevivência não tem custo de nascimento. O substituto precisa pagar nascimento e eventual corte, inclusive a tarifa de guarda quando aplicável. A onda pode financiar a ação liquidando células convencionais elegíveis. Se a primeira candidatura não pode pagar, sai da disputa e o motor reaplica a eleição às restantes, inclusive ao eleitorado de cédulas. Os sítios usam ordem geométrica para disputar a carteira compartilhada. A geração termina com no máximo um genótipo por sítio.

Essa composição encerra a decisão mesmo em presença de ciclos. Cada recusa retira uma candidatura de um conjunto finito. As tabelas físicas continuam podendo ser diferentes em cada região e carteira. O trabalho cobriu os nove perfis nomeados do atlas, com grau 5 e grau 6. O editor B/S personalizado do jogo principal e a criação a partir do vácuo (B0) têm outras condições de geração de propostas.

## Quantas formas de precedência?

O editor oferece quatro interações herdadas e quatro cédulas herdadas (apoio, idade, ordem geométrica ou robustez). Há **dez configurações de árbitro** para as combinar. Algumas configurações coincidem em casos particulares, inclusive o original e o apoio quando a preferência pela travessia está desligada e a admissão é a mesma.

| Árbitro | Critério entre candidatos elegíveis |
|---|---|
| Original | Apoio com a opção histórica de priorizar travessia em disputa no vazio |
| Apoio local | Número de vizinhos da própria linhagem |
| Preferência à travessia | Travessia vem primeiro no vazio quando há proposta material. Depois vale o apoio |
| Ordem fixa | Lista ordenada de regras ou de interações |
| Dominante designado | Uma família vence qualquer outra. As restantes comparam apoio |
| Ciclo entre três | A vence B, B vence C, C vence A. O trio precede as demais famílias |
| Matriz editável | Cada par de famílias tem sua própria entrada. Famílias iguais comparam apoio |
| Maioria de três critérios | Um voto por apoio, idade e ordem geométrica |
| Maioria ecológica | Um voto por apoio, idade e robustez da transição B/S |
| Voto herdado | Cada genótipo elegível vota com a própria cédula. O eleitorado depende do sítio |

Robustez conta quantas inversões individuais de um dos cinco ou seis vizinhos deixam a transição proposta ainda válida sob a tabela daquele tipo. A ignição forçada recebe zero. Para nascimentos, idade usa o pai mais antigo daquele genótipo. Para a residente, usa a idade dela mesma. A ordem geométrica usa o sítio do pai escolhido, ou o da própria sobrevivente.

**As matrizes cobrem todos os torneios estritos e sem memória entre famílias**. Com nove regras, há 36 pares e **68.719.476.736 matrizes**. Destas, 2.415.919.104 têm uma família que vence as outras oito: há nove escolhas para o dominante, e as 28 arestas entre as outras oito continuam livres. Em uma ordem totalmente transitiva restam apenas 9! = 362.880 possibilidades. Com quatro interações herdadas há 64 matrizes. Testamos todas as 64 em todas as 24 ordens de inserção e a correspondência de cada um dos 36 bits para nove regras. A fórmula cobre decisões estáticas, binárias e com um vencedor obrigatório. Permitir coocupação, fusão ou destruição mútua muda os estados de saída e exigiria outras regras de transição.

Na matriz circular de nove, cada família supera quatro rivais e perde para quatro. Em 12 mundos completos F16, em 64 gerações, foram 16.180 disputas entre regras e 106 com ciclo no topo. Na matriz transitiva com Callahan acima de todas, Callahan recebeu a primeira preferência nas 1.817 oportunidades elegíveis, e ocupou ou conservou o sítio em 1.732. Inverter a matriz tornou Ashley 2016 a preferida nas 4.741 oportunidades dela, com 4.111 ocupações. A garantia local vale para a precedência. A capacidade de propor e de pagar continuam a depender da física e da carteira. [Dados e transcrição da matriz circular](matrix-audit.json)

## Cobertura exaustiva e dinâmica em campo

Enumeramos a vizinhança **material** completa com um genótipo de contato por regra, incluindo todas as orientações. Cada uma das posições do anel pode estar vazia ou conter uma das nove regras. O centro também tem dez estados. São 10⁶ configurações em pentágonos e 10⁷ em hexágonos. Aplicamos diretamente as nove tabelas físicas, com admissão aberta entre tipos. Para cada conjunto distinto de propostas, reconstruímos um representante com carimbadas legais na malha real e verificamos sua candidatura e o vencedor. Os 36 pares de regras podem concorrer. As contagens são do espaço de configurações, e sua distribuição não representa a frequência em partidas.

| Centro | Bairros enumerados | Máximo de regras candidatas materialmente | Bairros que atingem esse máximo |
|---|---:|---:|---:|
| Pentágono vazio | 100.000 | 3 | 3.390 |
| Pentágono ocupado | 900.000 | 4 | 6.780 |
| Hexágono vazio | 1.000.000 | 3 | 20.340 |
| Hexágono ocupado | 9.000.000 | 4 | 40.680 |

Ondas, ignições e genótipos com sensores diferentes tornam mais amplo o espaço de estados experimental. Em 96 mundos densos, o registro contabilizou **66.754 disputas entre regras**, das quais 1.514 tinham pelo menos três regras. Em 94 mundos as nove participaram de disputas em uma mesma geração, distribuídas por sítios diferentes. No cenário de coexistência, uma carteira sustentou indefinidamente os nove tipos em órbita física de período 252 sem colisões. A conta ganha 981 por período. Na fronteira densa houve perda precoce de diversidade. [Contagens locais](local-space.json) · [Experimentos de campo e certificado de coexistência](all-rules.md)

Na busca direta por ciclos locais de **maioria absoluta em todas as arestas**, usamos as sementes 1–64 e 65–128, as três carteiras heterogêneas e 64 gerações para cada um de três árbitros. Exigimos três **autômatos distintos** no conjunto dominante. A maioria de apoio, idade e geometria produziu um testemunho na semente 36. As cédulas herdadas produziram outro na 33. Nos três braços, a segunda metade não produziu novos testemunhos. Houve ciclos no grafo completado por desempates em ambos os blocos. [Seis contagens e votos das ocorrências](cycle-audit.json)

Pela **última colônia**, a liga de 7.776 partidas encontrou em F24 o ciclo entre cédulas apoio → idade → robustez → apoio. Cada aresta foi decidida por duas pistas a uma, com cinco empatadas, e desapareceu na repetição F32. Nas 45 matrizes que compararam as quatro interações, não apareceu ciclo pelo mesmo critério. A travessia venceu os três rivais em 39, atingindo maioria absoluta de todas as pistas em 16. A liga fixa os lançamentos iniciais, alterna os assentos e deixa o campo evoluir sem reforços. Isso mede o efeito da política no ecossistema de nove regras. [Liga, regimes de caixa e réplicas](LEAGUE.md)

## Reprodução

A partir da raiz do repositório, use Node 22 ou superior.

```sh
npm ci
npm run build
npm test
node experiments/typed-world/general/local-space.mjs
node experiments/typed-world/general/cycle-audit.mjs
node experiments/typed-world/general/matrix-audit.mjs
```

Os runners e parâmetros das demais baterias estão nos dois relatórios de experimentos acima.
