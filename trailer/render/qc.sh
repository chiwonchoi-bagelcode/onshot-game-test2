#!/bin/sh
# Quick QC of a finished trailer: stream info, loudness/true peak, a 1 fps contact sheet.
#   sh render/qc.sh release/wajangchang-nyangi-trailer-1080p.mp4 out/qc
set -e
IN=$1; OUT=${2:-out/qc}
mkdir -p "$OUT"
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,sample_rate,channels -of compact "$IN"
ffmpeg -hide_banner -i "$IN" -map 0:a -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p' | grep -E "I:|LRA:|Peak:"
ffmpeg -hide_banner -loglevel error -y -i "$IN" -vf "fps=1,scale=384:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=13:fontcolor=white:box=1:boxcolor=black@0.5,tile=8x10" -frames:v 1 "$OUT/sheet.png"
ffmpeg -hide_banner -loglevel error -y -i "$IN" -map 0:a -ac 1 -ar 48000 "$OUT/audio.wav"
sox "$OUT/audio.wav" -n rate 16k spectrogram -x 2000 -y 300 -z 70 -t "final mix" -o "$OUT/spectrogram.png"
echo "QC files in $OUT"
