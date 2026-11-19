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
import { loadFont } from "@remotion/google-fonts/Cinzel";

const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

// LATVERIAN IRON palette: iron black, doom emerald, steel, mint core, brass rivets
const IRON = "#0A0D0C";
const EMERALD = "#1FBF6B";
const DEEP_GREEN = "#0E3B2B";
const STEEL = "#9AA7AB";
const STEEL_LIGHT = "#D9E0E1";
const MINT = "#BDFFDD";
const BRASS = "#B8934A";

const OVERLAP_FRAMES = 10;

// 6 transitions rotate through the cuts:
// 0 visor slit | 1 iron jaws close | 2 glitch bands
// 3 vertical whip | 4 eye iris (push through the mask) | 5 sorcery blast
const TRANSITION_COUNT = 6;

const DIRS = [
  { x: 1, y: 0.35 },
  { x: -1, y: -0.3 },
  { x: 0.45, y: -1 },
  { x: -0.5, y: 1 },
  { x: 1, y: -0.45 },
  { x: -1, y: 0.5 },
];
const dirOf = (i: number) => DIRS[((i % 6) + 6) % 6];

type Pt = { x: number; y: number };

// Jagged arcs via midpoint displacement
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

const hexPts = (r: number, cy: number, rot: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = rot + (k * Math.PI) / 3;
    return `${(540 + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");

const easeSnap = (t: number) => 1 - Math.pow(1 - t, 3);

const BANDS = 14;

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

  const accent = brand.color || EMERALD;
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
  const inc = dirOf(index);
  const nxt = dirOf(index + 1);

  // ================================================
  // 02. VELOCITY SPEED RAMP (fast in, slow-mo float, snap out)
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const ramp =
    u < 0.24
      ? interpolate(u, [0, 0.24], [0, 0.46], CLAMP)
      : u < 0.76
        ? interpolate(u, [0.24, 0.76], [0.46, 0.54], CLAMP)
        : interpolate(u, [0.76, 1], [0.54, 1], CLAMP);

  const exitCut = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP,
  );
  const landSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 170, mass: 0.8 },
  });
  const enterArc = isFirst ? 0 : Math.max(0, 1 - landSpring);
  const exitArc = Math.pow(exitCut, 2.2);
  const warpEnergy = Math.min(1, enterArc + exitArc);

  // ================================================
  // 03. TRANSITION ENGINE (6 ways to change the image)
  // ================================================
  const wipeActive = !isFirst && frame < OVERLAP_FRAMES;
  const wipeT = interpolate(frame, [0, OVERLAP_FRAMES - 1], [0, 1], CLAMP);
  const snapT = easeSnap(wipeT);

  // --- T0 VISOR SLIT (angular eye-slit opens from the middle) ---
  const slitH = snapT * 1800;
  const slitA = slitH * (dir > 0 ? 0.55 : 1);
  const slitB = slitH * (dir > 0 ? 1 : 0.55);
  const slitTop = `0,${(960 - slitA).toFixed(1)} 540,${(960 - slitB).toFixed(1)} 1080,${(960 - slitA).toFixed(1)}`;
  const slitBot = `0,${(960 + slitA).toFixed(1)} 540,${(960 + slitB).toFixed(1)} 1080,${(960 + slitA).toFixed(1)}`;
  const slitClip = `polygon(0px ${(960 - slitA).toFixed(1)}px, 540px ${(960 - slitB).toFixed(1)}px, 1080px ${(960 - slitA).toFixed(1)}px, 1080px ${(960 + slitA).toFixed(1)}px, 540px ${(960 + slitB).toFixed(1)}px, 0px ${(960 + slitA).toFixed(1)}px)`;

  // --- T1 IRON JAWS (two plates close from the outer edges) ---
  const jawQ = -2 + easeSnap(Math.min(1, wipeT * 1.12)) * 104;
  const jawX = (Math.min(100, Math.max(0, jawQ)) / 100) * 540;

  // --- T2 GLITCH BANDS (hit-stop stepped reveal) ---
  const gT = Math.min(1.3, (Math.floor(frame / 2) + 1) * 0.26);
  const bandH = 1920 / BANDS;
  const bands = Array.from({ length: BANDS }, (_, i) => ({
    y: i * bandH,
    on: gT >= 0.05 + random(`gb-${index}-${i}`) * 0.85,
  }));
  const onBands = bands.filter((b) => b.on);

  // --- T3 VERTICAL WHIP ---
  const whipF = snapT;

  // --- T4 EYE IRIS (push through the mask) ---
  const irisCx = 540;
  const irisCy = 860;
  const irisR = 40 + snapT * 1760;

  // --- T5 SORCERY BLAST (from the hand, lower corner) ---
  const blastCx = dir > 0 ? 190 : 890;
  const blastCy = 1480;
  const blastR = 60 + snapT * 2450;

  let wrapX = 0;
  let wrapY = 0;
  let wrapBlur = 0;
  if (wipeActive && incType === 3) {
    wrapY = (1 - whipF) * 1920 * dir;
    wrapBlur = (1 - whipF) * 16;
  } else if (wipeActive && incType === 2) {
    wrapX = (random(`gj-${g}`) - 0.5) * 70 * (1 - wipeT);
  }
  if (exitCut > 0 && nxtType === 3) {
    wrapY = easeSnap(exitCut) * 1920 * dir;
    wrapBlur = easeSnap(exitCut) * 16;
  } else if (exitCut > 0 && nxtType === 2) {
    wrapX = (random(`gx-${g}`) - 0.5) * exitCut * 40;
  }

  // --- mask / clip per transition ---
  let maskImage: string | undefined;
  let maskSize: string | undefined;
  let maskPosition: string | undefined;
  let maskRepeat: string | undefined;
  let clipPath: string | undefined;
  if (wipeActive && incType === 0) {
    clipPath = slitClip;
  } else if (wipeActive && incType === 1) {
    maskImage = `linear-gradient(90deg, #000 ${jawQ}%, transparent ${jawQ + 1.2}%), linear-gradient(270deg, #000 ${jawQ}%, transparent ${jawQ + 1.2}%)`;
    maskSize = "50.3% 100%, 50.3% 100%";
    maskPosition = "0 0, 100% 0";
    maskRepeat = "no-repeat, no-repeat";
  } else if (wipeActive && incType === 2) {
    if (onBands.length === 0) {
      clipPath = "inset(100%)";
    } else {
      maskImage = onBands.map(() => "linear-gradient(#000, #000)").join(",");
      maskSize = onBands.map(() => `100% ${(bandH + 1).toFixed(1)}px`).join(",");
      maskPosition = onBands.map((b) => `0 ${b.y.toFixed(1)}px`).join(",");
      maskRepeat = onBands.map(() => "no-repeat").join(",");
    }
  } else if (wipeActive && incType === 4) {
    maskImage = `radial-gradient(circle at ${irisCx}px ${irisCy}px, #000 ${irisR.toFixed(0)}px, transparent ${(irisR + 46).toFixed(0)}px)`;
  } else if (wipeActive && incType === 5) {
    maskImage = `radial-gradient(circle at ${blastCx}px ${blastCy}px, #000 ${blastR.toFixed(0)}px, transparent ${(blastR + 60).toFixed(0)}px)`;
  }

  // glitch slices drawn above the cut
  const glitchBars =
    wipeActive && incType === 2
      ? Array.from({ length: 9 }, (_, i) => {
          const k = `gl-${index}-${i}-${Math.floor(frame / 2)}`;
          return {
            y: random(`${k}-y`) * 1900,
            h: 8 + random(`${k}-h`) * 44,
            x: random(`${k}-x`) * 600,
            w: 300 + random(`${k}-w`) * 780,
            col: i % 3 === 0 ? MINT : i % 3 === 1 ? accent : STEEL_LIGHT,
            op: 0.35 + random(`${k}-o`) * 0.4,
          };
        })
      : [];

  const whipLines =
    wipeActive && incType === 3
      ? Array.from({ length: 18 }, (_, i) => ({
          x: random(`wx-${index}-${i}`) * 1080,
          y: random(`wy-${index}-${i}`) * 1920,
          len: 300 + random(`wn-${index}-${i}`) * 600,
          w: 1.5 + random(`ww-${index}-${i}`) * 2.5,
        }))
      : [];

  // ================================================
  // 04. CUT STROBE (each transition has its own flash rhythm)
  // ================================================
  const flashSeq: Record<number, number[]> = {
    0: [0.55, 0.2, 0, 0.12],
    1: [0, 0, 0, 0, 0, 0, 0, 0.25, 0.65, 0.35, 0.15],
    2: [0.45, 0, 0.5, 0, 0.3, 0.1],
    3: [0.3, 0.12],
    4: [0.6, 0.3, 0.15],
    5: [0.85, 0.55, 0.3, 0.15, 0.07],
  };
  const cutStrobe = isFirst ? 0 : (flashSeq[incType] ?? [])[frame] ?? 0;
  const negativeNow = !isFirst && frame === 1 && incType === 2;
  const strobeMint =
    incType === 1 || incType === 4 || incType === 5 || (incType === 2 && frame === 2);
  const beatStrobe = thud > 0.72 && g % 2 === 0 ? 0.12 : 0;

  // ================================================
  // 05. HEAVY DROP + SHAKE (camera)
  // ================================================
  const hit = Math.min(1.25, thud);
  const noiseF = Math.floor(g / 2); // hit-stop style: noise changes every 2 frames

  const enterPanK = incType === 3 ? 0 : 1;
  const exitPanK = nxtType === 3 ? 0 : 1;

  const baseScale = interpolate(ramp, [0, 1], [1.18, 1.32], CLAMP);
  const strikeZoom =
    (index % 2 === 0
      ? enterArc * 0.3 + exitArc * 0.04
      : enterArc * 0.08 + exitArc * 0.3) + (nxtType === 4 ? exitArc * 0.3 : 0);
  const totalScale = Math.max(
    1.16,
    baseScale + strikeZoom + hit * 0.09 + Math.sin(pulse * Math.PI * 2) * hit * 0.02,
  );

  const camX =
    -inc.x * enterArc * 150 * enterPanK +
    nxt.x * exitArc * 110 * exitPanK +
    Math.sin(g * 0.07) * 5 +
    Math.sin(g * 3.1) * hit * 34 +
    (random(`bsx-${noiseF}`) - 0.5) * hit * 26;
  const camY =
    -inc.y * enterArc * 170 * enterPanK +
    nxt.y * exitArc * 120 * exitPanK +
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
  // 06. EMERALD SORCERY ARCS
  // ================================================
  const bSeed = Math.floor(g / 2);
  const arcOn = thud > 0.45 && random(`arc-${bSeed}`) > 0.25;
  const blastLit =
    incType === 5 && frame < 6 ? interpolate(frame, [0, 6], [1, 0.3], CLAMP) : 0;
  const lit = Math.max(arcOn ? thud : 0, blastLit);

  // arcs crackle in from both "hands" (lower side edges) toward the middle
  const arcs = arcOn
    ? [0, 1].map((side) => {
        const bs = `arc-${bSeed}-${index}-${side}`;
        const fromLeft = side === 0;
        const sx = fromLeft ? -30 : 1110;
        const sy = 1250 + random(`${bs}-y`) * 420;
        const ex = fromLeft
          ? 260 + random(`${bs}-ex`) * 300
          : 820 - random(`${bs}-ex`) * 300;
        const ey = 640 + random(`${bs}-ey`) * 420;
        const main = genBolt(bs, { x: sx, y: sy }, { x: ex, y: ey }, 80, 5);
        const branches = [0, 1, 2].map((bi) => {
          const idx = Math.floor(
            main.length * (0.35 + 0.2 * bi + random(`${bs}-bi${bi}`) * 0.1),
          );
          const p = main[Math.min(main.length - 1, idx)];
          const q = {
            x: p.x + (random(`${bs}-bx${bi}`) - 0.5) * 300,
            y: p.y - 60 - random(`${bs}-by${bi}`) * 200,
          };
          return toPts(genBolt(`${bs}-b${bi}`, p, q, 40, 4));
        });
        return { main: toPts(main), branches };
      })
    : [];
  const arcOp = Math.min(1, thud * 1.1);

  // blast arcs radiate from the hand during T5
  const blastArcs =
    wipeActive && incType === 5 && blastR > 120
      ? Array.from({ length: 7 }, (_, i) => {
          const k = `ba-${index}-${i}-${frame}`;
          const ang =
            dir > 0
              ? -0.1 - random(`${k}-a`) * 1.3
              : Math.PI + 0.1 + random(`${k}-a`) * 1.3;
          const len = blastR * (0.55 + random(`${k}-l`) * 0.4);
          return toPts(
            genBolt(
              k,
              { x: blastCx, y: blastCy },
              { x: blastCx + Math.cos(ang) * len, y: blastCy + Math.sin(ang) * len },
              70,
              4,
            ),
          );
        })
      : [];

  // Energy crawling along the frame edges
  const aura =
    random(`ea-${bSeed}`) > 0.5
      ? (() => {
          const y0 = 200 + random(`eay-${bSeed}`) * 600;
          const len = 500 + random(`eal-${bSeed}`) * 500;
          return {
            left: toPts(
              genBolt(`eal-${bSeed}`, { x: 36, y: y0 }, { x: 36, y: y0 + len }, 36, 5),
            ),
            right: toPts(
              genBolt(`ear-${bSeed}`, { x: 1044, y: y0 + 150 }, { x: 1044, y: y0 + 150 + len }, 36, 5),
            ),
          };
        })()
      : null;

  // ================================================
  // 07. GRADE + RGB SPLIT (emerald / steel, shadows crushed)
  // ================================================
  const lamp = isFirst ? 0 : Math.exp(-frame / 4) * 0.12;
  const grade = `contrast(${1.18 + hit * 0.1}) saturate(${
    0.95 + pulse * 0.12
  }) brightness(${1.05 + lamp + hit * 0.1 + lit * 0.18})`;
  const heroFilter = `${negativeNow ? "invert(1) " : ""}${grade}`;

  const cutSplit = isFirst ? 0 : Math.exp(-frame / 3) * (incType === 2 ? 60 : 24);
  const splitAmt = hit * 22 + cutSplit + warpEnergy * 8;
  const echo = hit * 28 + warpEnergy * 12;
  const ghostShift = warpEnergy * 46;

  // ================================================
  // 08. BEAT FX DATA + PARTICLES
  // ================================================
  const speedLines = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 + random(`sl-a-${i}`) * 0.12;
    return {
      cos: Math.cos(a),
      sin: Math.sin(a),
      extra: 120 + random(`sl-e-${i}`) * 170,
      w: 2 + random(`sl-w-${i}`) * 2.2,
    };
  });

  const burst =
    !isFirst && frame < 18 && incType !== 3
      ? Array.from({ length: 26 }, (_, i) => {
          const k = `bu-${index}-${i}`;
          const ang = random(`${k}-a`) * Math.PI * 2;
          const spd = 14 + random(`${k}-s`) * 30;
          const life = 10 + random(`${k}-l`) * 8;
          const ox = incType === 5 ? blastCx : 540;
          const oy = incType === 5 ? blastCy : 960;
          const pos = (t: number) => {
            const d = spd * 6 * (1 - Math.exp(-t / 6));
            return {
              x: ox + Math.cos(ang) * d,
              y: oy + Math.sin(ang) * d + 0.4 * t * t,
            };
          };
          const a = pos(frame);
          const b = pos(Math.max(0, frame - 2));
          return {
            a,
            b,
            op: Math.max(0, 1 - frame / life),
            col: i % 3 === 0 ? STEEL_LIGHT : i % 3 === 1 ? accent : MINT,
            w: 2 + random(`${k}-w`) * 3,
          };
        })
      : [];

  const particles = Array.from({ length: 66 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 4; // 0 steel shard | 1 ember | 2 mote | 3 bokeh
    const sway =
      Math.sin(g * 0.06 + i * 1.3) * (40 + (i % 4) * 20) +
      Math.cos(g * 0.03 + i) * 22;
    const rawX = random(`px-${seed}`) * 1080 + sway + camX * 0.18;
    const x = (((rawX % 1160) + 1160) % 1160) - 40;
    const speed =
      kind === 3
        ? 2.5 + (i % 3) * 0.8
        : kind === 1
          ? 4 + (i % 4) * 1.2
          : 3.5 + (i % 5) * 1.1 + warpEnergy * 6;
    const y = 1980 - ((g * speed + random(`py-${seed}`) * 2000) % 2120);
    const size =
      kind === 3
        ? 14 + (i % 3) * 8
        : kind === 1
          ? 5 + (i % 3) * 2
          : kind === 2
            ? 3
            : 6 + (i % 4) * 2.5 + roar * 4;
    const rot = g * (3 + (i % 4) * 2) * (i % 2 === 0 ? 1 : -1);
    const flick = 0.55 + random(`pf-${seed}-${Math.floor(g / 3)}`) * 0.45;
    const col =
      kind === 1
        ? i % 8 < 4
          ? accent
          : MINT
        : kind === 2
          ? STEEL_LIGHT
          : kind === 3
            ? accent
            : i % 8 < 4
              ? STEEL_LIGHT
              : BRASS;
    return { x, y, size, rot, flick, col, kind };
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundColor: IRON,
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
            <AbsoluteFill style={{ backgroundColor: "#000", isolation: "isolate" }}>
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

          {/* metallic sharpen pass: grayscale high contrast overlay */}
          <AbsoluteFill
            style={{ mixBlendMode: "overlay", opacity: 0.32 + pulse * 0.12 }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(1) contrast(1.9) brightness(1.02)",
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
                  }deg) scale(${1 + echo * 0.002})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "sepia(1) hue-rotate(95deg) saturate(2.2) contrast(1.2) brightness(0.9)",
                  }}
                />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: Math.min(0.2, echo * 0.006),
                  transform: `translate3d(${echo * dir * 0.5}px, ${echo * 0.3}px, 0) scale(${
                    1 + echo * 0.0035
                  })`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(1) contrast(1.2) brightness(1.1)",
                  }}
                />
              </AbsoluteFill>
            </>
          )}
        </AbsoluteFill>

        {/* LAYER 03: EMERALD / STEEL GRADE + CHEST GLOW + CLOAK SMOKE + GRAIN */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(165deg, ${STEEL}88 0%, transparent 40%, ${DEEP_GREEN}aa 72%, ${accent}55 100%)`,
            mixBlendMode: "soft-light",
            opacity: 0.5 + pulse * 0.25,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 44%, ${accent}66 0%, transparent 56%)`,
            mixBlendMode: "screen",
            opacity: 0.1 + pulse * 0.16 + thud * 0.12,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: 0.17 + thud * 0.1,
            WebkitMaskImage: "linear-gradient(0deg, #000 0%, transparent 70%)",
            maskImage: "linear-gradient(0deg, #000 0%, transparent 70%)",
          }}
        >
          <svg
            width="1500"
            height="1100"
            style={{
              position: "absolute",
              left: -210,
              bottom: -60,
              transform: `translate(${frame * 0.9 * dir}px, 0)`,
            }}
          >
            <filter
              id={`smoke-${index}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1500"
              height="1100"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.004 0.010"
                numOctaves="4"
                seed={index * 5 + 2}
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.35  0 0 0 0 0.85  0 0 0 0 0.60  2.2 0 0 0 -0.92"
              />
            </filter>
            <rect width="1500" height="1100" filter={`url(#smoke-${index})`} />
          </svg>
        </AbsoluteFill>
        <AbsoluteFill
          style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.16 }}
        >
          <svg width="1080" height="1920">
            <filter
              id={`grain-${index}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1080"
              height="1920"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="1"
                seed={g % 997}
              />
              <feColorMatrix
                type="matrix"
                values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
              />
            </filter>
            <rect width="1080" height="1920" filter={`url(#grain-${index})`} />
          </svg>
        </AbsoluteFill>

        {/* LAYER 04: BEAT FX (arcs / sigil / hex shockwave / radial lines) */}
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
            {/* arcane sigil (angular hexagons, flares on the beat) */}
            <g
              transform={`rotate(${g * 0.35} 540 900)`}
              fill="none"
              opacity={0.1 + thud * 0.45}
            >
              <polygon points={hexPts(330, 900, 0)} stroke={accent} strokeWidth={3} />
              <polygon
                points={hexPts(300, 900, Math.PI / 6)}
                stroke={STEEL}
                strokeWidth={1.5}
              />
            </g>
            <g
              transform={`rotate(${-g * 0.5} 540 900)`}
              fill="none"
              opacity={0.1 + thud * 0.4}
            >
              <circle
                cx={540}
                cy={900}
                r={500}
                stroke={accent}
                strokeWidth={2}
                strokeDasharray="8 22"
              />
              <polygon points={hexPts(440, 900, 0.2)} stroke={STEEL_LIGHT} strokeWidth={1.5} />
            </g>

            {thud > 0.12 && (
              <g opacity={thud * 0.5} fill="none">
                <polygon
                  points={hexPts(140 + (1 - thud) * 760, 960, g * 0.02)}
                  stroke={accent}
                  strokeWidth={14}
                  opacity={0.5}
                />
                <polygon
                  points={hexPts(140 + (1 - thud) * 760, 960, g * 0.02)}
                  stroke={STEEL_LIGHT}
                  strokeWidth={4}
                />
              </g>
            )}

            {thud > 0.15 && (
              <g transform="translate(540 960)" opacity={thud * 0.45}>
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
                      stroke={STEEL_LIGHT}
                      strokeWidth={s.w}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            )}

            {aura && (
              <g opacity={0.45 + thud * 0.5}>
                {[aura.left, aura.right].map((pts, i) => (
                  <g key={`aura-${i}`} fill="none" strokeLinejoin="round">
                    <polyline points={pts} stroke={accent} strokeWidth={6} opacity={0.3} />
                    <polyline points={pts} stroke={MINT} strokeWidth={2} />
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
              key={`doom-pt-${i}`}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.kind === 0 ? p.size * 2.3 : p.size,
                backgroundColor: p.col,
                borderRadius: p.kind === 0 ? 0 : "50%",
                clipPath:
                  p.kind === 0
                    ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                    : undefined,
                boxShadow:
                  p.kind === 1 ? `0 0 ${p.size * 2}px ${p.col}77` : undefined,
                filter: p.kind === 3 ? "blur(3px)" : undefined,
                transform: `rotate(${p.rot}deg)`,
                opacity:
                  (p.kind === 3
                    ? 0.2 + p.flick * 0.18
                    : p.kind === 2
                      ? 0.55
                      : 0.55 + p.flick * 0.4) +
                  sub * 0.1,
              }}
            />
          ))}
        </AbsoluteFill>

        {/* LAYER 06: VIGNETTE, EMERALD FLASH, ARC FLASH, VISOR BARS, DIM */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 46%, transparent ${
              40 + pulse * 2
            }%, rgba(10,13,12,0.45) 74%, rgba(10,13,12,0.9) 100%)`,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 50%, transparent 38%, ${accent} 120%)`,
            opacity: Math.min(0.45, hit * 0.38),
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundColor: MINT,
            mixBlendMode: "screen",
            opacity: lit * 0.2,
            pointerEvents: "none",
          }}
        />
        {beatStrobe > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: STEEL_LIGHT,
              opacity: beatStrobe,
              pointerEvents: "none",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: hit * 64,
            background: `linear-gradient(180deg, #1B2120, ${IRON})`,
            borderBottom: hit > 0.05 ? `3px solid ${accent}` : undefined,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: hit * 64,
            background: `linear-gradient(0deg, #1B2120, ${IRON})`,
            borderTop: hit > 0.05 ? `3px solid ${accent}` : undefined,
            pointerEvents: "none",
          }}
        />
        {exitCut > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: IRON,
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
              backgroundColor: "rgba(10, 13, 12, 0.9)",
              borderLeft: `7px solid ${accent}`,
              borderRight: `3px solid ${STEEL}`,
              clipPath:
                "polygon(0 0, 95% 0, 100% 34%, 100% 100%, 5% 100%, 0 66%)",
              transform: `translateX(${enterArc * -60}px) scale(${
                1 + thud * 0.06
              })`,
            }}
          >
            <div style={{ display: "flex", gap: 4, transform: "skewX(-20deg)" }}>
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: STEEL,
                  transform: `scaleY(${0.75 + pulse * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: STEEL_LIGHT,
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
                color: STEEL_LIGHT,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 6,
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
              backgroundColor: "rgba(10, 13, 12, 0.86)",
              borderLeft: `6px solid ${STEEL}`,
              borderTop: `2px solid ${accent}`,
              transform: `translateX(${enterArc * -50}px)`,
            }}
          >
            <div
              style={{
                fontFamily,
                fontSize: 26,
                fontWeight: 700,
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
                fontSize: 16,
                fontWeight: 700,
                color: STEEL_LIGHT,
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
            {/* T0 visor slit edges */}
            {incType === 0 && (
              <g
                fill="none"
                opacity={interpolate(wipeT, [0, 0.08, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                {[slitTop, slitBot].map((pts, i) => (
                  <g key={`slit-${i}`}>
                    <polyline points={pts} stroke={accent} strokeWidth={22} opacity={0.35} />
                    <polyline points={pts} stroke={STEEL} strokeWidth={8} />
                    <polyline points={pts} stroke={MINT} strokeWidth={2.5} />
                  </g>
                ))}
              </g>
            )}

            {/* T1 iron jaw plates */}
            {incType === 1 && jawQ < 100 && (
              <g>
                <rect x={jawX - 30} y={0} width={30} height={1920} fill={STEEL} />
                <rect x={jawX - 30} y={0} width={5} height={1920} fill={IRON} />
                <rect x={jawX - 3} y={0} width={3} height={1920} fill={MINT} />
                <rect x={1080 - jawX} y={0} width={30} height={1920} fill={STEEL} />
                <rect x={1080 - jawX + 25} y={0} width={5} height={1920} fill={IRON} />
                <rect x={1080 - jawX} y={0} width={3} height={1920} fill={MINT} />
                {Array.from({ length: 8 }, (_, i) => (
                  <g key={`rivet-${i}`}>
                    <circle cx={jawX - 15} cy={120 + i * 240} r={5} fill={BRASS} />
                    <circle cx={1080 - jawX + 15} cy={120 + i * 240} r={5} fill={BRASS} />
                  </g>
                ))}
              </g>
            )}

            {/* T2 glitch slices */}
            {glitchBars.map((b, i) => (
              <rect
                key={`glitch-${i}`}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={b.col}
                opacity={b.op * (1 - wipeT)}
              />
            ))}

            {/* T3 whip speed lines (vertical) */}
            {whipLines.map((w, i) => (
              <line
                key={`whip-${i}`}
                x1={w.x}
                y1={w.y}
                x2={w.x}
                y2={w.y - dir * w.len}
                stroke={STEEL_LIGHT}
                strokeWidth={w.w}
                strokeLinecap="round"
                opacity={(1 - whipF) * 0.55}
              />
            ))}

            {/* T4 eye iris ring */}
            {incType === 4 && (
              <g
                fill="none"
                opacity={interpolate(wipeT, [0, 0.1, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                <circle cx={irisCx} cy={irisCy} r={irisR + 18} stroke={IRON} strokeWidth={26} opacity={0.6} />
                <circle cx={irisCx} cy={irisCy} r={irisR} stroke={accent} strokeWidth={16} opacity={0.45} />
                <circle cx={irisCx} cy={irisCy} r={irisR} stroke={STEEL} strokeWidth={6} />
                <circle cx={irisCx} cy={irisCy} r={irisR} stroke={MINT} strokeWidth={2.5} />
              </g>
            )}

            {/* T5 sorcery blast ring + radiating arcs */}
            {incType === 5 && (
              <g
                fill="none"
                strokeLinejoin="round"
                opacity={interpolate(wipeT, [0, 0.08, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                <circle cx={blastCx} cy={blastCy} r={blastR} stroke={accent} strokeWidth={30} opacity={0.4} />
                <circle cx={blastCx} cy={blastCy} r={blastR} stroke={MINT} strokeWidth={8} />
                <circle cx={blastCx} cy={blastCy} r={blastR} stroke={STEEL_LIGHT} strokeWidth={2.5} />
                {blastArcs.map((pts, i) => (
                  <g key={`blast-arc-${i}`}>
                    <polyline points={pts} stroke={accent} strokeWidth={14} opacity={0.25} />
                    <polyline points={pts} stroke={MINT} strokeWidth={5} opacity={0.7} />
                    <polyline points={pts} stroke={STEEL_LIGHT} strokeWidth={2} />
                  </g>
                ))}
              </g>
            )}
          </svg>
        </AbsoluteFill>
      )}

      {/* ============================================
          EMERALD ARCS ON THE BEAT (above everything but the strobe)
      ============================================ */}
      {arcs.length > 0 && (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: arcOp }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <g fill="none" strokeLinejoin="round" strokeLinecap="round">
              {arcs.map((a, ai) => (
                <g key={`arc-${ai}`}>
                  <polyline points={a.main} stroke={accent} strokeWidth={22} opacity={0.22} />
                  <polyline points={a.main} stroke={MINT} strokeWidth={9} opacity={0.65} />
                  <polyline points={a.main} stroke={STEEL_LIGHT} strokeWidth={3.5} />
                  {a.branches.map((b, i) => (
                    <g key={`arc-branch-${ai}-${i}`}>
                      <polyline points={b} stroke={accent} strokeWidth={12} opacity={0.2} />
                      <polyline points={b} stroke={MINT} strokeWidth={5} opacity={0.6} />
                      <polyline points={b} stroke={STEEL_LIGHT} strokeWidth={2} />
                    </g>
                  ))}
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
            backgroundColor: strobeMint ? MINT : STEEL_LIGHT,
            opacity: cutStrobe,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export const DoomLatverianIron: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#0A0D0C" overlap={OVERLAP_FRAMES} Scene={Scene} />
);