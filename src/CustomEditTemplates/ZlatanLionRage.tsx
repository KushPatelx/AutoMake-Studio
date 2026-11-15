import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, SAFE, ProgressBar } from "../shared";
import {
  EditProps,
  EditSceneProps,
  EditVideo,
  beatPulseAt,
} from "../editShared";
import { loadFont } from "@remotion/google-fonts/BebasNeue";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

// STORM LION palette: onyx, lion gold, rage red, storm blue, bone white
const ONYX = "#0A0A0C";
const LION_GOLD = "#E3A72F";
const RAGE_RED = "#C1121F";
const STORM_BLUE = "#1B4F9C";
const BONE_WHITE = "#F3EFE6";
const EMBER_ORANGE = "#D9772B";
const BOLT_BLUE = "#BFD4FF";

const OVERLAP_FRAMES = 10;

// 6 different transitions rotate through the cuts:
// 0 strike-slash | 1 lightning strike | 2 slat shutter
// 3 glass shatter | 4 whip pan | 5 titan slam
const TRANSITION_COUNT = 6;

const SLASH_ANGLES = [118, 242, 62, 298, 100, 260];
const slashOf = (i: number) => {
  const ang = SLASH_ANGLES[((i % 6) + 6) % 6];
  const a = (ang * Math.PI) / 180;
  return { ang, a, x: Math.sin(a), y: -Math.cos(a) };
};

type Pt = { x: number; y: number };

// Jagged lightning via midpoint displacement
const genBolt = (
  seed: string,
  a: Pt,
  b: Pt,
  rough: number,
  iters: number,
): Pt[] => {
  let pts: Pt[] = [a, b];
  let disp = rough;
  for (let it = 0; it < iters; it++) {
    const next: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = (random(`${seed}-${it}-${i}`) - 0.5) * 2 * disp;
      next.push(
        {
          x: (p.x + q.x) / 2 + (-dy / len) * off,
          y: (p.y + q.y) / 2 + (dx / len) * off,
        },
        q,
      );
    }
    pts = next;
    disp *= 0.55;
  }
  return pts;
};
const toPts = (pts: Pt[]) =>
  pts.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(" ");

const easeSnap = (t: number) => 1 - Math.pow(1 - t, 3);

const SLAT_N = 9;
const SHARD_COLS = 6;
const SHARD_ROWS = 10;

const Scene: React.FC<EditSceneProps> = ({
  src,
  seg,
  index,
  total,
  totalFrames,
  bpm,
  beatFrames,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const g = seg.start + frame;
  const duration = Math.max(1, seg.duration);
  const span = duration + OVERLAP_FRAMES;
  const isFirst = index === 0;

  const accent = brand.color || LION_GOLD;
  const brandName = brand.name || "APEX";

  // ================================================
  // 01. BEAT SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const thud = beatPulseAt(g, beatFrames, 3.1);
  const roar = beatPulseAt(g + 3, beatFrames, 2.2);
  const sub = beatPulseAt(g + 5, beatFrames, 1.6);

  const incType = isFirst ? -1 : index % TRANSITION_COUNT;
  const nxtType = (index + 1) % TRANSITION_COUNT;
  const dir = index % 2 === 0 ? 1 : -1;
  const inc = slashOf(index);
  const nxt = slashOf(index + 1);

  // ================================================
  // 02. VELOCITY SPEED RAMP
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const ramp =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.42], CLAMP)
      : u < 0.78
        ? interpolate(u, [0.2, 0.78], [0.42, 0.58], CLAMP)
        : interpolate(u, [0.78, 1], [0.58, 1], CLAMP);

  const exitCut = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP,
  );
  const landSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 220, mass: 0.6 },
  });
  const enterArc = isFirst ? 0 : Math.max(0, 1 - landSpring);
  const exitArc = Math.pow(exitCut, 2.2);
  const warpEnergy = Math.min(1, enterArc + exitArc);

  // ================================================
  // 03. TRANSITION ENGINE (6 different ways to change the image)
  // ================================================
  const wipeActive = !isFirst && frame < OVERLAP_FRAMES;
  const wipeT = interpolate(frame, [0, OVERLAP_FRAMES - 1], [0, 1], CLAMP);

  // --- T0 STRIKE-SLASH (diagonal hard edge) ---
  const slashE = 1 - Math.pow(1 - wipeT, 3.2);
  const pPct = -3 + slashE * 106;
  const gradLen =
    Math.abs(1080 * Math.sin(inc.a)) + Math.abs(1920 * Math.cos(inc.a));
  const tOff = (pPct / 100 - 0.5) * gradLen;
  const ex = 540 + inc.x * tOff;
  const ey = 960 + inc.y * tOff;
  const nX = Math.cos(inc.a);
  const nY = Math.sin(inc.a);

  // --- T2 SLAT SHUTTER ---
  const slatH = 1920 / SLAT_N;
  const slats = Array.from({ length: SLAT_N }, (_, i) => {
    const local = Math.min(1, Math.max(0, (wipeT * 1.35 - i * 0.06) / 0.6));
    const pp = -3 + easeSnap(local) * 106;
    return { pp, from: i % 2 === 0 ? 90 : 270, y: i * slatH };
  });

  // --- T3 GLASS SHATTER ---
  const shardData =
    incType === 3 && wipeActive
      ? (() => {
          const cx = 540 + dir * 200;
          const cy = 960;
          const tris: { pts: Pt[]; delay: number }[] = [];
          const cw = 1080 / SHARD_COLS;
          const rh = 1920 / SHARD_ROWS;
          for (let r = 0; r < SHARD_ROWS; r++) {
            for (let c = 0; c < SHARD_COLS; c++) {
              const x0 = c * cw;
              const y0 = r * rh;
              const x1 = x0 + cw;
              const y1 = y0 + rh;
              const diag = random(`sd-${index}-${r}-${c}`) > 0.5;
              const pair: Pt[][] = diag
                ? [
                    [
                      { x: x0, y: y0 },
                      { x: x1, y: y0 },
                      { x: x1, y: y1 },
                    ],
                    [
                      { x: x0, y: y0 },
                      { x: x1, y: y1 },
                      { x: x0, y: y1 },
                    ],
                  ]
                : [
                    [
                      { x: x0, y: y0 },
                      { x: x1, y: y0 },
                      { x: x0, y: y1 },
                    ],
                    [
                      { x: x1, y: y0 },
                      { x: x1, y: y1 },
                      { x: x0, y: y1 },
                    ],
                  ];
              pair.forEach((pts, k) => {
                const mx = (pts[0].x + pts[1].x + pts[2].x) / 3;
                const my = (pts[0].y + pts[1].y + pts[2].y) / 3;
                const dist = Math.hypot(mx - cx, my - cy) / 1250;
                tris.push({
                  pts,
                  delay:
                    dist * 0.62 + random(`sh-${index}-${r}-${c}-${k}`) * 0.18,
                });
              });
            }
          }
          const visible = tris.filter((t) => wipeT * 1.12 >= t.delay);
          const glints = tris.filter(
            (t) => wipeT * 1.12 >= t.delay && wipeT * 1.12 - t.delay < 0.12,
          );
          const path = visible
            .map((t) => {
              const mx = (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3;
              const my = (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;
              return (
                t.pts
                  .map((p, i) => {
                    const sx = mx + (p.x - mx) * 1.04;
                    const sy = my + (p.y - my) * 1.04;
                    return `${i === 0 ? "M" : "L"} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                  })
                  .join(" ") + " Z"
              );
            })
            .join(" ");
          return { path, glints, count: visible.length };
        })()
      : null;

  // --- T4 WHIP PAN + T5 TITAN SLAM (move the whole scene) ---
  const whipF = easeSnap(wipeT);
  const slamS = Math.min(1, frame / 5);
  const slamLanded = incType === 5 && frame >= 5;
  const slamHit = slamLanded ? Math.exp(-(frame - 5) / 3) : 0;
  const slamBounce = slamLanded
    ? Math.abs(Math.sin((frame - 5) * 1.5)) * Math.exp(-(frame - 5) / 2.2) * 28
    : 0;

  let wrapX = 0;
  let wrapY = 0;
  let wrapBlur = 0;
  if (wipeActive && incType === 4) {
    wrapX = (1 - whipF) * 1080 * dir;
    wrapBlur = (1 - whipF) * 14;
  } else if (wipeActive && incType === 5) {
    wrapY = -(1 - Math.pow(slamS, 2.6)) * 1990 - slamBounce;
  }
  if (exitCut > 0 && nxtType === 4) {
    wrapX = easeSnap(exitCut) * 1080 * dir;
    wrapBlur = easeSnap(exitCut) * 14;
  } else if (exitCut > 0 && nxtType === 5) {
    wrapY = Math.pow(exitCut, 3) * 50;
    wrapX = (random(`xs-${g}`) - 0.5) * exitCut * 22;
  }

  // --- mask / clip per transition ---
  let maskImage: string | undefined;
  let maskSize: string | undefined;
  let maskPosition: string | undefined;
  let maskRepeat: string | undefined;
  let clipPath: string | undefined;
  if (wipeActive && incType === 0) {
    maskImage = `linear-gradient(${inc.ang}deg, #000 ${pPct}%, transparent ${pPct + 2.2}%)`;
  } else if (wipeActive && incType === 2) {
    maskImage = slats
      .map(
        (s) =>
          `linear-gradient(${s.from}deg, #000 ${s.pp}%, transparent ${s.pp + 1.5}%)`,
      )
      .join(",");
    maskSize = slats.map(() => `100% ${100 / SLAT_N + 0.4}%`).join(",");
    maskPosition = slats
      .map((_, i) => `0 ${(i * 100) / (SLAT_N - 1)}%`)
      .join(",");
    maskRepeat = slats.map(() => "no-repeat").join(",");
  } else if (shardData) {
    clipPath =
      shardData.count > 0 ? `path('${shardData.path}')` : "inset(100%)";
  }
  // Lightning cut: scene is hidden on the white-out frame
  const wrapOpacity = incType === 1 && frame === 0 ? 0 : 1;

  // ================================================
  // 04. CUT STROBE (each transition has its own flash rhythm)
  // ================================================
  const flashSeq: Record<number, number[]> = {
    0: [0.7, 0, 0.35, 0.12],
    1: [1, 0.85, 0.5, 0.28, 0.14, 0.06],
    2: [0.5, 0.2, 0.1],
    3: [0.6, 0.25, 0.1],
    4: [0.35, 0.12],
    5: [0, 0, 0, 0, 0, 0.9, 0.5, 0.25, 0.1],
  };
  const cutStrobe = isFirst ? 0 : ((flashSeq[incType] ?? [])[frame] ?? 0);
  const negativeNow =
    !isFirst && frame === 1 && (incType === 0 || incType === 1);
  const strobeGold =
    (incType === 0 && frame === 2) || (incType === 5 && frame >= 6);
  const beatStrobe = thud > 0.72 && g % 2 === 0 ? 0.12 : 0;

  // ================================================
  // 05. HEAVY DROP + SHAKE (camera)
  // ================================================
  const hit = Math.min(1.25, thud + slamHit);
  const noiseF = Math.floor(g / 2); // hit-stop style: noise changes every 2 frames

  const enterPanK = incType === 4 || incType === 5 ? 0 : 1;
  const exitPanK = nxtType === 4 || nxtType === 5 ? 0 : 1;

  const baseScale = interpolate(ramp, [0, 1], [1.18, 1.32], CLAMP);
  const strikeZoom =
    index % 2 === 0
      ? enterArc * 0.3 + exitArc * 0.04
      : enterArc * 0.08 + exitArc * 0.3;
  const totalScale = Math.max(
    1.16,
    baseScale +
      strikeZoom +
      hit * 0.09 +
      Math.sin(pulse * Math.PI * 2) * hit * 0.02,
  );

  const camX =
    -inc.x * enterArc * 130 * enterPanK +
    nxt.x * exitArc * 100 * exitPanK +
    Math.sin(g * 0.07) * 5 +
    Math.sin(g * 3.1) * hit * 34 +
    (random(`bsx-${noiseF}`) - 0.5) * hit * 26;
  const camY =
    -inc.y * enterArc * 160 * enterPanK +
    nxt.y * exitArc * 110 * exitPanK +
    Math.cos(g * 0.06) * 4 +
    hit * 30 +
    Math.cos(g * 2.6) * hit * 30 +
    (random(`bsy-${noiseF}`) - 0.5) * hit * 24;
  const camRot =
    enterArc * 5 * dir * enterPanK -
    exitArc * 6 * dir * exitPanK +
    Math.sin(g * 0.05) * 0.8 +
    (random(`bsr-${noiseF}`) - 0.5) * hit * 4;

  // ================================================
  // 06. LIGHTNING
  // ================================================
  const bSeed = Math.floor(g / 2);
  const beatBolt = thud > 0.5 && random(`ltn-${bSeed}`) > 0.3;
  const cutBolt = incType === 1 && frame < 6;
  const boltOn = beatBolt || cutBolt;
  const lit = Math.max(
    beatBolt ? thud : 0,
    cutBolt ? interpolate(frame, [0, 6], [1, 0.3], CLAMP) : 0,
  );

  const bolt = boltOn
    ? (() => {
        const bs = `bolt-${bSeed}-${index}`;
        const sx = cutBolt
          ? 540 + dir * 200 + (random(`${bs}-x`) - 0.5) * 120
          : 120 + random(`${bs}-x`) * 840;
        const exX = sx + (random(`${bs}-e`) - 0.5) * (cutBolt ? 200 : 380);
        const exY = cutBolt ? 1500 : 700 + random(`${bs}-y`) * 700;
        const main = genBolt(bs, { x: sx, y: -60 }, { x: exX, y: exY }, 110, 6);
        const branches = [0, 1, 2].map((bi) => {
          const idx = Math.floor(
            main.length * (0.3 + 0.2 * bi + random(`${bs}-bi${bi}`) * 0.1),
          );
          const p = main[Math.min(main.length - 1, idx)];
          const side = random(`${bs}-bs${bi}`) > 0.5 ? 1 : -1;
          const q = {
            x: p.x + side * (120 + random(`${bs}-bx${bi}`) * 220),
            y: p.y + 160 + random(`${bs}-by${bi}`) * 260,
          };
          return toPts(genBolt(`${bs}-b${bi}`, p, q, 50, 4));
        });
        return {
          main: toPts(main),
          branches,
          op: cutBolt
            ? interpolate(frame, [0, 5], [1, 0.4], CLAMP)
            : Math.min(1, thud * 1.1),
        };
      })()
    : null;

  // Electric aura crawling along the frame edges
  const aura =
    random(`ea-${bSeed}`) > 0.5
      ? (() => {
          const y0 = 200 + random(`eay-${bSeed}`) * 600;
          const len = 500 + random(`eal-${bSeed}`) * 500;
          return {
            left: toPts(
              genBolt(
                `eal-${bSeed}`,
                { x: 36, y: y0 },
                { x: 36, y: y0 + len },
                36,
                5,
              ),
            ),
            right: toPts(
              genBolt(
                `ear-${bSeed}`,
                { x: 1044, y: y0 + 150 },
                { x: 1044, y: y0 + 150 + len },
                36,
                5,
              ),
            ),
          };
        })()
      : null;

  // ================================================
  // 07. GRADE + RGB SPLIT
  // ================================================
  const lamp = isFirst ? 0 : Math.exp(-frame / 4) * 0.12;
  const grade = `contrast(${1.2 + hit * 0.1}) saturate(${
    1.1 + pulse * 0.1
  }) brightness(${1.06 + lamp + hit * 0.1 + lit * 0.22})`;
  const heroFilter = `${negativeNow ? "invert(1) " : ""}${grade}`;

  const cutSplit = isFirst ? 0 : Math.exp(-frame / 3) * 26;
  const splitAmt = hit * 24 + cutSplit + warpEnergy * 8;
  const echo = hit * 28 + warpEnergy * 12;
  const ghostShift = warpEnergy * 46;

  // ================================================
  // 08. BEAT FX DATA + PARTICLES
  // ================================================
  const speedLines = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2 + random(`sl-a-${i}`) * 0.12;
    return {
      cos: Math.cos(a),
      sin: Math.sin(a),
      extra: 120 + random(`sl-e-${i}`) * 170,
      w: 2 + random(`sl-w-${i}`) * 2.2,
    };
  });
  const clawLens = [420, 520, 380];

  const streaks =
    wipeActive && incType === 0
      ? Array.from({ length: 14 }, (_, i) => {
          const k = `st-${index}-${i}`;
          const s = (random(`${k}-s`) - 0.5) * 2000;
          const len = 140 + random(`${k}-l`) * 320;
          const x1 = ex + nX * s;
          const y1 = ey + nY * s;
          return {
            x1,
            y1,
            x2: x1 - inc.x * len,
            y2: y1 - inc.y * len,
            op: 0.2 + random(`${k}-o`) * 0.3,
            w: 1.5 + random(`${k}-w`) * 2,
          };
        })
      : [];
  const edgeSparks =
    wipeActive && incType === 0
      ? Array.from({ length: 24 }, (_, i) => {
          const k = `es-${index}-${i}`;
          const s = (random(`${k}-s`) - 0.5) * 1700;
          const phase = (frame * 0.18 + random(`${k}-p`)) % 1;
          const px = ex + nX * s + inc.x * phase * 90;
          const py = ey + nY * s + inc.y * phase * 90;
          const len = 14 + random(`${k}-l`) * 22;
          return {
            x1: px,
            y1: py,
            x2: px - inc.x * len,
            y2: py - inc.y * len,
            op: 1 - phase,
            col: i % 3 === 0 ? BONE_WHITE : i % 3 === 1 ? accent : EMBER_ORANGE,
            w: 1.5 + random(`${k}-w`) * 2.2,
          };
        })
      : [];
  const whipLines =
    wipeActive && incType === 4
      ? Array.from({ length: 18 }, (_, i) => ({
          y: random(`wl-${index}-${i}`) * 1920,
          x: random(`wx-${index}-${i}`) * 1080,
          len: 300 + random(`wn-${index}-${i}`) * 600,
          w: 1.5 + random(`ww-${index}-${i}`) * 2.5,
        }))
      : [];

  const burst =
    !isFirst && frame < 18 && incType !== 4
      ? Array.from({ length: 26 }, (_, i) => {
          const k = `bu-${index}-${i}`;
          const ang = random(`${k}-a`) * Math.PI * 2;
          const spd = 14 + random(`${k}-s`) * 30;
          const life = 10 + random(`${k}-l`) * 8;
          const t0 = incType === 5 ? Math.max(0, frame - 5) : frame;
          const oy = incType === 5 ? 1500 : 960;
          const pos = (t: number) => {
            const d = spd * 6 * (1 - Math.exp(-t / 6));
            return {
              x: 540 + Math.cos(ang) * d,
              y: oy + Math.sin(ang) * d + 0.4 * t * t,
            };
          };
          const a = pos(t0);
          const b = pos(Math.max(0, t0 - 2));
          const active = incType === 5 ? frame >= 5 : true;
          return {
            a,
            b,
            op: active ? Math.max(0, 1 - t0 / life) : 0,
            col: i % 3 === 0 ? BONE_WHITE : i % 3 === 1 ? accent : RAGE_RED,
            w: 2 + random(`${k}-w`) * 3,
          };
        })
      : [];

  const particles = Array.from({ length: 72 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 4;
    const sway =
      Math.sin(g * 0.06 + i * 1.3) * (45 + (i % 4) * 22) +
      Math.cos(g * 0.03 + i) * 24;
    const rawX = random(`px-${seed}`) * 1080 + sway + camX * 0.18;
    const x = (((rawX % 1160) + 1160) % 1160) - 40;
    const speed =
      kind === 1 ? 4 + (i % 4) * 1.2 : 5.5 + (i % 5) * 1.6 + warpEnergy * 6;
    const y = 1980 - ((g * speed + random(`py-${seed}`) * 2000) % 2120);
    const size =
      kind === 1
        ? 5 + (i % 3) * 2
        : kind === 2
          ? 3
          : 6 + (i % 4) * 2.5 + roar * 4;
    const rot = g * (4 + (i % 4) * 2.5) * (i % 2 === 0 ? 1 : -1);
    const flick = 0.55 + random(`pf-${seed}-${Math.floor(g / 2)}`) * 0.45;
    const col =
      kind === 1
        ? EMBER_ORANGE
        : kind === 2
          ? BONE_WHITE
          : i % 8 < 4
            ? accent
            : RAGE_RED;
    return { x, y, size, rot, flick, col, kind };
  });

  const showClaws = thud > 0.35 && !beatBolt;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundColor: ONYX,
          overflow: "hidden",
          WebkitMaskImage: maskImage,
          maskImage,
          WebkitMaskSize: maskSize,
          maskSize,
          WebkitMaskPosition: maskPosition,
          maskPosition,
          WebkitMaskRepeat: maskRepeat,
          maskRepeat,
          clipPath,
          opacity: wrapOpacity,
          transform:
            wrapX !== 0 || wrapY !== 0
              ? `translate3d(${wrapX}px, ${wrapY}px, 0)`
              : undefined,
          filter: wrapBlur > 0.3 ? `blur(${wrapBlur.toFixed(1)}px)` : undefined,
        }}
      >
        {/* RGB channel filters */}
        <svg
          width="0"
          height="0"
          style={{ position: "absolute", pointerEvents: "none" }}
        >
          <defs>
            <filter id={`zr-${index}`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              />
            </filter>
            <filter id={`zg-${index}`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              />
            </filter>
            <filter id={`zb-${index}`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              />
            </filter>
          </defs>
        </svg>

        {/* LAYER 01: BACKDROP */}
        <AbsoluteFill
          style={{
            transform: `scale(${totalScale * 1.24}) rotate(${-camRot * 0.45}deg)`,
            opacity: 0.42,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.4) saturate(0.7) brightness(0.45) blur(6px)",
            }}
          />
        </AbsoluteFill>

        {/* LAYER 02: HERO + CAMERA RIG */}
        <AbsoluteFill
          style={{
            transformOrigin: "center center",
            transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
          }}
        >
          {splitAmt > 1.5 ? (
            <AbsoluteFill
              style={{ backgroundColor: "#000", isolation: "isolate" }}
            >
              {[
                { id: "zr", dx: -1, dy: -0.25 },
                { id: "zg", dx: 0, dy: 0 },
                { id: "zb", dx: 1, dy: 0.25 },
              ].map((ch) => (
                <AbsoluteFill
                  key={ch.id}
                  style={{
                    mixBlendMode: "screen",
                    transform: `translate3d(${ch.dx * splitAmt * dir}px, ${
                      ch.dy * splitAmt
                    }px, 0)`,
                  }}
                >
                  <Img
                    src={src}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: `${heroFilter} url(#${ch.id}-${index})`,
                    }}
                  />
                </AbsoluteFill>
              ))}
            </AbsoluteFill>
          ) : (
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: heroFilter,
              }}
            />
          )}

          <AbsoluteFill
            style={{ mixBlendMode: "overlay", opacity: 0.32 + pulse * 0.12 }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(1) contrast(1.8) brightness(1.02)",
              }}
            />
          </AbsoluteFill>

          {warpEnergy > 0.08 && (
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: Math.min(0.28, warpEnergy * 0.28),
                transform: `translate3d(${-inc.x * ghostShift}px, ${
                  -inc.y * ghostShift
                }px, 0) scale(${1 + warpEnergy * 0.05})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: grade,
                }}
              />
            </AbsoluteFill>
          )}

          {echo > 4 && (
            <>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: Math.min(0.24, echo * 0.007),
                  transform: `translate3d(${-echo * dir}px, ${-echo * 0.3}px, 0) rotate(${
                    -echo * 0.04 * dir
                  }deg) scale(${1 + echo * 0.0018})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "sepia(1) saturate(2.4) contrast(1.2) brightness(0.9)",
                  }}
                />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: Math.min(0.2, echo * 0.006),
                  transform: `translate3d(${echo * dir}px, ${echo * 0.3}px, 0) rotate(${
                    echo * 0.04 * dir
                  }deg) scale(${1 + echo * 0.003})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "grayscale(0.4) sepia(0.6) hue-rotate(190deg) saturate(1.8) brightness(0.85)",
                  }}
                />
              </AbsoluteFill>
            </>
          )}
        </AbsoluteFill>

        {/* LAYER 03: STORM GRADE + CLOUDS lit by the lightning */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(150deg, ${STORM_BLUE}99 0%, transparent 48%, ${RAGE_RED}44 70%, ${accent}66 100%)`,
            mixBlendMode: "soft-light",
            opacity: 0.55 + pulse * 0.3,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: 0.14 + lit * 0.4,
            WebkitMaskImage:
              "linear-gradient(180deg, #000 0%, transparent 62%)",
            maskImage: "linear-gradient(180deg, #000 0%, transparent 62%)",
          }}
        >
          <svg
            width="1500"
            height="1100"
            style={{
              position: "absolute",
              left: -210,
              top: -60,
              transform: `translate(${frame * 1.1 * dir}px, 0)`,
            }}
          >
            <filter
              id={`storm-cloud-${index}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1500"
              height="1100"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.0045 0.011"
                numOctaves="4"
                seed={index * 5 + 2}
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.45  0 0 0 0 0.55  0 0 0 0 0.70  2.2 0 0 0 -0.95"
              />
            </filter>
            <rect
              width="1500"
              height="1100"
              filter={`url(#storm-cloud-${index})`}
            />
          </svg>
        </AbsoluteFill>

        {/* LAYER 04: BEAT FX (alternates: lightning beats / claw beats) */}
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            justifyContent: "center",
            alignItems: "center",
            mixBlendMode: "screen",
          }}
        >
          <svg
            width="1080"
            height="1920"
            viewBox="0 0 1080 1920"
            style={{
              transform: `translate3d(${camX * 0.16}px, ${camY * 0.16}px, 0)`,
            }}
          >
            {thud > 0.12 && (
              <g opacity={thud * 0.5}>
                <circle
                  cx={540}
                  cy={960}
                  r={140 + (1 - thud) * 760}
                  fill="none"
                  stroke={accent}
                  strokeWidth={14}
                  opacity={0.5}
                />
                <circle
                  cx={540}
                  cy={960}
                  r={140 + (1 - thud) * 760}
                  fill="none"
                  stroke={BONE_WHITE}
                  strokeWidth={4}
                />
              </g>
            )}

            {thud > 0.15 && (
              <g transform="translate(540 960)" opacity={thud * 0.5}>
                {speedLines.map((s, i) => {
                  const r1 = 400 + (1 - thud) * 160;
                  const r2 = r1 + s.extra;
                  return (
                    <line
                      key={`speed-${i}`}
                      x1={s.cos * r1}
                      y1={s.sin * r1}
                      x2={s.cos * r2}
                      y2={s.sin * r2}
                      stroke={BONE_WHITE}
                      strokeWidth={s.w}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            )}

            {showClaws && (
              <g
                transform={`translate(${dir > 0 ? 880 : 200} 640) rotate(${
                  -24 * dir
                }) scale(${0.9 + thud * 0.15})`}
                opacity={Math.min(0.9, thud * 1.1)}
              >
                {[-1, 0, 1].map((k) => {
                  const len = clawLens[k + 1];
                  const x = k * 64;
                  return (
                    <g key={`claw-${k}`}>
                      <polygon
                        points={`${x - 17 + 10},${-len / 2 + 8} ${x + 17 + 10},${-len / 2 + 8} ${x + 10},${len / 2 + 8}`}
                        fill={RAGE_RED}
                      />
                      <polygon
                        points={`${x - 17},${-len / 2} ${x + 17},${-len / 2} ${x},${len / 2}`}
                        fill={accent}
                      />
                      <polygon
                        points={`${x - 5},${-len / 2 + 10} ${x + 5},${-len / 2 + 10} ${x},${len / 2 - 40}`}
                        fill={BONE_WHITE}
                        opacity={0.7}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {aura && (
              <g opacity={0.45 + thud * 0.5}>
                {[aura.left, aura.right].map((pts, i) => (
                  <g key={`aura-${i}`} fill="none" strokeLinejoin="round">
                    <polyline
                      points={pts}
                      stroke={accent}
                      strokeWidth={6}
                      opacity={0.3}
                    />
                    <polyline
                      points={pts}
                      stroke={BONE_WHITE}
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </g>
            )}

            {burst.map((b, i) =>
              b.op > 0.02 ? (
                <line
                  key={`burst-${i}`}
                  x1={b.b.x}
                  y1={b.b.y}
                  x2={b.a.x}
                  y2={b.a.y}
                  stroke={b.col}
                  strokeWidth={b.w}
                  strokeLinecap="round"
                  opacity={b.op}
                />
              ) : null,
            )}
          </svg>
        </AbsoluteFill>

        {/* LAYER 05: PARTICLES */}
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
          {particles.map((p, i) => (
            <div
              key={`zlatan-pt-${i}`}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.kind === 0 || p.kind === 3 ? p.size * 2.3 : p.size,
                backgroundColor: p.col,
                borderRadius: p.kind === 1 || p.kind === 2 ? "50%" : 0,
                clipPath:
                  p.kind === 0 || p.kind === 3
                    ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                    : undefined,
                boxShadow:
                  p.kind === 1 ? `0 0 ${p.size * 2}px ${p.col}77` : undefined,
                transform: `rotate(${p.rot}deg)`,
                opacity:
                  (p.kind === 2 ? 0.55 : 0.55 + p.flick * 0.4) + sub * 0.1,
              }}
            />
          ))}
        </AbsoluteFill>

        {/* LAYER 06: VIGNETTE, RAGE FLASH, SKY FLASH, SLAM BARS, DIM */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 46%, transparent ${
              40 + pulse * 2
            }%, rgba(10,10,12,0.42) 74%, rgba(10,10,12,0.9) 100%)`,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 50%, transparent 38%, ${RAGE_RED} 120%)`,
            opacity: Math.min(0.5, hit * 0.4),
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundColor: BOLT_BLUE,
            mixBlendMode: "screen",
            opacity: lit * 0.26,
            pointerEvents: "none",
          }}
        />
        {beatStrobe > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: BONE_WHITE,
              opacity: beatStrobe,
              pointerEvents: "none",
            }}
          />
        )}
        <AbsoluteFill
          style={{
            height: hit * 70,
            backgroundColor: ONYX,
            bottom: undefined,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            height: hit * 70,
            backgroundColor: ONYX,
            top: undefined,
            bottom: 0,
            pointerEvents: "none",
          }}
        />
        {exitCut > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: ONYX,
              opacity: exitCut * 0.5,
              pointerEvents: "none",
            }}
          />
        )}

        {/* LAYER 07: SAFE ZONE BRAND + TELEMETRY */}
        <AbsoluteFill
          style={{
            top: SAFE.top,
            bottom: SAFE.bottom,
            left: SAFE.left,
            right: SAFE.right,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 26px",
              backgroundColor: "rgba(10, 10, 12, 0.9)",
              borderLeft: `7px solid ${accent}`,
              borderRight: `3px solid ${RAGE_RED}`,
              clipPath:
                "polygon(0 0, 95% 0, 100% 34%, 100% 100%, 5% 100%, 0 66%)",
              transform: `translateX(${enterArc * -60}px) scale(${
                1 + thud * 0.06
              })`,
            }}
          >
            <div
              style={{ display: "flex", gap: 4, transform: "skewX(-20deg)" }}
            >
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: RAGE_RED,
                  transform: `scaleY(${0.75 + pulse * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: BONE_WHITE,
                  transform: `scaleY(${0.75 + thud * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: accent,
                  transform: `scaleY(${0.75 + sub * 0.45})`,
                }}
              />
            </div>
            <span
              style={{
                fontFamily,
                color: BONE_WHITE,
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: 5,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {brandName}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 26,
              left: 16,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              padding: "8px 20px",
              backgroundColor: "rgba(10, 10, 12, 0.86)",
              borderLeft: `6px solid ${RAGE_RED}`,
              borderTop: `2px solid ${accent}`,
              transform: `translateX(${enterArc * -50}px)`,
            }}
          >
            <div
              style={{
                fontFamily,
                fontSize: 28,
                fontWeight: 400,
                color: accent,
                letterSpacing: 4,
                lineHeight: 1.05,
              }}
            >
              {`CUT ${(index + 1).toString().padStart(2, "0")}/${total
                .toString()
                .padStart(2, "0")}`}
            </div>
            <div
              style={{
                fontFamily,
                fontSize: 17,
                fontWeight: 400,
                color: BONE_WHITE,
                letterSpacing: 3,
                opacity: 0.9,
              }}
            >
              {`TC ${(g / fps).toFixed(2)}S // ${bpm} BPM`}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 6, left: 16, right: 16 }}>
            <ProgressBar
              progress={(g / Math.max(1, totalFrames)) * 100}
              accent={accent}
              height={6}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ============================================
          TRANSITION OVERLAYS (outside the mask so never clipped)
      ============================================ */}
      {wipeActive && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            {/* T0 strike blade */}
            {incType === 0 && (
              <g
                opacity={interpolate(
                  wipeT,
                  [0, 0.08, 0.85, 1],
                  [0, 1, 1, 0],
                  CLAMP,
                )}
              >
                {streaks.map((s, i) => (
                  <line
                    key={`streak-${i}`}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={BONE_WHITE}
                    strokeWidth={s.w}
                    strokeLinecap="round"
                    opacity={s.op}
                  />
                ))}
                <line
                  x1={ex - nX * 2400}
                  y1={ey - nY * 2400}
                  x2={ex + nX * 2400}
                  y2={ey + nY * 2400}
                  stroke={RAGE_RED}
                  strokeWidth={46}
                  opacity={0.5}
                />
                <line
                  x1={ex - nX * 2400}
                  y1={ey - nY * 2400}
                  x2={ex + nX * 2400}
                  y2={ey + nY * 2400}
                  stroke={accent}
                  strokeWidth={10}
                />
                <line
                  x1={ex - nX * 2400}
                  y1={ey - nY * 2400}
                  x2={ex + nX * 2400}
                  y2={ey + nY * 2400}
                  stroke={BONE_WHITE}
                  strokeWidth={3}
                />
                {edgeSparks.map((s, i) => (
                  <line
                    key={`edge-spark-${i}`}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={s.col}
                    strokeWidth={s.w}
                    strokeLinecap="round"
                    opacity={s.op}
                  />
                ))}
              </g>
            )}

            {/* T2 slat edges */}
            {incType === 2 &&
              slats.map((s, i) => {
                if (s.pp <= -2 || s.pp >= 100) return null;
                const x =
                  s.from === 90 ? (s.pp / 100) * 1080 : (1 - s.pp / 100) * 1080;
                return (
                  <g key={`slat-edge-${i}`}>
                    <rect
                      x={x - 5}
                      y={s.y}
                      width={10}
                      height={slatH}
                      fill={accent}
                    />
                    <rect
                      x={x - 1.5}
                      y={s.y}
                      width={3}
                      height={slatH}
                      fill={BONE_WHITE}
                    />
                  </g>
                );
              })}

            {/* T3 shard glints */}
            {shardData?.glints.map((t, i) => (
              <polygon
                key={`glint-${i}`}
                points={t.pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={BONE_WHITE}
                strokeWidth={3}
                opacity={0.85}
              />
            ))}

            {/* T4 whip speed lines */}
            {whipLines.map((w, i) => (
              <line
                key={`whip-${i}`}
                x1={w.x}
                y1={w.y}
                x2={w.x - dir * w.len}
                y2={w.y}
                stroke={BONE_WHITE}
                strokeWidth={w.w}
                strokeLinecap="round"
                opacity={(1 - whipF) * 0.55}
              />
            ))}
          </svg>
        </AbsoluteFill>
      )}

      {/* ============================================
          LIGHTNING BOLTS (beat hits + the T1 lightning cut)
      ============================================ */}
      {bolt && (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: bolt.op }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <g fill="none" strokeLinejoin="round" strokeLinecap="round">
              <polyline
                points={bolt.main}
                stroke={accent}
                strokeWidth={22}
                opacity={0.22}
              />
              <polyline
                points={bolt.main}
                stroke={BOLT_BLUE}
                strokeWidth={9}
                opacity={0.65}
              />
              <polyline
                points={bolt.main}
                stroke={BONE_WHITE}
                strokeWidth={3.5}
              />
              {bolt.branches.map((b, i) => (
                <g key={`branch-${i}`}>
                  <polyline
                    points={b}
                    stroke={accent}
                    strokeWidth={12}
                    opacity={0.2}
                  />
                  <polyline
                    points={b}
                    stroke={BOLT_BLUE}
                    strokeWidth={5}
                    opacity={0.6}
                  />
                  <polyline points={b} stroke={BONE_WHITE} strokeWidth={2} />
                </g>
              ))}
            </g>
          </svg>
        </AbsoluteFill>
      )}

      {/* CUT STROBE */}
      {cutStrobe > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: strobeGold ? accent : BONE_WHITE,
            opacity: cutStrobe,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export const ZlatanLionRage: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#0A0A0C" overlap={OVERLAP_FRAMES} Scene={Scene} />
);
