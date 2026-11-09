# O que aconteceu na colisão do glider

A nave P6 de nove células (DB #151) de um jogador colide com a fazenda 4 → 12 de outro na regra hexagonal B2/S245. Bastam dois carimbos pagos e zero ações de bot. Na resolução original, duas células empatadas nascem cinzentas no sexto passo depois do lançamento. No passo 36, todas as 152 células vivas já são cinzentas. A facção neutra pode reproduzir, mas não tem jogador que pague pelos nascimentos. [Reproduzir os três mundos](./replay.html)

## Por que o ensaio anterior perdeu o fenômeno

Reexecutamos as **3.132 posições do PR #9** com a autoria original. As 3.076 intervenções legais reproduziram as duas populações e as duas diferenças de caixa registradas até o centavo. O relatório anterior media o atacante e o defensor. O terceiro dono que aparece nesses mesmos mundos não tinha coluna no CSV.

Em **367 dos 540 impactos legais de B2/S245**, pelo menos 256 células cinzentas estiveram vivas simultaneamente. Em 375 casos o defensor perdeu toda a sua população. Em **360 desses 375** restaram pelo menos 256 células cinzentas no fim. Nos 30 de 36 ataques em que a P6 eliminou a fazenda de 12, 28 terminaram com essa quantidade de cinzentas. Contra a fazenda de 66, os 28 ataques que a eliminaram terminaram assim. A extinção da colônia defensora mede perda de autoria, mas sozinha esconde o que ocupou a posição. [Contagens por par original](./contacts-retrospective.csv) · [Verificação contra o CSV do PR #9](./contacts-retrospective.mjs)

## O que é da física e o que é da autoria

Esfera F32, 10.242 posições. Cada trio mostra as contagens **atacante / defensor / neutras**. A economia é a mesma em todas as colunas.

| Gerações após lançar | Original | Herança do time | Bloqueio de nascimento misto |
|---:|---:|---:|---:|
| 0 | 9 / 12 / 0 | 9 / 12 / 0 | 9 / 12 / 0 |
| 6 | 9 / 12 / 2 | 9 / 14 / 0 | 9 / 12 / 0 |
| 36 | 0 / 0 / 152 | 105 / 47 / 0 | 3 / 12 / 0 |
| 144 | 0 / 0 / 1.189 | 836 / 353 / 0 | 3 / 12 / 0 |
| 512 | 0 / 0 / 3.768 | 2.381 / 1.387 / 0 | 3 / 12 / 0 |
| 1.024 | 0 / 0 / 3.761 | 2.205 / 1.633 / 0 | 3 / 12 / 0 |

Para isolar a física, desligamos a liquidação econômica durante a evolução em três controles. Com os dois carimbos do mesmo jogador, com jogadores rivais na regra original e com herança por time, os conjuntos de posições vivas foram **idênticos em todas as 1.025 fotografias consecutivas** de cada esfera F32, F96 e F320. A expansão já está no autômato. O cinza vem da autoria no primeiro empate e de como os descendentes herdam a facção neutra. Com liquidação, as despesas podem esgotar um jogador e provocar erosão. Na herança em F32 o atacante perdeu 284 células por insolvência até G1.024, explicando a divergência tardia entre as duas malhas.

Em F320, a mesma entrada chegou a **68.291 neutras** em G1.024 com a regra original. Com herança dos times e liquidação, foram 40.647 do atacante e 26.291 do defensor. Sozinha, a fazenda manteve 12. A nave sozinha entrou na vizinhança de um pentágono em G653 e apresentou a primeira divergência na população esperada de seu ciclo em G663, com uma célula viva a um passo do pentágono. Em G1.024 tinha 6.233 células do seu próprio time. No contato de dois times, a população cinzenta já tinha aparecido em G6. [Estados, erosão e assinaturas das trajetórias](./contacts-deep.csv)

## Impactos dirigidos em nove regras

Examinamos em F32 seis rotações e três desvios laterais. Usamos duas fases de lançamento da nave (a fase de catálogo e a fase seguinte, ambas compradas pela quantidade efetiva de células) e idades iniciais de 16 e 17 gerações para o defensor. Em B2/S245 entraram seis naves e quatro fazendas. As demais regras receberam duas naves leves e dois defensores, ou uma nave quando o catálogo só tinha uma. Os tiros apontam para a região da colônia. O campo estava livre na colocação, com o mesmo planeta, a mesma ancoragem e as tarifas de estabilidade em todos os pares. Oferecemos mais posições de B2/S245 para investigar a ocorrência descrita pelo jogador.

São **1.944 posições de teste**. Cada uma foi repetida com as três políticas e com dois controles isolados de nave e defensor nas posições correspondentes, totalizando 9.720 execuções curtas de 144 gerações depois do lançamento. O limiar de 256 assinala crescimento macroscópico nesta amostra. As contagens descrevem ataques propositadamente alinhados e padrões escolhidos, sem valor de estimativa da frequência em jogo aberto.

| Regra | Posições | Original com pico ≥256 cinzentas | Herança com pico ≥256 vivas | Defensor perdeu células com herança¹ | Defensor perdeu toda a população com herança¹ |
|---|---:|---:|---:|---:|---:|
| B2/S245H | 864 | 862 | 864 | 54 | 50 |
| Callahan | 144 | 0 | 0 | 84 | 0 |
| Bays B2/S35H | 144 | 0 | 0 | 129 | 63 |
| Hexagonal Life B2/S34H | 144 | 0 | 0 | 144 | 50 |
| Bays B245/S3H | 144 | 0 | 0 | 128 | 50 |
| Andreen | 144 | 0 | 0 | 112 | 44 |
| HighHexLife | 144 | 0 | 0 | 125 | 53 |
| Ashley 2015 | 72 | 0 | 0 | 44 | 16 |
| Ashley 2016 | 144 | 2 | 14 | 95 | 59 |

¹ Comparação com o mesmo defensor evoluindo sozinho. A perda da população no campo não implica eliminação do jogador se ainda houver reserva.

Em B2/S245, a política de herança eliminou o cinza nos 864 impactos, mas **todos os 864** ultrapassaram 256 vivas e a soma dos picos dos dois controles isolados. Na original, **851 de 864** terminaram tendo exclusivamente células neutras. O bloqueio protegeu todas as quatro fazendas de perder população após 144 gerações, embora 774 impactos ainda alcançassem pelo menos 256 células. Em 768 destes, o pico superou inclusive a soma dos picos isolados. Vedar nascimentos mistos altera o combate e também pode, por mudar a colisão, produzir mais crescimento. Em Ashley 2016, 24 posições cruzaram esse limiar com bloqueio, contra 14 com herança. [Contagens por regra e política](./contacts-summary.csv) · [Contagens por nave e alvo](./contacts-by-pair.csv)

## Reprodução

O ensaio longo contém 114 execuções. Em cada regra escolhemos, por critério declarado, a posição mediana e a máxima segundo o pico cinzento da política antiga no ensaio curto (desempate pela tupla de parâmetros). Repetimos cada posição até G1.024 nas três políticas e nos controles isolados. Acrescentamos o caso da fazenda em F32, F96 e F320 com os controles de autoria e liquidação. A tabela profunda identifica separadamente o desfecho de cada execução. A assinatura SHA-256 inclui a ocupação a cada geração, com o número de vivas e a geração delimitando cada conjunto.

Comandos a partir da raiz do projeto:

```sh
python3 experiments/conflict-survey/contacts-survey.py /tmp/hex-conflict-contacts 3
node experiments/conflict-survey/contacts-retrospective.mjs > experiments/conflict-survey/contacts-retrospective.csv
node experiments/conflict-survey/contacts.mjs replay hex-b2s245 legacy 32 1024 db-151 farm-4-12 0 -2 16 > experiments/conflict-survey/contacts-replay-data.js
```

O coletor salva as execuções individuais no diretório indicado, verifica a identidade das trajetórias físicas no caso controlado e escreve as tabelas do repositório. O replay usa estados amostrados diretamente do motor, com o índice de cada vértice compartilhado entre as três políticas.
