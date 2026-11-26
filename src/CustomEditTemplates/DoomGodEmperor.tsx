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

// GOD EMPEROR palette: iron black, doom emerald, steel, mint core, brass halo
const IRON = "#0A0D0C";
const EMERALD = "#1FBF6B";
const DEEP_GREEN = "#0E3B2B";
const STEEL = "#9AA7AB";
const STEEL_LIGHT = "#D9E0E1";
const MINT = "#BDFFDD";
const BRASS = "#C9A24D";
const BRASS_LIGHT = "#FFE29A";

const OVERLAP_FRAMES = 10;

// 7 transitions, in this order across the cuts (cut 1 = first transition):
// 1 rune seal | 2 krackle burst | 6 reality rift | 0 iron jaws
// 4 throne rise | 3 doom's gaze | 5 cloak sweep
const TRANSITION_ORDER = [1, 2, 6, 0, 4, 3, 5];
const typeAt = (i: number) =>
  TRANSITION_ORDER[
    (((i - 1) % TRANSITION_ORDER.length) + TRANSITION_ORDER.length) %
      TRANSITION_ORDER.length
  ];

const ANGLES = [118, 242, 62, 298, 100, 260];

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

// Jagged emerald arcs via midpoint displacement
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

// angular rune glyph: a stem with a few branches, deterministic per seed
const runePath = (
  seed: string,
  cx: number,
  cy: number,
  size: number,
  rot: number,
) => {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const tr = (x: number, y: number) =>
    `${(cx + (x * c - y * s) * size).toFixed(1)} ${(cy + (x * s + y * c) * size).toFixed(1)}`;
  let d = `M ${tr(0, -1)} L ${tr(0, 1)}`;
  const branches = 1 + Math.floor(random(`${seed}-n`) * 3);
  for (let b = 0; b < branches; b++) {
    const y0 = -0.9 + random(`${seed}-y${b}`) * 1.3;
    const sd = random(`${seed}-s${b}`) > 0.5 ? 1 : -1;
    const y1 = y0 + (random(`${seed}-e${b}`) - 0.3) * 0.9;
    d += ` M ${tr(0, y0)} L ${tr(sd * 0.75, y1)}`;
  }
  if (random(`${seed}-c`) > 0.6) d += ` M ${tr(-0.5, 0.1)} L ${tr(0.5, -0.1)}`;
  return d;
};

const KR_SLOTS = 7;
const KR_PER = 10;
const FLOAT_RUNES = 14;
// krackle stays emerald + black no matter what brand colour is passed in
const KRACKLE_GREEN = "#1FBF6B";

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
  // 01. BEAT SYNC
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const thud = beatPulseAt(g, beatFrames, 3.1);
  const roar = beatPulseAt(g + 3, beatFrames, 2.2);
  const sub = beatPulseAt(g + 5, beatFrames, 1.6);

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
    config: { damping: 20, stiffness: 170, mass: 0.8 },
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

  // --- T0 IRON JAWS (two plates close from the outer edges) ---
  const jawQ = -2 + easeSnap(Math.min(1, wipeT * 1.12)) * 104;
  const jawX = (Math.min(100, Math.max(0, jawQ)) / 100) * 540;

  // --- T1 RUNE SEAL (hexagon opens, rune ring rides the edge) ---
  const sealR = snapT * 1500;
  const sealRot = (index * 0.3) % (Math.PI / 3);
  const sealVerts = Array.from({ length: 6 }, (_, k) => {
    const a = sealRot + (k * Math.PI) / 3;
    return { x: 540 + Math.cos(a) * sealR, y: 960 + Math.sin(a) * sealR };
  });
  const sealClip = `polygon(${sealVerts
    .map((v) => `${v.x.toFixed(1)}px ${v.y.toFixed(1)}px`)
    .join(", ")})`;
  const sealGlyphs =
    wipeActive && incType === 1
      ? Array.from({ length: 24 }, (_, i) => {
          const e = Math.floor(i / 4);
          const f = (i % 4) * 0.25 + 0.125;
          const v0 = sealVerts[e];
          const v1 = sealVerts[(e + 1) % 6];
          const mx = v0.x + (v1.x - v0.x) * f;
          const my = v0.y + (v1.y - v0.y) * f;
          const ex = (v0.x + v1.x) / 2 - 540;
          const ey = (v0.y + v1.y) / 2 - 960;
          const el = Math.hypot(ex, ey) || 1;
          const ang = Math.atan2(v1.y - v0.y, v1.x - v0.x);
          return runePath(
            `rs-${i}`,
            mx + (ex / el) * 44,
            my + (ey / el) * 44,
            24,
            ang + Math.PI / 2,
          );
        })
      : [];

  // --- T2 KRACKLE BURST (black-dot blobs grow and merge) ---
  const krCircles =
    wipeActive && incType === 2
      ? Array.from({ length: 12 }, (_, k) => {
          const c = k % 3;
          const r = Math.floor(k / 3);
          const cx = (c + 0.5) * 360 + (random(`kx-${index}-${k}`) - 0.5) * 240;
          const cy = (r + 0.5) * 480 + (random(`ky-${index}-${k}`) - 0.5) * 240;
          const delay = random(`kdl-${index}-${k}`) * 0.4;
          const rmax = 700 + random(`kmx-${index}-${k}`) * 300;
          const rad =
            easeSnap(Math.min(1, Math.max(0, (wipeT * 1.25 - delay) / 0.7))) *
            rmax;
          return { k, cx, cy, rad };
        })
      : [];
  const krLive = krCircles.filter((c) => c.rad > 3);
  const krDots = krLive.flatMap((c) =>
    Array.from({ length: 8 }, (_, j) => {
      const a = random(`kda-${index}-${c.k}-${j}`) * Math.PI * 2;
      const d = c.rad + (random(`kdd-${index}-${c.k}-${j}`) - 0.2) * 26;
      const s = 7 + random(`kds-${index}-${c.k}-${j}`) * 20;
      return {
        x: c.cx + Math.cos(a) * d,
        y: c.cy + Math.sin(a) * d,
        rx: s,
        ry: s * (0.7 + random(`kdy-${index}-${c.k}-${j}`) * 0.5),
      };
    }),
  );

  // --- T3 DOOM'S GAZE (iris opens through the eyes) ---
  const irisCx = 540;
  const irisCy = 860;
  const irisR = 40 + snapT * 1760;

  // --- T4 THRONE RISE (new shot rises as a pair with the old one) ---
  const riseF = snapT;
  const riseEdge = (1 - riseF) * 1920;
  const riseLines =
    wipeActive && incType === 4
      ? Array.from({ length: 14 }, (_, i) => ({
          x: random(`rl-${index}-${i}`) * 1080,
          len: 260 + random(`rn-${index}-${i}`) * 520,
          w: 1.5 + random(`rw-${index}-${i}`) * 2.5,
        }))
      : [];

  // --- T5 CLOAK SWEEP (diagonal wipe with a smoke-cloth edge) ---
  const cloakAng = ANGLES[index % 6];
  const cloakP = -16 + snapT * 132;

  // --- T6 REALITY RIFT (jagged emerald tear sweeps across) ---
  const riftAng = ANGLES[(index + 2) % 6];
  const riftA = (riftAng * Math.PI) / 180;
  const riftD = { x: Math.sin(riftA), y: -Math.cos(riftA) };
  const riftN = { x: Math.cos(riftA), y: Math.sin(riftA) };
  const riftLen =
    Math.abs(1080 * Math.sin(riftA)) + Math.abs(1920 * Math.cos(riftA));
  const riftPct = -3 + snapT * 106;
  const riftOff = (riftPct / 100 - 0.5) * riftLen;
  const riftC = { x: 540 + riftD.x * riftOff, y: 960 + riftD.y * riftOff };
  const riftEdge: Pt[] =
    wipeActive && incType === 6
      ? Array.from({ length: 21 }, (_, i) => {
          const s = -1700 + i * 170;
          const jag = (random(`rf-${index}-${i}-${frame}`) - 0.5) * 70;
          return {
            x: riftC.x + riftN.x * s + riftD.x * jag,
            y: riftC.y + riftN.y * s + riftD.y * jag,
          };
        })
      : [];
  const riftClip =
    riftEdge.length > 0
      ? `polygon(${riftEdge
          .map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`)
          .concat([
            `${(riftC.x - riftD.x * 4000 + riftN.x * 1700).toFixed(1)}px ${(riftC.y - riftD.y * 4000 + riftN.y * 1700).toFixed(1)}px`,
            `${(riftC.x - riftD.x * 4000 - riftN.x * 1700).toFixed(1)}px ${(riftC.y - riftD.y * 4000 - riftN.y * 1700).toFixed(1)}px`,
          ])
          .join(", ")})`
      : "inset(100%)";
  const riftBranches = riftEdge.length
    ? [3, 6, 9, 12, 15, 18].map((pi, bi) => {
        const p = riftEdge[pi];
        const len = 150 + random(`rb-${index}-${bi}`) * 150;
        return toPts(
          genBolt(
            `rbr-${index}-${bi}-${frame}`,
            p,
            {
              x:
                p.x +
                riftD.x * len +
                (random(`rbx-${index}-${bi}`) - 0.5) * 120,
              y: p.y + riftD.y * len,
            },
            40,
            4,
          ),
        );
      })
    : [];

  // --- wrapper motion + mask / clip ---
  let wrapY = 0;
  let wrapBlur = 0;
  let wrapX = 0;
  if (wipeActive && incType === 4) {
    wrapY = (1 - riseF) * 1920;
    wrapBlur = (1 - riseF) * 18;
  }
  if (exitCut > 0 && nxtType === 4) {
    wrapY = -easeSnap(exitCut) * 1920;
    wrapBlur = easeSnap(exitCut) * 18;
  } else if (exitCut > 0 && (nxtType === 2 || nxtType === 6)) {
    wrapX = (random(`xj-${g}`) - 0.5) * exitCut * 30;
  }

  let maskImage: string | undefined;
  let maskSize: string | undefined;
  let maskPosition: string | undefined;
  let maskRepeat: string | undefined;
  let clipPath: string | undefined;
  if (wipeActive && incType === 0) {
    maskImage = `linear-gradient(90deg, #000 ${jawQ}%, transparent ${jawQ + 1.2}%), linear-gradient(270deg, #000 ${jawQ}%, transparent ${jawQ + 1.2}%)`;
    maskSize = "50.3% 100%, 50.3% 100%";
    maskPosition = "0 0, 100% 0";
    maskRepeat = "no-repeat, no-repeat";
  } else if (wipeActive && incType === 1) {
    clipPath = sealClip;
  } else if (wipeActive && incType === 2) {
    if (krLive.length === 0) {
      clipPath = "inset(100%)";
    } else {
      maskImage = krLive
        .map(
          (c) =>
            `radial-gradient(circle at ${c.cx.toFixed(0)}px ${c.cy.toFixed(0)}px, #000 ${c.rad.toFixed(0)}px, transparent ${(c.rad + 3).toFixed(0)}px)`,
        )
        .join(",");
    }
  } else if (wipeActive && incType === 3) {
    maskImage = `radial-gradient(circle at ${irisCx}px ${irisCy}px, #000 ${irisR.toFixed(0)}px, transparent ${(irisR + 46).toFixed(0)}px)`;
  } else if (wipeActive && incType === 5) {
    maskImage = `linear-gradient(${cloakAng}deg, #000 ${cloakP}%, transparent ${cloakP + 14}%)`;
  } else if (wipeActive && incType === 6) {
    clipPath = riftClip;
  }

  // ================================================
  // 04. CUT STROBE
  // ================================================
  const flashSeq: Record<number, number[]> = {
    0: [0, 0, 0, 0, 0, 0, 0, 0.25, 0.7, 0.35, 0.15],
    1: [0.55, 0.25, 0, 0.2, 0.1],
    2: [0.5, 0.2, 0.4, 0.15],
    3: [0.6, 0.3, 0.15],
    4: [0.3, 0.1, 0, 0, 0, 0, 0, 0.4, 0.2, 0.1],
    5: [0.25, 0.1],
    6: [0.55, 0.2, 0.35, 0.12],
  };
  const cutStrobe = isFirst ? 0 : ((flashSeq[incType] ?? [])[frame] ?? 0);
  const strobeCol =
    incType === 0 ? STEEL_LIGHT : incType === 4 ? BRASS_LIGHT : MINT;
  const negativeNow = !isFirst && incType === 6 && frame === 1;
  const beatStrobe = thud > 0.72 && g % 2 === 0 ? 0.12 : 0;

  // ================================================
  // 05. HEAVY DROP + SHAKE (camera)
  // ================================================
  const cutHit = isFirst
    ? 0
    : incType === 0
      ? frame >= 8
        ? 1.2 * Math.exp(-(frame - 8) / 3)
        : 0
      : incType === 1
        ? 0.5 * Math.exp(-frame / 4)
        : incType === 2
          ? 0.7 * Math.exp(-frame / 4)
          : incType === 3
            ? 0.5 * Math.exp(-frame / 4)
            : incType === 4
              ? frame >= 7
                ? 0.9 * Math.exp(-(frame - 7) / 3)
                : 0
              : incType === 6
                ? 0.8 * Math.exp(-frame / 3.5)
                : 0.3 * Math.exp(-frame / 4);
  const cutZoom = isFirst
    ? 0
    : incType === 3 || incType === 6
      ? Math.exp(-frame / 4) * 0.2
      : 0;
  const hit = Math.min(1.35, thud + cutHit);
  const noiseF = Math.floor(g / 2);

  const baseScale = interpolate(ramp, [0, 1], [1.18, 1.32], CLAMP);
  const strikeZoom =
    (index % 2 === 0
      ? enterArc * 0.3 + exitArc * 0.04
      : enterArc * 0.08 + exitArc * 0.3) +
    (nxtType === 3 ? exitArc * 0.3 : 0) +
    cutZoom;
  const totalScale = Math.max(
    1.16,
    baseScale +
      strikeZoom +
      hit * 0.09 +
      Math.sin(pulse * Math.PI * 2) * hit * 0.02,
  );

  const camX =
    -inc.x * enterArc * 150 * (incType === 4 ? 0 : 1) +
    nxt.x * exitArc * 110 * (nxtType === 4 ? 0 : 1) +
    Math.sin(g * 0.07) * 5 +
    Math.sin(g * 3.1) * hit * 34 +
    (random(`bsx-${noiseF}`) - 0.5) * hit * 26;
  const camY =
    -inc.y * enterArc * 170 * (incType === 4 ? 0 : 1) +
    nxt.y * exitArc * 120 * (nxtType === 4 ? 0 : 1) +
    Math.cos(g * 0.06) * 4 +
    hit * 30 +
    Math.cos(g * 2.6) * hit * 30 +
    (random(`bsy-${noiseF}`) - 0.5) * hit * 24;
  const camRot =
    enterArc * 5 * dir * (incType === 4 ? 0 : 1) -
    exitArc * 6 * dir * (nxtType === 4 ? 0 : 1) +
    Math.sin(g * 0.05) * 0.8 +
    (random(`bsr-${noiseF}`) - 0.5) * hit * 4;

  // ================================================
  // 06. DOOM SIGNATURE: ARCS, RUNE AURA, HALO, KIRBY KRACKLE
  // ================================================
  const bSeed = Math.floor(g / 2);
  const arcOn = thud > 0.45 && random(`arc-${bSeed}`) > 0.25;
  const lit = Math.max(arcOn ? thud : 0, incType === 6 && frame < 4 ? 0.6 : 0);

  // emerald arcs crackle in from both hands
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

  const runeIgnite = 0.16 + thud * 0.6;

  // runes drifting upward like embers
  const floatRunes = Array.from({ length: FLOAT_RUNES }, (_, i) => {
    const seed = i * 61 + index * 19;
    const x =
      random(`fr-x-${seed}`) * 1000 + Math.sin(g * 0.04 + i) * 26 + camX * 0.12;
    const speed = 2.5 + (i % 4) * 0.8;
    const y = 2000 - ((g * speed + random(`fr-y-${seed}`) * 2200) % 2200);
    const flick = 0.5 + random(`fr-f-${seed}-${Math.floor(g / 3)}`) * 0.5;
    return {
      d: runePath(
        `fr-${i}`,
        x,
        y,
        16 + (i % 3) * 6,
        Math.sin(g * 0.03 + i) * 0.4,
      ),
      op: 0.25 + flick * 0.5,
    };
  });

  // rune columns scrolling slowly up the far left and right edges
  const runeCols = [0, 1].flatMap((side) =>
    Array.from({ length: 19 }, (_, i) => {
      const x = side === 0 ? 30 : 1050;
      const y = ((((i * 90 - g * 0.8) % 1710) + 1710) % 1710) + 100;
      return { d: runePath(`rc-${side}-${i}`, x, y, 15, 0), hot: i % 3 === 0 };
    }),
  );

  // cathedral light shafts falling from the top corners (kept off the centre)
  const shaftDefs = [
    { t0: -80, t1: 130, b0: 60, b1: 400 },
    { t0: 170, t1: 250, b0: 250, b1: 430 },
    { t0: 950, t1: 1160, b0: 680, b1: 1020 },
    { t0: 830, t1: 910, b0: 650, b1: 830 },
  ];
  const shafts = shaftDefs.map((d, k) => {
    const sw = Math.sin(g * 0.02 + k * 1.7) * 26;
    return `${d.t0 + sw},0 ${d.t1 + sw},0 ${d.b1 + sw},1920 ${d.b0 + sw},1920`;
  });

  // KIRBY KRACKLE: emerald + black clusters that respawn at random spots,
  // weighted hard toward the left and right edges so the subject stays clear
  const krackle = Array.from({ length: KR_SLOTS }, (_, sl) => {
    const period = 24 + sl * 3;
    const phase = (g + sl * 9) / period;
    const epoch = Math.floor(phase);
    const local = phase - epoch;
    const env = Math.pow(Math.sin(Math.PI * local), 0.7);
    const kseed = `kr-${index}-${sl}-${epoch}`;
    const zone = random(`${kseed}-z`);
    const cx =
      zone < 0.43
        ? -30 + random(`${kseed}-x`) * 270
        : zone < 0.86
          ? 840 + random(`${kseed}-x`) * 270
          : random(`${kseed}-x`) * 1080;
    const cy = 120 + random(`${kseed}-y`) * 1680;
    const scale = 0.8 + random(`${kseed}-sc`) * 0.7;
    const grow = env * (0.6 + thud * 0.5 + pulse * 0.1);
    return Array.from({ length: KR_PER }, (_, m) => {
      const ang = random(`${kseed}-a-${m}`) * Math.PI * 2;
      const rad = random(`${kseed}-r-${m}`) * 110 * scale;
      const size = (14 + random(`${kseed}-s-${m}`) * 46) * scale * grow;
      return {
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad,
        rx: size,
        ry: size * (0.7 + random(`${kseed}-y-${m}`) * 0.5),
        env,
      };
    });
  }).flat();

  // shadow tendrils creeping in from the side edges on the beat
  const tdBase = Math.floor(g / 9);
  const tendrils = Array.from({ length: 8 }, (_, i) => {
    const left = i < 4;
    const k = i % 4;
    const tseed = `td-${tdBase}-${index}-${i}`;
    const y0 = 160 + k * 430 + random(`${tseed}-y`) * 180;
    const len =
      (130 + random(`${tseed}-l`) * 190) * (0.35 + thud * 0.65 + pulse * 0.2);
    const sx = left ? -20 : 1100;
    const dx = left ? 1 : -1;
    const wob = random(`${tseed}-w`) * 6;
    return Array.from({ length: 7 }, (_, j) => {
      const t = j / 6;
      return {
        x: sx + dx * len * t,
        y:
          y0 +
          Math.sin(t * 3.1 + wob) * 38 * t +
          (random(`${tseed}-j${j}`) - 0.5) * 16,
      };
    })
      .map((q) => `${q.x.toFixed(0)},${q.y.toFixed(0)}`)
      .join(" ");
  });

  // edge energy crawling along the frame
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

  const speedLines = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 + random(`sl-a-${i}`) * 0.12;
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
  const grade = `contrast(${1.18 + hit * 0.1}) saturate(${
    0.95 + pulse * 0.12
  }) brightness(${1.05 + lamp + hit * 0.1 + lit * 0.18})`;
  const heroFilter = `${negativeNow ? "invert(1) " : ""}${grade}`;

  const cutSplit = isFirst ? 0 : Math.exp(-frame / 3) * 24;
  const splitAmt = hit * 22 + cutSplit + warpEnergy * 8;
  const echo = hit * 28 + warpEnergy * 12;
  const ghostShift = warpEnergy * 46;

  // ================================================
  // 08. BURST + PARTICLES
  // ================================================
  const burst =
    !isFirst && frame < 18 && incType !== 4
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
            col: i % 3 === 0 ? STEEL_LIGHT : i % 3 === 1 ? accent : MINT,
            w: 2 + random(`${k}-w`) * 3,
          };
        })
      : [];

  const particles = Array.from({ length: 56 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 4; // 0 steel shard | 1 ember | 2 brass dust | 3 bokeh
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
            ? 4
            : 6 + (i % 4) * 2.5 + roar * 4;
    const rot = g * (3 + (i % 4) * 2) * (i % 2 === 0 ? 1 : -1);
    const flick = 0.55 + random(`pf-${seed}-${Math.floor(g / 3)}`) * 0.45;
    const col =
      kind === 1
        ? i % 8 < 4
          ? accent
          : MINT
        : kind === 2
          ? BRASS_LIGHT
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
          style={{
            pointerEvents: "none",
            mixBlendMode: "overlay",
            opacity: 0.16,
          }}
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

        {/* LAYER 03b: KIRBY KRACKLE + SHADOW TENDRILS (normal blend so black stays black) */}
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <svg
            width="1080"
            height="1920"
            viewBox="0 0 1080 1920"
            style={{
              transform: `translate3d(${camX * 0.12}px, ${camY * 0.12}px, 0)`,
            }}
          >
            {tendrils.map((pts, i) => (
              <g
                key={`tendril-${i}`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline
                  points={pts}
                  stroke={KRACKLE_GREEN}
                  strokeWidth={20}
                  opacity={0.3 + thud * 0.2}
                />
                <polyline
                  points={pts}
                  stroke="#000"
                  strokeWidth={11}
                  opacity={0.92}
                />
              </g>
            ))}
            {krackle.map((k, i) => (
              <ellipse
                key={`kglow-${i}`}
                cx={k.x}
                cy={k.y}
                rx={k.rx * 2.1}
                ry={k.ry * 2.1}
                fill={KRACKLE_GREEN}
                opacity={k.env * (0.12 + thud * 0.18)}
              />
            ))}
            {krackle.map((k, i) => (
              <ellipse
                key={`kdot-${i}`}
                cx={k.x}
                cy={k.y}
                rx={k.rx}
                ry={k.ry}
                fill="#000"
                stroke={KRACKLE_GREEN}
                strokeWidth={3}
                opacity={Math.min(0.95, k.env * (0.6 + thud * 0.4) + 0.05)}
              />
            ))}
          </svg>
        </AbsoluteFill>

        {/* LAYER 04: LIGHT SHAFTS, RUNE COLUMNS, SHOCKWAVE */}
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
            {/* gothic cathedral light shafts */}
            <defs>
              <linearGradient id={`shaft-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.7" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            {shafts.map((pts, i) => (
              <polygon
                key={`shaft-${i}`}
                points={pts}
                fill={`url(#shaft-${index})`}
                opacity={0.1 + pulse * 0.1 + thud * 0.14}
              />
            ))}

            {/* rune columns down both edges */}
            <g fill="none" strokeLinecap="round">
              {runeCols.map((r, i) => (
                <path
                  key={`rc-${i}`}
                  d={r.d}
                  stroke={r.hot ? MINT : accent}
                  strokeWidth={2.5}
                  opacity={runeIgnite * (r.hot ? 1 : 0.75)}
                />
              ))}
            </g>

            {/* floating runes */}
            <g fill="none" strokeLinecap="round">
              {floatRunes.map((r, i) => (
                <path
                  key={`fr-${i}`}
                  d={r.d}
                  stroke={i % 2 === 0 ? accent : MINT}
                  strokeWidth={2.5}
                  opacity={r.op}
                />
              ))}
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
                    <polyline
                      points={pts}
                      stroke={accent}
                      strokeWidth={6}
                      opacity={0.3}
                    />
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
                      ? 0.6
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
              borderRight: `3px solid ${BRASS}`,
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
                  backgroundColor: BRASS,
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
              borderLeft: `6px solid ${BRASS}`,
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
      {wipeActive && incType === 5 && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            WebkitMaskImage: `linear-gradient(${cloakAng}deg, transparent ${cloakP - 6}%, #000 ${cloakP + 4}%, transparent ${cloakP + 22}%)`,
            maskImage: `linear-gradient(${cloakAng}deg, transparent ${cloakP - 6}%, #000 ${cloakP + 4}%, transparent ${cloakP + 22}%)`,
            opacity: interpolate(
              wipeT,
              [0, 0.15, 0.8, 1],
              [0, 0.95, 0.95, 0],
              CLAMP,
            ),
          }}
        >
          <svg
            width="1080"
            height="1920"
            style={{
              transform: `translate(${frame * 40 * (cloakAng < 180 ? 1 : -1)}px, 0)`,
            }}
          >
            <filter
              id={`cloak-${index}`}
              filterUnits="userSpaceOnUse"
              x="-400"
              y="0"
              width="1880"
              height="1920"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.006 0.012"
                numOctaves="4"
                seed={index * 3 + 7}
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.03  0 0 0 0 0.22  0 0 0 0 0.13  3 0 0 0 -0.9"
              />
            </filter>
            <rect
              x="-400"
              width="1880"
              height="1920"
              filter={`url(#cloak-${index})`}
            />
          </svg>
        </AbsoluteFill>
      )}

      {wipeActive && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <defs>
              <linearGradient id={`rise-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0" />
                <stop
                  offset="100%"
                  stopColor={BRASS_LIGHT}
                  stopOpacity="0.75"
                />
              </linearGradient>
            </defs>

            {/* T0 iron jaw plates */}
            {incType === 0 && jawQ < 100 && (
              <g>
                <rect
                  x={jawX - 44}
                  y={0}
                  width={44}
                  height={1920}
                  fill="#1B2120"
                />
                <rect
                  x={jawX - 44}
                  y={0}
                  width={6}
                  height={1920}
                  fill={STEEL}
                />
                <rect
                  x={jawX - 14}
                  y={0}
                  width={11}
                  height={1920}
                  fill={STEEL_LIGHT}
                  opacity={0.8}
                />
                <rect x={jawX - 3} y={0} width={3} height={1920} fill={MINT} />
                <rect
                  x={1080 - jawX}
                  y={0}
                  width={44}
                  height={1920}
                  fill="#1B2120"
                />
                <rect
                  x={1080 - jawX + 38}
                  y={0}
                  width={6}
                  height={1920}
                  fill={STEEL}
                />
                <rect
                  x={1080 - jawX + 3}
                  y={0}
                  width={11}
                  height={1920}
                  fill={STEEL_LIGHT}
                  opacity={0.8}
                />
                <rect
                  x={1080 - jawX}
                  y={0}
                  width={3}
                  height={1920}
                  fill={MINT}
                />
                {Array.from({ length: 8 }, (_, i) => (
                  <g key={`rivet-${i}`}>
                    <circle
                      cx={jawX - 28}
                      cy={120 + i * 240}
                      r={7}
                      fill={BRASS}
                    />
                    <circle
                      cx={jawX - 28}
                      cy={120 + i * 240}
                      r={3}
                      fill={BRASS_LIGHT}
                    />
                    <circle
                      cx={1080 - jawX + 28}
                      cy={120 + i * 240}
                      r={7}
                      fill={BRASS}
                    />
                    <circle
                      cx={1080 - jawX + 28}
                      cy={120 + i * 240}
                      r={3}
                      fill={BRASS_LIGHT}
                    />
                  </g>
                ))}
              </g>
            )}
            {incType === 0 && frame >= 8 && (
              <g fill="none">
                <circle
                  cx={540}
                  cy={960}
                  r={(frame - 7) * 260}
                  stroke={accent}
                  strokeWidth={26}
                  opacity={0.5}
                />
                <circle
                  cx={540}
                  cy={960}
                  r={(frame - 7) * 260}
                  stroke={STEEL_LIGHT}
                  strokeWidth={6}
                />
              </g>
            )}

            {/* T1 rune seal: hex outline + rune ring */}
            {incType === 1 && (
              <g
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={interpolate(
                  wipeT,
                  [0, 0.08, 0.85, 1],
                  [0, 1, 1, 0],
                  CLAMP,
                )}
              >
                {[0.82, 1].map((f, i) => (
                  <polygon
                    key={`seal-${i}`}
                    points={sealVerts
                      .map(
                        (v) =>
                          `${(540 + (v.x - 540) * f).toFixed(0)},${(960 + (v.y - 960) * f).toFixed(0)}`,
                      )
                      .join(" ")}
                    stroke={i === 0 ? STEEL : accent}
                    strokeWidth={i === 0 ? 2.5 : 18}
                    opacity={i === 0 ? 0.7 : 0.45}
                  />
                ))}
                <polygon
                  points={sealVerts
                    .map((v) => `${v.x.toFixed(0)},${v.y.toFixed(0)}`)
                    .join(" ")}
                  stroke={MINT}
                  strokeWidth={4}
                />
                {sealGlyphs.map((d, i) => (
                  <path
                    key={`sg-${i}`}
                    d={d}
                    stroke={i % 2 === 0 ? MINT : accent}
                    strokeWidth={4}
                  />
                ))}
              </g>
            )}

            {/* T2 krackle rings + black dots */}
            {incType === 2 && (
              <g
                opacity={interpolate(
                  wipeT,
                  [0, 0.08, 0.85, 1],
                  [0, 1, 1, 0],
                  CLAMP,
                )}
              >
                {krLive.map((c) => (
                  <g key={`krc-${c.k}`} fill="none">
                    <circle
                      cx={c.cx}
                      cy={c.cy}
                      r={c.rad}
                      stroke={KRACKLE_GREEN}
                      strokeWidth={12}
                      opacity={0.55}
                    />
                    <circle
                      cx={c.cx}
                      cy={c.cy}
                      r={c.rad}
                      stroke={MINT}
                      strokeWidth={3}
                    />
                  </g>
                ))}
                {krDots.map((d, i) => (
                  <ellipse
                    key={`krd-${i}`}
                    cx={d.x}
                    cy={d.y}
                    rx={d.rx}
                    ry={d.ry}
                    fill="#000"
                    stroke={KRACKLE_GREEN}
                    strokeWidth={2.5}
                  />
                ))}
              </g>
            )}

            {/* T3 doom's gaze: ring + cathedral rays */}
            {incType === 3 && (
              <g
                fill="none"
                opacity={interpolate(
                  wipeT,
                  [0, 0.1, 0.85, 1],
                  [0, 1, 1, 0],
                  CLAMP,
                )}
              >
                {Array.from({ length: 14 }, (_, i) => {
                  const a = (i / 14) * Math.PI * 2 + wipeT * 0.4;
                  return (
                    <line
                      key={`gray-${i}`}
                      x1={irisCx}
                      y1={irisCy}
                      x2={irisCx + Math.cos(a) * irisR * 0.92}
                      y2={irisCy + Math.sin(a) * irisR * 0.92}
                      stroke={MINT}
                      strokeWidth={2}
                      opacity={0.35}
                    />
                  );
                })}
                <circle
                  cx={irisCx}
                  cy={irisCy}
                  r={irisR + 18}
                  stroke={IRON}
                  strokeWidth={26}
                  opacity={0.6}
                />
                <circle
                  cx={irisCx}
                  cy={irisCy}
                  r={irisR}
                  stroke={accent}
                  strokeWidth={16}
                  opacity={0.45}
                />
                <circle
                  cx={irisCx}
                  cy={irisCy}
                  r={irisR}
                  stroke={STEEL}
                  strokeWidth={6}
                />
                <circle
                  cx={irisCx}
                  cy={irisCy}
                  r={irisR}
                  stroke={MINT}
                  strokeWidth={2.5}
                />
              </g>
            )}

            {/* T4 throne rise: edge glow + speed lines */}
            {incType === 4 && (
              <g
                opacity={interpolate(
                  wipeT,
                  [0, 0.08, 0.85, 1],
                  [0, 1, 1, 0],
                  CLAMP,
                )}
              >
                <rect
                  x={0}
                  y={riseEdge - 240}
                  width={1080}
                  height={240}
                  fill={`url(#rise-${index})`}
                />
                <rect
                  x={0}
                  y={riseEdge - 4}
                  width={1080}
                  height={8}
                  fill={BRASS_LIGHT}
                />
                <rect
                  x={0}
                  y={riseEdge - 1.5}
                  width={1080}
                  height={3}
                  fill={MINT}
                />
                {riseLines.map((l, i) => (
                  <line
                    key={`rise-line-${i}`}
                    x1={l.x}
                    y1={riseEdge}
                    x2={l.x}
                    y2={riseEdge + l.len}
                    stroke={STEEL_LIGHT}
                    strokeWidth={l.w}
                    strokeLinecap="round"
                    opacity={(1 - riseF) * 0.6}
                  />
                ))}
              </g>
            )}

            {/* T6 reality rift: glowing tear + cracks */}
            {incType === 6 && riftEdge.length > 0 && (
              <g
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={interpolate(
                  wipeT,
                  [0, 0.08, 0.85, 1],
                  [0, 1, 1, 0],
                  CLAMP,
                )}
              >
                {riftBranches.map((pts, i) => (
                  <g key={`rbr-${i}`}>
                    <polyline
                      points={pts}
                      stroke={accent}
                      strokeWidth={12}
                      opacity={0.3}
                    />
                    <polyline points={pts} stroke={MINT} strokeWidth={3} />
                  </g>
                ))}
                <polyline
                  points={toPts(riftEdge)}
                  stroke={accent}
                  strokeWidth={34}
                  opacity={0.4}
                />
                <polyline
                  points={toPts(riftEdge)}
                  stroke={MINT}
                  strokeWidth={10}
                  opacity={0.8}
                />
                <polyline
                  points={toPts(riftEdge)}
                  stroke={STEEL_LIGHT}
                  strokeWidth={3.5}
                />
              </g>
            )}
          </svg>
        </AbsoluteFill>
      )}

      {/* ============================================
          EMERALD ARCS ON THE BEAT
      ============================================ */}
      {arcs.length > 0 && (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: arcOp }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <g fill="none" strokeLinejoin="round" strokeLinecap="round">
              {arcs.map((a, ai) => (
                <g key={`arc-${ai}`}>
                  <polyline
                    points={a.main}
                    stroke={accent}
                    strokeWidth={22}
                    opacity={0.22}
                  />
                  <polyline
                    points={a.main}
                    stroke={MINT}
                    strokeWidth={9}
                    opacity={0.65}
                  />
                  <polyline
                    points={a.main}
                    stroke={STEEL_LIGHT}
                    strokeWidth={3.5}
                  />
                  {a.branches.map((b, i) => (
                    <g key={`arc-branch-${ai}-${i}`}>
                      <polyline
                        points={b}
                        stroke={accent}
                        strokeWidth={12}
                        opacity={0.2}
                      />
                      <polyline
                        points={b}
                        stroke={MINT}
                        strokeWidth={5}
                        opacity={0.6}
                      />
                      <polyline
                        points={b}
                        stroke={STEEL_LIGHT}
                        strokeWidth={2}
                      />
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
            backgroundColor: strobeCol,
            opacity: cutStrobe,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export const DoomGodEmperor: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#0A0D0C" overlap={OVERLAP_FRAMES} Scene={Scene} />
);
