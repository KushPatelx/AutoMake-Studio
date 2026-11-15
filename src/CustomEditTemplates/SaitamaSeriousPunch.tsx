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
import { EditProps, EditSceneProps, EditVideo, beatPulse } from "../editShared";
import { loadFont } from "@remotion/google-fonts/BlackOpsOne";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const COSMIC_VOID = "#040206";
const SAITAMA_YELLOW = "#FFD000";
const GLOVE_RED = "#E60012";
const GENOS_ORANGE = "#FF5500";
const GAROU_PURPLE = "#9D00FF";
const IMPACT_WHITE = "#FFFDF9";

const OVERLAP_FRAMES = 9;

const Scene: React.FC<EditSceneProps> = ({
  src,
  seg,
  index,
  total,
  totalFrames,
  bpm,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const g = seg.start + frame;
  const duration = Math.max(1, seg.duration);
  const span = duration + OVERLAP_FRAMES;

  const accent = brand.color || GLOVE_RED;
  const brandName = brand.name || "SERIOUS SERIES";

  // ================================================
  // 01. SERIOUS PUNCH IMPACT & BEAT RECOIL MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const punchImpact = beatPulse(g, bpm, 3.4);
  const subShock = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.8);
  const limiterTick = beatPulse(g * 2, bpm, 1.5);

  // Elastic recoil snap on every heavy beat (simulates physical punch knockback)
  const punchRecoil = Math.sin(pulse * Math.PI * 2.5) * punchImpact * 0.11;

  // ================================================
  // 02. SERIOUS SIDEWAYS JUMPS VELOCITY (TWIXTOR CURVE)
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const velocityFlow =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.48], CLAMP)
      : u < 0.8
        ? interpolate(u, [0.2, 0.8], [0.48, 0.52], CLAMP)
        : interpolate(u, [0.8, 1], [0.52, 1], CLAMP);

  const enterCut =
    index === 0 ? 1 : interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], CLAMP);
  const exitCut = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP,
  );

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 9, stiffness: 310, mass: 0.36 },
  });

  const enterSlam = Math.pow(1 - enterCut, 2.6);
  const exitSlam = Math.pow(exitCut, 2.6);
  const impactSurge = Math.min(1, enterSlam + exitSlam);

  // ================================================
  // 03. PLANETARY SHOCKWAVE CAMERA & 9:16 FULL-BLEED RIG
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;

  // Always >= 1.18 scale so 9:16 portrait images NEVER expose black edges
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.34], CLAMP);
  const punchZoom =
    index % 2 === 0
      ? enterSlam * 0.72 + exitSlam * 0.45
      : (1 - enterSpring) * 0.52 + exitSlam * 0.75;
  const totalScale = Math.max(
    1.16,
    baseScale + punchZoom + punchImpact * 0.16 + punchRecoil,
  );

  // Serious Sideways Jumps lateral snap + knockback tremor
  const jumpX = (enterSlam * 620 - exitSlam * 660) * dir;
  const jumpY = (enterSlam * -260 + exitSlam * 280) * dir;

  const quakeAmp = punchImpact * 38 + impactSurge * 26 + pulse * 8;
  const shakeX =
    Math.sin(g * 3.8) * quakeAmp +
    (random(`opx-${g}`) - 0.5) * punchImpact * 34;
  const shakeY =
    Math.cos(g * 3.1) * quakeAmp +
    (random(`opy-${g}`) - 0.5) * punchImpact * 30;

  const camX = jumpX + shakeX;
  const camY = jumpY + shakeY;

  const camRot =
    (enterSlam * 14 - exitSlam * 16) * dir +
    Math.sin(g * 0.28) * 1.8 +
    (random(`opr-${g}`) - 0.5) * punchImpact * 7;

  // ================================================
  // 04. SERIOUS PUNCH CLOUD-SPLIT V-WEDGE TRANSITION
  // ================================================
  // Just like Saitama's Serious Punch splitting the atmosphere across the globe,
  // a massive supersonic V-wedge tears the outgoing cut apart while 4 diagonal tectonic slabs slam in!
  const slabs = [0, 1, 2, 3].map((sIdx) => {
    const delay = sIdx * 1.4;
    const sProg =
      index === 0 ? 1 : interpolate(frame, [delay, delay + 5.2], [0, 1], CLAMP);
    const sEase = 1 - Math.pow(1 - sProg, 3);

    const sExit = Math.pow(
      interpolate(
        frame,
        [duration + sIdx * 1.1, duration + OVERLAP_FRAMES],
        [0, 1],
        CLAMP,
      ),
      2.4,
    );

    // Upper slabs blow upward/left, lower slabs blow downward/right on punch exit
    const blowDir = sIdx < 2 ? -1 : 1;
    const slideX =
      (1 - sEase) * 115 * (sIdx % 2 === 0 ? 1 : -1) +
      sExit * 130 * blowDir +
      (punchImpact > 0.45 ? (sIdx - 1.5) * punchImpact * 14 : 0);
    const slideY = sExit * 55 * blowDir;

    return {
      top: sIdx * 25,
      bottom: 75 - sIdx * 25,
      slideX,
      slideY,
      opacity: interpolate(sEase, [0, 0.15, 1], [0, 1, 1], CLAMP),
    };
  });

  // ================================================
  // 05. MURATA MANGA INK-IMPACT GRADE (CLEAN & FAST, NO INVERT)
  // ================================================
  const opmContrast = 1.42 + punchImpact * 0.34;
  const opmSat = 1.2 + pulse * 0.35;
  const opmBright = 0.96 + punchImpact * 0.28 + impactSurge * 0.24;
  const murataFilter = `contrast(${opmContrast}) saturate(${opmSat}) brightness(${opmBright})`;

  // Serious Sideways Jumps Multi-Clone Offset
  const cloneOffset = punchImpact * 42 + impactSurge * 48 + subShock * 18;

  // ================================================
  // 06. NON-CIRCULAR SHOCKWAVE CONES, FRACTURES & SPEED SPIKES
  // ================================================
  // A) 16 Angular Manga Impact Speed-Spikes (Jagged Triangular Wedges from edges, Zero Circles)
  const impactSpikes = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + (g % 2) * 0.08;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const outerR = 1150;
    const innerR =
      460 - punchImpact * 220 - impactSurge * 180 + ((i * 73 + g * 19) % 140);
    const spread = 0.055 + punchImpact * 0.035;

    const x1 = 540 + Math.cos(angle - spread) * outerR;
    const y1 = 960 + Math.sin(angle - spread) * outerR * 1.45;
    const x2 = 540 + Math.cos(angle + spread) * outerR;
    const y2 = 960 + Math.sin(angle + spread) * outerR * 1.45;
    const tipX = 540 + cosA * innerR;
    const tipY = 960 + sinA * innerR * 1.45;

    const col =
      i % 4 === 0
        ? SAITAMA_YELLOW
        : i % 3 === 0
          ? accent
          : i % 2 === 0
            ? IMPACT_WHITE
            : GENOS_ORANGE;

    return {
      points: `${x1.toFixed(0)},${y1.toFixed(0)} ${tipX.toFixed(
        0,
      )},${tipY.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}`,
      col,
    };
  });

  // B) Planetary Tectonic Impact Fracture Lines (Radiating from Fist Strike Point)
  const fistSeed = Math.floor(g / 2);
  const buildFracture = (targetX: number, targetY: number, id: number) => {
    let pts = "540,960 ";
    for (let s = 1; s <= 6; s++) {
      const t = s / 6;
      const jx =
        540 +
        (targetX - 540) * t +
        (random(`frx-${fistSeed}-${id}-${s}`) - 0.5) * 140;
      const jy =
        960 +
        (targetY - 960) * t +
        (random(`fry-${fistSeed}-${id}-${s}`) - 0.5) * 140;
      pts += `${jx.toFixed(0)},${jy.toFixed(0)} `;
    }
    return pts;
  };

  const fractures = [
    buildFracture(60, 140, 1),
    buildFracture(1020, 180, 2),
    buildFracture(1040, 1740, 3),
    buildFracture(40, 1780, 4),
    buildFracture(540, 40, 5),
    buildFracture(540, 1880, 6),
  ];

  // C) Serious Table Flip Flying Boulder / Debris Polygons (14 fast angular rocks)
  const debrisRocks = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const x = ((random(`rx-${seed}`) * 1080 + camX * 0.25) % 1160) - 40;
    const speed = 22 + (i % 5) * 10 + impactSurge * 36 + punchImpact * 25;
    const y = 1980 - ((g * speed + random(`ry-${seed}`) * 1920) % 2120);
    const size = 10 + (i % 4) * 8 + punchImpact * 12;
    const rot = g * (6 + (i % 3) * 4) * (i % 2 === 0 ? 1 : -1);
    const col =
      i % 4 === 0
        ? GAROU_PURPLE
        : i % 3 === 0
          ? SAITAMA_YELLOW
          : i % 2 === 0
            ? accent
            : IMPACT_WHITE;
    return { x, y, size, rot, col };
  });

  // D) Supersonic Cloud-Split Wedge Progress
  const wedgeProg =
    frame < OVERLAP_FRAMES + 3
      ? interpolate(frame, [0, OVERLAP_FRAMES + 3], [0, 1], CLAMP)
      : exitCut > 0
        ? exitCut
        : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: COSMIC_VOID, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED COSMIC GAROU / SAITAMA BACKDROP
      ============================================ */}
      {(index === 0 || frame >= OVERLAP_FRAMES) && (
        <AbsoluteFill
          style={{
            transform: `scale(${totalScale * 1.22}) rotate(${-camRot * 0.45}deg)`,
            opacity: 0.42,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.7) saturate(0.45) brightness(0.4)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + 4-SLAB SERIOUS PUNCH SHUTTER
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
        }}
      >
        {slabs.map((sl, sIdx) => (
          <AbsoluteFill
            key={`punch-slab-${sIdx}`}
            style={{
              clipPath: `inset(${Math.max(0, sl.top - 0.3)}% 0% ${Math.max(
                0,
                sl.bottom - 0.3,
              )}% 0%)`,
              transform: `translate3d(${sl.slideX}%, ${sl.slideY}%, 0)`,
              opacity: sl.opacity,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: murataFilter,
              }}
            />
          </AbsoluteFill>
        ))}

        {/* ============================================
            LAYER 03: SERIOUS SIDEWAYS JUMPS AFTERIMAGE CLONES (FAST)
        ============================================ */}
        {(punchImpact > 0.08 || impactSurge > 0.08) && frame >= 3 && (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: Math.min(0.52, punchImpact * 0.44 + impactSurge * 0.4),
                transform: `translate3d(${-cloneOffset * dir}px, ${
                  cloneOffset * 0.15
                }px, 0) scale(${1 + punchImpact * 0.06})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </AbsoluteFill>

            <AbsoluteFill
              style={{
                mixBlendMode: "lighten",
                opacity: Math.min(0.4, punchImpact * 0.34 + impactSurge * 0.32),
                transform: `translate3d(${cloneOffset * dir}px, ${
                  -cloneOffset * 0.15
                }px, 0) scale(${1 + punchImpact * 0.11})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </AbsoluteFill>
          </>
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 04: ONE PUNCH MAN LIMITER-BREAKER ENGINE (SVG - ZERO CIRCLES)
          - Murata Manga Angular Impact Speed-Spikes
          - Planetary Space-Shatter Fracture Lines
          - Genos Incineration Cannon / Cosmic Beam Grid
          - Serious Punch Atmosphere-Splitting V-Shockwave Wipe
      ============================================ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      >
        <svg
          width="1080"
          height="1920"
          viewBox="0 0 1080 1920"
          style={{
            transform: `translate3d(${camX * 0.18}px, ${camY * 0.18}px, 0)`,
          }}
        >
          {/* 1. MURATA MANGA ANGULAR IMPACT SPEED-SPIKES (ZERO CIRCLES) */}
          {(punchImpact > 0.12 || impactSurge > 0.15) && (
            <g opacity={Math.min(0.92, punchImpact * 0.95 + impactSurge * 0.8)}>
              {impactSpikes.map((sp, i) => (
                <polygon
                  key={`opm-spike-${i}`}
                  points={sp.points}
                  fill={sp.col}
                  opacity={i % 2 === 0 ? 0.85 : 0.55}
                />
              ))}
            </g>
          )}

          {/* 2. PLANETARY SPACE-SHATTER FRACTURE CRACKS ON HEAVY PUNCH */}
          {(punchImpact > 0.25 || impactSurge > 0.3) && (
            <g opacity={Math.min(1, punchImpact * 1.35 + impactSurge)}>
              {fractures.map((pts, fIdx) => (
                <g key={`fracture-${fIdx}`}>
                  {/* Outer Crimson/Gold Shock Glow */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={fIdx % 2 === 0 ? accent : SAITAMA_YELLOW}
                    strokeWidth={32 + punchImpact * 28}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    opacity={0.42}
                  />
                  {/* Mid Incineration Orange Core */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={GENOS_ORANGE}
                    strokeWidth={12 + punchImpact * 12}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    opacity={0.85}
                  />
                  {/* Razor White Impact Crack */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={IMPACT_WHITE}
                    strokeWidth={4 + punchImpact * 4}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                </g>
              ))}
            </g>
          )}

          {/* 3. ANGULAR HERO ASSOCIATION / GENOS TACTICAL LOCK BRACKETS */}
          <g
            stroke={SAITAMA_YELLOW}
            strokeWidth={6 + punchImpact * 6}
            fill="none"
            opacity={0.82}
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.95 + punchImpact * 0.09})`,
            }}
          >
            {/* Outer Octagonal Impact Lock (Zero Curved Circles) */}
            <polygon
              points="360,340 720,340 960,580 960,1340 720,1580 360,1580 120,1340 120,580"
              stroke={accent}
              strokeWidth={4 + pulse * 6}
              strokeDasharray="160 220"
              strokeDashoffset={-g * 26}
              opacity={0.65}
            />
            {/* Corner Impact Chevrons */}
            <polyline points="110,540 110,380 270,380" />
            <polyline points="970,540 970,380 810,380" />
            <polyline points="110,1380 110,1540 270,1540" />
            <polyline points="970,1380 970,1540 810,1540" />
          </g>

          {/* 4. SERIOUS PUNCH ATMOSPHERE-SPLITTING V-WEDGE SHOCKWAVE WIPE */}
          {(wedgeProg > 0.01 || punchImpact > 0.45) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 2 === 0 ? -18 : 18}deg) scale(${
                  1 + punchImpact * 0.25
                })`,
              }}
            >
              {(() => {
                const p = wedgeProg > 0 ? wedgeProg : punchImpact;
                const apexX = interpolate(p, [0, 1], [-400, 1480], CLAMP);
                const spreadY = interpolate(p, [0, 1], [120, 1650], CLAMP);
                const op = interpolate(
                  p,
                  [0, 0.15, 0.85, 1],
                  [0, 1, 0.95, 0],
                  CLAMP,
                );

                return (
                  <g opacity={op}>
                    {/* Outer Red Glove Shockwave Wake */}
                    <polygon
                      points={`${apexX},960 -600,${960 - spreadY} -600,${
                        960 - spreadY + 240
                      } ${apexX - 180},960 -600,${
                        960 + spreadY - 240
                      } -600,${960 + spreadY}`}
                      fill={accent}
                      opacity={0.75}
                    />
                    {/* Mid Saitama Yellow Sonic Cone */}
                    <polygon
                      points={`${apexX + 60},960 -600,${
                        960 - spreadY * 0.75
                      } -600,${960 - spreadY * 0.75 + 130} ${
                        apexX - 120
                      },960 -600,${960 + spreadY * 0.75 - 130} -600,${
                        960 + spreadY * 0.75
                      }`}
                      fill={SAITAMA_YELLOW}
                      opacity={0.9}
                    />
                    {/* Inner White-Hot Fist Pressure Spear */}
                    <polygon
                      points={`${apexX + 140},960 -600,${
                        960 - spreadY * 0.35
                      } ${apexX - 220},960 -600,${960 + spreadY * 0.35}`}
                      fill={IMPACT_WHITE}
                    />
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: SERIOUS TABLE FLIP FLYING BOULDER SHARDS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {debrisRocks.map((rk, i) => (
          <div
            key={`table-flip-rock-${i}`}
            style={{
              position: "absolute",
              left: rk.x,
              top: rk.y,
              width: rk.size,
              height: rk.size * 1.8,
              backgroundColor: rk.col,
              clipPath: "polygon(25% 0%, 100% 20%, 80% 100%, 0% 75%)",
              transform: `rotate(${rk.rot}deg)`,
              opacity: 0.68 + pulse * 0.32,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: INCINERATION CANNON GLOW, VIGNETTE & PUNCH FLASH
      ============================================ */}
      {/* Saitama Yellow & Red Glove Split Atmosphere */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${accent}55 0%, transparent 40%, transparent 60%, ${SAITAMA_YELLOW}48 100%)`,
          mixBlendMode: "screen",
          opacity: 0.45 + pulse * 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Deep Cosmic Void Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 36%, rgba(4,2,6,0.58) 76%, rgba(4,2,6,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Diagonal Incineration Cannon Laser Beam Flash on Beat */}
      <AbsoluteFill
        style={{
          top: "45%",
          height: 22 + punchImpact * 65,
          background: `linear-gradient(90deg, transparent 0%, ${GENOS_ORANGE}aa 20%, ${SAITAMA_YELLOW} 45%, ${IMPACT_WHITE} 50%, ${accent}aa 80%, transparent 100%)`,
          transform: `rotate(${index % 2 === 0 ? -14 : 14}deg) scaleY(${
            0.35 + punchImpact * 1.5 + impactSurge
          })`,
          opacity: punchImpact * 0.7 + impactSurge * 0.55,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Serious Punch White-Hot Impact Strobe */}
      <AbsoluteFill
        style={{
          backgroundColor: IMPACT_WHITE,
          mixBlendMode: "overlay",
          opacity: impactSurge * 0.72 + punchImpact * 0.32,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING HERO SUIT YELLOW & RED FRAME
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${7 + punchImpact * 15}px solid ${accent}`,
          opacity: 0.46 + punchImpact * 0.54,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `3px solid ${SAITAMA_YELLOW}`,
          opacity: 0.42 + subShock * 0.58,
          transform: `scale(${0.978 - pulse * 0.008})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: SAFE ZONE BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
      ============================================ */}
      <AbsoluteFill
        style={{
          top: SAFE.top,
          bottom: SAFE.bottom,
          left: SAFE.left,
          right: SAFE.right,
          pointerEvents: "none",
        }}
      >
        {/* TOP-LEFT SERIOUS SERIES BRAND WATERMARK (NO EMOJIS, ZERO CIRCLES) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(4, 2, 6, 0.9)",
            borderLeft: `8px solid ${accent}`,
            borderRight: `4px solid ${SAITAMA_YELLOW}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterSlam * -60}px) scale(${
              1 + punchImpact * 0.07
            })`,
          }}
        >
          {/* Red Glove & Yellow Suit Power Bars */}
          <div style={{ display: "flex", gap: 4, transform: "skewX(-24deg)" }}>
            <div
              style={{
                width: 5,
                height: 22,
                backgroundColor: accent,
                transform: `scaleY(${0.75 + pulse * 0.45})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 22,
                backgroundColor: SAITAMA_YELLOW,
                transform: `scaleY(${0.75 + limiterTick * 0.45})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 22,
                backgroundColor: IMPACT_WHITE,
                transform: `scaleY(${0.75 + subShock * 0.45})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: IMPACT_WHITE,
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT HERO THREAT-LEVEL TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(4, 2, 6, 0.86)",
            borderLeft: `6px solid ${SAITAMA_YELLOW}`,
            borderTop: `2px solid ${accent}`,
            transform: `translateX(${enterSlam * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 25,
              color: SAITAMA_YELLOW,
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
              fontSize: 15,
              color: IMPACT_WHITE,
              letterSpacing: 3,
              opacity: 0.9,
            }}
          >
            {`TC ${(g / fps).toFixed(2)}S // ${bpm} BPM`}
          </div>
        </div>

        {/* SAFE ZONE PROGRESS BAR */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 16,
            right: 16,
          }}
        >
          <ProgressBar
            progress={(g / Math.max(1, totalFrames)) * 100}
            accent={accent}
            height={6}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SaitamaSeriousPunch: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#040206" overlap={OVERLAP_FRAMES} Scene={Scene} />
);
