// render.mjs — renders the "Day one, day seven" TikTok video in this session.
// Creative (decided by the agent in this session): a tiny top-down dot-collector
// game, "DOT RUN", filmed with a fixed camera on the same map. Day 1: one square,
// one coin, muted and slow. Day 7: the same map, same start, same path — but now
// coins, patrolling enemies, a player trail, particle bursts and a combo meter:
// visibly more going on. The camera never moves, so the change is the whole story.
// Hook first (my agent built a game, then updated it for 7 days), a "7 days of
// updates later" cut, then a close on the newer build being played with the line
// inviting viewers to build theirs at make.fun. The make.fun referral end card
// is laid over the last 2.5 s in a separate ffmpeg step (see composite.sh), with
// the referral code typed into its field.
//
// Usage: node render.mjs   (writes raw RGB24 frames to ffmpeg on stdin, which
// encodes work/clip.mp4 — 1080x1920, 30 fps, 30 s, no audio yet.)

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

const W = 1080;
const H = 1920;
const FPS = 30;
const SECONDS = 30;
const FRAMES = FPS * SECONDS;

// ---- referral code placeholder -------------------------------------------
// REFERRAL_CODE is Javier's make.fun referral code. It goes ONLY in the end
// card's empty field (composite.sh draws it there with drawtext). Swap this one
// constant to re-render with a different code. The TikTok caption needs a
// different thing — Javier's play code (makefun-word-word-word) — see CAPTION.txt.
export const REFERRAL_CODE = '2h52kpbm';

// ---- tiny deterministic PRNG ----------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261123);

// ---- frame buffer helpers ---------------------------------------------------
const frame = Buffer.alloc(W * H * 3);

function fillRect(x, y, w, h, rgb) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > W) w = W - x;
  if (y + h > H) h = H - y;
  if (w <= 0 || h <= 0) return;
  const row = Buffer.alloc(w * 3);
  for (let i = 0; i < w; i++) { row[i * 3] = rgb[0]; row[i * 3 + 1] = rgb[1]; row[i * 3 + 2] = rgb[2]; }
  for (let yy = y; yy < y + h; yy++) row.copy(frame, (yy * W + x) * 3);
}

function circle(cx, cy, r, rgb) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    fillRect(cx - half, cy + dy, half * 2 + 1, 1, rgb);
  }
}

function ring(cx, cy, r, thick, rgb) {
  for (let i = 0; i < thick; i++) {
    const rr = r - i;
    for (let dy = -rr; dy <= rr; dy++) {
      const half = Math.floor(Math.sqrt(rr * rr - dy * dy));
      const inner = Math.floor(Math.sqrt(Math.max(0, (rr - 1) * (rr - 1) - dy * dy)));
      if (half > inner) {
        fillRect(cx - half, cy + dy, half - inner, 1, rgb);
        fillRect(cx + inner + 1, cy + dy, half - inner, 1, rgb);
      }
    }
  }
}

// ---- 5x7 bitmap font (my own glyphs) ----------------------------------------
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
};

function textWidth(str, scale) {
  return str.length * 6 * scale - scale;
}

function drawText(str, x, y, scale, rgb) {
  str = str.toUpperCase();
  for (let ci = 0; ci < str.length; ci++) {
    const g = GLYPHS[str[ci]] || GLYPHS['?'];
    const ox = x + ci * 6 * scale;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === '1') fillRect(ox + c * scale, y + r * scale, scale, scale, rgb);
      }
    }
  }
}

function drawTextCentered(str, cy, scale, rgb) {
  drawText(str, (W - textWidth(str, scale)) / 2, cy, scale, rgb);
}

// ---- the game: same map, same start, both days ------------------------------
const ARENA = { x: 90, y: 560, w: 900, h: 900 };
const PATH = [
  [180, 650], [900, 650], [900, 1370], [180, 1370],
];
const PERIMETER = 2 * (720 + 720);

function pathPoint(dist) {
  let d = ((dist % PERIMETER) + PERIMETER) % PERIMETER;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = PATH[i];
    const [x2, y2] = PATH[(i + 1) % 4];
    const seg = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
    d -= seg;
  }
  return PATH[0];
}

// Day-7 coins sit on the player's path so the same run collects them.
const COIN_SPOTS = [
  [360, 650], [720, 650], [900, 830], [900, 1190],
  [720, 1370], [360, 1370], [180, 1190], [180, 830],
];
const DAY1_COIN = [540, 650];

const ENEMIES = [
  { loop: [[300, 800], [780, 800], [780, 1220], [300, 1220]], speed: 260, off: 0 },
  { loop: [[780, 800], [780, 1220], [300, 1220], [300, 800]], speed: 200, off: 900 },
  { loop: [[540, 700], [840, 1010], [540, 1320], [240, 1010]], speed: 300, off: 400 },
];

function loopPoint(loop, dist) {
  let per = 0;
  const segs = [];
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    const s = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    segs.push(s); per += s;
  }
  let d = ((dist % per) + per) % per;
  for (let i = 0; i < loop.length; i++) {
    if (d <= segs[i]) {
      const [x1, y1] = loop[i];
      const [x2, y2] = loop[(i + 1) % loop.length];
      const t = segs[i] === 0 ? 0 : d / segs[i];
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
    d -= segs[i];
  }
  return loop[0];
}

// ---- palette ------------------------------------------------------------------
const C = {
  bgTop: [13, 17, 23], bgBot: [22, 27, 34],
  arena: [26, 34, 48], arenaDay7: [24, 40, 58],
  grid: [42, 52, 70], border: [90, 110, 140],
  player: [125, 211, 252], playerDay7: [34, 211, 238],
  trail: [34, 211, 238], coin: [251, 191, 36], coinDim: [160, 130, 60],
  enemy: [239, 68, 68], enemyRing: [127, 29, 29],
  white: [229, 231, 235], dim: [148, 163, 184], amber: [251, 191, 36],
  pink: [244, 114, 182], green: [74, 222, 128], band: [10, 12, 18],
};
const PARTICLE_COLORS = [[251, 191, 36], [34, 211, 238], [244, 114, 182], [74, 222, 128]];

// ---- per-run state (rebuilt deterministically per frame from t) -----------------
// Day-7 coins respawn on a fixed 2.5 s cycle; collect events are derived from
// the player's distance along the path, so the render is a pure function of t.
function day7State(t) {
  // t = seconds into the day-7 segment (0..11.5)
  const dist = 380 * t;
  const [px, py] = pathPoint(dist);
  let score = 0;
  let combo = 0;
  const coins = [];
  const bursts = [];
  for (let i = 0; i < COIN_SPOTS.length; i++) {
    // Each spot's coin is collected when the player passes it, then respawns
    // 2.5 s later. Coin i is first passed at dist_i along the path.
    const [cx, cy] = COIN_SPOTS[i];
    const spotDist = pathDistOf(cx, cy);
    const cycle = 2880 + 380 * 2.5; // one lap + respawn delay, in px
    let collectedAt = -1;
    for (let lap = 0; lap < 3; lap++) {
      const hit = spotDist + lap * cycle;
      if (hit <= dist) collectedAt = hit / 380;
      else break;
    }
    if (collectedAt < 0) {
      coins.push({ x: cx, y: cy, taken: false });
    } else {
      score += 5;
      combo += 1;
      const since = t - collectedAt;
      if (since < 2.5) {
        // burst particles still flying
        for (let p = 0; p < 10; p++) {
          const a = (p / 10) * Math.PI * 2 + i;
          const sp = 120 + 90 * ((p * 7 + i) % 5) / 5;
          bursts.push({
            x: cx + Math.cos(a) * sp * since,
            y: cy + Math.sin(a) * sp * since + 60 * since * since,
            life: 1 - since / 0.6,
            color: PARTICLE_COLORS[(p + i) % PARTICLE_COLORS.length],
          });
        }
      } else {
        coins.push({ x: cx, y: cy, taken: false });
      }
    }
  }
  return { px, py, score, combo, coins, bursts };
}

function pathDistOf(x, y) {
  // distance along the rectangular path of a point that sits on it
  if (y === 650) return x - 180;
  if (x === 900) return 720 + (y - 650);
  if (y === 1370) return 720 + 720 + (900 - x);
  return 720 + 720 + 720 + (1370 - y);
}

// ---- frame drawing ---------------------------------------------------------------
function drawBackground(day7) {
  const bands = 32;
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    const rgb = [
      Math.round(C.bgTop[0] + (C.bgBot[0] - C.bgTop[0]) * f),
      Math.round(C.bgTop[1] + (C.bgBot[1] - C.bgTop[1]) * f),
      Math.round(C.bgTop[2] + (C.bgBot[2] - C.bgTop[2]) * f),
    ];
    fillRect(0, (H / bands) * i, W, H / bands + 1, rgb);
  }
  fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h, day7 ? C.arenaDay7 : C.arena);
  for (let gx = ARENA.x + 90; gx < ARENA.x + ARENA.w; gx += 90) {
    fillRect(gx, ARENA.y, 2, ARENA.h, C.grid);
  }
  for (let gy = ARENA.y + 90; gy < ARENA.y + ARENA.h; gy += 90) {
    fillRect(ARENA.x, gy, ARENA.w, 2, C.grid);
  }
  fillRect(ARENA.x - 6, ARENA.y - 6, ARENA.w + 12, 6, C.border);
  fillRect(ARENA.x - 6, ARENA.y + ARENA.h, ARENA.w + 12, 6, C.border);
  fillRect(ARENA.x - 6, ARENA.y - 6, 6, ARENA.h + 12, C.border);
  fillRect(ARENA.x + ARENA.w, ARENA.y - 6, 6, ARENA.h + 12, C.border);
}

function drawCoin(x, y, dim, t) {
  const pulse = dim ? 0 : Math.round(3 * Math.sin(t * 6));
  circle(x, y, 26 + pulse, dim ? C.coinDim : C.coin);
  circle(x, y, 18 + pulse, dim ? [140, 112, 52] : [253, 224, 71]);
  drawText('$', x - 12, y - 18, 5, dim ? [120, 96, 44] : [120, 80, 10]);
}

function drawPlayer(x, y, size, color) {
  fillRect(x - size / 2, y - size / 2, size, size, color);
  fillRect(x - size / 2 + 8, y - size / 2 + 8, size - 16, size - 16, [10, 12, 18]);
  fillRect(x - 6, y - 6, 12, 12, color);
}

function drawHud(day, score, combo) {
  drawText(day === 1 ? 'DAY 1' : 'DAY 7', 90, 120, 7, day === 1 ? C.dim : C.amber);
  const s = `SCORE ${score}`;
  drawText(s, W - 90 - textWidth(s, 7), 120, 7, C.white);
  if (day === 7 && combo >= 2) {
    const c = `COMBO X${combo}`;
    drawText(c, W - 90 - textWidth(c, 5), 200, 5, C.pink);
  }
  drawText(day === 1 ? 'ONE SQUARE. ONE COIN.' : 'SAME MAP. SAME START. MORE EVERYTHING.', 90, 1520, 4, C.dim);
}

function renderFrame(f) {
  const t = f / FPS;
  frame.fill(0);
  if (t < 2.5) {
    // Hook: title over the faint day-1 map.
    drawBackground(false);
    const [px, py] = pathPoint(150 * 0.8);
    drawPlayer(px, py, 46, C.player);
    drawCoin(DAY1_COIN[0], DAY1_COIN[1], true, t);
    fillRect(0, 700, W, 420, C.band);
    drawTextCentered('MY AGENT', 730, 11, C.white);
    drawTextCentered('BUILT A GAME', 830, 11, C.amber);
    drawTextCentered('THEN UPDATED IT FOR 7 DAYS', 980, 4, C.dim);
    return;
  }
  if (t < 11) {
    // Day 1 gameplay.
    const dt = t - 2.5;
    drawBackground(false);
    const [px, py] = pathPoint(150 * dt);
    const collected = 150 * dt >= pathDistOf(DAY1_COIN[0], DAY1_COIN[1]);
    if (!collected) drawCoin(DAY1_COIN[0], DAY1_COIN[1], true, t);
    drawPlayer(px, py, 46, C.player);
    drawHud(1, collected ? 1 : 0, 0);
    return;
  }
  if (t < 12.5) {
    // Transition: 7 days of updates later.
    const p = (t - 11) / 1.5;
    drawBackground(true);
    fillRect(0, 780, W, 360, C.band);
    drawTextCentered('7 DAYS OF', 810, 10, C.white);
    drawTextCentered('UPDATES LATER', 910, 10, C.amber);
    for (let i = 0; i < 7; i++) {
      const cx = W / 2 - 3 * 70 + i * 70;
      const filled = p * 7 > i;
      circle(cx, 1060, 18, filled ? C.amber : C.grid);
    }
    return;
  }
  if (t < 24) {
    // Day 7 gameplay: same map, same start, visibly more going on.
    const dt = t - 12.5;
    drawBackground(true);
    const st = day7State(dt);
    // trail
    for (let i = 14; i >= 1; i--) {
      const [tx, ty] = pathPoint(380 * dt - i * 26);
      const a = 1 - i / 15;
      const s = 46 * a;
      if (s > 4) fillRect(tx - s / 2, ty - s / 2, s, s, [16 + 18 * a, 90 + 120 * a, 110 + 128 * a].map(Math.round));
    }
    for (const c of st.coins) drawCoin(c.x, c.y, false, t);
    for (const b of st.bursts) {
      if (b.life > 0) fillRect(b.x - 5, b.y - 5, 10, 10, b.color);
    }
    for (const e of ENEMIES) {
      const [ex, ey] = loopPoint(e.loop, e.speed * dt + e.off);
      circle(ex, ey, 34, C.enemy);
      ring(ex, ey, 34, 5, C.enemyRing);
      drawText('X', ex - 12, ey - 17, 5, [255, 255, 255]);
    }
    drawPlayer(st.px, st.py, 46, C.playerDay7);
    drawHud(7, st.score, st.combo);
    return;
  }
  // Close: the newer build being played, with the invite line.
  const dt = t - 12.5; // day-7 play continues underneath
  drawBackground(true);
  const st = day7State(Math.min(dt, 11.5));
  for (const c of st.coins) drawCoin(c.x, c.y, false, t);
  for (const b of st.bursts) {
    if (b.life > 0) fillRect(b.x - 5, b.y - 5, 10, 10, b.color);
  }
  for (const e of ENEMIES) {
    const [ex, ey] = loopPoint(e.loop, e.speed * Math.min(dt, 11.5) + e.off);
    circle(ex, ey, 34, C.enemy);
    ring(ex, ey, 34, 5, C.enemyRing);
  }
  drawPlayer(st.px, st.py, 46, C.playerDay7);
  drawHud(7, st.score, st.combo);
  fillRect(0, 700, W, 380, C.band);
  drawTextCentered('YOUR TURN.', 730, 12, C.white);
  drawTextCentered('BUILD YOURS AT MAKE.FUN', 870, 5, C.amber);
}

// ---- encode ----------------------------------------------------------------------
async function main() {
  const outPath = new URL('./work/clip.mp4', import.meta.url).pathname;
  const ff = spawn('ffmpeg', [
    '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS),
    '-i', '-', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-preset', 'medium', '-crf', '20', outPath,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    renderFrame(f);
    if (!ff.stdin.write(frame)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${FRAMES} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  ff.stdin.end();
  await new Promise((resolve, reject) => {
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  console.log(`wrote ${outPath} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => { console.error(err); process.exit(1); });
