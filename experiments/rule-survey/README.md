# Nove regras hexagonais no Hexophage

**Reavaliação após acompanhar as células neutras.** Das 30 posições em que a nave P6 eliminou a fazenda B2/S245H de 12 células, 28 deixaram pelo menos 256 células neutras vivas. As medições econômicas e a perda das células do defensor continuam reproduzíveis. A recomendação original para o jogo subestimava o que ocupava o mapa depois do ataque. [Investigação de conflitos, resultados por regra e replay](../conflict-survey/README.md)

## Resultado por regra

São 409 entradas de Atlas em nove regras fixas, 247 além das 162 visíveis em produção. A coluna de compras soma quatro partidas F32 com o baralho da regra e os cinco aprendizes. A de fluxo conta carimbos com fluxo operacional médio positivo quando isolados nas gerações 897–1.024. O custo de implantação e o saldo acumulado constam no CSV.

| Regra | Carimbos | Com fluxo positivo | Compras | Formação ou interação reproduzida |
|---|---:|---:|---:|---|
| Callahan · B2o/S2m34H | 205 | 3 | 40 | As três sementes rentáveis produzem hastes. A haste original chegou a +4,528/g. O glider P4 reduziu sua população em 10 de 36 poses e não zerou a haste em nenhuma. |
| Bays · B2/S35H | 30 | 0 | 10 | Gliders P5, nave P14, osciladores e a reação Supernova. As dez compras foram do mesmo P2 de seis células. |
| Hexagonal Life · B2/S34H | 43 | 0 | 10 | A muralha de Hickerson recuperou a forma do controle em 14 gerações após a remoção da célula central. Os detritos sumiram em 44. |
| B2/S245H | 24 | 5 | 203 | Doze naves documentadas, uma formação estável de 12 células e quatro precursores de fazendas. |
| Bays · B245/S3H | 19 | 0 | 10 | Uma nave de nove células anda duas casas em dez gerações. Contra o Blossom P57, zerou a população do defensor em 31 de 36 poses. |
| Andreen · B2o3o4m/S2om4oH | 32 | 0 | 14 | A nave que dispara gliders, P28, extinguiu o defensor Toggle Pair em 28 de 36 poses. Há também refletor, puffer diagonal e uma estrutura P320. |
| HighHexLife · B25/S34H | 35 | 0 | 10 | Dezesseis naves compatíveis no banco de gliders e puffers com rastros distintos. Todas as compras foram do mesmo oscilador. |
| Ashley 2015 · B2/S2opH | 8 | 0 | 0 | Rotor de cinco células, P126, e puffer de cinco células que deixa osciladores P2. Mesmo oferecidos individualmente, os bots recusaram os dois. |
| Ashley 2016 · B2o3m56/S2om4oH | 13 | 0 | 10 | Um canhão de três células emite três Hawks a cada nove gerações. Há ainda um emissor P110 e colisões de puffers. |

O Atlas do jogo permite ordenar por **Fluxo · estabilidade padrão** ou **Compras · ensaio dos bots**. Ambos exibem medidas destes ensaios. A simulação econômica do carimbo selecionado usa os sliders atuais da partida.

## As fazendas de B2/S245H

Na primeira rodada os aprendizes tinham 20 cartas, inclusive a fazenda pronta de 12 células. Na segunda acrescentamos quatro precursores descobertos por busca. As quatro partidas usaram as mesmas sementes e a mesma sequência de transferência de memória. As compras passaram de **5, 0, 0, 5** para **40, 50, 63, 50**. Em todas as quatro com 24 cartas, os cinco aprendizes encerraram G16.384 com fluxo positivo. Em F320, na semente fria, passaram de cinco compras e dois bots com fluxo positivo para 50 compras e cinco com fluxo positivo. [Resultados antes](./pre-precursor/matches.csv) · [Resultados depois](./matches.csv)

| Carimbo | Custo | Fica estável em | Fluxo maduro isolado | Recupera o custo em isolamento | Compras nas quatro partidas |
|---|---:|---:|---:|---:|---:|
| Fazenda 4 → 12 | 40.000 | G2 | +0,240/g | G167.223 | 119 |
| Fazenda 9 → 30 | 90.000 | G5 | +0,598/g | G150.932 | 4 |
| Fazenda 10 → 36 | 100.000 | G3 | +0,717/g | G139.816 | 76 |
| Fazenda 18 → 66 | 180.000 | G4 | +1,309/g | G137.824 | 3 |

O retorno inclui a implantação, os nascimentos iniciais e a maturação. Depois de verificar a formação fixa, calculamos o restante com seu fluxo constante. Na partida de carta única até G4.096, a 10 → 36 produziu o maior fluxo final combinado dos cinco bots, +22,368/g. A 4 → 12 teve a maior adesão no baralho completo. Na extensão fria até G360.000, a preferência mudou para a 10 → 36, com 32 das 48 compras. Os cinco bots terminaram com fluxo positivo. [Busca e verificação das fazendas](./SHIPS.md) · [Ensaio por carta](./auditions.csv)

## O que aconteceu no combate

Com as 20 cartas da primeira rodada de B2/S245H, o bot 6 **escolheu por conta própria** gastar 30.000 em um P2 de três células junto à fazenda do bot 2 na G269.570. Repetimos todas as ordens e retiramos apenas essa compra na partida de controle. Em cinco gerações a fazenda caiu de 12 células para três. Seu fluxo passou de +0,240 para −1,980/g. Na G360.000 o defensor tinha 200.711,52 créditos a menos e o atacante tinha 30.004 a menos que no controle, uma vantagem relativa de 170.707,52 para o atacante. O tributo foi zero. [Replay interativo](./attack-view.html) · [Ordens e saldos](./attack-replay.json)

Nas **63 partidas de baralho aberto com os catálogos finais**, houve zero compras dirigidas a rivais. A fazenda de 66 células ainda foi destruída por um P2 de três células em 23 das 36 poses controladas. A nave P6 de nove células zerou essa mesma fazenda em 28 poses e a fazenda de 12 em 30. As contagens descrevem essas posições de teste, com o mesmo defensor e a mesma fase inicial. Nenhuma serve como taxa de vitória numa partida espontânea. [Todos os contatos](./contacts.csv)

## Como comparamos

- **Catálogos.** Incorporamos 133 entradas da coleção Life2D de David Bagley. Examinamos os 668 registros da base de naves hexagonais e reproduzimos 42 compatibilidades em cinco regras, 40 novas para os respectivos atlas. As publicações originais de Ashley, Hickerson, JMM e outros também forneceram naves, emissores, reações e objetos que se reparam. Os padrões de busca local têm origem identificada. O censo complementar enumerou todos os 449 poli-hexágonos livres de até sete células por regra pesquisada. Conservou formas periódicas conectadas e eliminou fases, translações e simetrias já representadas. [Bagley e índice de nomes](./BAGLEY.md) · [Naves, Ashley e precursores](./SHIPS.md) · [Muralha, osciladores e puffers](./FORUM.md) · [Artigo de Carter Bays](https://doi.org/10.25088/ComplexSystems.15.3.245)
- **Física.** Cada partida usa uma regra em toda a esfera. Continuamos com dois estados e os vizinhos imediatos. Nas três novas regras dependentes da geometria, nos 12 pentágonos testamos as cinco posições possíveis do vizinho ausente, vazio, e usamos a maioria. Os hexágonos seguem as classes de vizinhança publicadas. Atribuição de descendentes mistos usa a regra de propriedade já implementada no motor para cada perfil.
- **Economia fixa.** Aplicamos a política de estabilidade de produção a todas as regras, inclusive Bays. A reserva inicial foi 820.000, cada célula carimbada custou 10.000, cada nascimento custou 1, a maturação levou 256 gerações e a tarifa madura foi 0,02/g com saturação na escala de 8.000 por dono. Mantivemos a tarifa de combate de 0,25. Nenhum valor foi otimizado por regra.
- **Cartas isoladas.** Cada uma das 409 recebeu 1.024 gerações no plano hexagonal com financiamento externo e registro da primeira insuficiência de caixa. Medimos toda a trajetória e a média das 128 gerações finais. O CSV separa receita operacional, implantação, saldo líquido e população. [Medições por carimbo](./isolated.csv)
- **Aprendizes.** Foram 63 partidas abertas. Para cada regra, três sementes em sequência com memória herdada mais a repetição fria da terceira em F32, uma réplica fria em F96, outra em F320 e uma extensão fria F32 de até 360.000 gerações. O assento humano ficou vazio. Houve ainda 391 partidas de carta única de até G4.096. Das 409 formas, 18 excedem o raio mental dos bots de produção. Outras oito cabem na projeção, mas excedem a reserva inicial. Callahan mantém a prioridade de abertura do kit de produção. Nos perfis ampliados as demais regras oferecem o catálogo completo à pesquisa inicial. O ensaio de carta única controla essa diferença de oferta. [Método e reprodução](./BOT-MATCHES.md) · [Tentativas e compras por carimbo](./stamp-trials.csv)
- **Contatos dirigidos.** Selecionamos alvos por fluxo em isolamento e pelo tipo de estrutura. Deixamos cada alvo evoluir por 32 gerações em F48 e testamos ataques pagos em dois flancos, com seis rotações e três deslocamentos laterais. Foram 3.132 posições candidatas, 3.076 legais. Cada resultado compara o estado 128 gerações depois ao controle do mesmo alvo sem ataque, usando a economia e a propriedade reais do jogo. Também incluímos a fazenda original e o P2 do ataque autônomo em B2/S245H.

Para reproduzir o censo, a medição isolada e os contatos a partir da raiz:

```sh
node experiments/rule-survey/census.mjs
node experiments/rule-survey/isolated.mjs
node experiments/rule-survey/contacts.mjs
node --test "experiments/rule-survey/*.test.mjs"
```

Depois de reproduzir as partidas e coletar os CSV conforme o documento de treino, rode `node experiments/rule-survey/rank-atlas.mjs` e `npm run build` para atualizar o Atlas jogável.
