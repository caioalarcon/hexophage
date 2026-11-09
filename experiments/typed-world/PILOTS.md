# Aprendizes e combates no mundo misto

Na semente 8221 em F16, Jade comprou padrões de Ashley 2016 e B2/S245, escolheu travessia em uma compra, fez oito cortes diretos e ficou com a última colônia em G2851. Cada lado fez seis compras além da fazenda inicial. Jade ainda tinha 564 células e 29.447,19 créditos. A prévia executa a mesma partida do CSV, geração por geração. O teste de navegador reproduz o instante da vitória, as compras e os cortes. [Abrir a partida](index.html?scene=arena&bots=tactical&seed=8221&f=16) · [Inverter os controladores entre assentos](index.html?scene=arena&bots=tactical&seed=8221&f=16&swap=1)

## O controlador do PR #10

Os dois lados usam o `createThinkingStrategy` do [PR #10](https://github.com/caioalarcon/hexophage/pull/10). Ele consulta o catálogo, estima retorno, reconhece setores e rivais, testa propostas de compra contra espera, procura fases de ataque e recebe observações da partida após comprar. Cada jogador compartilha o dinheiro, a posição em campo e o intervalo mínimo de dez gerações entre seus catálogos. A memória começa vazia em cada partida. O adaptador associa os assentos internos 2/3 do controlador a Jade/Cobre.

O controlador original prevê uma física por vez. Cada catálogo dispõe de uma instância desse planejador, observando a mesma ocupação, propriedade e idade da esfera. O orçamento total de reposição é de 768 visitas por geração, dividido igualmente entre as instâncias; cada uma conserva a capacidade de acumulação nativa. No braço **contato** o pedido aprovado vai direto ao motor misto. No braço **escolha de resolução** essa mesma proposta de padrão, local e orientação ganha uma avaliação adicional contra esperar. O agente simula 48 gerações em um disco de 12 passos, compara contato, travessia, guarda e antimatéria, e aceita somente uma melhoria financiável. Ele estima o retorno com o saldo no horizonte e 96 gerações projetadas pela média das oito últimas. Em igualdade preserva a primeira opção, contato. Se a geometria exceder o disco, mantém a proposta de contato já aprovada. As trajetórias privadas de uma única regra podem descartar uma proposta antes da avaliação mista. O ensaio mede esse adaptador e seu orçamento adicional de previsão. [Adaptador dos aprendizes](pr10-controller.mjs) · [Runner](pr10-pilots.mjs)

As partidas começam com 2.400 créditos por lado, antes de pagar a mesma fazenda material com guarda B2/S245. As 12 sementes foram jogadas nos dois sentidos em F16 e F32. Cada confronto termina com a última colônia convencional ou fica aberto em G4096. Os dois tamanhos e os dois assentos repetem as mesmas sementes.

| Quatro catálogos ativos | Vitórias com escolha | Vitórias com contato | Abertos em G4096 |
|---|---:|---:|---:|
| F16, 2.562 sítios | 11 | 7 | 6 |
| F32, 10.242 sítios | 3 | 3 | 18 |
| Total | 14 | 10 | 24 |

Nos quatro catálogos de Callahan, Bays, B2/S245 e Ashley 2016, o controlador concluiu 4.326 testes locais, 1.291 comparações de propostas, 141 testes de fase e 423 conferências de previsões com o campo. Fez 484 compras, incluindo 35 dirigidas contra rival. Em 12 partidas **ambos** compraram carimbos de pelo menos duas físicas além da fazenda inicial. A escolha adicional autorizou 229 compras e vetou 22. Em 12 compras escolheu travessia. As 217 restantes foram de contato. Guarda e antimatéria receberam zero compras espontâneas. O braço de contato fez 255 compras. Todos os oito cortes diretos ocorreram em uma única partida. Nos 24 jogos abertos, o braço com escolha liderava em reserva em 10 e em população em 11, com um empate populacional. [Resultados por partida](pr10-pilots.csv)

Como controle de sensibilidade, repetimos o confronto com apenas os catálogos de Callahan e Bays nas mãos dos aprendizes e a mesma fazenda fundadora. Foram 122 compras e 26 ataques dirigidos em 48 jogos. Cada braço venceu 11 e 26 ficaram abertos. Em nenhum dos 24 pares a inversão do braço alterou o assento vencedor ou o desfecho aberto. Ao distribuir o mesmo orçamento de reposição entre quatro catálogos, a diferença de 14 a 10 apareceu inteiramente em F16. As batalhas não demonstram um resolvedor universal, nem permitem atribuir essa diferença somente à travessia. A camada adicional também pode vetar compras. [Controle com dois catálogos](pr10-two-rules.csv)

## Pilotos da arena experimental

O controle **Bot × bot** usa uma busca própria, capaz de prever diretamente as colisões tipadas. A cada 32 gerações ela avalia até duas fazendas e, havendo rival, um lançamento com quatro resolvedores. O estudo compara três formas de pontuar a previsão. O piloto por **inventário** conta caixa e valor das células após 16 gerações. O de **fluxo** compara retorno operacional local mais caixa. O **limitado pela borda** encerra a extrapolação quando ação e espera divergem no contorno observado. O piloto de fluxo é o padrão desse controle. [Piloto](pilots.mjs) · [Protocolo e critérios](pilot-survey.mjs)

São 336 partidas até G512, em 12 sementes, duas esferas, dois modos de precedência e sete pareamentos de pilotos. As medidas abaixo vêm de 48 partidas por linha, disputadas contra o mesmo tipo de piloto. O replay reconstrói a primeira compra dirigida e a compara com esperar na esfera completa, sem novas ordens, por 96 gerações. Mede a variação de caixa relativa entre atacante e alvo. A coluna de partidas decididas usa a última colônia convencional.

| Piloto contra si mesmo | Compras | Ataques dirigidos | Detonações | Partidas decididas | Ataques com melhora relativa no replay |
|---|---:|---:|---:|---:|---:|
| Inventário | 566 | 61 | 3 | 16/48 | 26/36 |
| Fluxo | 357 | 124 | 8 | 23/48 | 40/48 |
| Limitado pela borda | 306 | 111 | 4 | 35/48 | 46/46 |

Na comparação direta, fluxo venceu inventário por **18 a 8**, com 70 jogos abertos. No bloco de quatro sementes reservadas foram 3 a 2 e 27 abertos. O piloto limitado pela borda perdeu para inventário por 8 a 39, com 49 abertos, apesar do resultado favorável de seus primeiros ataques nos replays. A qualidade econômica de um ataque isolado e a sobrevivência da colônia medem efeitos diferentes. [336 resultados e replays](pilots.csv)

## Reprodução

Na raiz do repositório, com Node 24 e dependências instaladas, os comandos imprimem CSV no terminal. A ordem de argumentos do estudo nativo é sementes, frequências da esfera, horizonte e quantidade de catálogos. Na prévia ao vivo, **+256** avança o mesmo relógio dos bots e **Gastos e receitas** expõe as carteiras.

```sh
node experiments/typed-world/pr10-pilots.mjs
node experiments/typed-world/pr10-pilots.mjs 7,41,109,1549,953,2933,6389,10487,577,1723,4733,8221 16,32 4096 2
node experiments/typed-world/pilot-survey.mjs all 4
```
