#!/bin/sh
# contact sheet of a clip: sheet.sh clip.mp4 out.png [fps=2] [cols=6] [width=320]
ffmpeg -y -loglevel error -i "$1" -vf "fps=${3:-2},scale=${5:-320}:-1,drawtext=text='%{pts\:hms}':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.5,tile=${4:-6}x$(( ( $(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$1") * ${3:-2} / 15 + ${4:-6} - 1 ) / ${4:-6} ))" -frames:v 1 "$2"
