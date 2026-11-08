# Ritmo observado em jogos de estratégia

O indicador mais próximo de um carimbo economicamente relevante que conseguimos extrair de *Age of Empires II* foi o aparecimento de uma instalação ou a conclusão de uma pesquisa. Em uma amostra de jogadores de alto nível, a mediana foi de **1,72 desses eventos por jogador por minuto real equivalente**. Ao incluir fazendas e casas, subiu para **2,90**. As duas definições oferecem referências de escala para uma busca de parâmetros.

## Ações e investimentos

| Jogo e coorte | Indicador por jogador | Média/min | Mediana/min | Relógio |
|---|---|---:|---:|---|
| AoE II DE, 100 partidas de elite em Arabia | Novos locais de instalações, excluindo casas, fazendas e muralhas | 1,12 | 1,00 | Real equivalente |
| Mesma amostra | Avanços do contador de pesquisas | 0,79 | 0,79 | Real equivalente |
| Mesma amostra | Instalações + pesquisas | 1,91 | 1,72 | Real equivalente |
| Mesma amostra | Locais de construções com casas e fazendas + pesquisas | 2,98 | 2,90 | Real equivalente |
| AoE II DE, estudo de 12.800 replays, Elo 1.000–1.199 | Ordens úteis segundo o filtro do autor | — | 18 em jogo ≈ 30,6 reais | Jogo a 1,7× |
| Mesmo estudo, Elo 2.000–2.199 | Ordens úteis | — | 36 em jogo ≈ 61,2 reais | Jogo a 1,7× |
| StarCraft II, SkillCraft, 3.395 observações | APM conforme o dataset | 117,05 | 108,01 | APM do estudo |
| Mesma amostra | Ciclos de percepção/ação | 18,39 | 18,03 | Real equivalente |
| Mesma amostra | Trabalhadores treinados | 5,48 | 4,81 | Real equivalente |

O estudo do AoE Buddy informa 1,9 e 5,8 ordens de combate por minuto **de jogo**, respectivamente, nesses dois estratos de Elo. Mover, formar, atacar e pesquisar são usos diferentes da atenção. Um carimbo de gun pode continuar produzindo naves e efeitos sobre o adversário por muitos minutos após uma única ordem. No StarCraft II, os autores encontram, em média, 5,27 ações por ciclo de percepção/ação. Esse ciclo é definido pela atividade durante uma fixação da câmera e também pode conter execução repetitiva. [AoE Buddy, metodologia e estratos](https://aoebuddy.com/studies/your-replay-knows-your-elo) · [Thompson et al., estudo e métricas](https://pmc.ncbi.nlm.nih.gov/articles/PMC3776738/) · [SkillCraft, dados e unidades](https://archive.ics.uci.edu/dataset/272/skillcraft1+master+table+dataset)

Em SkillCraft, as medianas de APM são 54,05 na Bronze (167 registros), 85,96 na Gold (553), 126,01 na Diamond (806) e 274,34 nos profissionais (55). As medianas de trabalhadores treinados por minuto real equivalente nesses quatro grupos são 2,93, 4,29, 5,41 e 5,05. A diferença no volume de comandos entre Diamond e profissional é muito maior que a diferença na produção desses trabalhadores.

## Ritmo dentro da partida de AoE II

Estimativa própria a partir dos quatro arquivos do conjunto AoE Rec Info. São 100 replays distintos, 200 observações jogador-partida e 53 nomes de jogador. A duração média até a última amostra foi de **21,86 minutos**, mediana **22,20**, intervalo central de 80% **11,91–31,73**. Os relógios originais estão em milissegundos de jogo. Todas as estimativas reais para esse conjunto dividem o tempo de jogo por 1,7, velocidade Normal, sem estimar pausas externas. O repositório não registra a velocidade individual. [AoE Rec Info, dados e esquema fixados no commit](https://github.com/aoerecinfo/aoe2dataset/tree/753b3cd151a42fb7e6a1da20a7b936a4e2dc0293) · [Referência de velocidade](https://aoebuddy.com/studies/your-replay-knows-your-elo)

| Minutos reais equivalentes | Observações jogador-partida que alcançam o fim do intervalo | Instalações + pesquisas/min, mediana | Incluindo casas e fazendas/min, mediana |
|---|---:|---:|---:|
| 0–5 | 200 | 0,8 | 1,6 |
| 5–10 | 190 | 1,8 | 2,8 |
| 10–15 | 156 | 2,2 | 3,2 |
| 15–20 | 118 | 2,2 | 3,4 |
| 20–25 | 66 | 3,7 | 5,3 |
| 25–30 | 28 | 4,0 | 5,4 |

- **Distribuição entre jogadores e partidas.** Para instalações + pesquisas, P25–P75 foi 1,40–2,38/min e P10–P90 foi 1,24–2,82/min. Para a definição incluindo casas e fazendas, P25–P75 foi 2,35–3,56/min. Os estratos tardios da tabela incluem somente os jogos que chegaram àquele ponto.
- **Intervalos entre observações de investimento.** Em 6.743 intervalos de tempo positivos entre snapshots com uma ou mais instalações/pesquisas por jogador, a mediana foi 24,39 s e P90 foi 77,54 s. Incluindo casas e fazendas, mediana e P90 foram 23,68 s e 60,19 s. Ao restringir a instalações, foram 37,33 s e 109,89 s. Como os snapshots são espaçados em aproximadamente 20 s de jogo (12 s reais), diversos investimentos na mesma janela ficam agrupados. Um intervalo sem investimento pode incluir combate, reposicionamento de aldeões e exploração.
- **Marcos.** A primeira instalação observada ocorreu em mediana aos 99 s. Entre quem atingiu cada marco, a mediana da Feudal foi 6,07 min (200/200), a primeira contagem positiva de abates 7,32 min (198/200), a Castle 12,43 min (170/200) e a Imperial 22,12 min (81/200). Um abate surge depois de avistar um adversário e depende da interação com ele.
- **Liquidez.** Aos 10, 15 e 20 min, a mediana de recursos guardados equivalia a 0,884, 0,545 e 0,610 minuto, respectivamente, do ritmo bruto de coleta dos cinco minutos anteriores. Aos 15 min a metade central ficou entre 0,396 e 0,731 minuto, ou 24–44 s. A medida soma comida, madeira, ouro e pedra a peso unitário. O preço e a utilidade de cada recurso dependem da compra pretendida. Em Hexophage uma métrica paralela é quanto tempo de produção **bruta** está na reserva, e quantos flippers ou guns aquela reserva realmente compra.

O extrator registra a primeira aparição de uma nova posição ocupada por uma classe de construção concluída, ignorando construções iniciais. Exclui fundações, muralhas, portões, projéteis, ruínas e componentes duplicados de centros urbanos. Reutilização do mesmo local pela mesma classe, replantio, obras abandonadas e construções que desaparecem entre amostras podem escapar. Usa avanços do contador total de pesquisas, que pode incluir efeitos concedidos automaticamente. Assim se medem resultados observáveis da economia. Não se identifica o instante do clique, a intenção, o melhor lance, nem o número de alternativas que o jogador ponderou.

## Duração de uma temporada de Age of Empires IV

Reprocessamento do dump integral **RM 1v1, temporada 13**, publicado pelo AoE4 World. Todas as 1.597.096 linhas têm game ID distinto e duração positiva. Os jogos começaram entre 7 de maio e 31 de agosto de 2026. Usamos os segundos do campo `duration` como publicados. [Arquivo Games — RM 1v1 — Season 13](https://aoe4world.com/dumps)

| Distribuição | Resultado |
|---|---:|
| Duração média | 25 min 27 s |
| Mediana | 23 min 57 s |
| P25–P75 | 16 min 48 s–32 min 19 s |
| P90 | 41 min 40 s |
| 30 min ou mais | 30,8716% |
| 45 min ou mais | 7,1620% |
| 60 min ou mais | 1,7641% |
| 90 min ou mais | 0,1839% |
| 120 min ou mais | 0,0373% |

Incluímos durações muito curtas para evitar escolher o resultado pelo corte. Com um corte de cinco minutos restam 1.515.228 jogos, mediana de 24 min 41 s e P90 de 42 min 11 s. O máximo bruto é 3.282 min, o que recomenda cautela com registros extremos, desconexões e jogos ociosos. O modo é duelo ranqueado. Batalhas de equipe, partidas livres e servidores persistentes têm objetivos distintos.

## O que faz duas moedas criarem uma escolha

A Blizzard explica que tirar trabalhadores da coleta de minerais para acumular gás cedo reduz os recursos disponíveis para mais drones e para a defesa. A equipe de *Age of Empires IV* descreve um ajuste em partidas navais. Passou a cobrar comida por certas unidades para ampliar a demanda concorrente por esse recurso. Em Hexophage, a comparação sugere medir quantos carimbos ou quanta defesa precisam ser adiados para manter mais células fixas gerando mana. Se tal adiamento for desprezível, adicionar uma segunda moeda pode preservar a mesma corrida por produção ilimitada. [Blizzard, economia Zerg](https://news.blizzard.com/en-us/article/5838583/game-guide-zerg-economy) · [World’s Edge, revisão de custos navais](https://www.ageofempires.com/news/age_of_empires_iv_update_24916_season3/)

## O contraste com Ikariam

Em *Ikariam*, a Gameforge publica tempos de 25 s para a academia no nível 1, 22 min 34 s no nível 2 e 1 h 31 min no nível 8. Segundo a desenvolvedora, processos de construção e pesquisa seguem em tempo real e sessões diárias curtas podem bastar. Esse exemplo dá uma escala concreta à ideia de voltar amanhã. Em um duelo, conta quanto terreno, pressão militar ou capacidade de resposta o jogador perde enquanto se ausenta. A duração total da partida por si só não mede isso. [Gameforge, tempos por nível](https://gameforge.com/en-GB/games/ikariam-basic-knowledge-game-start.html) · [Gameforge, duração das sessões](https://gameforge.com/en-GB/games/ikariam-what-is-that.html)

## Reprodução

`benchmarks.py` requer apenas Python 3.10+ e aceita cada fonte separadamente. `benchmarks.json` contém os resumos numéricos, incluindo os denominadores. Nenhum replay ou identificador de jogador é distribuído aqui.

```sh
git clone https://github.com/aoerecinfo/aoe2dataset /tmp/aoe2dataset
git -C /tmp/aoe2dataset checkout 753b3cd151a42fb7e6a1da20a7b936a4e2dc0293
curl -fL 'https://archive.ics.uci.edu/static/public/272/skillcraft1+master+table+dataset.zip' -o /tmp/skillcraft.zip
# Na página de dumps do AoE4 World, baixe Games - RM 1v1 - Season 13.
python experiments/pacing/benchmarks.py \
  --aoe2 /tmp/aoe2dataset/dataset/v1/1v1_arabia_top_players \
  --skillcraft /tmp/skillcraft.zip --aoe4 /tmp/games_rm_1v1_s13.json.gz
```

SHA-256 do zip SkillCraft `d6f4f88c2d077a0938cf774ff242df511c9a5801dcc66e4461ffdf893ce23fc2`. SHA-256 do gzip AoE4 `e632d458ca7537936e563facca0a7168208c7befbfd6fc2525f51e396eb075e1`. Conversão SkillCraft de taxas por timestamp para taxas por minuto real usa 88,5 × 60, conforme a documentação dos autores no modo Faster. [Autores e licença CC BY 4.0](https://doi.org/10.24432/C5161N)
