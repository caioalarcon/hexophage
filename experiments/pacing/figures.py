"""Regenerate the comparison figure from the published numeric results."""
import json
from pathlib import Path
import matplotlib
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parent
read = lambda file: json.loads((root/file).read_text())
search, legacy, visits = map(read, ("results-search.json","legacy-results.json","holdouts.json"))
matplotlib.rcParams.update({"svg.fonttype":"none","svg.hashsalt":"hexophage-pacing","font.size":10})
fig,(a,b)=plt.subplots(1,2,figsize=(10.4,3.9),layout="constrained")
x=list(range(5))
series = [
    ("AoE II · instalações + pesquisas",search["aoe_median_reference"],"#2c485e", "o"),
    ("Hexophage · preço de 40 min", search["empirical_selected"]["mass"]["short"]["rates"], "#087965","s"),
    ("Hexophage · preço de 2 h",search["empirical_selected"]["mass"]["long-relaxed"]["rates"],"#7263a5","^"),
    ("Hexophage · controle com bateria",legacy["battery"]["fiveMinuteRates"],"#a85b21","d"),
]
for label, vals, color, shape in series:
    a.plot(x,vals,label=label,marker=shape,color=color,linewidth=2,markersize=5)
a.set(xticks=x,xticklabels=["0–5","5–10","10–15","15–20","20–25"],xlabel="Minutos desde a abertura",ylabel="Eventos por jogador por minuto",ylim=(0,8.6))
a.set_title("Investimentos ao longo da partida",loc="left",weight="bold")
a.legend(fontsize=8,frameon=False)
cad=["0.005","15","30","60","300","900"]
for key,label,color,shape in [("short","Preço de 40 min","#087965","s"),("long","Preço de 2 h","#7263a5","^")]:
    y=visits[key]["two_hours_mixed_orders_by_seconds_between_reviews"]
    b.plot(range(len(cad)),[100*y[c]/y[cad[0]] for c in cad],label=label,marker=shape,color=color,linewidth=2)
b.set(xticks=range(len(cad)),xticklabels=["Sempre","15 s","30 s","1 min","5 min","15 min"],xlabel="Intervalo entre consultas do jogador",ylabel="% dos carimbos em duas horas",ylim=(0,108))
b.set_title("Quanto custa olhar com menos frequência?",loc="left",weight="bold")
b.legend(fontsize=8,frameon=False,loc="lower left")
for ax in (a,b):
    ax.grid(axis="y",color="#dce2e6")
    ax.spines[["top","right"]].set_visible(False)
fig.savefig(root/"ritmo.svg",metadata={"Date":None})
svg=root/"ritmo.svg"
svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines())+"\n")
