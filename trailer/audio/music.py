"""Original score for the trailer, written to picture.

One fixed tempo (120 BPM, a beat every 0.5 s) so every cut of the montage
lands on the grid; hits that must follow the physics (a vase, a clock) are
placed at their exact time instead. Writes a General MIDI file that
audio/render_music.sh renders with FluidSynth + MuseScore General.

  python audio/music.py out/audio/music.mid
"""
import random
import sys

import mido

random.seed(11)
TPS = 960  # ticks per second (480 per beat at 120 BPM)
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def n(s):
    """'A4' / 'C#5' / 'Bb3' -> MIDI note number"""
    k = NAMES[s[0]]
    i = 1
    while i < len(s) and s[i] in '#b':
        k += 1 if s[i] == '#' else -1
        i += 1
    return 12 * (int(s[i:]) + 1) + k


# --------------------------------------------------------------------------
# instruments (General MIDI program numbers, 0-based) — channel 9 is drums
# --------------------------------------------------------------------------
CH = {
    'celesta': (0, 8, 92, 0), 'musicbox': (1, 10, 70, 30), 'pizz': (2, 45, 100, -20), 'strings': (3, 48, 88, 10),
    'bassoon': (4, 70, 100, -30), 'clarinet': (5, 71, 92, 25), 'xylo': (6, 13, 92, 35), 'glock': (7, 9, 74, -35),
    'bass': (8, 45, 110, 0), 'brass': (10, 61, 96, 0), 'timp': (11, 47, 110, 0), 'trem': (12, 44, 80, 15),
    'horn': (13, 60, 90, -15), 'bells': (14, 14, 90, 20), 'harp': (15, 46, 84, -10),
}
DR = 9
KICK, SIDE, SNARE, CLAP, HAT, OPENHAT, CRASH, RIDE, TAMB, SPLASH, CHINA, WOOD, WOODLO, TRI, CRASH2 = 36, 37, 38, 39, 42, 46, 49, 51, 54, 55, 52, 76, 77, 81, 57

events = []  # (tick, order, msg)


def at(t):
    return max(0, int(round(t * TPS)))


def note(inst, t, dur, pitch, vel=80, human=0.006):
    ch = CH[inst][0] if inst in CH else inst
    p = n(pitch) if isinstance(pitch, str) else pitch
    t0 = t + random.uniform(-human, human)
    v = max(1, min(127, int(vel + random.uniform(-5, 5))))
    events.append((at(t0), 1, mido.Message('note_on', channel=ch, note=p, velocity=v)))
    events.append((at(t0 + dur), 0, mido.Message('note_off', channel=ch, note=p, velocity=0)))


def chord(inst, t, dur, pitches, vel=80, spread=0.0):
    for i, p in enumerate(pitches):
        note(inst, t + i * spread, dur, p, vel)


def drum(t, key, vel=80, human=0.004):
    note(DR, t, 0.12, key, vel, human)


def cc(inst, t, ctl, val):
    ch = CH[inst][0] if inst in CH else inst
    events.append((at(t), 0, mido.Message('control_change', channel=ch, control=ctl, value=int(max(0, min(127, val))))))


def swell(inst, t0, t1, v0, v1, steps=24):
    """expression (CC11) ramp"""
    for i in range(steps + 1):
        k = i / steps
        cc(inst, t0 + (t1 - t0) * k, 11, v0 + (v1 - v0) * k)


def roll(t0, t1, key, v0, v1, rate=0.0625):
    t = t0
    while t < t1:
        k = (t - t0) / max(1e-6, t1 - t0)
        drum(t, key, v0 + (v1 - v0) * k, 0.002)
        t += rate


def timp_roll(t0, t1, pitch, v0, v1, rate=0.06):
    t = t0
    while t < t1:
        k = (t - t0) / max(1e-6, t1 - t0)
        note('timp', t, rate * 1.3, pitch, v0 + (v1 - v0) * k, 0.002)
        t += rate


def hit(t, big=1.0, root='A', quality='m'):
    """orchestral stab + cymbal + timpani on a sync point"""
    third = {'m': 3, 'M': 4}[quality]
    r = n(root + '2')
    v = int(70 + 45 * big)
    chord('brass', t, 0.45 + 0.6 * big, [r + 12, r + 12 + third, r + 19, r + 24], v)
    chord('strings', t, 0.5 + 0.6 * big, [r, r + 12, r + 19, r + 24 + third], v)
    note('timp', t, 0.6, r, v + 10)
    drum(t, CRASH, v + 10)
    drum(t, KICK, v)
    if big > 0.7:
        drum(t, CRASH2, v)
        note('bass', t, 0.6, r - 12, v)


def stop_all(t):
    """choke: all notes off on every channel"""
    for ch in list(range(16)):
        events.append((at(t), 2, mido.Message('control_change', channel=ch, control=120, value=0)))
        events.append((at(t), 2, mido.Message('control_change', channel=ch, control=123, value=0)))


# --------------------------------------------------------------------------
# shared material
# --------------------------------------------------------------------------
CHORDS = {
    'C': ['C', 'E', 'G'], 'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'], 'G': ['G', 'B', 'D'], 'Dm': ['D', 'F', 'A'],
    'E7': ['E', 'G#', 'B', 'D'], 'Em': ['E', 'G', 'B'], 'A': ['A', 'C#', 'E'], 'G7': ['G', 'B', 'D', 'F'],
}
ROOT_OCT = {'C': 2, 'D': 2, 'E': 2, 'F': 2, 'G': 1, 'A': 1, 'B': 1}

# the caper motif (8th-note slots, two bars each)
P1 = [['A4', None, 'C5', 'A4', 'E5', None, 'D5', 'C5'], ['B4', None, 'G#4', None, 'E4', None, None, None]]
P2 = [['F4', 'A4', 'C5', 'F5', 'E5', None, 'D5', 'C5'], ['B4', 'G#4', 'E4', 'G#4', 'B4', None, 'E5', None]]
P3 = [['A4', None, 'C5', 'A4', 'E5', None, 'A5', 'G5'], ['F5', None, 'D5', None, 'A4', None, None, None]]
P4 = [['G#4', 'B4', 'D5', 'E5', 'F5', 'E5', 'D5', 'B4'], ['A4', None, None, None, None, None, None, None]]
# the lullaby (opening, the innocent cat, the title)
LULL = [['E5', None, 'G5', None, 'C6', None, None, 'B5'], ['A5', None, 'G5', None, 'E5', None, None, 'D5'],
        ['F5', None, 'A5', None, 'C6', None, 'A5', None], ['G5', None, None, None, None, None, None, None]]


def melody(inst, t0, bar, vel=80, octave=0, dur=0.22, until=99.0):
    for i, p in enumerate(bar):
        t = t0 + i * 0.25
        if p and t < until:
            note(inst, t, dur, n(p) + 12 * octave, vel)


def bass_bar(t0, ch_name, nxt, vel=90, until=99.0, inst='bass'):
    tones = CHORDS[ch_name]
    root = n(tones[0] + str(ROOT_OCT[tones[0][0]]))
    fifth = root + 7
    nroot = n(CHORDS[nxt][0] + str(ROOT_OCT[CHORDS[nxt][0][0]]))
    approach = nroot - 1 if nroot > root else nroot + 1
    for i, p in enumerate([root, None, fifth, None, root + 12, None, approach, None]):
        t = t0 + i * 0.25
        if p and t < until:
            note(inst, t, 0.2, p, vel)


def offbeats(inst, t0, ch_name, vel=62, until=99.0, octave=4):
    tones = [n(x + str(octave)) for x in CHORDS[ch_name][:3]]
    for i in (1, 3, 5, 7):
        t = t0 + i * 0.25
        if t < until:
            chord(inst, t, 0.12, tones, vel)


def groove(t0, vel=72, until=99.0, tamb=False, ride=False):
    for i in range(8):
        t = t0 + i * 0.25
        if t >= until:
            break
        if i in (0, 4):
            drum(t, KICK, vel + 6)
        if i in (2, 6):
            drum(t, SNARE if tamb else SIDE, vel - (0 if tamb else 6))
        drum(t, RIDE if ride else HAT, vel - 22 + (8 if i % 2 == 0 else 0))
        if tamb and i in (1, 3, 5, 7):
            drum(t, TAMB, vel - 26)


def heist16(t0, ch_name, vel=60, until=99.0):
    tones = [n(x + '3') for x in CHORDS[ch_name][:3]]
    pat = [tones[0], tones[0], tones[1], tones[0], tones[2], tones[0], tones[1] + 12 if len(tones) > 1 else tones[0], tones[2]]
    for i in range(16):
        t = t0 + i * 0.125
        if t < until:
            note('pizz', t, 0.1, pat[i % 8], vel + (10 if i % 4 == 0 else 0))


def setup_track():
    msgs = [(0, 0, mido.MetaMessage('set_tempo', tempo=500000))]
    for name, (ch, prog, vol, pan) in CH.items():
        msgs.append((0, 0, mido.Message('program_change', channel=ch, program=prog)))
        msgs.append((0, 0, mido.Message('control_change', channel=ch, control=7, value=vol)))
        msgs.append((0, 0, mido.Message('control_change', channel=ch, control=10, value=64 + pan)))
        msgs.append((0, 0, mido.Message('control_change', channel=ch, control=91, value=70)))
        msgs.append((0, 0, mido.Message('control_change', channel=ch, control=11, value=110)))
    msgs.append((0, 0, mido.Message('control_change', channel=DR, control=7, value=104)))
    msgs.append((0, 0, mido.Message('control_change', channel=DR, control=91, value=40)))
    return msgs


# ==========================================================================
# ACT 1 — 0.0 … 13.5   peaceful afternoon → the stare → 툭 → crash → smug
# ==========================================================================
# lullaby: celesta + music box, soft pizz bass, string pad (C | Am …)
for b, (chd, bar) in enumerate(zip(['C', 'Am'], LULL[:2])):
    t0 = 0.15 + b * 2.0
    melody('celesta', t0, bar, 70, dur=0.45, until=3.35)
    melody('musicbox', t0, bar, 52, octave=1, dur=0.4, until=3.35)
    tones = [n(x + '4') for x in CHORDS[chd]]
    for i in range(8):
        t = t0 + i * 0.25
        if t < 3.35:
            note('harp', t, 0.4, [tones[0] - 12, tones[1] - 12, tones[2] - 12, tones[1]][i % 4], 48)
    if t0 < 3.35:
        note('bass', t0, 0.4, n(CHORDS[chd][0] + '2'), 60)
        note('bass', t0 + 1.0, 0.4, n(CHORDS[chd][2] + '2'), 52)
        chord('strings', t0, min(2.0, 3.35 - t0), [n(x + '3') for x in CHORDS[chd]], 42)
# 3.4 the stare: tiptoe bassoon + pizz, low string drone
for t, p in [(3.5, 'A2'), (3.75, 'C3'), (4.0, 'E3'), (4.5, 'D#3'), (4.75, 'E3'), (5.0, 'A2'), (5.25, 'C3')]:
    note('bassoon', t, 0.16, p, 78)
for t in (3.5, 4.5):
    note('pizz', t, 0.12, 'A2', 70)
note('strings', 3.45, 2.1, 'A1', 46)
drum(3.5, WOODLO, 40); drum(4.5, WOODLO, 40)
# 5.6 the vase — DUN!
chord('brass', 5.6, 0.7, ['A2', 'E3', 'A3'], 108)
note('timp', 5.6, 0.8, 'A2', 115)
drum(5.6, KICK, 100)
note('strings', 5.6, 0.9, 'A1', 100)
# suspense: tremolo strings, then the finger draws the arrow (ticking pizz)
chord('trem', 5.75, 1.85, ['E4', 'A4'], 60)
swell('trem', 5.75, 7.55, 60, 112)
for i, p in enumerate(['E4', 'F4', 'F#4', 'G4', 'G#4']):
    note('pizz', 6.5 + i * 0.25, 0.1, p, 70 + i * 6)
stop_all(7.6)  # 툭. — silence while the books fall
# the vase tips in slow motion: high tremolo + timpani roll, cut on the crash
chord('trem', 9.25, 1.05, ['E5', 'E6'], 55)
swell('trem', 9.25, 10.3, 50, 120)
timp_roll(9.3, 10.28, 'E2', 40, 110)
stop_all(10.31)
# smug: clarinet "후훗" lick + pizz, then a snare pickup into the montage
for t, p, d in [(11.05, 'A4', 0.2), (11.3, 'C5', 0.2), (11.55, 'E5', 0.2), (11.8, 'D#5', 0.12), (11.95, 'E5', 0.5)]:
    note('clarinet', t, d, p, 74)
for t, p in [(11.05, 'A2'), (11.55, 'E2'), (12.05, 'A2')]:
    note('pizz', t, 0.14, p, 70)
note('bassoon', 12.55, 0.18, 'E2', 64)
note('bassoon', 12.8, 0.18, 'G#2', 66)
roll(13.0, 13.48, SNARE, 30, 92, rate=0.0625)

# ==========================================================================
# ACT 2 — 13.5 … 38.0   the caper (A minor, bars every 2 s from 13.5)
# ==========================================================================
M = 13.5


def bar_t(i):
    return M + 2.0 * i


def full_bar(i, chd, nxt, mel, vel=80, until=99.0, tamb=True, glock=False):
    t0 = bar_t(i)
    bass_bar(t0, chd, nxt, 92, until)
    offbeats('pizz', t0, chd, 64, until)
    groove(t0, 74, until, tamb)
    if mel:
        melody('clarinet', t0, mel, vel, until=until)
        melody('xylo', t0, mel, vel - 14, until=until)
        if glock:
            melody('glock', t0, mel, vel - 20, octave=1, until=until)


# i0 — B_yank: groove … the cloth flies (14.85) and the band stops dead
drum(M, CRASH, 96)
full_bar(0, 'Am', 'Am', P1[0], until=14.85)
stop_all(14.86)
# "…어라?" — a bassoon question
note('bassoon', 15.75, 0.2, 'E3', 80)
note('bassoon', 16.0, 0.35, 'A3', 84)
# i1/i2 — B_gentle: tiptoe from 16.5, everything slides… crashes from ~18.3
for k, p in enumerate(['A3', None, 'C4', None, 'E4', None, 'C4', None, 'A3', None, 'C4', None, 'E4', 'F4', 'E4', 'D#4']):
    if p:
        note('pizz', 16.5 + k * 0.125 * 2 if k < 8 else 17.5 + (k - 8) * 0.125, 0.1, p, 58 + k)
note('bass', 16.5, 0.2, 'A1', 70); note('bass', 17.5, 0.2, 'E2', 72)
roll(18.0, 18.48, SNARE, 40, 96)
drum(18.5, CRASH, 104)
# second half of i2: the band falls back in
for t, p in [(18.5, 'A1'), (18.75, 'E2'), (19.0, 'A2'), (19.25, 'G#1')]:
    note('bass', t, 0.2, p, 92)
for t in (18.75, 19.25):
    chord('pizz', t, 0.12, ['A4', 'C5', 'E5'], 66)
for i in range(4, 8):
    t = bar_t(2) + i * 0.25
    drum(t, KICK if i in (4, 6) else HAT, 74)
chord('brass', 19.25, 0.3, ['A3', 'C4', 'E4'], 104)  # the cake hits the floor
drum(19.25, CRASH2, 92)
# i3–i4 — C_soda: fizz (20.98) riser, rocket (21.27), TV (22.42)
full_bar(3, 'F', 'E7', P2[0], glock=True)
chord('trem', 20.5, 0.8, ['C5', 'F5'], 50); swell('trem', 20.5, 21.27, 50, 120)
full_bar(4, 'E7', 'Am', P2[1], glock=True)
chord('brass', 22.38, 0.35, ['E3', 'G#3', 'B3', 'D4'], 110); drum(22.38, CRASH, 106)
# i5 — D_castle: one block out … slow motion collapse … the doll (27.4)
full_bar(5, 'Am', 'Dm', P3[0], until=25.3)
chord('horn', 25.5, 2.0, ['D3', 'F3', 'A3'], 70); swell('horn', 25.5, 27.4, 60, 125)
chord('trem', 25.5, 2.0, ['A4', 'D5', 'F5'], 60); swell('trem', 25.5, 27.4, 55, 125)
timp_roll(25.5, 27.45, 'D2', 40, 112)
roll(26.5, 27.45, SNARE, 30, 100)
hit(27.5, 1.0, 'A', 'm')
# i7–i10 — balloons, flood, the quick hits
full_bar(7, 'Am', 'Am', P1[0], until=99, glock=True)
for t in (28.6, 29.1, 29.3, 29.55):  # pops: xylophone flicks
    for k, p in enumerate(['E5', 'A5', 'C6']):
        note('xylo', t + k * 0.04, 0.08, p, 70)
full_bar(8, 'Am', 'F', P1[1], glock=True)
drum(30.0, CRASH, 96)
full_bar(9, 'F', 'E7', P2[0], glock=True)
drum(32.56, SPLASH, 110); drum(32.56, CRASH, 90); chord('brass', 32.56, 0.3, ['F3', 'A3', 'C4'], 100)
full_bar(10, 'E7', 'E7', P2[1], glock=True)
for t, r, q in [(34.5, 'E', 'M'), (35.24, 'F', 'M'), (35.5, 'G', 'M'), (36.7, 'A', 'm'), (37.0, 'B', 'M')]:
    hit(t, 0.6, r, q)
bass_bar(bar_t(11), 'E7', 'Am', 96, 37.7)
groove(bar_t(11), 84, 37.7, True)
roll(37.15, 37.6, SNARE, 60, 110)
chord('trem', 36.0, 1.6, ['E5', 'G#5', 'B5'], 70); swell('trem', 36.0, 37.6, 70, 125)
hit(37.63, 1.0, 'A', 'm')
stop_all(38.02)

# ==========================================================================
# ACT 3 — 38.5 … 66.9   the whole house
# ==========================================================================
F = 38.5
# establishing (N5): low pad, harp, the clock ticking
chord('strings', F, 4.0, ['A1', 'E2', 'A2'], 50); swell('strings', F, F + 4.0, 70, 100)
for k in range(16):
    note('harp', F + 0.1 + k * 0.25, 0.5, ['A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'E3'][k % 8], 44)
for k in range(8):
    drum(F + k * 0.5, WOOD if k % 2 == 0 else WOODLO, 46)
note('celesta', F + 0.6, 0.8, 'E6', 50); note('celesta', F + 2.6, 0.8, 'C6', 50)
# the stare (42.1) → the paw (43.05 aim, 43.62 release): heist groove kicks in
for k, p in enumerate(['A2', 'A2', 'C3', 'A2', 'E3', 'A2', 'D#3', 'E3']):
    note('bassoon', 42.5 + k * 0.125, 0.1, p, 60 + k * 3)
roll(43.1, 43.6, SNARE, 40, 96)
drum(43.62, CRASH, 104); drum(43.62, KICK, 104)
for t0, chd, nxt in [(44.5, 'Am', 'Dm'), (46.5, 'Dm', 'E7')]:
    heist16(t0, chd, 62)
    bass_bar(t0, chd, nxt, 96)
heist16(43.62, 'Am', 62, until=44.5)
for k in range(4):
    note('bass', 43.62 + k * 0.25, 0.2, 'A1', 96)
for t0 in (43.62, 44.5, 46.5):
    for i in range(16):
        t = t0 + i * 0.125
        if t < (44.5 if t0 == 43.62 else t0 + 2.0) and t < 47.5:
            drum(t, HAT, 52 + (14 if i % 2 == 0 else 0))
            if i % 8 == 0:
                drum(t, KICK, 88)
            if i % 8 == 4:
                drum(t, SNARE, 84)
# the domino wave: a xylophone run climbing with it (44.4 → 45.8)
scale = ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G#5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F6', 'G#6', 'A6']
for k, p in enumerate(scale):
    note('xylo', 44.4 + k * 0.1, 0.12, p, 70 + k * 2)
# fizz (45.78) … rocket (46.02): riser + strings flying up
chord('trem', 45.5, 0.55, ['E5', 'A5'], 60); swell('trem', 45.5, 46.02, 60, 125)
drum(46.0, CRASH, 100)
run = ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6']
for k, p in enumerate(run):
    note('strings', 46.0 + k * 0.125, 0.14, p, 80 + k * 3)
chord('horn', 47.5, 0.5, ['E3', 'G#3', 'B3', 'D4'], 90); swell('horn', 47.5, 48.0, 80, 125)
roll(47.5, 47.98, CRASH, 40, 90, rate=0.0625)
hit(48.0, 1.0, 'A', 'm')  # the china shelf
# the coat rack
for t0, chd, nxt, mel in [(48.5, 'Am', 'Dm', P3[0]), (50.5, 'Dm', 'E7', None)]:
    until = 50.6 if t0 == 48.5 else 50.6
    heist16(t0, chd, 64, until)
    bass_bar(t0, chd, nxt, 96, until)
    if mel:
        melody('brass', t0, mel, 86, -1, until=until)
    groove(t0, 80, until, True)
note('bells', 50.67, 2.5, 'A4', 120); note('bells', 50.67, 2.5, 'A5', 100)  # 댕-!
drum(50.67, CHINA, 110); note('timp', 50.67, 1.0, 'A2', 120)
chord('trem', 50.8, 1.5, ['D5', 'F5', 'A5'], 60); swell('trem', 50.8, 52.3, 60, 125)
timp_roll(50.9, 52.27, 'E2', 40, 115)
hit(52.3, 1.0, 'F', 'M')  # the aquarium floods the hallway
drum(52.3, SPLASH, 120)
# toward the TV
for t0, chd, nxt, mel in [(52.5, 'Dm', 'E7', P4[0]), (54.5, 'E7', 'Am', None)]:
    until = 55.05 if t0 == 54.5 else 99
    heist16(t0, chd, 66, until)
    bass_bar(t0, chd, nxt, 100, until)
    if mel:
        melody('brass', t0, mel, 92, -1, until=until)
        melody('glock', t0, mel, 70, 1, until=until)
    groove(t0, 86, until, True)
roll(54.0, 55.08, SNARE, 50, 118)
hit(55.1, 1.0, 'E', 'M')  # the new TV
# the house in ruins: tutti
for k, (t0, chd, nxt, mel) in enumerate([(55.6, 'Am', 'F', P1[0])]):
    bass_bar(t0, chd, nxt, 104, 57.6)
    offbeats('pizz', t0, chd, 76, 57.6)
    melody('brass', t0, mel, 104, -1, dur=0.24, until=57.6)
    melody('strings', t0, mel, 96, 0, dur=0.24, until=57.6)
    melody('glock', t0, mel, 80, 1, until=57.6)
    groove(t0, 92, 57.6, True)
melody('brass', 57.6, ['E5', None, 'E5', None], 108, -1)
chord('brass', 57.6, 0.5, ['E3', 'G#3', 'B3', 'D4'], 112)
chord('strings', 58.1 - 0.5, 0.5, ['E2', 'B2', 'G#3', 'E4'], 104)
roll(57.6, 58.08, SNARE, 80, 120)
hit(58.05, 1.0, 'A', 'M')
stop_all(58.25)  # …click.
# the owner: just a muted "uh-oh"
note('bassoon', 60.1, 0.42, 'Bb2', 72); note('bassoon', 60.6, 0.9, 'A2', 66)
# the innocent cat: the lullaby again, very small
for b, (chd, bar) in enumerate(zip(['C', 'Am', 'F', 'G'], LULL)):
    t0 = 61.6 + b * 1.25
    melody('celesta', t0, bar[:5], 64, dur=0.45)
    chord('strings', t0, 1.25, [n(x + '3') for x in CHORDS[chd]], 36)
note('musicbox', 66.3, 0.6, 'C6', 50)

# ==========================================================================
# TITLE — 66.9 … 72.5   (logo slam at 67.2)
# ==========================================================================
T = 67.2
roll(66.9, 67.18, SNARE, 50, 110)
hit(T, 1.0, 'C', 'M')
note('timp', T, 0.8, 'C2', 125)
for b, (chd, nxt, bar) in enumerate([('C', 'Am', LULL[0]), ('F', 'G', LULL[2])]):
    t0 = T + 0.5 + b * 2.0
    bass_bar(t0, chd, nxt, 90)
    offbeats('pizz', t0, chd, 62)
    groove(t0, 70, 99, True)
    melody('brass', t0, bar, 84, -1, dur=0.3)
    melody('glock', t0, bar, 70, 0)
    melody('strings', t0, bar, 74, 0, dur=0.3)
# button
chord('brass', 71.7, 0.25, ['G3', 'B3', 'D4', 'F4'], 100)
chord('brass', 71.95, 0.9, ['C3', 'E3', 'G3', 'C4'], 116)
chord('strings', 71.95, 1.0, ['C2', 'G2', 'E3', 'C4', 'G4'], 106)
note('timp', 71.95, 1.0, 'C2', 120); drum(71.95, CRASH, 110); drum(71.95, KICK, 110)
note('glock', 71.95, 1.2, 'C6', 90)
stop_all(73.4)
# stinger: one pizz plink as the cat looks at us… then nothing (the mug does the rest)
note('pizz', 73.2, 0.12, 'E4', 54)
note('pizz', 73.95, 0.12, 'D#4', 56)
# after the cut to black
note('celesta', 76.2, 1.0, 'C6', 46)

# --------------------------------------------------------------------------
mid = mido.MidiFile(ticks_per_beat=480)
tr = mido.MidiTrack()
mid.tracks.append(tr)
allm = sorted(setup_track() + events, key=lambda e: (e[0], e[1]))
last = 0
for tick, _, msg in allm:
    tr.append(msg.copy(time=tick - last))
    last = tick
tr.append(mido.MetaMessage('end_of_track', time=at(1.0)))
mid.save(sys.argv[1] if len(sys.argv) > 1 else 'music.mid')
print('notes:', sum(1 for e in events if e[2].type == 'note_on'), 'length:', round(last / TPS, 2), 's')
