#!/bin/sh
# Full trailer pipeline: picture → game-sound stems → score → designed layer →
# mix → master → final MP4. Run from the trailer/ folder with the trailer dev
# server already up (npx vite --config vite.config.ts) and the Python venv
# (numpy, scipy, soundfile, mido) on PATH as `python`.
#
#   sh render/all.sh            # 1920x1080 @ 30 fps
#   PREVIEW=1 sh render/all.sh  # 480x270 @ 15 fps, a few minutes
set -e
if [ -n "$PREVIEW" ]; then W=480; H=270; FPS=15; CLIPS=out/prev; CRF=22; else W=1920; H=1080; FPS=30; CLIPS=out/clips; CRF=12; fi
PY=${PY:-python}
mkdir -p out/audio "$CLIPS" release

# 1. picture: every shot is a real level simulated by the game, filmed by the trailer camera
node render/capture.mjs --edl --w $W --h $H --fps $FPS --out "$CLIPS" --crf $CRF
node render/edit.mjs --clips "$CLIPS" --out "$CLIPS/picture.mp4" --fps $FPS --crf $([ -n "$PREVIEW" ] && echo 22 || echo 14)

# 2. sound: the game's own synth replays every recorded sound call, plus hand-placed cues
node render/sfx.mjs --clips "$CLIPS" --out out/audio/sfx

# 3. score + designed layer (narration wavs in audio/vo are the masters; see audio/tts.py)
$PY audio/music.py out/audio/music.mid
sh audio/render_music.sh out/audio/music.mid out/audio/music.wav
$PY audio/design.py out/audio/design.wav

# 4. mix, master (-14 LUFS) and mux
$PY audio/mix.py out/audio/sfx out/audio/music.wav out/audio/design.wav out/audio/mix_raw.wav
if [ -n "$PREVIEW" ]; then
  sh render/master.sh out/audio/mix_raw.wav "$CLIPS/picture.mp4" out/preview.mp4
else
  sh render/master.sh out/audio/mix_raw.wav "$CLIPS/picture.mp4" out/master.mp4
  sh render/deliver.sh out/master.mp4 release/wajangchang-nyangi-trailer-1080p.mp4
fi
