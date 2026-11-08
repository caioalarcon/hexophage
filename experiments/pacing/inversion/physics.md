# Um glider consegue interromper a renda de um crescedor?

Sim. Na esfera f256, um glider P4 legalmente plantado diante da ponta de um crescedor transformou o campo inteiro em um oscilador de período três. A configuração completa, incluindo donos das células, foi idêntica nas gerações 47 e 50. A trajetória fora da rota deixou o crescimento idêntico ao do controle isolado. A resposta econômica depende de como se remunera uma célula estável.

O ensaio usou o motor do jogo por 512 gerações físicas, com bots ociosos. Em cada geração foram contados os nascimentos naturais, sobreviventes de idade mínima dois, sobreviventes de idade mínima cem e células que atingiram exatamente a idade 64. A unidade é uma energia por nascimento. Os acumulados abaixo são operacionais, descontados os nascimentos. A carimbada e a reserva inicial são contabilizadas à parte.

## Gerações 385 a 512

| Ativo ou intervenção | Nascimentos/G | Sobreviventes de idade ≥2/G | Células que atingem 64/G | Renda líquida recorrente, idade ≥2 | Renda líquida de 12 uma vez, ao atingir 64 | Renda líquida de 384 uma vez, ao atingir 64 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Crescedor isolado ou inimigo fora da rota | 5,961 | 368,125 | 0,750 | +362,164 | +3,039 | +282,039 |
| Crescedor atingido, disparo na geração 0 | 4,656 | 34,000 | 0 | +29,344 | −4,656 | −4,656 |
| Crescedor atingido, disparo na geração 16 | 4,664 | 43,000 | 0 | +38,336 | −4,664 | −4,664 |
| Glider P4 isolado | 5,000 | 1,500 | 0 | −3,500 | −5,000 | −5,000 |
| Gun P20 isolada com descendentes | 130,445 | 69,070 | 0 | −61,375 | −130,445 | −130,445 |
| Flipper P2 isolado | 2,000 | 1,000 | 0 | −1,000 | −2,000 | −2,000 |

Aos 512 turnos, a fazenda intacta tinha 421 células e a atingida pelo disparo inicial tinha 40. Pela renda contínua, a diferença acumulada foi de **96.597** (111.701 contra 15.104). A remuneração por maturação eliminou a renda recorrente da trilha parada. Com o prêmio de 384, a fazenda atingida ainda acumulava +10.643 de operação desde o início, mas perdia 4,656/G no trecho final. A reserva já acumulada sobrevive à interrupção da fonte.

O disparo antecipado do ataque custou um carimbo de seis células. Na variante de renda contínua ele precisou de 35 de capital de giro adicional até a colisão. Com maturação, o ataque bem apontado gastou 100 em nascimentos no total e não teve nenhuma célula madura. O P4 mal apontado continuou voando e gastou 2.560 no mesmo horizonte. Neste ensaio, uma ordem do mesmo tamanho e custo inicial teve efeitos opostos sobre a renda futura do adversário.

## Fundação e financiamento

- **Maturação e origem.** Um crescedor teve 369 maturações até G512. Delas, 30 ocorreram em células da semente, que começam na idade um e amadurecem em G63. A gun P20 teve 27 maturações, todas de sua semente. O flipper P2 teve uma, também de sua semente, e o glider teve zero. Se a regra remunerar somente células nascidas pelo autômato, o crescedor precisará de 376 de capital de giro, contra 372 contando a semente. Seu saldo acumulado em G512 passa a +1.017 com prêmio de 12 ou +127.125 com prêmio de 384. A taxa do trecho final é idêntica.
- **P20 e a idade do campo.** Pela renda contínua com idade mínima dois, a P20 ganhou 788 líquidos até G80, ganhou 456 acumulados até G160 e acumulou −1.403 até G256, chegando a −14.302 em G512. O resultado se deteriorou à medida que cresceu o número de descendentes. O número por geração na tabela pertence à idade medida.
- **Erosão realizada.** Uma execução adicional usou os coeficientes com sinais trocados apenas no motor de ensaio para percorrer a mesma rotina de déficit do jogo. Com capital de giro zero depois do carimbo, o glider teve a primeira erosão em G1. Com 1.000 de giro, em G286. Em ambos os casos, chegou vazio a G512. A P20 com giro zero teve a primeira erosão em G193 e também terminou vazia. Para o crescedor recebendo continuamente por idade mínima cem, a semente com giro zero se extinguiu, mas 587 de giro evitaram toda erosão até G512. Com 586 houve uma erosão em G98 e a colônia sobreviveu.
- **Cobertura do ataque.** A busca inicial tentou 630 combinações de direção, deslocamento e geração de lançamento no f48, com rejeição dos carimbos inválidos. O contraste publicado foi reexecutado no f256. O glider foi girado cinco sextos de volta e deslocado até (−11, 22) na carta do crescedor. A jogada mais tardia, em G16, produziu um ciclo de período três em G66–G69. O horizonte físico foi de 512 gerações e a recorrência garante a continuação do oscilador sem interferência ou erosão.

Executar `node experiments/pacing/inversion/physics.mjs` na raiz do repositório para gerar os resultados por ativo, participante e geração amostrada. O parâmetro `--search` reproduz a busca limitada por disparos. Os saldos de maturação usam uma contabilidade paralela financiada, com erosão desligada. As saídas `funding` registram os ensaios adicionais de erosão pela renda contínua.

## Fases para projetar o caixa

Em `physics-traces.json`, o elemento zero é G1. Cada linha contém nascimentos, maturações totais aos 64 e a parcela das maturações vinda do carimbo. Nos 512 turnos do crescedor, os nascimentos repetem um período de 24 desde G1 cuja soma é 143. Depois da bonificação da semente em G63, oito gerações repetem 6 maturações, começando por [3, 2, 0, 0, 0, 1, 0, 0] em G64. O fluxo médio de um ciclo observado completo com prêmio de 12 é 73/24 de energia por geração. O P4 alterna seis e quatro nascimentos desde G1 e nunca amadurece.

Na P20, os primeiros 20 turnos dão os nascimentos do mecanismo inicial. Depois disso, a cada bloco de 20 acrescenta-se a série de nascimentos de um glider, seis nas gerações ímpares e quatro nas pares. Essa decomposição e os períodos do crescedor são conferidos em cada uma das 512 gerações medidas. A continuidade em horizontes mais longos exige espaço, financiamento e sobrevivência dos descendentes.

Para conferir a extrapolação em dados independentes, `node experiments/pacing/inversion/physics-holdout.mjs` usa o autômato plano do atlas até G4.000, sem ajustar novamente as fases. A contagem de maturações é a diferença entre células de idade mínima 64 e 65. Depois de G512, os nascimentos e maturações previstos conferiram em todas as 1.220 janelas completas observadas. O crescedor somou 20.735 nascimentos e 2.610 maturações nas 174 janelas de vinte gerações. No mesmo intervalo, a P20 somou 2.030.406 nascimentos e nenhuma maturação. O glider registrou 17.440 nascimentos e nenhuma maturação nas 872 janelas de quatro gerações.

Os quadros da figura [duel.svg](duel.svg) vêm da esfera f256 e podem ser recriados com `node experiments/pacing/inversion/duel.mjs`. A comparação usa a mesma escala em todas as seis imagens e localiza cada célula em uma carta axial verificada contra os carimbos.
