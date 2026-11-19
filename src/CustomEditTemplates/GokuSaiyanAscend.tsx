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
import { loadFont } from "@remotion/google-fonts/Bangers";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

// SAIYAN ASCEND palette: night navy, saiyan gold, gi orange, ki blue, hot white, kaioken red
const NAVY = "#07101F";
const GOLD = "#FFC81E";
const ORANGE = "#FF7A1A";
const KI_BLUE = "#4DB5FF";
const ICE = "#DFF3FF";
const WHITE_HOT = "#FFFBEA";
const RED = "#E8362B";

const OVERLAP_FRAMES = 10;

// 6 transitions rotate through the cuts:
// 0 zanzoken whip | 1 kamehameha beam | 2 power-up burst
// 3 manga impact frame | 4 dragon radar sweep | 5 gi stripes
const TRANSITION_COUNT = 6;

const DIRS = [
  { x: 1, y: 0.3 },
  { x: -1, y: -0.25 },
  { x: 0.4, y: -1 },
  { x: -0.45, y: 1 },
  { x: 1, y: -0.4 },
  { x: -1, y: 0.45 },
];
const dirOf = (i: number) => DIRS[((i % 6) + 6) % 6];

type Pt = { x: number; y: number };

// Jagged ki-electricity via midpoint displacement
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
const FLAME_N = 14;
const ROCK_N = 14;

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

  const accent = brand.color || GOLD;
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
    config: { damping: 19, stiffness: 200, mass: 0.7 },
  });
  const enterArc = isFirst ? 0 : Math.max(0, 1 - landSpring);
  const exitArc = Math.pow(exitCut, 2.2);
  const warpEnergy = Math.min(1, enterArc + exitArc);

  // ================================================
  // 03. TRANSITION ENGINE
  // ================================================
  const wipeActive = !isFirst && frame < OVERLAP_FRAMES;
  const wipeT = interpolate(frame, [0, OVERLAP_FRAMES - 1], [0, 1], CLAMP);
  const snapT = easeSnap(wipeT);

  // --- T0 ZANZOKEN WHIP (horizontal, pairs with the outgoing shot) ---
  const whipF = snapT;

  // --- T1 KAMEHAMEHA BEAM (fires from a side, then widens) ---
  const beamFire = Math.min(1, wipeT * 3.2);
  const beamH = 30 + snapT * 1000;
  const beamYIn = Math.max(0, 960 - beamH);
  const beamLeftIn = dir > 0 ? 0 : 1080 * (1 - beamFire);
  const beamRightIn = dir > 0 ? 1080 * (1 - beamFire) : 0;
  const beamFront = dir > 0 ? 1080 * beamFire : 1080 * (1 - beamFire);
  const beamBack = dir > 0 ? 0 : 1080;

  // --- T2 POWER-UP BURST (radial gold from the chest) ---
  const burstCx = 540;
  const burstCy = 900;
  const burstR = 30 + snapT * 1700;

  // --- T3 MANGA IMPACT FRAME (2 frames of focus lines, then snap open) ---
  const impT = interpolate(frame, [1, 8], [0, 1], CLAMP);
  const impR = easeSnap(impT) * 1500;

  // --- T4 DRAGON RADAR SWEEP (conic reveal) ---
  const sweepStart = (index * 60) % 360;
  const sweepDeg = snapT * 362;
  const sweepAng = ((sweepStart + sweepDeg) * Math.PI) / 180;

  // --- T5 GI STRIPES (vertical slats, alternate top / bottom) ---
  const slatW = 1080 / SLAT_N;
  const slats = Array.from({ length: SLAT_N }, (_, i) => {
    const local = Math.min(
      1,
      Math.max(0, (wipeT * 1.35 - i * 0.06) / 0.6),
    );
    const pp = -3 + easeSnap(local) * 106;
    return { pp, from: i % 2 === 0 ? 180 : 0, x: i * slatW };
  });

  let wrapX = 0;
  let wrapBlur = 0;
  if (wipeActive && incType === 0) {
    wrapX = (1 - whipF) * 1080 * dir;
    wrapBlur = (1 - whipF) * 14;
  }
  if (exitCut > 0 && nxtType === 0) {
    wrapX = easeSnap(exitCut) * 1080 * dir;
    wrapBlur = easeSnap(exitCut) * 14;
  } else if (exitCut > 0 && nxtType === 3) {
    wrapX = (random(`xj-${g}`) - 0.5) * exitCut * 30;
  }

  // --- mask / clip per transition ---
  let maskImage: string | undefined;
  let maskSize: string | undefined;
  let maskPosition: string | undefined;
  let maskRepeat: string | undefined;
  let clipPath: string | undefined;
  if (wipeActive && incType === 1) {
    clipPath = `inset(${beamYIn.toFixed(1)}px ${beamRightIn.toFixed(1)}px ${beamYIn.toFixed(1)}px ${beamLeftIn.toFixed(1)}px)`;
  } else if (wipeActive && incType === 2) {
    maskImage = `radial-gradient(circle at ${burstCx}px ${burstCy}px, #000 ${burstR.toFixed(0)}px, transparent ${(burstR + 50).toFixed(0)}px)`;
  } else if (wipeActive && incType === 3) {
    if (frame < 2) {
      clipPath = "inset(100%)";
    } else {
      maskImage = `radial-gradient(circle at 540px 960px, #000 ${impR.toFixed(0)}px, transparent ${(impR + 40).toFixed(0)}px)`;
    }
  } else if (wipeActive && incType === 4) {
    maskImage = `conic-gradient(from ${sweepStart}deg at 50% 50%, #000 0deg, #000 ${sweepDeg.toFixed(1)}deg, transparent ${(sweepDeg + 2).toFixed(1)}deg)`;
  } else if (wipeActive && incType === 5) {
    maskImage = slats
      .map((s) => `linear-gradient(${s.from}deg, #000 ${s.pp}%, transparent ${s.pp + 1.5}%)`)
      .join(",");
    maskSize = slats.map(() => `${100 / SLAT_N + 0.4}% 100%`).join(",");
    maskPosition = slats
      .map((_, i) => `${(i * 100) / (SLAT_N - 1)}% 0`)
      .join(",");
    maskRepeat = slats.map(() => "no-repeat").join(",");
  }

  // manga focus lines for the impact frame
  const impactWedges =
    wipeActive && incType === 3 && frame < 2
      ? Array.from({ length: 34 }, (_, i) => {
          const a0 = (i / 34) * Math.PI * 2 + random(`iw-${index}-${i}`) * 0.05;
          const w = 0.045 + random(`iww-${index}-${i}`) * 0.07;
          const inner = 90 + random(`iwi-${index}-${i}`) * 140;
          return [
            `${(540 + Math.cos(a0 + w / 2) * inner).toFixed(0)},${(960 + Math.sin(a0 + w / 2) * inner).toFixed(0)}`,
            `${(540 + Math.cos(a0) * 2600).toFixed(0)},${(960 + Math.sin(a0) * 2600).toFixed(0)}`,
            `${(540 + Math.cos(a0 + w) * 2600).toFixed(0)},${(960 + Math.sin(a0 + w) * 2600).toFixed(0)}`,
          ].join(" ");
        })
      : [];

  const burstFlames =
    wipeActive && incType === 2
      ? Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2 + random(`bf-${index}-${i}`) * 0.1;
          const w = 0.12;
          const len = 60 + random(`bfl-${index}-${i}`) * 90;
          const r0 = burstR;
          const r1 = burstR + len;
          return `${(burstCx + Math.cos(a - w) * r0).toFixed(0)},${(burstCy + Math.sin(a - w) * r0).toFixed(0)} ${(burstCx + Math.cos(a) * r1).toFixed(0)},${(burstCy + Math.sin(a) * r1).toFixed(0)} ${(burstCx + Math.cos(a + w) * r0).toFixed(0)},${(burstCy + Math.sin(a + w) * r0).toFixed(0)}`;
        })
      : [];

  const whipLines =
    wipeActive && incType === 0
      ? Array.from({ length: 18 }, (_, i) => ({
          y: random(`wl-${index}-${i}`) * 1920,
          x: random(`wx-${index}-${i}`) * 1080,
          len: 300 + random(`wn-${index}-${i}`) * 600,
          w: 1.5 + random(`ww-${index}-${i}`) * 2.5,
        }))
      : [];

  // ================================================
  // 04. CUT STROBE
  // ================================================
  const flashSeq: Record<number, number[]> = {
    0: [0.4, 0.15],
    1: [0.7, 0.35, 0.15],
    2: [0.9, 0.55, 0.3, 0.15, 0.07],
    3: [0, 0, 0.6, 0.3, 0.12],
    4: [0.4, 0.15],
    5: [0.5, 0.2, 0.1],
  };
  const strobeCols: Record<number, string> = {
    0: WHITE_HOT,
    1: ICE,
    2: WHITE_HOT,
    3: WHITE_HOT,
    4: ICE,
    5: GOLD,
  };
  const cutStrobe = isFirst ? 0 : (flashSeq[incType] ?? [])[frame] ?? 0;
  const strobeCol = strobeCols[incType] ?? WHITE_HOT;
  const negativeNow =
    !isFirst && incType === 3 && (frame === 2 || frame === 3);
  const beatStrobe = thud > 0.72 && g % 2 === 0 ? 0.12 : 0;

  // ================================================
  // 05. POWER-UP DROP + SHAKE (camera)
  // ================================================
  const hit = Math.min(1.25, thud);
  const noiseF = Math.floor(g / 2);

  const enterPanK = incType === 0 ? 0 : 1;
  const exitPanK = nxtType === 0 ? 0 : 1;

  const baseScale = interpolate(ramp, [0, 1], [1.18, 1.32], CLAMP);
  const strikeZoom =
    (index % 2 === 0
      ? enterArc * 0.3 + exitArc * 0.04
      : enterArc * 0.08 + exitArc * 0.3) + (nxtType === 2 ? exitArc * 0.2 : 0);
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
  // 06. SUPER SAIYAN KI ELECTRICITY + AURA FLAMES
  // ================================================
  const sparkOn = thud > 0.4 && random(`ssj-${noiseF}`) > 0.2;
  const lit = Math.max(sparkOn ? thud : 0, incType === 1 && frame < 5 ? 0.6 : 0);

  const ssj = sparkOn
    ? Array.from({ length: 6 }, (_, i) => {
        const k = `ssj-${noiseF}-${index}-${i}`;
        const a = random(`${k}-a`) * Math.PI * 2;
        const r0 = 260 + random(`${k}-r`) * 220;
        const x0 = 540 + Math.cos(a) * r0;
        const y0 = 900 + Math.sin(a) * r0;
        const tang = a + Math.PI / 2 + (random(`${k}-t`) - 0.5) * 1.2;
        const l = 140 + random(`${k}-l`) * 200;
        return {
          pts: toPts(
            genBolt(k, { x: x0, y: y0 }, { x: x0 + Math.cos(tang) * l, y: y0 + Math.sin(tang) * l }, 46, 4),
          ),
          col: i % 2 === 0 ? accent : KI_BLUE,
        };
      })
    : [];

  // aura flames rising from the bottom edge
  const flames = Array.from({ length: FLAME_N }, (_, i) => {
    const cx = i * 80 + random(`fx-${i}`) * 40;
    const h =
      (160 + random(`fl-${i}-${Math.floor(g / 2)}`) * 240) *
      (0.55 + pulse * 0.45 + thud * 0.5);
    const tipX = cx + (random(`ft-${i}-${Math.floor(g / 2)}`) - 0.5) * 60;
    return {
      outer: `${cx - 48},1990 ${cx - 14},${1990 - h * 0.55} ${tipX},${1990 - h} ${cx + 16},${1990 - h * 0.5} ${cx + 48},1990`,
      inner: `${cx - 26},1990 ${cx - 6},${1990 - h * 0.4} ${tipX},${1990 - h * 0.72} ${cx + 8},${1990 - h * 0.36} ${cx + 26},1990`,
    };
  });

  const spikeLines = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2 + random(`sl-a-${i}`) * 0.12;
    return {
      cos: Math.cos(a),
      sin: Math.sin(a),
      extra: 120 + random(`sl-e-${i}`) * 170,
      w: 2 + random(`sl-w-${i}`) * 2.2,
    };
  });

  // ================================================
  // 07. GRADE + RGB SPLIT (bright anime grade)
  // ================================================
  const lamp = isFirst ? 0 : Math.exp(-frame / 4) * 0.12;
  const grade = `contrast(${1.12 + hit * 0.1}) saturate(${
    1.2 + pulse * 0.15
  }) brightness(${1.07 + lamp + hit * 0.1 + lit * 0.18})`;
  const heroFilter = `${negativeNow ? "invert(1) " : ""}${grade}`;

  const cutSplit = isFirst ? 0 : Math.exp(-frame / 3) * 22;
  const splitAmt = hit * 14 + cutSplit + warpEnergy * 6;
  const echo = hit * 28 + warpEnergy * 12;
  const ghostShift = warpEnergy * 46;

  // ================================================
  // 08. BURST + PARTICLES
  // ================================================
  const burst =
    !isFirst && frame < 18 && incType !== 0
      ? Array.from({ length: 26 }, (_, i) => {
          const k = `bu-${index}-${i}`;
          const ang = random(`${k}-a`) * Math.PI * 2;
          const spd = 14 + random(`${k}-s`) * 30;
          const life = 10 + random(`${k}-l`) * 8;
          const pos = (t: number) => {
            const d = spd * 6 * (1 - Math.exp(-t / 6));
            return {
              x: 540 + Math.cos(ang) * d,
              y: 960 + Math.sin(ang) * d + 0.4 * t * t,
            };
          };
          return {
            a: pos(frame),
            b: pos(Math.max(0, frame - 2)),
            op: Math.max(0, 1 - frame / life),
            col: i % 3 === 0 ? WHITE_HOT : i % 3 === 1 ? accent : ORANGE,
            w: 2 + random(`${k}-w`) * 3,
          };
        })
      : [];

  const particles = Array.from({ length: 56 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 4; // 0 gold spark | 1 ki orb | 2 mote | 3 soft bokeh
    const sway =
      Math.sin(g * 0.06 + i * 1.3) * (40 + (i % 4) * 20) +
      Math.cos(g * 0.03 + i) * 22;
    const rawX = random(`px-${seed}`) * 1080 + sway + camX * 0.18;
    const x = (((rawX % 1160) + 1160) % 1160) - 40;
    const speed =
      kind === 3
        ? 2.5 + (i % 3) * 0.8
        : kind === 0
          ? 4.5 + (i % 5) * 1.0 + warpEnergy * 6
          : 3.5 + (i % 4) * 1.1 + warpEnergy * 4;
    const y = 1980 - ((g * speed + random(`py-${seed}`) * 2000) % 2120);
    const size =
      kind === 3
        ? 14 + (i % 3) * 8
        : kind === 1
          ? 6 + (i % 3) * 2.5
          : kind === 2
            ? 3
            : 6 + (i % 4) * 2.5 + roar * 4;
    const rot = g * (3 + (i % 4) * 2) * (i % 2 === 0 ? 1 : -1);
    const flick = 0.55 + random(`pf-${seed}-${Math.floor(g / 3)}`) * 0.45;
    const col =
      kind === 1
        ? KI_BLUE
        : kind === 2
          ? WHITE_HOT
          : kind === 3
            ? accent
            : i % 8 < 4
              ? accent
              : ORANGE;
    return { x, y, size, rot, flick, col, kind };
  });

  // floating rock debris lifted by the power-up
  const rocks = Array.from({ length: ROCK_N }, (_, i) => {
    const seed = i * 53 + index * 17;
    const x =
      random(`rx-${seed}`) * 1000 +
      Math.sin(g * 0.04 + i) * 20 +
      camX * 0.1;
    const speed = 1.6 + (i % 4) * 0.8;
    const y = 2040 - ((g * speed + random(`ry-${seed}`) * 2200) % 2200);
    const size = 16 + (i % 5) * 7;
    const rot = g * (1 + (i % 3)) * (i % 2 === 0 ? 1 : -1);
    return { x, y, size, rot };
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundColor: NAVY,
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
          transform: wrapX !== 0 ? `translate3d(${wrapX}px, 0, 0)` : undefined,
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
              filter: "contrast(1.4) saturate(0.8) brightness(0.45) blur(6px)",
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

          <AbsoluteFill
            style={{ mixBlendMode: "overlay", opacity: 0.3 + pulse * 0.12 }}
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
                  }deg) scale(${1 + echo * 0.002})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "sepia(1) saturate(3) contrast(1.1) brightness(1.1)",
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
                      "grayscale(0.3) sepia(0.6) hue-rotate(170deg) saturate(2.2) brightness(1.1)",
                  }}
                />
              </AbsoluteFill>
            </>
          )}
        </AbsoluteFill>

        {/* LAYER 03: KI-BLUE / SAIYAN-GOLD GRADE + AURA GLOW */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(170deg, ${KI_BLUE}88 0%, transparent 45%, ${ORANGE}66 80%, ${GOLD}77 100%)`,
            mixBlendMode: "soft-light",
            opacity: 0.5 + pulse * 0.25,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 62%, ${accent}77 0%, transparent 58%)`,
            mixBlendMode: "screen",
            opacity: 0.12 + pulse * 0.15 + thud * 0.15,
            pointerEvents: "none",
          }}
        />

        {/* LAYER 04: BEAT FX (aura flames / ki electricity / rings / focus lines) */}
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
            <g opacity={0.35 + pulse * 0.2 + thud * 0.25}>
              {flames.map((f, i) => (
                <g key={`flame-${i}`}>
                  <polygon points={f.outer} fill={RED} opacity={0.35} />
                  <polygon points={f.outer} fill={accent} opacity={0.55} />
                  <polygon points={f.inner} fill={WHITE_HOT} opacity={0.6} />
                </g>
              ))}
            </g>

            {thud > 0.12 && (
              <g opacity={thud * 0.5} fill="none">
                <circle
                  cx={540}
                  cy={960}
                  r={140 + (1 - thud) * 760}
                  stroke={accent}
                  strokeWidth={14}
                  opacity={0.5}
                />
                <circle
                  cx={540}
                  cy={960}
                  r={140 + (1 - thud) * 760}
                  stroke={WHITE_HOT}
                  strokeWidth={4}
                />
              </g>
            )}

            {thud > 0.15 && (
              <g transform="translate(540 960)" opacity={thud * 0.5}>
                {spikeLines.map((s, i) => {
                  const r1 = 400 + (1 - thud) * 160;
                  const r2 = r1 + s.extra;
                  return (
                    <line
                      key={`spike-${i}`}
                      x1={s.cos * r1}
                      y1={s.sin * r1}
                      x2={s.cos * r2}
                      y2={s.sin * r2}
                      stroke={WHITE_HOT}
                      strokeWidth={s.w}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            )}

            {ssj.map((s, i) => (
              <g key={`ssj-${i}`} fill="none" strokeLinejoin="round" strokeLinecap="round">
                <polyline points={s.pts} stroke={s.col} strokeWidth={10} opacity={0.35} />
                <polyline points={s.pts} stroke={WHITE_HOT} strokeWidth={2.5} />
              </g>
            ))}

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

        {/* LAYER 05: ROCK DEBRIS (normal blend) + PARTICLES (screen) */}
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {rocks.map((r, i) => (
            <div
              key={`rock-${i}`}
              style={{
                position: "absolute",
                left: r.x,
                top: r.y,
                width: r.size,
                height: r.size * 0.8,
                backgroundColor: "#3B3A42",
                clipPath: "polygon(10% 0%, 85% 12%, 100% 60%, 70% 100%, 15% 88%, 0% 40%)",
                transform: `rotate(${r.rot}deg)`,
                opacity: 0.85,
              }}
            />
          ))}
        </AbsoluteFill>
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
          {particles.map((p, i) => (
            <div
              key={`goku-pt-${i}`}
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
                  p.kind === 1 ? `0 0 ${p.size * 2}px ${p.col}88` : undefined,
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

        {/* LAYER 06: VIGNETTE, KI FLASH, STROBE, EXIT DIM */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 46%, transparent ${
              42 + pulse * 2
            }%, rgba(7,16,31,0.4) 76%, rgba(7,16,31,0.85) 100%)`,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${accent} 125%)`,
            opacity: Math.min(0.4, hit * 0.34),
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundColor: ICE,
            mixBlendMode: "screen",
            opacity: lit * 0.16,
            pointerEvents: "none",
          }}
        />
        {beatStrobe > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: WHITE_HOT,
              opacity: beatStrobe,
              pointerEvents: "none",
            }}
          />
        )}
        {exitCut > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: NAVY,
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
              backgroundColor: "rgba(7, 16, 31, 0.9)",
              borderLeft: `7px solid ${accent}`,
              borderRight: `3px solid ${ORANGE}`,
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
                  backgroundColor: ORANGE,
                  transform: `scaleY(${0.75 + pulse * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: WHITE_HOT,
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
                color: WHITE_HOT,
                fontSize: 34,
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
              backgroundColor: "rgba(7, 16, 31, 0.86)",
              borderLeft: `6px solid ${ORANGE}`,
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
                color: WHITE_HOT,
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
            {/* T0 zanzoken speed lines */}
            {whipLines.map((w, i) => (
              <line
                key={`whip-${i}`}
                x1={w.x}
                y1={w.y}
                x2={w.x - dir * w.len}
                y2={w.y}
                stroke={ICE}
                strokeWidth={w.w}
                strokeLinecap="round"
                opacity={(1 - whipF) * 0.6}
              />
            ))}

            {/* T1 kamehameha beam */}
            {incType === 1 && (
              <g opacity={interpolate(wipeT, [0, 0.1, 0.8, 1], [0, 1, 1, 0], CLAMP)}>
                <rect
                  x={Math.min(beamBack, beamFront)}
                  y={960 - beamH * 1.12}
                  width={Math.abs(beamFront - beamBack)}
                  height={beamH * 2.24}
                  fill={KI_BLUE}
                  opacity={0.18}
                />
                <rect
                  x={Math.min(beamBack, beamFront)}
                  y={960 - Math.max(14, beamH * 0.3)}
                  width={Math.abs(beamFront - beamBack)}
                  height={Math.max(28, beamH * 0.6)}
                  fill={ICE}
                  opacity={0.55}
                />
                <rect
                  x={Math.min(beamBack, beamFront)}
                  y={960 - Math.max(6, beamH * 0.1)}
                  width={Math.abs(beamFront - beamBack)}
                  height={Math.max(12, beamH * 0.2)}
                  fill={WHITE_HOT}
                />
                <circle cx={beamFront} cy={960} r={60 + beamH * 0.15} fill={ICE} opacity={0.6} />
                <circle cx={beamFront} cy={960} r={28 + beamH * 0.07} fill={WHITE_HOT} />
              </g>
            )}

            {/* T2 power-up ring with flame crown */}
            {incType === 2 && (
              <g
                fill="none"
                opacity={interpolate(wipeT, [0, 0.08, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                {burstFlames.map((pts, i) => (
                  <polygon key={`bflame-${i}`} points={pts} fill={i % 2 === 0 ? accent : ORANGE} opacity={0.8} />
                ))}
                <circle cx={burstCx} cy={burstCy} r={burstR} stroke={accent} strokeWidth={26} opacity={0.45} />
                <circle cx={burstCx} cy={burstCy} r={burstR} stroke={WHITE_HOT} strokeWidth={5} />
              </g>
            )}

            {/* T3 manga impact focus lines */}
            {impactWedges.length > 0 && (
              <g opacity={0.92}>
                <rect width={1080} height={1920} fill={frame === 1 ? "#000" : WHITE_HOT} />
                {impactWedges.map((pts, i) => (
                  <polygon
                    key={`wedge-${i}`}
                    points={pts}
                    fill={frame === 1 ? WHITE_HOT : "#000"}
                  />
                ))}
              </g>
            )}

            {/* T4 dragon radar sweep line */}
            {incType === 4 && (
              <g
                fill="none"
                strokeLinecap="round"
                opacity={interpolate(wipeT, [0, 0.08, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                {[0, 1, 2].map((k) => (
                  <line
                    key={`radar-${k}`}
                    x1={540}
                    y1={960}
                    x2={540 + Math.sin(sweepAng) * 1700}
                    y2={960 - Math.cos(sweepAng) * 1700}
                    stroke={k === 0 ? KI_BLUE : k === 1 ? ICE : WHITE_HOT}
                    strokeWidth={k === 0 ? 26 : k === 1 ? 9 : 3}
                    opacity={k === 0 ? 0.4 : 1}
                  />
                ))}
                <circle cx={540} cy={960} r={260} stroke={ICE} strokeWidth={3} opacity={0.5} />
                <circle cx={540} cy={960} r={560} stroke={ICE} strokeWidth={2} opacity={0.35} />
              </g>
            )}

            {/* T5 gi stripe edges */}
            {incType === 5 &&
              slats.map((s, i) => {
                if (s.pp <= -2 || s.pp >= 100) return null;
                const y = s.from === 180 ? (s.pp / 100) * 1920 : (1 - s.pp / 100) * 1920;
                return (
                  <g key={`slat-edge-${i}`}>
                    <rect x={s.x} y={y - 6} width={slatW} height={12} fill={ORANGE} />
                    <rect x={s.x} y={y - 1.5} width={slatW} height={3} fill={WHITE_HOT} />
                  </g>
                );
              })}
          </svg>
        </AbsoluteFill>
      )}

      {/* CUT STROBE */}
      {cutStrobe > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: strobeCol,
            opacity: cutStrobe,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export const GokuSaiyanAscend: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#07101F" overlap={OVERLAP_FRAMES} Scene={Scene} />
);