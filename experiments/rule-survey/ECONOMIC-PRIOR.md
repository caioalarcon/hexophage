# Prior econômico de carimbos

A interface ordena os carimbos por *retorno estimado*, não por custo bruto. Os números vêm de `isolated.csv`: 1.024 gerações por carimbo em isolamento, com médias dos nascimentos e das células maduras das gerações 897–1024. O módulo `src/patterns/physical-yields.js` contém exclusivamente observações físicas: não grava economia, recompensa ou decisões dos bots.

O ranking aplica a economia atual aos dois valores médios por meio de `generationEnergy()`. Entre carimbos com fluxo positivo e custo dentro da reserva inicial, ordena pelo menor prazo estimado de amortização (custo/fluxo). Carimbos positivos mas acima do saldo inicial aparecem depois, seguidos dos deficitários e dos que não possuem medição completa. A barra apresenta primeiro os mais promissores, preservando o número de slots e as escolhas manuais. O Atlas permite mudar para ordenação por custo, período, atividade ou classificação histórica.

Cada aprendiz começa com essa shortlist para decidir **o que estudar**, antes de usar como evidência uma medição física por ele solicitada e um teste local de viabilidade. Os resultados reais continuam individualizados durante a partida e passam ao histórico compartilhado apenas na seguinte. Ainda há exploração aleatória para padrões não classificados, estratégias ofensivas e contextos locais.

## Restrições da estimativa

A amostragem usa **maturação em 256 gerações**. Se o slider de maturação mudar, os resultados são tratados como *não medidos*: não atribuímos lucro fictício e a pesquisa autônoma continua. Regras com `generationQuote` personalizado também ficam sem essa estimativa. A aplicação de uma função econômica não linear à média física é uma **aproximação**, não uma integração exata geração a geração. Impactos de colisão, custos durante a maturação, crescimento além de G1024, interações espaciais e o risco de falência precisam ser verificados por simulação local e pelas observações do jogo. O ranking não pretende decidir qual regra de autômato torna o jogo mais interessante.

Reproduzir: `node experiments/rule-survey/isolated.mjs` e `node --test src/patterns/economic-ranking.test.js`.
