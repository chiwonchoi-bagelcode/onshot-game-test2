"""Final mix: game-sound stems cut to the edit, extra game cues, the designed
layer, the score (ducked under the narration) and the narration itself.
Writes a float wav; loudness is normalised afterwards with ffmpeg loudnorm.

  python audio/mix.py <sfx_dir> <music.wav> <design.wav> <out.wav>
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
sfx_dir, music_f, design_f, out_f = sys.argv[1:5]
tl = json.load(open('edit/timeline.json', encoding='utf-8'))


def load(f):
    x, sr = sf.read(f, always_2d=True, dtype='float64')
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    if sr != SR:
        g = np.gcd(SR, sr)
        x = signal.resample_poly(x, SR // g, sr // g, axis=0)
    return x


def place(bus, t, x, gain=1.0):
    i = int(round(t * SR))
    j = min(len(bus), i + len(x))
    if j > i:
        bus[i:j] += x[: j - i] * gain


# timeline length
total = sum(v.get('black') or (v['out'] - v['in']) for v in tl['video'])
N = int((total + 0.2) * SR)
sfx = np.zeros((N, 2))

# ---- game sound, cut with the picture (tails ring over the next cut)
t = 0.0
for v in tl['video']:
    if 'black' in v:
        t += v['black']
        continue
    d = v['out'] - v['in']
    tail = v.get('tail', 0.3)
    x = load(f"{sfx_dir}/{v['shot']}.wav")
    a, b = int(v['in'] * SR), int((v['out'] + tail) * SR)
    seg = x[a:b].copy()
    fi = int(0.004 * SR)
    seg[:fi] *= np.linspace(0, 1, fi)[:, None]
    k0 = int(d * SR)
    if len(seg) > k0:
        n_t = len(seg) - k0
        seg[k0:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_t)))[:, None]
    place(sfx, t, seg, v.get('sfxGain', 1.0))
    t += d

# a short room on the game sound glues the synthesized hits together
ir_n = int(0.55 * SR)
rng = np.random.default_rng(3)
ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR * 9)[:, None]
ir = signal.sosfilt(signal.butter(2, 5200, 'lowpass', fs=SR, output='sos'), ir, axis=0)
ir /= np.sqrt(np.sum(ir ** 2, 0))
wet = np.stack([signal.fftconvolve(sfx[:, c], ir[:, c])[:N] for c in range(2)], 1)
sfx = sfx + wet * 0.22

cues = np.zeros((N, 2))
try:
    place(cues, 0, load(f'{sfx_dir}/_cues.wav'))
except FileNotFoundError:
    pass
design = np.zeros((N, 2))
place(design, 0, load(design_f))
music = np.zeros((N, 2))
place(music, 0, load(music_f))


def shelf(x, f0, gain_db, high=True):
    """RBJ shelving biquad"""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    al = np.sin(w0) / 2 * np.sqrt(2)
    cw = np.cos(w0)
    sA = 2 * np.sqrt(A) * al
    if high:
        b = [A * ((A + 1) + (A - 1) * cw + sA), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sA)]
        a = [(A + 1) - (A - 1) * cw + sA, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sA]
    else:
        b = [A * ((A + 1) - (A - 1) * cw + sA), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sA)]
        a = [(A + 1) + (A - 1) * cw + sA, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sA]
    return signal.lfilter(b, a, x, axis=0)


# score polish: rumble cut, a little air, slightly wider image
music = signal.sosfilt(signal.butter(2, 32, 'highpass', fs=SR, output='sos'), music, axis=0)
music = shelf(music, 7500, 2.0, True)
mid, side = (music[:, 0] + music[:, 1]) / 2, (music[:, 0] - music[:, 1]) / 2
music = np.stack([mid + side * 1.25, mid - side * 1.25], 1)

# ---- narration
vo = np.zeros((N, 2))
active = np.zeros(N)
hpf = signal.butter(2, 85, 'highpass', fs=SR, output='sos')
pres = signal.butter(2, [2500, 6000], 'bandpass', fs=SR, output='sos')
for line in tl.get('vo', []):
    x = load(f"audio/vo/{line['id']}.wav")[:, 0]
    x = signal.sosfilt(hpf, x)
    x = x + 0.25 * signal.sosfilt(pres, x)
    rms = np.sqrt(np.mean(x[np.abs(x) > 0.02] ** 2))
    x = x / rms * 10 ** (-17 / 20) * line.get('gain', 1.0)
    st = np.stack([x, x], 1)
    place(vo, line['t'], st)
    i = int(line['t'] * SR)
    active[i:i + len(x)] = 1
# small plate on the voice
vir_n = int(0.4 * SR)
vir = rng.standard_normal((vir_n, 2)) * np.exp(-np.arange(vir_n) / SR * 14)[:, None]
vir /= np.sqrt(np.sum(vir ** 2, 0))
vo = vo + np.stack([signal.fftconvolve(vo[:, c], vir[:, c])[:N] for c in range(2)], 1) * 0.12


# ---- ducking under the voice (smoothed gate)
def smooth_env(a, att, rel):
    out = np.zeros_like(a)
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    y = 0.0
    for i in range(0, len(a), 64):
        v = a[i]
        k = ka if v > y else kr
        y = v + (y - v) * (k ** 64)
        out[i:i + 64] = y
    return out


duck = smooth_env(active, 0.08, 0.35)
music_gain = 10 ** (np.interp(duck, [0, 1], [0, -9]) / 20)
sfx_gain = 10 ** (np.interp(duck, [0, 1], [0, -3]) / 20)

# score automation from the timeline: [[t, dB], ...] (linear between points)
auto = tl.get('musicGain', [[0, 0]])
tt = np.arange(N) / SR
music_gain = music_gain * 10 ** (np.interp(tt, [a for a, _ in auto], [b for _, b in auto]) / 20)

buses = {'sfx': sfx * sfx_gain[:, None], 'cues': cues * 0.8, 'design': design, 'music': music * music_gain[:, None] * 0.95, 'vo': vo}
mix = sum(buses.values())
if '--stats' in sys.argv:
    def rms_db(x, a, b):
        seg = x[int(a * SR):int(b * SR)]
        return 10 * np.log10(np.mean(seg ** 2) + 1e-12)
    for s0 in np.arange(0, total, 2.0):
        print(f'{s0:5.1f} ' + ' '.join(f'{k}:{rms_db(v, s0, s0 + 2):6.1f}' for k, v in buses.items()))


# ---- bus glue: gentle RMS compressor, then a soft clip safety
def compress(x, thr_db=-16, ratio=2.2, att=0.012, rel=0.18):
    lvl = np.sqrt(signal.sosfilt(signal.butter(1, 30, 'lowpass', fs=SR, output='sos'), np.mean(x ** 2, 1)).clip(1e-12))
    db = 20 * np.log10(lvl)
    over = np.maximum(0, db - thr_db)
    gr = -over * (1 - 1 / ratio)
    gr = smooth_env(gr, rel, att)  # (gain reduction is negative: fast down, slow up)
    return x * (10 ** (gr / 20))[:, None]


mix = compress(mix)
peak = np.max(np.abs(mix))
print(f'pre-norm peak {20 * np.log10(peak):.1f} dBFS, length {len(mix) / SR:.2f} s')
sf.write(out_f, mix.astype(np.float32), SR, subtype='FLOAT')
