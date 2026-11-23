#!/bin/sh
# composite.sh — finishes the video: lays make.fun's referral end card
# (press pack, 9:16 transparent webm, fetched from the manifest in this session,
# sha256 verified) over the last 2.5 s of work/clip.mp4, with the clip blurred
# and desaturated underneath, and types the referral code into the card's field
# once the field comes to rest (1.433 s into the card). The card itself is used
# exactly as downloaded: never redrawn, re-coloured, cropped or cut.
#
# REFERRAL_CODE is the one placeholder: swap it here (and in render.mjs) to
# re-render with a different code. Current code: 2h52kpbm.
# Font for the code is JetBrains Mono Bold, per the press-pack manifest
# (fallback in the manifest is Inter Bold); the .ttf was fetched to /tmp.
set -e
cd "$(dirname "$0")/work"
CODE="2h52kpbm"
FONT="/tmp/JetBrainsMono-Bold.ttf"
[ -f "$FONT" ] || FONT="/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
ffmpeg -y -v error \
  -i clip.mp4 -i card-9x16.webm -f lavfi -i anullsrc=r=44100:cl=stereo \
  -filter_complex "\
[0:v]split[base][tail]; \
[base]trim=end=27.5,setpts=PTS-STARTPTS[head]; \
[tail]trim=start=27.5,setpts=PTS-STARTPTS,gblur=sigma=12,eq=saturation=0.3[tailb]; \
[tailb][1:v]overlay=0:0:eof_action=pass[carded]; \
[carded]drawbox=x=208:y=1230:w=9:h=82:color=white:t=fill:enable='gte(t,1.433)'[covered]; \
[covered]drawtext=fontfile=$FONT:text='$CODE':x=210:y=1232:fontsize=62:fontcolor=0x191419:enable='gte(t,1.433)'[withcode]; \
[head][withcode]concat=n=2:v=1:a=0[vout]" \
  -map "[vout]" -map 2:a -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac \
  -shortest -movflags +faststart day-one-day-seven.mp4
echo done
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,codec_name -of default=noprint_wrappers=1 day-one-day-seven.mp4
