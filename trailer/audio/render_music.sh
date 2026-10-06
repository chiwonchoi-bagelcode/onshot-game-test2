#!/bin/sh
# Render the score with FluidSynth + MuseScore General (MIT-licensed SoundFont).
#   sh audio/render_music.sh out/audio/music.mid out/audio/music.wav
SF2=${SF2:-/usr/share/sounds/sf2/MuseScore_General_Full.sf2}
fluidsynth -ni -q -r 48000 -g 0.55 \
  -o synth.reverb.active=1 -o synth.reverb.room-size=0.62 -o synth.reverb.damp=0.35 -o synth.reverb.width=0.9 -o synth.reverb.level=0.55 \
  -o synth.chorus.active=0 -o synth.polyphony=512 \
  -F "$2" "$SF2" "$1"
