#!/usr/bin/env python3
"""Trilha original do filme (30,6 s), sintetizada do zero: sem amostras nem
músicas de terceiros, livre de direitos.

Ré maior, 70,6 BPM (compasso de 3,4 s), para o acorde final (Ré maior com
nona) cair junto da logo, aos 27,2 s. Camadas: pad quente, piano em arpejo,
baixo suave, pulso discreto de chocalho a partir da montagem, uma subida de
ar antes do final e um brilho de sino quando o reflexo passa na logo.

Uso: python3 tools/compor-trilha.py  →  assets/audio/trilha.wav (48 kHz, estéreo)
Requer numpy e scipy.
"""
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
LENGTH = 30.6
BAR = 3.4
rng = np.random.default_rng(2026)
N = int(SR * LENGTH)
t_all = np.arange(N) / SR


def hz(note: str) -> float:
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octave + 1) - 69) / 12)


# acordes por compasso (pad / arpejo) e fundamental do baixo
CHORDS = [
    (["D3", "A3", "C#4", "E4", "F#4"], "D2"),   # Dmaj9
    (["B2", "F#3", "A3", "C#4", "D4"], "B1"),   # Bm9
    (["G2", "D3", "F#3", "B3", "C#4"], "G1"),   # Gmaj7(#11)
    (["A2", "D3", "E3", "A3", "C#4"], "A1"),    # Asus4 → A
    (["D3", "A3", "C#4", "E4", "F#4"], "D2"),   # Dmaj9
    (["F#2", "C#3", "E3", "A3", "C#4"], "F#1"), # F#m7
    (["G2", "D3", "F#3", "A3", "B3"], "G1"),    # Gmaj9
    (["A2", "E3", "F#3", "B3", "C#4"], "A1"),   # A6sus2
    (["D3", "A3", "C#4", "E4", "F#4"], "D2"),   # Dmaj9 final (27,2 s)
]


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype="low", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype="high", fs=SR, output="sos"), x)


def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    ai, di, ri = int(a * SR), int(d * SR), int(r * SR)
    ai = min(ai, n)
    e[:ai] = np.linspace(0, 1, ai)
    end_d = min(ai + di, n)
    e[ai:end_d] = np.linspace(1, s, end_d - ai)
    if ri > 0:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def place(buf, sig, start):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


# ---------- pad ----------
def pad_voice(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for cents in (-7, 0, 6):
        ff = f * 2 ** (cents / 1200)
        lfo = 1 + 0.002 * np.sin(2 * np.pi * (0.13 + 0.05 * rng.random()) * t + rng.random() * 6.28)
        ph = 2 * np.pi * ff * np.cumsum(lfo) / SR
        for k, amp in ((1, 1.0), (2, 0.35), (3, 0.18), (4, 0.08)):
            out += amp * np.sin(k * ph + rng.random() * 6.28)
    return out / 6


pad = np.zeros((2, N))
for b, (notes, _) in enumerate(CHORDS):
    start = b * BAR - 0.4
    dur = (LENGTH - start) if b == len(CHORDS) - 1 else BAR + 1.6
    start = max(start, 0)
    n = int(dur * SR)
    level = [0.55, 0.62, 0.7, 0.75, 0.85, 0.92, 1.0, 1.0, 0.95][b]
    e = env_adsr(n, 1.2 if b else 2.2, 0.5, 0.85, 1.4 if b < len(CHORDS) - 1 else 2.5)
    for idx, note in enumerate(notes):
        v = pad_voice(hz(note), dur) * e * level
        pan = 0.5 + (idx - 2) * 0.12
        place(pad[0], v * (1 - pan), start)
        place(pad[1], v * pan, start)
pad = np.stack([highpass(lowpass(ch, 1800), 110) for ch in pad]) * 0.22

# pulsação leve do pad em semínimas, a partir da montagem
beat = BAR / 4
pump = np.ones(N)
mask = (t_all > 4 * BAR) & (t_all < 8 * BAR)
phase = (t_all % beat) / beat
pump[mask] = 1 - 0.12 * np.exp(-phase[mask] * 6)
pad *= pump


# ---------- piano ----------
def piano(f, vel, dur=3.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00025  # inarmonicidade
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2:
            break
        decay = 1.2 + 2.4 * k / (1 + f / 300)
        out += (0.9 ** k) / k ** 0.6 * np.sin(2 * np.pi * fk * t + rng.random() * 6.28) * np.exp(-decay * t)
    attack = np.minimum(t / 0.004, 1)
    hammer = highpass(rng.standard_normal(n) * np.exp(-t * 90) * 0.04, 2000)
    out = (out * attack + hammer) * vel
    out[-int(0.08 * SR):] *= np.linspace(1, 0, int(0.08 * SR))
    return out


pno = np.zeros((2, N))
eighth = BAR / 8
pattern = [0, 2, 3, 5, 6]  # colcheias tocadas em cada compasso
for b, (notes, _) in enumerate(CHORDS[:-1]):
    up = [hz(nt) * 2 for nt in notes[1:]]  # arpejo uma oitava acima do pad
    for j, step in enumerate(pattern):
        f = up[(j * 2 + b) % len(up)]
        vel = (0.22 + 0.08 * rng.random()) * (0.75 if b < 2 else 1.0)
        s = piano(f, vel)
        pan = 0.35 + 0.3 * rng.random()
        place(pno[0], s * (1 - pan), b * BAR + step * eighth + rng.normal(0, 0.006))
        place(pno[1], s * pan, b * BAR + step * eighth + rng.normal(0, 0.006))
# melodia simples nos compassos 4–7
melody = [("F#5", 4, 0), ("E5", 4, 4), ("C#5", 5, 0), ("E5", 5, 4), ("D5", 6, 0), ("B4", 6, 4), ("C#5", 7, 0), ("E5", 7, 4)]
for note, b, step in melody:
    s = piano(hz(note), 0.32, 3.4)
    place(pno[0], s * 0.5, b * BAR + step * eighth)
    place(pno[1], s * 0.5, b * BAR + step * eighth)
# acorde final arpejado + nota alta
for i, note in enumerate(["D3", "A3", "D4", "F#4", "A4", "E5"]):
    s = piano(hz(note), 0.3, 3.4)
    place(pno[0], s * (0.6 - i * 0.04), 8 * BAR + i * 0.06)
    place(pno[1], s * (0.4 + i * 0.04), 8 * BAR + i * 0.06)
pno *= 0.55

# ---------- baixo ----------
bass = np.zeros(N)
for b, (_, root) in enumerate(CHORDS):
    if b < 2:
        continue
    dur = (LENGTH - b * BAR) if b == len(CHORDS) - 1 else BAR + 0.3
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(root) * 2
    v = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env_adsr(n, 0.25, 0.6, 0.7, 0.6)
    place(bass, v * 0.07, b * BAR)
bass = highpass(lowpass(bass, 220), 55)

# ---------- chocalho discreto (compassos 4–7) ----------
shaker = np.zeros(N)
for b in range(4, 8):
    for step in range(8):
        n = int(0.09 * SR)
        t = np.arange(n) / SR
        hit = rng.standard_normal(n) * np.exp(-t * 55) * (0.6 if step % 2 else 1.0)
        place(shaker, hit, b * BAR + step * eighth + 0.01)
shaker = highpass(lowpass(shaker, 9000), 5000) * 0.018

# ---------- subida de ar antes do final ----------
n = int(1.6 * SR)
t = np.arange(n) / SR
riser = rng.standard_normal(n) * (t / t[-1]) ** 2.5
riser = highpass(lowpass(riser, 6000), 1500) * 0.05
air = np.zeros(N)
place(air, riser, 8 * BAR - 1.6)

# ---------- brilho de sino (reflexo na logo, ~29,2 s) ----------
bell = np.zeros(N)
for f, amp in ((hz("A6"), 1.0), (hz("A6") * 2.76, 0.4), (hz("A6") * 5.4, 0.15)):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    place(bell, amp * np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) * np.minimum(t / 0.002, 1) * 0.05, 29.2)

# ---------- mixagem ----------
mix = pad + pno
mix[0] += bass + shaker * 0.8 + air + bell * 0.7
mix[1] += bass + shaker * 1.2 + air + bell * 1.0

# reverberação: impulso sintético estéreo de 2,6 s
rn = int(2.6 * SR)
rt = np.arange(rn) / SR
irs = [highpass(rng.standard_normal(rn), 200) * np.exp(-rt * 2.4) for _ in range(2)]
irs = [ir / np.sqrt(np.sum(ir**2)) for ir in irs]
wet = np.stack([fftconvolve(mix[c], irs[c])[:N] for c in range(2)])
mix = mix * 0.72 + wet * 0.5

# sem graves abaixo de 40 Hz (rumble) e com espaço para a voz
mix = np.stack([highpass(ch, 40, 4) for ch in mix])

# entrada suave, normalização e limite de pico
mix *= np.minimum(t_all / 1.5, 1)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.1) * 0.8

out = Path(__file__).resolve().parent.parent / "assets/audio/trilha.wav"
wavfile.write(out, SR, (mix.T * 32767).astype(np.int16))
print(f"{out.relative_to(out.parents[2])} ({LENGTH} s)")
