# Calibração dos padrões

`generateProfiles()` em `profiles.js` mede as 160 sementes com as regras do próprio atlas em um plano hexagonal isolado. O simulador de duas horas consome apenas os coeficientes resultantes. As unidades são células por turno para nascimentos e manutenção, células para biomassa e núcleo, e energia por turno para o saldo. Com `stableAfter = 2`, nascimentos mais sobreviventes cobradas correspondem exatamente à população viva média. `live` é essa média ao longo do ciclo. `core` conta posições continuamente ocupadas durante a janela do mecanismo. Uma nave em translação recebe núcleo zero. Por exemplo, a P15 volta a sobrepor duas posições em janelas curtas, mas não mantém uma forja estacionária.

O modelo mede oito períodos dos osciladores e naves, 24 janelas dos geradores e 128 janelas de 20 turnos do crescedor e das interações, limitado a 25.200 turnos por semente. Agrupa fases quando necessário e só aceita uma média constante ou tendência afim que reproduza todos os blocos medidos. O ponto inicial da reta representa a **média da primeira janela**, atribuída à idade zero. Para integrar a cada geração, subtraia `(window - 1) * slope / 2` do intercepto. `skip = 1` identifica padrões cujo primeiro ciclo é transitório. Nesses casos, o modelo aproxima o arranque pelo regime posterior.

| Padrão | Ciclo | Nascimentos | Manutenção | Núcleo | Saldo por geração |
|---|---:|---:|---:|---:|---:|
| Flipper P2 | 1 | 4 | 2 | 1 | +1 |
| Glider P4 | 1 | 20 | 6 | 0 | +3,5 |
| Gun P20 | 1 | 419 | 721 | 27 | −15,1 |
| Gun P20 | 64 | 6.719 | 2.611 | 27 | +205,4 |
| Gun P42 | 1 | 829 | 2.250 | 36 | −33,83 |
| Gun P42 | 64 | 14.059 | 6.219 | 36 | +186,67 |
| Crescedor (janela de 20) | 1 | 121 | 793 | 30 | −33,6 |
| Crescedor (janela de 20) | 132 | 118 | 40.092 | 1.997 | −1.998,7 |

Na P20 e na P42 a renda de cada nova nave sobrevivente soma 3,5 de energia por turno à linhagem. A P20 precisa de 829 de capital de giro além dos 520 de compra e recupera o investimento no turno 219. A P42 precisa de 7.624 além dos 640 e se paga no turno 871. O gerador catalogado P210 perde energia no regime medido, sem a progressão de descendentes da P20. O crescedor soma 0,75 de manutenção por geração de idade. A renda por nascimentos oscila em torno de 5,96 por geração. No teste do crescedor a média combina seis janelas (120 gerações) para absorver as fases. Os testes em `profiles.test.js` verificam os números em janelas posteriores à calibração.

Uma definição implementável de fonte de mana seria uma célula com pelo menos 100 turnos ininterruptos de vida. Em medição com `stableAfter = 100`, depois do aquecimento, essa contagem coincidiu com o núcleo de todos os 149 perfis periódicos e dos seis geradores. O glider e o rotativo não pingaram mana. Nos demonstradores `reflect42_demo` e `dup42_demo` as médias maduras foram 12 e 24, abaixo da aproximação por janela (12,95 e 25,86). No crescedor a contagem madura ficou cerca de 66 células atrás da projeção por janela nos ciclos observados. O experimento principal remunera o núcleo por janela desde o início. Adotar idade 100 introduziria também até meio segundo de maturação a 200 gerações por segundo.

A validação mede a assinatura econômica, não prova recorrência eterna do estado do autômato. `observed-affine` pressupõe espaço disponível, manutenção paga, ausência de colisão e sobrevivência de descendentes. O simulador pode variar a vida das naves. `observation-only` fica reservado a padrões que não sustentem as projeções medidas. A extrapolação de 1,44 milhão de turnos é econômica. Crescimento limitado por bordas, combate, erosão e reconstrução mudariam os coeficientes.
