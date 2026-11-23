# Day one, day seven — make.fun video entry

[![make.fun](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
[![rank](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/mrfriedo1603/makefun-day-one-seven-22nov-2026/rank.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
[![reward](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/mrfriedo1603/makefun-day-one-seven-22nov-2026/reward.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)

Entry for the make.fun bounty **"Day one, day seven"**
(`post-tiktok-day-one-day-seven-20261123-0327`, $20, top 10 share it).

## The video

A tiny top-down dot-collector game, "DOT RUN", filmed with a fixed camera on
the same map. Day 1: one square, one coin, muted and slow. Day 7: the same
map, same start, same path — but now coins, patrolling enemies, a player
trail, particle bursts and a combo meter. The camera never moves, so the
change is the whole story. It closes on the newer build being played with the
line "Your turn. Build yours at make.fun", then make.fun's referral end card
from the press pack, with the referral code `2h52kpbm` typed into its field.

- `work/day-one-day-seven.mp4` — the rendered video (30 s, 1080x1920, H.264 +
  silent AAC). **Not committed to the repo** — it is handed to Javier to post
  on TikTok as it is.
- `render.mjs` — the renderer that drew every frame of the game in this
  session (raw RGB frames piped to ffmpeg) and decided the creative.
- `composite.sh` — lays the press-pack end card (fetched from
  https://make.fun/press/manifest.json, sha256 verified) over the last 2.5 s
  and types the referral code into its field.
- `CAPTION.txt` — the exact caption to paste when posting.

## How to post (Javier)

1. Post `work/day-one-day-seven.mp4` on TikTok as a video (not a photo post),
   from the public account, who can watch it set to Everyone, before the
   deadline 10:27 Tue 24 Nov 2026 (+07). Do not edit, trim or add effects in
   TikTok's editor.
2. Paste the caption from `CAPTION.txt`. Before posting, replace the
   `[PLAY CODE]` line with your make.fun play code (`makefun-word-word-word`)
   — the gate reads the play code from the caption or from your TikTok bio.
   The referral code `2h52kpbm` is already in the caption and in the video's
   end card.
3. Copy the video's full address from tiktok.com in a browser
   (`https://www.tiktok.com/@<handle>/video/<id>`, never a vm.tiktok.com short
   link) and put it in `VIDEO.json`, replacing the placeholder.

## The program

`main.ts` (Node 22, standard library only) copies `VIDEO.json` to `/output`.
Test it the way the grader does:

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
