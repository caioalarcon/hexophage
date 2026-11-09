# Naves hexagonais, emissores e censo de sementes

## Índice de 668 naves

O arquivo de vizinhança hexagonal de raio 1 reúne 668 registros. Cada registro dá a regra mínima e a máxima que preservam a trajetória inteira da nave. Os conjuntos de nascimentos e de sobrevivências da regra candidata precisam estar contidos nesses intervalos, separadamente. A autoria, o número de linha, o período e a geometria permanecem rastreáveis em cada entrada. [Banco de Jed Lim, revisão utilizada](https://github.com/jedlimlx/HROT-Glider-DB/blob/6ff5015438270079760513b278b607e3a06613f3/R1-C2-NH-gliders.db.txt) · [Atualização original de Dmitry Maitak / May13](https://conwaylife.com/forums/viewtopic.php?start=50&t=3670)

| Regra | Registros compatíveis | Naves adicionadas além de Bays e Bagley |
|---|---:|---:|
| B25/S34H · HighHexLife | 16 | 16 |
| B2/S245H | 12 | 12 |
| B2/S34H | 7 | 7 |
| B2/S35H · Bays | 4 | 3 |
| B245/S3H · Bays | 3 | 2 |

HighHexLife e B2/S245H ocupam os dois primeiros lugares quando se enumeram os intervalos dessas 668 naves e se selecionam regras sem B0 e B1. A tabela conta compatibilidades por regra. Uma nave pode ocorrer em várias linhas. Foram descartadas repetições por fase, rotação, reflexão e translação dentro de cada regra. Os dois registros já presentes eram o glider Bays P5 e a nave Bays P10 de Bagley. A regra B2/S245H oferece desde uma nave P6 de 9 células até a nave P5 de 561 células.

Para conferir ou consultar outra regra, salve o arquivo bruto da revisão indicada e execute na raiz do projeto.

```sh
node experiments/rule-survey/ship-db.mjs R1-C2-NH-gliders.db.txt B25/S34
node --test experiments/rule-survey/ships.test.mjs
```

O primeiro comando verifica o SHA-256 do arquivo e reproduz cada trajetória selecionada no motor planar de produção. A conversão do vetor publicado para os eixos do jogo é `(dx + dy, -dy)`. O segundo mede a primeira recorrência por translação, nascimentos, mortes e núcleo fixo de cada carimbo periódico. Também testa os dois emissores Ashley 2016 e a trilha do puffer Ashley 2015. O puffer HighHexLife de 23 células publicado por Peter Naszvadi deixa quatro osciladores P2 de duas células a cada 40 passos nas janelas verificadas. [Registro do puffer](https://conwaylife.com/forums/viewtopic.php?p=162920)

## As duas regras estudadas por Gwylim Ashley

Em 2015, Ashley descreveu a regra **2b/2ab**, em notação própria de sobrevivência/nascimento. Na notação do jogo é B2/S2opH. O catálogo inclui a nave de período 3 e uma reconstrução do rotor de cinco células que retorna à orientação inicial após 126 gerações. O rotor tem 918 nascimentos e 918 mortes por ciclo. Uma busca por precursores recuperou um puffer de cinco células. A cada 30 gerações desde a geração 60, o estado anterior transladado por (20, −10) está contido no novo, restando o mesmo depósito de quatro células que oscila com período 2. O teste reproduz cinco desses intervalos. [Descrição de Ashley de 2015](https://gwyl.im/2015-11-22-hexagonal-life/index.html)

Em 2016, a regra **24a/256c** é B2o3m56/S2om4oH. O catálogo inclui as naves Hawk P3 e Slider P4, o oscilador Sprawler P30 e seu precursor de quatro células. O precursor e o oscilador têm carimbos próprios porque diferem em custo e evolução inicial. O canhão P9 nasce de um triângulo de três células e envia Hawks em três direções. O canhão P110 devolve a configuração de sua base e envia um Slider. Os dois carimbos de Fly Puffers paralelos reproduzem espaçamentos que suprimem depósitos em diferentes trilhas. [Ashley, descrição de 2016](https://gwyl.im/2016-12-17-more-hexagonal-life/) · [RLEs, nomes e tabela de transição publicados pelos autores](https://conwaylife.com/forums/viewtopic.php?p=29296)

Os registros marcados **Hexophage · censo de sementes** são resultados locais. Foram examinadas sementes pseudoaleatórias a partir do estado 39417, em quadrados de coordenadas axiais com lado de 3 a 7 e densidade de 25%. Foram 800 sementes na regra Ashley 2016, 7.000 na Ashley 2015, 1.000 em HighHexLife e 1.500 em B2/S245H. Componentes extraídos durante a evolução foram simulados isoladamente por até 140 gerações para detectar recorrências exatas. Foram removidas fases e simetrias duplicadas e combinações separáveis detectadas, privilegiando formas compactas. Os P126 e o puffer Ashley 2015 vieram de buscas dirigidas adicionais. O arquivo de carimbos preserva a geometria exata de cada resultado para reprodução.

## Precursores econômicos em B2/S245H

Depois de encontrar a estrutura estável de 12 células, a busca testou sementes com simetria de rotação, famílias triangulares e configurações compactas. Cada linha abaixo produz uma única formação conectada. Para algumas delas, a semente começa com partes separadas que interagem durante o crescimento. O teste verifica que a configuração estabilizada é idêntica após uma aplicação da regra. Isso certifica a permanência em isolamento.

| Células compradas | Células fixas | Geração da estabilização | Nascimentos até lá | Renda madura isolada por geração | Geração em que recupera o custo |
|---:|---:|---:|---:|---:|---:|
| 4 | 12 | 2 | 12 | 0,23964 | 167.223 |
| 9 | 30 | 5 | 66 | 0,59776 | 150.932 |
| 10 | 36 | 3 | 33 | 0,71677 | 139.816 |
| 18 | 66 | 4 | 102 | 1,30920 | 137.824 |

O retorno usa os preços de produção e a economia de estabilidade, com 10.000 por célula carimbada, 1 por nascimento, maturidade aos 256 passos e saturação em 8.000 células maduras do mesmo dono. O cálculo evolui as idades até toda a formação amadurecer e então prolonga a renda constante até cobrir a colocação e o custo dos nascimentos. Ataques e a saturação por outras formações do mesmo dono mudam esse prazo.

`node experiments/rule-survey/mine-farms.mjs` reproduz a busca em torno da mesma família de sementes e imprime suas coordenadas axiais, população final, tempo de estabilização e nascimentos. A relação entre células compradas e população final considera somente os candidatos explorados.
