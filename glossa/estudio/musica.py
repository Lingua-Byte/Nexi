"""Trilhas do Glossa: música clássica em domínio público, interpretada (sintetizada) pelo próprio estúdio.

Por que sintetizar? A COMPOSIÇÃO de Bach ou Mozart é de domínio público, mas cada GRAVAÇÃO tem
direitos do intérprete e da gravadora. Gerando a nossa própria interpretação a partir da partitura
(corpus aberto do music21), composição e gravação ficam livres de direitos.

Uso: python musica.py            → gera trilhas/<id>.wav para toda a biblioteca
     python musica.py T08        → só uma trilha
Requer: pip install music21 numpy scipy
"""
import sys, os, json, wave
import numpy as np
from scipy.signal import fftconvolve
from music21 import corpus

SR = 44100
DUR_MAX = 80  # segundos renderizados por trilha
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "trilhas")

# id, partitura, bpm (semínima), timbre, crédito
BIBLIOTECA = [
    ("T01", "bach/bwv1.6", 58, "cordas", "J. S. Bach (1685–1750) · coral BWV 1.6"),
    ("T02", "bach/bwv10.7", 60, "cordas", "J. S. Bach (1685–1750) · coral BWV 10.7"),
    ("T03", "bach/bwv26.6", 58, "cordas", "J. S. Bach (1685–1750) · coral BWV 26.6"),
    ("T04", "bach/bwv40.8", 60, "cordas", "J. S. Bach (1685–1750) · coral BWV 40.8"),
    ("T05", "bach/bwv66.6", 58, "cordas", "J. S. Bach (1685–1750) · coral BWV 66.6"),
    ("T06", "bach/bwv38.6", 58, "cordas", "J. S. Bach (1685–1750) · coral BWV 38.6"),
    ("T07", "bach/bwv65.7", 60, "cordas", "J. S. Bach (1685–1750) · coral BWV 65.7"),
    ("T08", "mozart/k545/movement1_exposition", 104, "piano", "W. A. Mozart (1756–1791) · Sonata K. 545, 1º mov."),
    ("T09", "haydn/opus74no1/movement2", 76, "cordas", "J. Haydn (1732–1809) · Quarteto op. 74 nº 1, 2º mov."),
    ("T10", "cpebach/h186", 84, "piano", "C. P. E. Bach (1714–1788) · H. 186"),
    ("T11", "monteverdi/madrigal.3.1", 72, "cordas", "C. Monteverdi (1567–1643) · Madrigal, livro 3 nº 1"),
    ("T12", "josquin/milleRegrets", 66, "cordas", "Josquin des Prez (c.1450–1521) · Mille regretz"),
    ("T13", "schubert/Lindenbaum", 76, "piano", "F. Schubert (1797–1828) · Der Lindenbaum"),
    ("T14", "handel/rinaldo/Lascia_chio_pianga", 58, "piano", "G. F. Händel (1685–1759) · Lascia ch'io pianga"),
    ("T15", "schumann_robert/dichterliebe_no2", 66, "piano", "R. Schumann (1810–1856) · Dichterliebe nº 2"),
    ("T16", "corelli/opus3no1/1grave", 54, "cordas", "A. Corelli (1653–1713) · Sonata op. 3 nº 1, Grave"),
    ("T17", "beethoven/opus18no1/movement2", 50, "cordas", "L. van Beethoven (1770–1827) · Quarteto op. 18 nº 1, Adagio"),
]


def notas(caminho, bpm):
    s = corpus.parse(caminho)
    seg = 60.0 / bpm
    out = []
    for el in s.flatten().notes:
        ini = float(el.getOffsetInHierarchy(s)) * seg if False else float(el.offset) * seg
        dur = max(0.08, float(el.quarterLength) * seg)
        for p in (el.pitches if hasattr(el, "pitches") else [el.pitch]):
            out.append((ini, dur, p.frequency, p.midi))
    # music21 .flatten() já devolve offsets absolutos
    return [n for n in out if n[0] < DUR_MAX]


def piano(f, dur, t):
    env_len = min(dur + 1.2, 6.0)
    tt = t[: int(env_len * SR)]
    sig = np.zeros_like(tt)
    for k in range(1, 9):
        fk = f * k * (1 + 0.0004 * k * k)  # leve inarmonicidade
        if fk > SR / 2.2:
            break
        sig += (1.0 / k ** 1.4) * np.exp(-tt * (0.9 + 0.55 * k) * (f / 440) ** 0.3) * np.sin(2 * np.pi * fk * tt)
    ataque = np.clip(tt / 0.006, 0, 1)
    soltura = np.clip((dur + 0.25 - tt) / 0.25, 0, 1)  # abafa depois que a nota acaba
    return sig * ataque * np.maximum(soltura, 0.0) * 0.9


def cordas(f, dur, t):
    env_len = dur + 0.6
    tt = t[: int(env_len * SR)]
    vib = 1 + 0.0025 * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - 0.3) / 0.5, 0, 1)
    sig = np.zeros_like(tt)
    for det in (-0.0018, 0.0018):
        for k in range(1, 11):
            fk = f * k * (1 + det)
            if fk > SR / 2.5:
                break
            amp = (1.0 / k) * np.exp(-0.12 * k * (f / 300))  # filtro "passa-baixa"
            sig += amp * np.sin(2 * np.pi * fk * tt * vib + k)
    ataque = np.clip(tt / 0.18, 0, 1) ** 1.5
    soltura = np.clip((dur + 0.5 - tt) / 0.5, 0, 1)
    return sig * ataque * soltura * 0.35


def reverb(x, seg=2.6, mistura=0.32, seed=0):
    rng = np.random.default_rng(seed)
    n = int(seg * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    molhado = fftconvolve(x, ir)[: len(x)]
    return (1 - mistura) * x + mistura * molhado


def renderizar(tid, caminho, bpm, timbre):
    ns = notas(caminho, bpm)
    fim = min(DUR_MAX, max(i + d for i, d, _, _ in ns) + 2.5)
    buf = np.zeros(int((fim + 7) * SR))
    t = np.arange(int(7 * SR)) / SR
    gerador = piano if timbre == "piano" else cordas
    for ini, dur, f, midi in ns:
        if f < 30 or f > 4200:
            continue
        s = gerador(f, dur, t)
        vel = 0.8 + 0.2 * ((midi * 7919) % 13) / 13  # pequena variação de dinâmica
        a = int(ini * SR)
        buf[a: a + len(s)] += s[: len(buf) - a] * vel
    buf = buf[: int(fim * SR)]
    est = np.stack([reverb(buf, seed=1), reverb(buf, seed=2)], axis=1)
    est /= (np.max(np.abs(est)) + 1e-9)
    est *= 0.85
    os.makedirs(SAIDA, exist_ok=True)
    with wave.open(os.path.join(SAIDA, tid + ".wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((est * 32767).astype("<i2").tobytes())
    return fim


if __name__ == "__main__":
    so = sys.argv[1:]
    creditos = {}
    for tid, cam, bpm, timbre, cred in BIBLIOTECA:
        creditos[tid] = cred
        if so and tid not in so:
            continue
        d = renderizar(tid, cam, bpm, timbre)
        print(f"{tid} {d:5.1f}s  {cred}")
    json.dump(creditos, open(os.path.join(AQUI, "trilhas-creditos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
