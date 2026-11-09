# Prior econômico de carimbos

A interface ordena os carimbos por *retorno estimado*, não por custo bruto. Cada um dos 409 carimbos roda por 1.024 gerações em isolamento. Nas gerações 897–1024, o levantamento registra nascimentos e a distribuição das idades das células vivas. O módulo `src/patterns/physical-yields.js` contém exclusivamente observações físicas: não grava economia, recompensa ou decisões dos bots.

O ranking aplica a economia atual aos dois valores médios por meio de `generationEnergy()`. Entre carimbos com fluxo positivo e custo dentro da reserva inicial, ordena pelo menor prazo estimado de amortização (custo/fluxo). Carimbos positivos mas acima do saldo inicial aparecem depois, seguidos dos deficitários e dos que não possuem medição completa. A barra apresenta primeiro os mais promissores, preservando o número de slots e as escolhas manuais. O Atlas permite mudar para ordenação por custo, período, atividade ou classificação histórica.

Cada aprendiz começa com essa shortlist para decidir **o que estudar**, antes de usar como evidência uma medição física por ele solicitada e um teste local de viabilidade. Os resultados reais continuam individualizados durante a partida e passam ao histórico compartilhado apenas na seguinte. Ainda há exploração aleatória para padrões não classificados, estratégias ofensivas e contextos locais.

## Restrições da estimativa

A distribuição das idades permite recalcular as células maduras para qualquer limiar inteiro entre 0 e 1.024. Acima disso, o Atlas indica que falta medição. Regras com `generationQuote` personalizado também ficam sem essa estimativa. A aplicação de uma função econômica não linear à média física é uma **aproximação**, não uma integração exata geração a geração. Impactos de colisão, custos durante a maturação, crescimento além de G1024, interações espaciais e o risco de falência precisam ser verificados por simulação local e pelas observações do jogo. O ranking não pretende decidir qual regra de autômato torna o jogo mais interessante.

Reproduzir: `node experiments/economic-starts/measure-ages.mjs` e `node --test src/patterns/economic-ranking.test.js`.
