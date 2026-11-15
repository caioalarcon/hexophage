# Pesquisa de capacidades e expansão

O controlador do experimento usa a observação parcial, os contratos do plano
do jogador e as mesmas transações de construção que a interface. Seus ensaios
pareados medem energia, recursos extraídos, capacidade de fabricação liberada,
território revelado, dano a adversários observados e preservação da base.

## Risco encontrado em 1.024 gerações

O ensaio inicial, F24, três jogadores, semente 41, executou 55 compras: 41 da
raiz, 11 de um contrato intermediário e três de armazenamento. Nenhuma receita
do segundo nível foi usada. O primeiro encontro entre bots ocorreu na geração
800. O saldo era suficiente para fabricar os demais contratos: o objetivo de
retorno financeiro repetia as estruturas produtoras.

A política agora reserva parte da renda acumulada para testar uma receita
habilitada ainda desconhecida. Essa experiência precisa preservar os produtores
existentes, manter material vivo no fim da previsão e respeitar toda a cadeia
de fabricação, luz, energia local e os quatro recursos.

O orçamento de pesquisa restante é:

```text
0,15 × renda de energia já obtida − compromissos anteriores de pesquisa
```

A cobrança contra esse orçamento é o maior valor entre a perda projetada e o
capital alocado na fabricação, incluindo carga energética transferida e custos
dos quatro recursos, valorizados em 2,5 unidades de planejamento por unidade.
Cada contrato recebe no máximo uma experiência subsidiada. Construções com
retorno previsto positivo continuam seguindo o critério econômico habitual.
Esse orçamento pertence ao planejador; todas as compras continuam consumindo
os estoques reais pelo comando normal.

## Resultado depois do ajuste

```sh
node experiments/frontier-resources/bots-survey.mjs 1024 41 > experiments/frontier-resources/bots-1024.json
node experiments/frontier-resources/bots-survey.mjs > experiments/frontier-resources/bots-survey.json
node --test experiments/typed-world/game/progression-bots.test.mjs
```

Na partida longa, ocorreram 45 compras e duas limpezas. Os contratos usados
foram os cinco do plano: 24 `base`, 15 `relay`, três `battery`, dois `pulse` e
um `scout`. O primeiro experimento do segundo nível ocorreu na geração 176;
o explorador foi lançado na geração 208. Os bots se avistaram nas gerações
608 e 611. Um dos jogadores perdeu toda a linhagem inicial na geração 710.

O registro tem zero ações ilegais, no máximo quatro passos pareados de
previsão por geração e erro de conservação dos recursos de até 1,49 × 10⁻¹¹.
As três partidas de 256 gerações passaram a registrar 17, 16 e 13 ordens;
duas delas utilizaram receitas do segundo nível. A exploração dos bots variou
de 714 a 1.460 posições.

O teste de integração usa geometria explícita e nomes personalizados, com o
catálogo fornecido ao bot vazio. Ele exige uma compra de segundo nível, verifica
os quatro débitos, o limite de renda destinado à pesquisa e a unicidade de cada
experiência subsidiada. Os testes de informação oculta e trabalho limitado do
primeiro experimento também continuam passando.

## Ressalvas e contrapontos

O uso de uma capacidade em uma experiência exploratória não demonstra que ela
tenha valor estratégico recorrente. O controlador ainda precisa aprender quais
resultados observados devem justificar repetir cada máquina em novos contextos.

Nenhuma ordem foi classificada como ataque deliberado nas partidas medidas, e
o contador de substituições hostis permaneceu em zero. A perda da base depois
do contato é um resultado observado; este ensaio não estabelece que tenha sido
causada por um ataque do adversário. Estratégia ofensiva e atribuição causal de
combate permanecem limitações explícitas deste protótipo.

Os pesos do objetivo e a fração de 15% são parâmetros experimentais, não uma
solução demonstrada de equilíbrio. O ensaio longo cobre uma semente.
