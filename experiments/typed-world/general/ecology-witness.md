# Um ciclo de Condorcet entre três físicas do mesmo jogador

Na geração 11 da esfera F32, três candidatas reivindicaram o sítio 246. A colônia mantinha as nove regras, a carteira começara com 16 mil créditos e todas as 18 ordens haviam sido aceitas e pagas. A semente do motor foi 632. A arbitragem usou três votos por par, um para cada critério da tabela.

| Candidata | Proposta | Apoio | Idade | Robustez |
|---|---|---:|---:|---:|
| B245/S3 (Bays) | Nascimento | 2 | 1 | 2 |
| Andreen | Nascimento | 1 | 6 | 1 |
| HighHexLife | Sobrevivência | 0 | 4 | 4 |

* B245/S3 vence Andreen por **2–1**. Tem mais vizinhos da própria linhagem e seu nascimento tolera mais perturbações no anel.
* Andreen vence HighHexLife por **2–1**. Tem mais apoio e sua linhagem reivindica o sítio a partir de uma célula mais velha.
* HighHexLife vence B245/S3 por **2–1**. A residente é mais velha e mantém a sobrevivência em mais perturbações do anel.

A robustez é o número de vizinhos cujo estado pode ser invertido individualmente preservando a decisão física da respectiva regra naquele sítio. Os três candidatos formaram todo o componente cíclico superior. A geometria entrou **depois** da votação para escolher qual candidata ocuparia o sítio. O vértice-pai de Andreen ganhou o desempate. Não houve abstinção nem voto geométrico em qualquer comparação da tabela.

A busca dirigida plantou carimbos pequenos do atlas em gerações sucessivas de uma vizinhança densa. Após encontrar o encontro, removemos ordens redundantes e repetimos as nove ordens restantes junto de uma base remota de cada regra. O relato fornece uma prova de existência. A frequência deve ser medida em partidas selecionadas independentemente desse encontro.

```sh
node experiments/typed-world/general/ecology-witness.mjs > /tmp/ecology-witness.json
diff experiments/typed-world/general/ecology-witness.json /tmp/ecology-witness.json
```

[Dados completos, candidatas, votos e ordens pagas](ecology-witness.json) · [Reconstruir o mundo em G10](ecology-replay.mjs) · [Conferir o sítio físico seguinte](ecology-witness.mjs)
