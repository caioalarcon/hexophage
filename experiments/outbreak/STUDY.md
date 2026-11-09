# Contenção de expansões no Hexophage

Na esfera F320, uma nave P6 de nove células contra a fazenda 4 → 12 em B2/S245 acabava com **66.938 células vivas em G+1.024**, todas com dono. Com o mesmo lançamento e herança por time, a contenção em 384 nascimentos simultâneos deixou duas células em G+100, G+1.024 e G+4.096. Os bots ficaram desligados nas duas partidas. O contador de área acumulada também caiu, de 184.260 posições já visitadas em G+1.024 para 1.790 na partida com contenção. [Execuções no motor esférico](./deep-cases.csv)

O pico contido nessa posição foi 663 células em G+98. A reação principal havia se extinguido na G+100. Na esfera F32, o mesmo choque subiu a 660 em G+99 e zerou o campo em G+100. No limite mais baixo, de 96 nascimentos, as três esferas F32, F96 e F320 atingiram o pico de 137 e ficaram vazias em G+34.

## O que ocorre com a mancha que já existe

Plantamos também uma fazenda estável de 12 células do outro lado de F320. Mantivemos o crescimento clássico até G+512 e só então ativamos a contenção de 384 durante a partida. Nas contagens abaixo o tempo é medido desde o lançamento da nave. Os três participantes pagaram os carimbos.

| Geração | Vivas na esfera |
|---:|---:|
| +512, antes da alteração | 17.237 |
| +513 | 22 |
| +1.024 | 12 |
| +2.048 | 12 |

As últimas 12 eram as mesmas posições da fazenda remota, ainda com seu proprietário original. Uma reação próxima pode atingir uma estrutura fisicamente ligada à frente de expansão. [Ensaio de troca ao vivo](./deep-cases.csv)

## Contatos em nove regras

Repetimos as 1.944 posições válidas do estudo de colisões anterior. Cada par de carimbos, fase, orientação, posição, intervalo de abertura, política econômica de estabilidade e regra de herança foi igual nas duas versões. A evolução original correu até G+144, a contida até G+1.024.

Em B2/S245, **864 de 864** posições tinham pelo menos 256 células na G+144 com crescimento clássico. Com contenção, **55 de 864** ainda estavam acima desse patamar na G+144. Em nenhuma das 864 houve novamente um campo de 256 células depois da G+558, mesmo estendendo cada simulação até G+16.384. No fim, 654 estavam vazias e as outras 210 tinham de uma a 14 células. Há um intervalo entre o choque, o crescimento e o disparo da contenção. O maior pico transitório foi de 1.338 células.

Repetimos em F320 as 24 combinações das seis naves e quatro fazendas, com uma orientação, fase e desvio lateral por combinação. O pico entre as 24 foi de 1.542 vivas, aproximadamente 0,15% das 1.024.002 posições do planeta. Em G+4.096, 21 campos estavam vazios e os três restantes tinham até duas células. Essas são geometrias dirigidas de colisão. [Endurance F32 e F320](./endurance.csv) · [Resultados nas nove regras](./contacts-summary.csv)

O número de posições visitadas é a união de todas as posições que já estiveram vivas. O pico de população mede um único instante. Por exemplo, em Ashley 2016 uma posição de teste chegou a visitar 9.481 sítios distintos de F32 ao longo de 1.024 gerações. O maior pico entre todos os 144 casos dessa regra foi 671 vivos simultâneos. Um projétil móvel pode visitar grande parte de um planeta.

## Integridade dos carimbos

Simulamos cada um dos 409 carimbos isoladamente no plano e comparamos todas as posições vivas e suas idades **em cada geração até G1.024**. No limiar 384, os 409 tiveram trajetórias idênticas ao autômato clássico. O número total de nascimentos num passo isolado chegou a 2.400 em Ashley 2016, distribuídos entre reações separadas.

No limiar 96, 399 dos 409 mantiveram trajetória idêntica. Os dez afetados foram duas formações de Bays, uma nave de Hexagonal Life, duas naves de B2/S245 e cinco formações de HighHexLife. Os oito carimbos de Ashley 2015, inclusive o puffer de cinco células e o rotor P126, passaram no limiar baixo também. [Inventário por regra e limiar](./atlas-summary.csv)

Nas esferas também lançamos o puffer de Ashley 2015 sem adversário, em espaço livre. Nas duas versões, a partida F320 atingiu o pico de 128 e terminou com 86 vivas e 3.011 posições visitadas na G+1.024. O pico em F32 foi 42, com oito vivas no final. A disposição na esfera e os encontros posteriores podem mudar o futuro mesmo de um padrão cuja trajetória no plano foi validada.

## Puffer de Ashley 2015 e verificação no navegador

Também lançamos o puffer de cinco células contra **cada um dos oito carimbos de Ashley 2015** em F32, com nascimentos remunerados, seis orientações, três pistas e duas idades do alvo. Em 263 dos 288 lançamentos houve adjacência entre os times. O maior pico das 512 gerações foi de 105 células. As contagens de pico e de campo final foram idênticas com crescimento livre e com contenção a 384. O recorte da captura do jogador não exibe a regra nem a sequência de carimbos, portanto não identifica por si só qual delas formou a mancha. [Comparação por lançamento](./puffer-contacts.csv)

O [replay sincronizado](../conflict-survey/replay.html?comparison=growth) mostra a nave P6 e a fazenda em três condições, todas com herança por time. O terceiro mundo começa em crescimento livre e passa a conter surtos imediatamente após G+144. Conferimos a mesma operação na interface real de Chromium. Ativar contenção preservou a geração, as reservas e as 1.189 células existentes. No passo seguinte restaram três. O aviso no mapa registra a geração e informa quantos nascimentos foram impedidos e quantos sobreviventes do foco foram removidos.

## Reprodução

As amostras da esfera usam os carimbos pagos, herança, liquidação, erosão e transferências do jogo. Em cada ensaio o relógio inicia logo após o disparo. Os dados brutos em JSONL permitem verificar cada posição. Aumentar o segundo argumento executa mais processos em paralelo.

```sh
python3 experiments/outbreak/study.py /tmp/hex-outbreak-study 3
```

Para refazer um único choque, os cinco últimos argumentos são o projétil, o alvo, a rotação, o desvio de pista e as gerações de preparação do alvo.

```sh
node experiments/outbreak/study.mjs case hex-b2s245 320 4096 contained 384 db-151 farm-4-12 0 -2 16
node experiments/outbreak/study.mjs case hex-b2s245 320 1024 classic 384 db-151 farm-4-12 0 -2 16
node experiments/outbreak/study.mjs rescue hex-b2s245 320 2048 contained 384 db-151 farm-4-12 0 -2 16 512
```

O replay e a série de impactos do puffer usam o motor do repositório.

```sh
node experiments/outbreak/replay.mjs
node experiments/outbreak/puffer-contacts.mjs classic
node experiments/outbreak/puffer-contacts.mjs contained
```
