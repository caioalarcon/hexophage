# Mundo misto

[**Abrir a partida experimental**](index.html)

O carimbo identifica o desenho, a orientação, o autômato e o resolutor. Os descendentes herdam o dono, o autômato e o resolutor. Uma fazenda e uma nave de um único jogador podem seguir físicas diferentes e pagar tudo da mesma carteira. O seletor oferece os 409 desenhos do atlas e as nove físicas. Ao selecionar um desenho, a interface sugere sua física de origem. Você pode trocar o autômato antes de plantar e guardar a combinação no navegador.

## Experimentar

| Cenário | O que observar |
|---|---|
| Uma carteira, duas físicas | Uma fazenda B2/S245 mantém a alternância de um oscilador Bays na outra região do planeta. |
| Glider × crescedor | Uma nave de Bays em travessia entra no crescedor material de Callahan. A preferência de fase vem ligada neste cenário. |
| Patrulha orbital | Um Slider Ashley pode dar a volta ao planeta passando por quatro fazendas. O botão de avanço completa uma volta. Desligue a fazenda do lançador ou mude o preço por corte e reinicie para repetir o trajeto. |
| Antimatéria × fazenda | Um projétil P6 tenta detonar contra um núcleo de Bays. A carteira da facção financia cada passo da reação. |
| Financiar e reconstruir | Duas fazendas do lançador têm idades e físicas diferentes. Compare o piso de proteção de 12 maduras com zero para ver quais estruturas continuam pagando renda depois da explosão. |
| O último a ser engolido | Três jogadores em F16. Compare 16 mil com 1 milhão de créditos para o lançador. Observar até o fim permite continuar vendo a onda depois que sobra uma única colônia. |
| Duelo de carteiras / Mundo vazio | Jogue localmente, contra um piloto ou com dois pilotos. No planeta pequeno, clique na faixa de navegação para escolher a região e diretamente no campo para plantar. |

Os preços e a condição de vitória se aplicam em **Iniciar cenário**. Controles de dois e três jogadores usam a mesma regra de cobrança. A cor do corpo identifica o dono. O violeta identifica a onda e o contorno conserva a cor do patrocinador. O mapa do planeta registra todos os locais por onde a onda já passou.

## Precedência na mesma geração

1. Cada sítio lê os vizinhos do instante anterior. Uma residente testa sobrevivência com sua própria tabela, orientada pelos cinco ou seis vizinhos reais do sítio. Para nascimento, cada tipo com pelo menos um pai local pode apresentar uma proposta sob sua própria física. Em contato e guarda, a máscara inclui os vizinhos materiais. A travessia lê apenas a sua linhagem e se mantém invisível aos tipos materiais até uma disputa de espaço.
2. Uma residente material que sobrevive mantém seu lugar contra nascimentos materiais. Uma fase pode sobrescrever uma inimiga. A guarda que sobrevive e tem pelo menos dois apoios de sua linhagem resiste à travessia. Na onda, penetrar essa guarda custa o multiplicador configurado. A travessia preserva aliados. A onda pode atingir ambos os lados.
3. Em um lugar vazio, propostas concorrentes são ordenadas pelo apoio de pais do próprio tipo. Em igualdade vale um desempate reproduzível pelos sítios da malha, semente e geração. Em **Preferência à travessia**, a fase passa à frente na disputa desse lugar. Ambos os modos ficam disponíveis porque a trajetória literal de um glider exige uma escolha até mesmo quando duas linhagens tentam nascer no mesmo vazio.
4. A carteira recebe a renda das células maduras e financia as propostas em ordem geométrica reproduzível. Sem saldo para nascimento e eventual substituição, a proposta perde a vez. Nunca se dá prioridade pelo número do jogador ou pela ordem de inserção dos carimbos. A célula residente segue seu destino físico quando nenhuma proposta financiada a substitui.

O estopim da antimatéria é explícito. O primeiro contato do grupo conectado com um inimigo ou com outro tipo aliado consome o portador e tenta formar um triângulo B2/S245. Depois do gatilho, a tabela nativa determina os nascimentos e sobrevivências. O registro distingue tentativa de ignição, células de onda, cortes pagos, liquidação e área atingida. Fragmentos desconectados podem detonar separadamente. Mortes naturais após a perda de vizinhos aparecem nos replays, mas não são cobradas como cortes diretos.

## Qual regra usar no jogo?

**Para o combate, usaria a travessia literal como capacidade comprada e a guarda como resposta visível.** Nas 72 pistas de controle com caixa amplo, a nave reproduziu exatamente sua trajetória solitária contra matéria comum. Para a arma orbital, o preço de 24 por baixa permitiu seis voltas pagas com renda externa. O preço de equilíbrio nessa órbita específica é aproximadamente 66,67 por corte. Ele depende da renda, do consumo da nave e da densidade de alvos. Destruir a fazenda financiadora também interrompe o ataque. [Duelos, órbita e carteira compartilhada](DUELS.md)

**Para a vitória, escolheria a última colônia convencional.** A onda continua sob responsabilidade do lançador e pode atingir suas próprias estruturas. No cenário de 1 milhão, a terceira facção é a última a ter células convencionais. A contagem que inclui a onda dá a vitória ao lançador, embora ele mesmo vá à falência. O critério financeiro, por sua vez, deixa os dois outros jogadores com saldo para reentrar no mapa. **Último solvente** e **Observar até o fim** estão disponíveis para inspecionar os desfechos. [Explosão e cobertura da esfera](blast.md)

A comparação de Condorcet usa o resultado pareado de cada pista como voto e trata empates explicitamente. O vencedor muda quando se compara território ou reserva e quando se muda a tarifa. A referência matemática usa preferências estritas; aqui a distinção entre maioria dos votos decididos e maioria absoluta de todas as pistas importa. [Matrizes e denominadores](DUELS.md) · [Definição de Condorcet em Sauermann, 2022](https://arxiv.org/abs/2203.13713)

## Execução

O modo usa as malhas, as tabelas físicas e o atlas de Hexophage. Tem um motor esparso próprio para múltiplas linhagens e pilotos experimentais com projeção local. A partida de física única e os aprendizes do outro modo continuam disponíveis no menu principal. O HTML misto funciona inclusive aberto como arquivo offline.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

O estudo de colisões fornece os comandos para regenerar a liga e as tabelas econômicas. O [relatório de pilotos](PILOTS.md) compara a decisão automática com replays em que o bot guarda o dinheiro. O de antimatéria inclui os cenários com carteiras, controles de trajetória e a figura medida no planeta. Os pilotos podem ser reproduzidos com o [runner de partidas](pilot-survey.mjs).
