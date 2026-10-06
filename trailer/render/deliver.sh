#!/bin/sh
# Delivery encode: H.264 High@4.1, BT.709, AAC 256k, faststart. Quality-first
# (CRF 17); falls back to a two-pass encode if the file would exceed ~48 MB.
#   sh render/deliver.sh out/master.mp4 release/wajangchang-nyangi-trailer-1080p.mp4
set -e
IN=$1; OUT=$2
TAGS="-pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
ffmpeg -hide_banner -loglevel error -y -i "$IN" -map 0 -c:v libx264 -preset slow -tune animation -crf 17 -profile:v high -level 4.1 $TAGS -c:a copy -movflags +faststart "$OUT"
SIZE=$(stat -c %s "$OUT")
if [ "$SIZE" -gt 50331648 ]; then
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
  KBPS=$(python3 -c "print(int(48*8*1024*1024/float('$DUR')/1000 - 270))")
  echo "too big ($SIZE bytes): two-pass at ${KBPS}k"
  ffmpeg -hide_banner -loglevel error -y -i "$IN" -map 0:v -c:v libx264 -preset slow -tune animation -b:v ${KBPS}k -pass 1 -passlogfile /tmp/x264pass $TAGS -an -f mp4 /dev/null
  ffmpeg -hide_banner -loglevel error -y -i "$IN" -map 0 -c:v libx264 -preset slow -tune animation -b:v ${KBPS}k -pass 2 -passlogfile /tmp/x264pass -profile:v high -level 4.1 $TAGS -c:a copy -movflags +faststart "$OUT"
fi
ls -la "$OUT"
ffprobe -v error -show_entries format=duration,bit_rate:stream=codec_name,width,height,r_frame_rate,color_space -of compact "$OUT"
