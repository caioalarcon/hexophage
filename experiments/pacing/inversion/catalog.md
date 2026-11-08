# Quem financia o jogo com a economia invertida?

Com a idade padrão de duas gerações, a troca direta dos sinais transforma **137 das 160 sementes** em fontes de saldo constante positivo. O crescedor é a única das 160 cujo saldo por geração cresce com a própria idade no ensaio isolado. Um oscilador lucrativo também pode financiar cópias sucessivas. O crescimento de sua produção agregada vem das carimbadas do jogador.

## O que foi contado

- **S** conta células do proprietário que permanecem vivas na mesma posição durante a última transição. Uma célula sobrevivente na cauda de uma nave recebe renda mesmo que morra na próxima geração. O motor mantém idade ininterrupta por posição e usa 2 como limiar padrão.
- **B** conta nascimentos naturais naquela geração. **D** conta mortes naturais. Em uma linhagem isolada, D = população anterior + B − população atual. Carimbo, erosão por dívida e morte natural são eventos distintos.
- O cenário invertido principal usa **S − B**. A leitura literal de pagar por toda mudança de ocupação usa **S − B − D**. O atual, com os valores padrão, é B − S. Posições ocupadas durante o ciclo inteiro são um terceiro conceito. O glider P4, a nave P15 e a P48 têm núcleo estacionário zero e ainda assim conservam respectivamente 1,5, 17,2 e 7,71 posições em média de uma transição para a seguinte.
- Calibração no plano hexagonal local, linhagens financiadas, sem colisão, com descendentes vivos. Os balanços por geração vêm do solver do atlas. A auditoria externa ao catálogo usa a esfera F128 e o motor da partida. Nenhuma regra de partida é alterada.

## Fontes e despesas

| Regime de fluxo por semente | S − B | S − B − D | S − 6B | S − 3(B + D) |
|---|---:|---:|---:|---:|
| Constante positivo, média por ciclo | 137 | 18 | 0 | 0 |
| Constante zero | 4 | 17 | 0 | 0 |
| Constante negativo | 13 | 119 | 154 | 154 |
| Crescente com a idade | 1 | 1 | 1 | 1 |
| Decrescente por descendência | 5 | 5 | 5 | 5 |

Em S − B, há 130 osciladores, quatro demonstrações de interação, duas naves e uma gun de fluxo constante positivo. Em S − B − D, os 18 positivos constantes são osciladores. A gun catalogada P210 tem uma fase inicial transitória e não perpetua uma série crescente de gliders na calibração do atlas. A linha de guns decrescentes corresponde a P20, P42, P43/86, P200 e P840.

| Semente | Células | S − B por geração | S − B − D por geração | Geração em que recupera o preço da semente, S − B / S − B − D |
|---|---:|---:|---:|---|
| Flipper P2 | 3 | −1 | −3 | Nunca / nunca |
| Oscilador P2 · C6-1 | 6 | +3 | 0 | 20 / nunca |
| Glider P4 | 6 | −3,50 | −8,50 | Nunca / nunca |
| Oscilador P3 · C12-1 | 12 | +8 | +4 | 15 / 30 |
| Rotativo P42 | 12 | −0,286 | −7,429 | Nunca / nunca |
| Nave P48 | 12 | +0,75 | −6,208 | 149 / nunca |
| Nave P15 | 26 | +7,20 | −2,80 | 35 / nunca |
| Crescedor | 36 | +33,60 na janela inicial | +28,40 na janela inicial | 12 / 14 |
| Gun P20 | 52 | +15,10 na janela inicial | −5,55 na janela inicial | 38 / não observado |
| Gun P42 | 64 | +33,83 na janela inicial | +14,24 na janela inicial | 19 / 48 |

Consideramos 10 unidades de energia por célula carimbada. O C6-1 alterna 0 e +6 em S − B. O P3 · C12-1 alterna +6, +6, +12 em S − B ou +6, 0, +6 na leitura literal. Ambos sustentam a sua trajetória sem reserva após a compra. Com o início atual, 30 unidades compram apenas o flipper das sementes catalogadas. Ele já gera dívida no primeiro turno. Para abrir com um produtor periódico bastam 60 em S − B ou 120 na leitura literal.

A Gun P20 rende 302, 232, 162, 92 e 22 nos seus primeiros ciclos de 20 gerações, depois perde 48 no sexto. O caixa operacional alcança +829 no pico, cai abaixo de zero em G193 se as naves continuarem vivas e não houver outro financiamento. Cada glider sobrevivente acrescenta uma despesa média de 3,5 por geração. A P42 tem o primeiro ciclo deficitário no 11º e o caixa operacional fica negativo em G853. São balanços antes de descontar o próprio carimbo. Destruir naves, interromper a emissão ou atingir uma borda muda as contas.

O crescedor abre com +24, +26, +30 e +30 em S − B. Com 360 unidades, a compra é viável sem fundo de giro e recupera o preço em 0,06 s a 200 gerações/s. Nas séries calibradas, sua taxa de produção cresce em média +0,75 por geração de idade. A entrada e saída das pontas oscilam, e o pagamento por geração não descreve uma reta exata em cada fase.

## Um oscilador que o catálogo não contém

O maior S/B de regime dos perfis limitados do atlas é **5,771**, no oscilador P7 (A). Subir o custo para seis por nascimento torna negativos os perfis limitados do catálogo e mantém o crescedor com saldo crescente. Para fundar esse crescedor, agora são necessárias **385** unidades. As duas primeiras transições custam 11 e 14 líquidos, e o caixa chega a −25 antes de se recuperar. Na versão S − 3(B+D) o mínimo é 368. Essas constatações valem para as sementes do atlas.

O editor permite construir um **oscilador estacionário P3** ao unir duas bases de crescedor por uma faixa imóvel e remover as pontas que avançam. A semente resultante não cresce. Carimbamos cada versão em espaço livre no motor da partida. Na esfera F128, o conjunto exato de coordenadas se repete em G0, G3 e G6 nos quatro modelos simétricos e em G1, G4 e G7 no assimétrico. O ciclo completo de cada modelo contém 14 nascimentos e 14 mortes. Acrescentar um segmento entre as duas bases acrescenta 12 células imóveis sem alterar essas transições.

| Células carimbadas | Grade reconhecida pelo editor | S por geração | S/B médio | Saldo por geração, S − 6B |
|---:|---:|---:|---:|---:|
| 36 | 15 × 15 | 34 | 7,29 | +6 |
| 56 | 25 × 25 | 52 | 11,14 | +24 |
| 68 | 25 × 25 | 64 | 13,71 | +36 |
| 128 | 51 × 51 | 124 | 26,57 | +96 |
| 296 | 101 × 101 | 292 | 62,57 | +264 |

**O fundador de 36 células já contorna a exigência na abertura.** Ele custa os mesmos 360 do crescedor. O primeiro turno produz +10, o segundo −2 e o terceiro +10 com S − 6B. A sequência de fluxos se repete e o saldo inicial após a compra pode ser zero. Compra uma cópia em G60, 0,30 s a 200 gerações/s. Com S − 3(B+D), o turno transitório produz +16 e o período seguinte +4, +4, +10. A semente pode ser reproduzida com este RLE do jogo.

```text
ob2o$b2obo$bob2o$2b2obo$2bob2o$3b2obo$3bob2o$4b2obo$4bob2o$5b2obo$5bob2o$6b2obo!
```

As três fases da semente de 56 células já pagam +28, +16 e +28 em S − 6B. Pode ser carimbada diretamente por 560, uma vez disponíveis os recursos. A de 296 ainda produz +12 por geração com S − 60B. Com S − 63B, essa construção específica passa a perder 2 por geração, mas o fundador crescedor já demanda 79.102 de caixa inicial, incluindo o carimbo. Não se demonstrou um máximo de S/B entre todos os carimbos personalizados. A regra avalia sobrevivência e mudança local e por isso remunera uma faixa estável, independentemente de estar ligada a uma ponta que cresce.

Uma construção finita inteiramente imóvel de período 1 é impossível no plano Callahan vazio. Na linha ocupada mais alta, um par de células adjacentes cria uma célula na linha vazia de cima. Se não houver tal par, uma célula nessa linha ocupada pode ter no máximo duas vizinhas na linha de baixo. Elas são adjacentes entre si, e a célula morre. A faixa P3 contorna essa condição com atividade apenas nas duas extremidades.

## Reprodução

Na raiz do repositório, execute `node experiments/pacing/inversion/catalog.mjs`. O comando recalibra as 160 sementes, verifica as cinco construções no motor e escreve `catalog.json`. Os campos `birthsPerGeneration` e `survivorsPerGeneration` são médias da primeira janela do ajuste, enquanto `firstWindowMean` usa a primeira janela observada. Em períodos com fase inicial transitória pode haver diferença. `boundedMean` somente caracteriza um saldo periódico constante. As inclinações das linhagens com descendência supõem que há espaço e que todas as naves sobrevivem.

Para sementes periódicas, o script verifica que as duas primeiras sequências completas de fluxos concordam e calcula a recuperação exata com os incrementos por fase, inclusive fora da janela observada. Para as não periódicas, `recoversStampAt` e `firstDeficit` vêm da observação. Um valor nulo significa que o evento não foi visto nesse intervalo. `extraCapitalThroughObservation` só cobre o intervalo indicado, e não garante solvência futura de uma gun.
