#!/bin/sh
# Loudness-normalise the mix (two-pass loudnorm: -14 LUFS, -1.5 dBTP) and mux it with the picture.
#   sh render/master.sh out/audio/mix_raw.wav out/picture.mp4 out/final.mp4
set -e
RAW=$1; PIC=$2; OUT=$3
J=$(ffmpeg -hide_banner -i "$RAW" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -hide_banner -loglevel error -y -i "$RAW" -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s16le "${RAW%_raw.wav}.wav"
ffmpeg -hide_banner -loglevel error -y -i "$PIC" -i "${RAW%_raw.wav}.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary" | grep -E "I:|Peak:|LRA:"
