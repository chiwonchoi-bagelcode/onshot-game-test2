"""Designed sound layer for the trailer (everything the game itself doesn't make):
room tone, birds and a wall clock for the quiet house, whooshes on camera moves,
sub-booms under the big crashes, a water rush for the floods, the front door,
and the riser into the title. Pure numpy synthesis, deterministic.

  python audio/design.py out/audio/design.wav
"""
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DUR = 77.5
rng = np.random.default_rng(5)
out = np.zeros((int(DUR * SR), 2))


def add(t, x, gain=1.0, pan=0.0):
    """mix a mono or stereo signal in at time t (constant-power pan)"""
    i = int(t * SR)
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        x = np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)
    j = min(len(out), i + len(x))
    if j > i:
        out[i:j] += x[: j - i] * gain


def env(n, attack, release, shape=3.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    r = np.exp(-np.maximum(0, t - attack) * shape / max(release, 1e-4))
    return a * r


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def db(v):
    return 10 ** (v / 20)


# ---------------------------------------------------------------- room tone
def room(t0, t1, level=-52, warm=900):
    d = t1 - t0
    x = lp(noise(d), warm, 1)
    x = x / np.max(np.abs(x)) * db(level)
    fade = int(0.6 * SR)
    e = np.ones(len(x))
    e[:fade] = np.linspace(0, 1, fade)
    e[-fade:] = np.linspace(1, 0, fade)
    l = x * e
    r = np.roll(l, 2400)
    add(t0, np.stack([l, r], 1))


room(0.0, 13.6)
room(38.4, 43.8, -54)
room(58.1, 67.0, -53)
room(72.4, 77.4, -54)


# ---------------------------------------------------------------- birds outside the window
def chirp(t, f0=3600, f1=5200, d=0.07, gain=-30, pan=0.5):
    n = int(d * SR)
    tt = np.arange(n) / SR
    f = f0 + (f1 - f0) * np.sin(np.pi * tt / d) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.006, d, 2.0)
    add(t, x, db(gain), pan)


for t, f0, f1 in [(0.35, 3800, 5600), (0.47, 3900, 5800), (0.6, 3600, 5000), (1.55, 4200, 3300), (1.66, 4100, 3200),
                  (2.8, 3700, 5400), (2.9, 3700, 5500), (11.9, 4000, 5600), (12.02, 4000, 5500)]:
    chirp(t, f0, f1, 0.065, -31, 0.55)


# ---------------------------------------------------------------- the wall clock
def tick(t, tock=False, gain=-30, pan=-0.35):
    n = int(0.06 * SR)
    x = noise(0.06) * env(n, 0.0005, 0.012, 4)
    f = 2300 if tock else 3100
    x = bp(x, f * 0.8, f * 1.25, 2) * 3 + bp(x, 600, 900, 1) * 0.6
    add(t, x / (np.max(np.abs(x)) + 1e-9), db(gain), pan)


for k in range(0, 15):
    t = 0.0 + k * 0.5
    if t >= 7.55:
        break
    close = 3.4 <= t < 5.6
    tick(t, k % 2 == 1, -27 if close else -33, -0.1 if close else -0.4)


# ---------------------------------------------------------------- whooshes
def whoosh(t_peak, d=0.6, f_lo=300, f_hi=3200, gain=-18, pan0=-0.6, pan1=0.6, rise=0.75):
    n = int(d * SR)
    x = noise(d)
    tt = np.arange(n) / n
    # time-varying band: sweep up then down around the peak
    fc = f_lo + (f_hi - f_lo) * np.sin(np.pi * np.clip(tt / (rise * 2), 0, 1)) ** 2
    y = np.zeros(n)
    blk = 256
    zi = None
    for i in range(0, n, blk):
        c = fc[min(i, n - 1)]
        sos = signal.butter(2, [max(60, c * 0.55), min(SR / 2 - 100, c * 1.6)], 'bandpass', fs=SR, output='sos')
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    a = np.where(tt < rise, (tt / rise) ** 2.2, np.exp(-(tt - rise) * 9))
    y = y * a
    y /= np.max(np.abs(y)) + 1e-9
    pans = np.linspace(pan0, pan1, n)
    ang = (pans + 1) * np.pi / 4
    st = np.stack([y * np.cos(ang), y * np.sin(ang)], 1) * np.sqrt(2)
    add(t_peak - rise * d, st, db(gain))


whoosh(3.42, 0.5, 400, 2600, -26, 0.5, -0.3, 0.8)     # into the stare
whoosh(5.6, 0.45, 300, 4200, -17, -0.2, 0.2, 0.92)    # snap zoom onto the vase
whoosh(13.5, 0.55, 300, 3000, -24, -0.6, 0.6, 0.8)    # into the montage
whoosh(46.1, 1.4, 500, 5200, -19, 0.7, -0.8, 0.35)    # the soda rocket over the walls
whoosh(55.75, 1.2, 200, 2400, -24, -0.3, 0.3, 0.45)   # crane up over the ruins


# ---------------------------------------------------------------- sub booms
def boom(t, strength=1.0, f0=72, f1=30, d=1.4):
    n = int(d * SR)
    tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 5)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, d * 0.55, 3.5)
    thump = lp(noise(0.12), 180, 2) * env(int(0.12 * SR), 0.001, 0.05, 4)
    x[: len(thump)] += thump * 2.5
    x /= np.max(np.abs(x)) + 1e-9
    add(t, x, db(-13 + 9 * np.log10(max(strength, 0.05))))


for t, s in [(5.6, 0.35), (10.32, 0.7), (19.2, 0.6), (22.38, 0.7), (27.4, 1.0), (30.0, 0.4), (32.56, 0.7),
             (35.24, 0.45), (36.7, 0.45), (37.63, 0.8), (48.0, 1.0), (50.67, 0.9), (52.3, 1.0), (55.1, 1.0),
             (58.05, 0.9), (67.2, 1.4), (75.27, 0.55)]:
    boom(t, s)


# ---------------------------------------------------------------- floods
def rush(t, d=2.2, gain=-17):
    n = int(d * SR)
    x = noise(d)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(3 + 4 * rng.random(n)) / SR)
    y = lp(x, 1400, 2) * (0.6 + 0.4 * lfo) + hp(x, 3000, 2) * 0.25
    # bubbly gurgles
    for k in range(18):
        bt = rng.uniform(0.05, d * 0.8)
        bn = int(0.05 * SR)
        f = rng.uniform(250, 700)
        b = np.sin(2 * np.pi * np.cumsum(np.linspace(f, f * 1.8, bn)) / SR) * env(bn, 0.002, 0.03, 3)
        i = int(bt * SR)
        y[i:i + bn] += b * 0.6
    y *= env(n, 0.06, d * 0.6, 2.5)
    y /= np.max(np.abs(y)) + 1e-9
    add(t, np.stack([y, np.roll(y, 900)], 1), db(gain))


rush(32.5)
rush(52.25, 2.6, -15)


# ---------------------------------------------------------------- the front door
def clack(t, gain=-20):
    n = int(0.08 * SR)
    x = noise(0.08) * env(n, 0.0005, 0.02, 4)
    y = bp(x, 1800, 3400, 2) * 2 + bp(x, 500, 900, 2)
    add(t, y / (np.max(np.abs(y)) + 1e-9), db(gain), -0.5)


clack(58.08)
clack(58.17, -22)
# creak
d = 0.7
nn = int(d * SR)
tt = np.arange(nn) / SR
f = 150 + 60 * np.sin(2 * np.pi * 1.3 * tt) + 8 * rng.standard_normal(nn).cumsum() / np.sqrt(nn)
saw = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR)
stick = (np.sin(2 * np.pi * np.cumsum(14 + 10 * rng.random(nn)) / SR) > 0.2).astype(float)
cr = bp(saw * (0.4 + 0.6 * lp(stick, 60, 1)), 500, 1600, 2) * env(nn, 0.05, d * 0.7, 2)
add(58.3, cr / (np.max(np.abs(cr)) + 1e-9), db(-26), -0.55)
# two steps in
for t in (58.55, 58.82):
    st = lp(noise(0.1), 260, 2) * env(int(0.1 * SR), 0.002, 0.04, 4)
    add(t, st / (np.max(np.abs(st)) + 1e-9), db(-22), -0.5)


# ---------------------------------------------------------------- reverse cymbal into the title
d = 1.2
nn = int(d * SR)
cy = hp(noise(d), 4500, 2) + 0.4 * bp(noise(d), 1500, 4000, 1)
cy *= np.linspace(0, 1, nn) ** 3
cy /= np.max(np.abs(cy)) + 1e-9
add(67.2 - d, np.stack([cy, np.roll(cy, 500)], 1), db(-20))


# ---------------------------------------------------------------- write
peak = np.max(np.abs(out))
print(f'design layer peak {20 * np.log10(peak + 1e-12):.1f} dBFS')
sf.write(sys.argv[1] if len(sys.argv) > 1 else 'design.wav', out.astype(np.float32), SR, subtype='FLOAT')
