# Quando uma regra quer vida e outra quer morte

Na esfera F24, em G11 da semente 17, a residente do sítio 5416 pertencia ao jogador 2 e usava Hex B2/S34. Ao lado dela, duas células de guarda do mesmo jogador usavam B2/S245. As duas linhagens leram a mesma máscara material `000011`. **A residente votou morrer e acabou substituída pela guarda aliada.** S34 rejeita dois vizinhos. S245 os aceita. A decisão por apoio deu peso 1 à residente e 2 aos pais da guarda. A nova célula iniciou com idade 1. A carteira do jogador pagou o nascimento e a substituição. Essa posição surgiu após 54 carimbos legais de três jogadores, cada um com as nove regras.

## Existência, identidade e interação

Cada genótipo material local emite um voto, inclusive a residente quando está sozinha. Na votação explícita, todos leem B no espaço material vazio e S no espaço ocupado por matéria. Contato e guarda podem ler a vizinhança material compartilhada ou apenas o próprio genótipo, conforme o sensor herdado do carimbo. Na maioria simples, um empate dá vazio. Em unanimidade é preciso que todos aprovem. Em qualquer SIM, um voto basta. Na votação por apoio, cada vizinho da linhagem conta uma unidade e a residente conta mais uma para sua linhagem. O modo histórico preserva a física anterior.

Se vencer a vida, só os votos SIM materiais disputam a identidade. Uma residente fisicamente viável pode conservar sua idade. Se votar NÃO, outra linhagem pode sucedê-la, inclusive do mesmo jogador. Com fogo amigo desligado, uma aliada respeita a residente viável. Uma proposta de nascimento que não consegue pagar a cobrança dá lugar à próxima. Sem identidade financiada ou sobrevivente elegível, o sítio fica vazio.

A travessia e a antimatéria usam sensores espectrais. Na passagem literal, a fase lê sua linhagem como no voo solitário. Quando fase e matéria disputam o destino, as candidaturas espectrais são avaliadas primeiro. A fase paga o corte de um corpo ocupado, pode nascer em um lugar vetado pela matéria e respeita a guarda sobrevivente com dois apoios. As candidaturas materiais voltam a competir se todas as espectrais falharem. Cada sítio mantém no máximo uma identidade.

Comparamos a nave Bays com seu gêmeo solitário, geração por geração, até G+96, em 18 corredores F48 contra o crescedor Callahan. Com 16.384 créditos, a travessia literal contra contato reproduziu a trajetória nativa em **18/18** e pagou 20.232 créditos por 843 cortes somados entre as pistas. Contra guarda, **0/18** trajetórias ficaram intactas. Sem conceder passagem literal, contra contato foram **0/18**. Com somente 240 créditos de abertura, nem a passagem literal manteve a trajetória até o fim em nenhum corredor. O ensaio fixa o corte em 24 e usa maioria material e cédulas herdadas para a identidade. [144 confrontos com controles solitários](passage-controls.csv)

## O que entra na carteira

A renda de maturidade é creditada a partir do campo no início da geração, com a saturação de produtores. As rendas configuráveis de nascimento e morte são lineares e entram no fim da geração. Carimbar paga o custo de colocação. Nascer exige autorização física, ganhar a identidade e conseguir pagar. Um voto ou uma proposta recusada rende zero. A substituição financiada dá um nascimento à sucessora e uma morte à residente. A venda forçada já paga o valor de resgate e fica fora do contador econômico de mortes.

Com os preços dos modos de partida, o oscilador Bays P2 começou com 624 créditos depois de pagar pelas duas células. Em 1.024 gerações completou 2.048 nascimentos e 2.048 mortes. Com tarifa de 1,3 por nascimento, 1,3 por morte ou 0,65 por cada evento, terminou nos dois sítios iniciais com **1.238,40**. Enquanto puder manter seu ciclo isolado, ganha 0,60 por geração com esses preços. Na economia de estabilidade, terminou sem campo e sem saldo.

## Reproduzir as disputas

```sh
node experiments/typed-world/game/existence-controls.mjs
node experiments/typed-world/duels-passage.mjs --playable
node --test experiments/typed-world/existence.test.mjs
```

O controle usa as mesmas 54 ordens em cada política e observa 64 gerações. Há três sementes e quatro agregadores. O CSV distingue votos discordantes, aprovação de vida material, trocas de regra quando a residente votou NÃO e passagem espectral em sítios vetados. As quatro políticas podem criar estados diferentes já nas primeiras gerações. [Resultados e primeiros casos aliados](existence-controls.csv)
