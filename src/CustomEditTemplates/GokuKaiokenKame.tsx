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

// KAIOKEN x KAMEHAMEHA palette
// even cuts = KAIOKEN (red heat, heartbeat, cracks) | odd cuts = KAMEHAMEHA (blue charge, beams)
const NAVY = "#07101F";
const GOLD = "#FFC81E";
const ORANGE = "#FF7A1A";
const RED = "#E8362B";
const DEEP_RED = "#8A0F12";
const KI_BLUE = "#4DB5FF";
const ICE = "#DFF3FF";
const WHITE_HOT = "#FFFBEA";

const OVERLAP_FRAMES = 10;

// 7 transitions, in this order across the cuts (cut 1 = first transition):
// 1 kamehameha blast | 2 kaioken explosion | 6 instant transmission
// 3 zanzoken dash | 0 manga impact frame | 4 ascension pillar | 5 ki vortex
const TRANSITION_ORDER = [1, 2, 6, 3, 0, 4, 5];
const typeAt = (i: number) =>
  TRANSITION_ORDER[(((i - 1) % TRANSITION_ORDER.length) + TRANSITION_ORDER.length) % TRANSITION_ORDER.length];

// instant transmission: outgoing shot squeezes into a vertical line of light
const itSqueeze = (ec: number) => 1 - easeSnap(Math.min(1, ec * 1.6)) * 0.985;

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

// flame silhouette rising from the bottom edge
const flameShape = (cx: number, h: number, tipX: number, w: number, hs: number) =>
  `${cx - w},1990 ${cx - w * 0.3},${1990 - h * hs * 0.55} ${tipX},${1990 - h * hs} ${cx + w * 0.33},${1990 - h * hs * 0.5} ${cx + w},1990`;

const FLAME_N = 14;
const SIDE_N = 7;
const ROCK_N = 14;
const STAR_N = 36;

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
  // 01. BEAT SYNC + MODE
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const thud = beatPulseAt(g, beatFrames, 3.1);
  const roar = beatPulseAt(g + 3, beatFrames, 2.2);
  const sub = beatPulseAt(g + 5, beatFrames, 1.6);
  const heart2 = beatPulseAt(g + 4, beatFrames, 3.6) * 0.6; // kaioken "lub-dub"

  const kaio = index % 2 === 0;
  const modeMain = kaio ? RED : KI_BLUE;
  const modeMid = kaio ? ORANGE : ICE;

  const incType = isFirst ? -1 : typeAt(index);
  const nxtType = typeAt(index + 1);
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

  // --- T1 KAMEHAMEHA BLAST: beam head shoots across, then widens ---
  const beamSign = dir > 0 ? 1 : -1;
  const beamBack = dir > 0 ? -60 : 1140;
  const beamFire = Math.min(1, wipeT * 2.8);
  const beamH = 26 + easeSnap(Math.max(0, (wipeT - 0.1) / 0.9)) * 1010;
  const beamFront = beamBack + beamSign * 1460 * beamFire;
  const beamSamples =
    wipeActive && incType === 1
      ? Array.from({ length: 16 }, (_, k) => {
          const t = k / 15;
          const taper = t > 0.82 ? (1 - t) / 0.18 : 1;
          const jag = 1 + (random(`bj-${index}-${k}-${frame}`) - 0.5) * 0.14;
          return {
            x: beamBack + (beamFront - beamBack) * t,
            hh: beamH * taper * jag,
          };
        })
      : [];
  const beamPoly = (f: number) =>
    beamSamples
      .map((s) => `${s.x.toFixed(1)},${(960 - s.hh * f).toFixed(1)}`)
      .concat(
        [...beamSamples]
          .reverse()
          .map((s) => `${s.x.toFixed(1)},${(960 + s.hh * f).toFixed(1)}`),
      )
      .join(" ");
  const beamClip =
    beamSamples.length > 0
      ? `polygon(${beamSamples
          .map((s) => `${s.x.toFixed(1)}px ${(960 - s.hh).toFixed(1)}px`)
          .concat(
            [...beamSamples]
              .reverse()
              .map((s) => `${s.x.toFixed(1)}px ${(960 + s.hh).toFixed(1)}px`),
          )
          .join(", ")})`
      : "inset(100%)";

  // --- T2 KAIOKEN EXPLOSION: spiky star burst from the chest ---
  const starR = snapT * 2600;
  const star =
    wipeActive && incType === 2
      ? Array.from({ length: STAR_N }, (_, j) => {
          const ang =
            (j / STAR_N) * Math.PI * 2 + (random(`ks-${index}-${j}`) - 0.5) * 0.05;
          const rr =
            starR * (j % 2 === 0 ? 1 : 0.6) * (0.86 + random(`kr-${index}-${j}`) * 0.28);
          return { x: 540 + Math.cos(ang) * rr, y: 960 + Math.sin(ang) * rr, even: j % 2 === 0 };
        })
      : [];
  const starClip =
    star.length > 0
      ? `polygon(${star.map((s) => `${s.x.toFixed(1)}px ${s.y.toFixed(1)}px`).join(", ")})`
      : "inset(100%)";
  const starCracks = star
    .filter((s) => s.even)
    .map((s, i) =>
      toPts(genBolt(`kc-${index}-${i}`, { x: 540, y: 960 }, { x: s.x, y: s.y }, 50, 3)),
    );

  // --- T3 ZANZOKEN DASH (horizontal whip with trailing afterimages) ---
  const whipF = snapT;

  // --- T4 ASCENSION PILLAR (aura column widens from the middle) ---
  const pilTop = snapT * 1300;
  const pilBot = snapT * 1900;
  const pilClip = `polygon(${(540 - pilTop / 2).toFixed(1)}px 0px, ${(540 + pilTop / 2).toFixed(1)}px 0px, ${(540 + pilBot / 2).toFixed(1)}px 1920px, ${(540 - pilBot / 2).toFixed(1)}px 1920px)`;

  // --- T5 KI VORTEX (conic sweep + spin-in) ---
  const sweepStart = (index * 60) % 360;
  const sweepDeg = snapT * 362;
  const sweepAng = ((sweepStart + sweepDeg) * Math.PI) / 180;
  const spiral =
    wipeActive && incType === 5
      ? [0, 1, 2].map((k) =>
          Array.from({ length: 42 }, (_, s) => {
            const r = s * 38;
            const a = sweepAng - r * 0.0048 + (k * 2 * Math.PI) / 3;
            return `${(540 + Math.sin(a) * r).toFixed(0)},${(960 - Math.cos(a) * r).toFixed(0)}`;
          }).join(" "),
        )
      : [];

  // --- T0 MANGA IMPACT FRAME (2 frames of focus lines, then radial snap) ---
  const impT = interpolate(frame, [1, 8], [0, 1], CLAMP);
  const impR = easeSnap(impT) * 1500;
  const impactWedges =
    wipeActive && incType === 0 && frame < 2
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

  // --- T6 INSTANT TRANSMISSION: old shot squeezes to a line, new shot opens from it ---
  const itEc = interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], CLAMP);
  const itOldHalf = 540 * itSqueeze(itEc);
  const itNewHalf =
    540 * easeSnap(Math.min(1, Math.max(0, (wipeT - 0.4) / 0.6)));
  const itGap = Math.max(itOldHalf, itNewHalf);
  const itX = 540 - itNewHalf;
  const itClip = `inset(0px ${itX.toFixed(1)}px 0px ${itX.toFixed(1)}px)`;
  const itStreaks =
    wipeActive && incType === 6
      ? Array.from({ length: 40 }, (_, i) => {
          const k = `its-${index}-${i}-${frame}`;
          return {
            x: random(`${k}-x`) * 1080,
            w: 1.5 + random(`${k}-w`) * 3.5,
            col: i % 3 === 0 ? WHITE_HOT : ICE,
            op: 0.45 + random(`${k}-o`) * 0.5,
          };
        }).filter((s) => Math.abs(s.x - 540) > itGap)
      : [];

  // --- wrapper motion ---
  let wrapX = 0;
  let wrapBlur = 0;
  let wrapRot = 0;
  let wrapScale = 1;
  let wrapSX = 1;
  let wrapBright = 1;
  if (exitCut > 0 && nxtType === 6) {
    wrapSX = itSqueeze(exitCut);
    wrapBright = 1 + easeSnap(exitCut) * 0.9;
  }
  if (wipeActive && incType === 3) {
    wrapX = (1 - whipF) * 1080 * dir;
    wrapBlur = (1 - whipF) * 14;
  } else if (wipeActive && incType === 5) {
    wrapRot = (1 - snapT) * -20 * dir;
    wrapScale = 1 + (1 - snapT) * 0.22;
  }
  if (exitCut > 0 && nxtType === 3) {
    wrapX = easeSnap(exitCut) * 1080 * dir;
    wrapBlur = easeSnap(exitCut) * 14;
  } else if (exitCut > 0 && (nxtType === 0 || nxtType === 1 || nxtType === 2)) {
    wrapX = (random(`xj-${g}`) - 0.5) * exitCut * 34;
  }

  // --- mask / clip per transition ---
  let maskImage: string | undefined;
  let clipPath: string | undefined;
  if (wipeActive && incType === 1) {
    clipPath = beamClip;
  } else if (wipeActive && incType === 2) {
    clipPath = starClip;
  } else if (wipeActive && incType === 4) {
    clipPath = pilClip;
  } else if (wipeActive && incType === 6) {
    clipPath = itClip;
  } else if (wipeActive && incType === 5) {
    maskImage = `conic-gradient(from ${sweepStart}deg at 50% 50%, #000 0deg, #000 ${sweepDeg.toFixed(1)}deg, transparent ${(sweepDeg + 2).toFixed(1)}deg)`;
  } else if (wipeActive && incType === 0) {
    if (frame < 2) {
      clipPath = "inset(100%)";
    } else {
      maskImage = `radial-gradient(circle at 540px 960px, #000 ${impR.toFixed(0)}px, transparent ${(impR + 40).toFixed(0)}px)`;
    }
  }

  const whipLines =
    wipeActive && incType === 3
      ? Array.from({ length: 20 }, (_, i) => ({
          y: random(`wl-${index}-${i}`) * 1920,
          x: random(`wx-${index}-${i}`) * 1080,
          len: 300 + random(`wn-${index}-${i}`) * 600,
          w: 1.5 + random(`ww-${index}-${i}`) * 2.5,
        }))
      : [];

  const beamStreaks =
    wipeActive && incType === 1
      ? Array.from({ length: 12 }, (_, i) => {
          const k = `bs-${index}-${i}`;
          return {
            y: 960 + (random(`${k}-y`) - 0.5) * 2 * Math.min(beamH, 900),
            len: 200 + random(`${k}-l`) * 380,
            w: 2 + random(`${k}-w`) * 3,
          };
        })
      : [];

  const pillarRays =
    wipeActive && incType === 4
      ? Array.from({ length: 10 }, (_, i) => {
          const k = `pr-${index}-${i}`;
          const f = (random(`${k}-f`) - 0.5) * 2;
          return {
            x1: 540 + f * pilTop * 0.5,
            x2: 540 + f * pilBot * 0.5,
            w: 2 + random(`${k}-w`) * 3,
            op: 0.4 + random(`${k}-o`) * 0.4,
          };
        })
      : [];

  // ================================================
  // 04. CUT STROBE
  // ================================================
  const flashSeq: Record<number, number[]> = {
    0: [0, 0, 0.6, 0.3, 0.12],
    1: [0.8, 0.45, 0.25, 0.12, 0.06],
    2: [0.9, 0.55, 0.35, 0.2, 0.1],
    3: [0.35, 0.12],
    4: [0.85, 0.5, 0.28, 0.12],
    5: [0.4, 0.2, 0.1],
    6: [0.12, 0.08, 0.12, 0.2, 0.35, 0.8, 0.45, 0.2, 0.1],
  };
  const cutStrobe = isFirst ? 0 : (flashSeq[incType] ?? [])[frame] ?? 0;
  const strobeCol =
    incType === 2
      ? frame === 0
        ? WHITE_HOT
        : RED
      : incType === 4
        ? frame < 2
          ? WHITE_HOT
          : accent
        : incType === 1 || incType === 3 || incType === 5 || incType === 6
          ? ICE
          : WHITE_HOT;
  const negativeNow =
    !isFirst &&
    ((incType === 0 && (frame === 2 || frame === 3)) ||
      (incType === 6 && frame === 5));
  const beatStrobe = thud > 0.72 && g % 2 === 0 ? 0.12 : 0;

  // ================================================
  // 05. HEAVY DROP + SHAKE (camera)
  // ================================================
  const cutHit = isFirst
    ? 0
    : incType === 1
      ? 0.9 * Math.exp(-frame / 4)
      : incType === 2
        ? 1.1 * Math.exp(-frame / 3.5)
        : incType === 0
          ? frame >= 2
            ? 1.1 * Math.exp(-(frame - 2) / 3)
            : 0
          : incType === 4
            ? 0.5 * Math.exp(-frame / 4)
            : incType === 6
              ? frame >= 6
                ? 0.6 * Math.exp(-(frame - 6) / 3)
                : 0
              : 0;
  const cutZoom = isFirst
    ? 0
    : incType === 2
      ? Math.exp(-frame / 4) * 0.3
      : incType === 0
        ? frame >= 2
          ? Math.exp(-(frame - 2) / 3.5) * 0.35
          : 0
        : incType === 1
          ? Math.exp(-frame / 4) * 0.15
          : 0;
  const hit = Math.min(1.4, (kaio ? thud + heart2 * 0.5 : thud) + cutHit);
  const noiseF = Math.floor(g / 2);

  const enterPanK = incType === 3 ? 0 : 1;
  const exitPanK = nxtType === 3 || nxtType === 6 ? 0 : 1;

  const baseScale = interpolate(ramp, [0, 1], [1.18, 1.32], CLAMP);
  const strikeZoom =
    (index % 2 === 0
      ? enterArc * 0.3 + exitArc * 0.04
      : enterArc * 0.08 + exitArc * 0.3) +
    (nxtType === 2 ? exitArc * 0.25 : 0) +
    cutZoom;
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
  // 06. KAIOKEN / KAMEHAMEHA SIGNATURE FX
  // ================================================
  const sparkOn = thud > 0.4 && random(`ssj-${noiseF}`) > 0.2;
  const lit = Math.max(sparkOn ? thud : 0, incType === 1 && frame < 5 ? 0.6 : 0);

  // aura electricity crackling around the body
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
          col: i % 2 === 0 ? accent : modeMid,
        };
      })
    : [];

  // aura flames: bottom edge + both side edges
  const fN = Math.floor(g / 2);
  const auraPow = 0.55 + pulse * 0.45 + hit * 0.5;
  const flames = Array.from({ length: FLAME_N }, (_, i) => {
    const cx = i * 80 + random(`fx-${i}`) * 40;
    const h = (160 + random(`fl-${i}-${fN}`) * 240) * auraPow;
    const tipX = cx + (random(`ft-${i}-${fN}`) - 0.5) * 60;
    return {
      outer: flameShape(cx, h, tipX, 48, 1),
      mid: flameShape(cx, h, tipX, 34, 0.8),
      inner: flameShape(cx, h, tipX, 20, 0.6),
    };
  });
  const sideFlames = Array.from({ length: SIDE_N * 2 }, (_, i) => {
    const left = i < SIDE_N;
    const k = i % SIDE_N;
    const cy = 200 + k * 230 + random(`sy-${i}`) * 60;
    const len = (120 + random(`sf-${i}-${fN}`) * 190) * auraPow;
    const tipY = cy + (random(`sft-${i}-${fN}`) - 0.5) * 70;
    const bx = left ? -20 : 1100;
    const dx = left ? 1 : -1;
    return {
      outer: `${bx},${cy - 55} ${bx + dx * len * 0.55},${cy - 18} ${bx + dx * len},${tipY} ${bx + dx * len * 0.5},${cy + 16} ${bx},${cy + 55}`,
      inner: `${bx},${cy - 30} ${bx + dx * len * 0.4},${cy - 8} ${bx + dx * len * 0.72},${tipY} ${bx + dx * len * 0.36},${cy + 10} ${bx},${cy + 30}`,
    };
  });

  // KAIOKEN: ground cracks on the heartbeat + red speed streaks
  const crackSeed = Math.floor(g / 5);
  const cracks =
    kaio && thud > 0.25
      ? Array.from({ length: 8 }, (_, i) => {
          const k = `ck-${crackSeed}-${index}-${i}`;
          const spread = (i / 7 - 0.5) * 2;
          const ex = 540 + spread * 620 + (random(`${k}-x`) - 0.5) * 160;
          const ey = 1250 + random(`${k}-y`) * 380;
          return toPts(
            genBolt(k, { x: 540 + spread * 60, y: 1880 }, { x: ex, y: ey }, 60, 5),
          );
        })
      : [];
  const kaioStreaks =
    kaio && thud > 0.2
      ? Array.from({ length: 14 }, (_, i) => {
          const k = `kst-${noiseF}-${i}`;
          return {
            x: random(`${k}-x`) * 1080,
            y: random(`${k}-y`) * 1920,
            len: 240 + random(`${k}-l`) * 420,
            w: 2 + random(`${k}-w`) * 3,
            col: i % 3 === 0 ? WHITE_HOT : i % 3 === 1 ? RED : ORANGE,
          };
        })
      : [];

  // KAMEHAMEHA: beam bursts in from the screen edge on strong beats
  const beamY = 1440;
  const beatBeamOn = !kaio && thud > 0.35;
  const beatBeamH = 18 + thud * 84;
  const beatBeamSamples = beatBeamOn
    ? Array.from({ length: 13 }, (_, k) => {
        const t = k / 12;
        const x0 = dir > 0 ? -80 : 1160;
        const x1 = dir > 0 ? 700 : 380;
        const taper = t > 0.8 ? (1 - t) / 0.2 : 1;
        return {
          x: x0 + (x1 - x0) * t,
          hh: beatBeamH * taper * (1 + (random(`bm-${noiseF}-${k}`) - 0.5) * 0.25),
        };
      })
    : [];
  const beatBeamPoly = (f: number) =>
    beatBeamSamples
      .map((s) => `${s.x.toFixed(0)},${(beamY - s.hh * f).toFixed(0)}`)
      .concat(
        [...beatBeamSamples]
          .reverse()
          .map((s) => `${s.x.toFixed(0)},${(beamY + s.hh * f).toFixed(0)}`),
      )
      .join(" ");
  const beatBeamOp = Math.min(0.9, (thud - 0.3) * 1.5);

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
  // 07. GRADE + RGB SPLIT
  // ================================================
  const lamp = isFirst ? 0 : Math.exp(-frame / 4) * 0.12;
  const grade = `contrast(${1.12 + hit * 0.1}) saturate(${
    1.2 + pulse * 0.15
  }) brightness(${1.07 + lamp + hit * 0.08 + lit * 0.18}) hue-rotate(${kaio ? -6 : 4}deg)`;
  const heroFilter = `${negativeNow ? "invert(1) " : ""}${grade}`;

  const cutSplit = isFirst ? 0 : Math.exp(-frame / 3) * (incType === 6 ? 40 : 22);
  const splitAmt = hit * (kaio ? 18 : 12) + cutSplit + warpEnergy * 6;
  const echo = hit * 28 + warpEnergy * 12;
  const ghostShift = warpEnergy * 46;

  const zanzoK =
    wipeActive && incType === 3
      ? 1 - whipF
      : exitCut > 0 && nxtType === 3
        ? easeSnap(exitCut)
        : 0;
  const zanzoSign = wipeActive && incType === 3 ? dir : -dir;

  // ================================================
  // 08. CUT BURST + PARTICLES
  // ================================================
  const burst =
    !isFirst && frame < 18 && incType !== 3
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
            col: i % 3 === 0 ? WHITE_HOT : i % 3 === 1 ? accent : modeMain,
            w: 2 + random(`${k}-w`) * 3,
          };
        })
      : [];

  const particles = Array.from({ length: 56 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 4; // 0 spark | 1 ki orb | 2 mote | 3 soft bokeh
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
        ? modeMain
        : kind === 2
          ? WHITE_HOT
          : kind === 3
            ? accent
            : i % 8 < 4
              ? accent
              : modeMid;
    return { x, y, size, rot, flick, col, kind };
  });

  const rocks = Array.from({ length: ROCK_N }, (_, i) => {
    const seed = i * 53 + index * 17;
    const x =
      random(`rx-${seed}`) * 1000 + Math.sin(g * 0.04 + i) * 20 + camX * 0.1;
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
          clipPath,
          transform:
            wrapX !== 0 || wrapRot !== 0 || wrapScale !== 1 || wrapSX !== 1
              ? `translate3d(${wrapX}px, 0, 0) rotate(${wrapRot}deg) scale(${wrapScale * wrapSX}, ${wrapScale})`
              : undefined,
          filter:
            [
              wrapBlur > 0.3 ? `blur(${wrapBlur.toFixed(1)}px)` : "",
              wrapBright !== 1 ? `brightness(${wrapBright.toFixed(2)})` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
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

          {/* zanzoken afterimages trail behind the dash */}
          {zanzoK > 0.02 &&
            [1, 2, 3].map((k) => (
              <AbsoluteFill
                key={`zanzo-${k}`}
                style={{
                  mixBlendMode: "screen",
                  opacity: 0.36 / k,
                  transform: `translate3d(${zanzoSign * k * 95 * zanzoK}px, 0, 0)`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "sepia(1) hue-rotate(170deg) saturate(3) brightness(1.2)",
                  }}
                />
              </AbsoluteFill>
            ))}

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
                  opacity: Math.min(0.26, echo * 0.0075),
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
                    filter: kaio
                      ? "sepia(1) hue-rotate(-30deg) saturate(4) contrast(1.1) brightness(1.0)"
                      : "sepia(1) hue-rotate(170deg) saturate(3) contrast(1.1) brightness(1.1)",
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
                    filter: "sepia(1) saturate(3) brightness(1.1)",
                  }}
                />
              </AbsoluteFill>
            </>
          )}
        </AbsoluteFill>

        {/* LAYER 03: MODE GRADE (red heat / blue ki) + AURA GLOW */}
        <AbsoluteFill
          style={{
            background: kaio
              ? `linear-gradient(170deg, ${DEEP_RED}99 0%, transparent 45%, ${ORANGE}66 80%, ${accent}77 100%)`
              : `linear-gradient(170deg, ${KI_BLUE}99 0%, transparent 45%, ${ICE}44 80%, ${accent}55 100%)`,
            mixBlendMode: "soft-light",
            opacity: 0.5 + pulse * 0.25,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 62%, ${modeMain}77 0%, transparent 58%)`,
            mixBlendMode: "screen",
            opacity: 0.12 + pulse * 0.15 + thud * 0.15,
            pointerEvents: "none",
          }}
        />

        {/* LAYER 04: SIGNATURE FX */}
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
            {/* aura flames: bottom + sides */}
            <g opacity={0.35 + pulse * 0.2 + hit * 0.25}>
              {flames.map((f, i) => (
                <g key={`flame-${i}`}>
                  <polygon points={f.outer} fill={modeMain} opacity={0.5} />
                  <polygon points={f.mid} fill={modeMid} opacity={0.55} />
                  <polygon points={f.inner} fill={WHITE_HOT} opacity={0.65} />
                </g>
              ))}
              {sideFlames.map((f, i) => (
                <g key={`sflame-${i}`}>
                  <polygon points={f.outer} fill={modeMain} opacity={0.45} />
                  <polygon points={f.inner} fill={modeMid} opacity={0.6} />
                </g>
              ))}
            </g>

            {/* KAIOKEN: ground cracks + red streaks */}
            {cracks.length > 0 && (
              <g
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={Math.min(1, thud * 1.2)}
              >
                {cracks.map((pts, i) => (
                  <g key={`crack-${i}`}>
                    <polyline points={pts} stroke={ORANGE} strokeWidth={12} opacity={0.35} />
                    <polyline points={pts} stroke={accent} strokeWidth={5} />
                    <polyline points={pts} stroke={WHITE_HOT} strokeWidth={2} />
                  </g>
                ))}
              </g>
            )}
            {kaioStreaks.map((s, i) => (
              <line
                key={`kst-${i}`}
                x1={s.x}
                y1={s.y}
                x2={s.x - dir * s.len}
                y2={s.y}
                stroke={s.col}
                strokeWidth={s.w}
                strokeLinecap="round"
                opacity={thud * 0.6}
              />
            ))}

            {/* KAMEHAMEHA: beat beam fired in from the edge */}
            {beatBeamOn && (
              <g opacity={beatBeamOp}>
                <polygon points={beatBeamPoly(1.9)} fill={KI_BLUE} opacity={0.35} />
                <polygon points={beatBeamPoly(1)} fill={ICE} opacity={0.85} />
                <polygon points={beatBeamPoly(0.42)} fill={WHITE_HOT} />
              </g>
            )}

            {/* shockwave ring + radial lines */}
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

        {/* LAYER 06: VIGNETTE, MODE EDGE GLOW, FLASHES, EXIT DIM */}
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
            background: `radial-gradient(ellipse at 50% 50%, transparent 38%, ${modeMain} 125%)`,
            opacity: Math.min(0.5, (kaio ? 0.18 : 0.1) + hit * 0.3),
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundColor: kaio ? ORANGE : ICE,
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
        {exitCut > 0 && nxtType !== 6 && (
          <AbsoluteFill
            style={{
              backgroundColor: nxtType === 2 ? DEEP_RED : NAVY,
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
              borderRight: `3px solid ${modeMain}`,
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
                  backgroundColor: modeMain,
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
              borderLeft: `6px solid ${modeMain}`,
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
            {/* T1 kamehameha: energy beam body, head flare, streaks, origin ring */}
            {incType === 1 && beamSamples.length > 0 && (
              <g
                opacity={interpolate(wipeT, [0, 0.15, 0.5, 0.9], [0, 1, 0.55, 0], CLAMP)}
              >
                <polygon points={beamPoly(1.25)} fill={KI_BLUE} opacity={0.35} />
                <polygon points={beamPoly(0.7)} fill={ICE} opacity={0.85} />
                <polygon points={beamPoly(0.35)} fill={WHITE_HOT} />
                {beamStreaks.map((s, i) => (
                  <line
                    key={`bstreak-${i}`}
                    x1={beamFront}
                    y1={s.y}
                    x2={beamFront - beamSign * s.len}
                    y2={s.y}
                    stroke={WHITE_HOT}
                    strokeWidth={s.w}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                ))}
                <circle
                  cx={beamBack + beamSign * 60}
                  cy={960}
                  r={90 + wipeT * 520}
                  fill="none"
                  stroke={ICE}
                  strokeWidth={10}
                  opacity={1 - wipeT}
                />
              </g>
            )}

            {/* T2 kaioken explosion: spiky outline + cracks */}
            {incType === 2 && star.length > 0 && (
              <g
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={interpolate(wipeT, [0, 0.08, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                {starCracks.map((pts, i) => (
                  <polyline
                    key={`kcrack-${i}`}
                    points={pts}
                    stroke={i % 2 === 0 ? WHITE_HOT : accent}
                    strokeWidth={3}
                    opacity={0.8}
                  />
                ))}
                <polygon
                  points={star.map((s) => `${s.x.toFixed(0)},${s.y.toFixed(0)}`).join(" ")}
                  stroke={RED}
                  strokeWidth={34}
                  opacity={0.5}
                />
                <polygon
                  points={star.map((s) => `${s.x.toFixed(0)},${s.y.toFixed(0)}`).join(" ")}
                  stroke={ORANGE}
                  strokeWidth={12}
                />
                <polygon
                  points={star.map((s) => `${s.x.toFixed(0)},${s.y.toFixed(0)}`).join(" ")}
                  stroke={WHITE_HOT}
                  strokeWidth={3.5}
                />
              </g>
            )}

            {/* T3 zanzoken speed lines */}
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

            {/* T4 ascension pillar: edges, core light, rays */}
            {incType === 4 && (
              <g
                opacity={interpolate(wipeT, [0, 0.08, 0.8, 1], [0, 1, 1, 0], CLAMP)}
              >
                <rect
                  x={540 - pilTop * 0.13}
                  y={0}
                  width={pilTop * 0.26}
                  height={1920}
                  fill={WHITE_HOT}
                  opacity={0.55 * (1 - wipeT)}
                />
                {[-1, 1].map((sd) => (
                  <g key={`pedge-${sd}`}>
                    <line
                      x1={540 + (sd * pilTop) / 2}
                      y1={0}
                      x2={540 + (sd * pilBot) / 2}
                      y2={1920}
                      stroke={accent}
                      strokeWidth={30}
                      opacity={0.4}
                    />
                    <line
                      x1={540 + (sd * pilTop) / 2}
                      y1={0}
                      x2={540 + (sd * pilBot) / 2}
                      y2={1920}
                      stroke={WHITE_HOT}
                      strokeWidth={5}
                    />
                  </g>
                ))}
                {pillarRays.map((r, i) => (
                  <line
                    key={`pray-${i}`}
                    x1={r.x1}
                    y1={0}
                    x2={r.x2}
                    y2={1920}
                    stroke={i % 2 === 0 ? accent : WHITE_HOT}
                    strokeWidth={r.w}
                    opacity={r.op}
                  />
                ))}
              </g>
            )}

            {/* T5 ki vortex: spiral arms + sweep edge */}
            {incType === 5 && (
              <g
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={interpolate(wipeT, [0, 0.08, 0.85, 1], [0, 1, 1, 0], CLAMP)}
              >
                {spiral.map((pts, i) => (
                  <g key={`spiral-${i}`}>
                    <polyline points={pts} stroke={KI_BLUE} strokeWidth={16} opacity={0.35} />
                    <polyline points={pts} stroke={ICE} strokeWidth={6} />
                    <polyline points={pts} stroke={WHITE_HOT} strokeWidth={2} />
                  </g>
                ))}
                <line
                  x1={540}
                  y1={960}
                  x2={540 + Math.sin(sweepAng) * 1700}
                  y2={960 - Math.cos(sweepAng) * 1700}
                  stroke={WHITE_HOT}
                  strokeWidth={4}
                />
              </g>
            )}

            {/* T6 instant transmission: light tunnel fills the gap, ripples, locked line */}
            {incType === 6 && (
              <g>
                {itGap < 540 && (
                  <g>
                    <rect x={0} y={0} width={540 - itGap} height={1920} fill={KI_BLUE} opacity={0.88} />
                    <rect x={540 + itGap} y={0} width={540 - itGap} height={1920} fill={KI_BLUE} opacity={0.88} />
                    {itStreaks.map((st, i) => (
                      <rect
                        key={`its-${i}`}
                        x={st.x}
                        y={0}
                        width={st.w}
                        height={1920}
                        fill={st.col}
                        opacity={st.op}
                      />
                    ))}
                  </g>
                )}
                {itOldHalf > 1 && (
                  <g>
                    <rect
                      x={540 - itOldHalf - 14}
                      y={0}
                      width={itOldHalf * 2 + 28}
                      height={1920}
                      fill={ICE}
                      opacity={0.5}
                    />
                    <rect x={538} y={0} width={4} height={1920} fill={WHITE_HOT} />
                  </g>
                )}
                {[0, 1, 2].map((k) => {
                  const p = Math.min(1, Math.max(0, (wipeT - 0.45 - k * 0.08) / 0.55));
                  return p > 0 && p < 1 ? (
                    <ellipse
                      key={`itr-${k}`}
                      cx={540}
                      cy={960}
                      rx={20 + p * 560}
                      ry={960 + p * 40}
                      fill="none"
                      stroke={ICE}
                      strokeWidth={2 + 6 * (1 - p)}
                      opacity={(1 - p) * 0.8}
                    />
                  ) : null;
                })}
              </g>
            )}

            {/* T0 manga impact focus lines + shock ring */}
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
            {incType === 0 && frame >= 2 && (
              <g
                fill="none"
                opacity={interpolate(wipeT, [0.2, 0.9], [1, 0], CLAMP)}
              >
                <circle cx={540} cy={960} r={impR} stroke={WHITE_HOT} strokeWidth={8} />
                <circle cx={540} cy={960} r={impR + 22} stroke={accent} strokeWidth={22} opacity={0.5} />
              </g>
            )}
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

export const GokuKaiokenKame: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#07101F" overlap={OVERLAP_FRAMES} Scene={Scene} />
);