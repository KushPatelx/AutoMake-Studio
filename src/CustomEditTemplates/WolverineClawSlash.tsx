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
import { loadFont } from "@remotion/google-fonts/Syne";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

const VOID_DARK = "#030306";
const HYPER_GOLD = "#FFB800";
const ELECTRIC_CYAN = "#00F0FF";
const CRIMSON_CORE = "#FF003C";
const PURE_WHITE = "#F8FAFC";

const OVERLAP_FRAMES = 10;

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

  const accent = brand.color || HYPER_GOLD;
  const brandName = brand.name || "APEX VELOCITY";

  // ================================================
  // 01. HARMONIC BEAT & NON-LINEAR VELOCITY MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 3.1);
  const offBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.8);
  const subHarmonic = beatPulse(g * 2, bpm, 1.4);

  // Sigmoid-like Twixtor Time-Remapping (Fast In -> Frozen Mid -> Fast Out)
  const u = Math.min(1, Math.max(0, frame / span));
  const sigmoidTime =
    u < 0.24
      ? interpolate(u, [0, 0.24], [0, 0.47], CLAMP)
      : u < 0.76
        ? interpolate(u, [0.24, 0.76], [0.47, 0.53], CLAMP)
        : interpolate(u, [0.76, 1], [0.53, 1], CLAMP);

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], CLAMP);
  const exitProg = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP,
  );

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 280, mass: 0.38 },
  });

  const enterImpulse = Math.pow(1 - enterProg, 2.5);
  const exitImpulse = Math.pow(exitProg, 2.5);
  const warpEnergy = Math.min(1, enterImpulse + exitImpulse);

  // ================================================
  // 02. 3D PERSPECTIVE TILT & DAMPED SPRING CAMERA
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;

  // Guaranteed >= 1.18 scale so 9:16 portrait images NEVER show black bars
  const baseDrift = interpolate(sigmoidTime, [0, 1], [1.18, 1.32], CLAMP);
  const mPullZoom =
    index % 2 === 0
      ? enterImpulse * 0.65 - exitImpulse * 0.15
      : (1 - enterSpring) * 0.45 + exitImpulse * 0.6;
  const elasticBounce = Math.cos(pulse * Math.PI * 3) * impact * 0.09;
  const totalScale = Math.max(
    1.16,
    baseDrift + mPullZoom + impact * 0.14 + elasticBounce,
  );

  // 3D Rotational Perspective Matrix (Tilt X, Tilt Y, Roll Z)
  const tiltX =
    Math.sin(g * 0.07) * 5 +
    (enterImpulse * 22 - exitImpulse * 24) * dir +
    impact * 8 * dir;
  const tiltY =
    Math.cos(g * 0.06) * 6 + (enterImpulse * -26 + exitImpulse * 28) * dir;
  const rollZ =
    (enterImpulse * 14 - exitImpulse * 16) * dir +
    (random(`rz-${g}`) - 0.5) * impact * 7;

  // Damped Harmonic Impact Shake
  const trauma = impact * 34 + warpEnergy * 24 + pulse * 7;
  const camX =
    (enterImpulse * 540 - exitImpulse * 580) * dir +
    Math.sin(g * 3.4) * trauma +
    (random(`cx-${g}`) - 0.5) * impact * 30;
  const camY =
    (enterImpulse * -260 + exitImpulse * 290) * dir +
    Math.cos(g * 2.9) * trauma +
    (random(`cy-${g}`) - 0.5) * impact * 26;

  // ================================================
  // 03. NON-CIRCULAR VENETIAN ACCORDION & CHEVRON WIPES
  // ================================================
  // 5 Horizontal Kinetic Louvers that unfold in 3D space with staggered phase math
  const slices = [0, 1, 2, 3, 4].map((sIdx) => {
    const staggerStart = sIdx * 1.3;
    const sProg =
      index === 0
        ? 1
        : interpolate(frame, [staggerStart, staggerStart + 5.2], [0, 1], CLAMP);
    const sEase = 1 - Math.pow(1 - sProg, 3);
    const sExit = Math.pow(
      interpolate(
        frame,
        [duration + sIdx * 0.9, duration + OVERLAP_FRAMES],
        [0, 1],
        CLAMP,
      ),
      2.2,
    );

    const alt = sIdx % 2 === 0 ? 1 : -1;
    const slideOffset = (1 - sEase) * 115 * alt + sExit * 125 * -alt;
    const faultShear = impact > 0.45 ? (sIdx - 2) * impact * 18 * alt : 0;

    return {
      top: sIdx * 20,
      bottom: 80 - sIdx * 20,
      slideOffset,
      faultShear,
      opacity: interpolate(sEase, [0, 0.15, 1], [0, 1, 1], CLAMP),
    };
  });

  // ================================================
  // 04. PARAMETRIC MATH CURVES (NO CIRCLES!)
  // ================================================
  // A) Lissajous 3D Phase-Shifted Energy Ribbon: x = A*sin(3t + d), y = B*sin(4t)
  const buildLissajousPath = (phaseShift: number, ampScale: number) => {
    let d = "";
    const steps = 42;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const lx =
        540 +
        Math.sin(3 * t + g * 0.065 + phaseShift) *
          (420 * ampScale + impact * 95);
      const ly =
        960 + Math.sin(4 * t + g * 0.045) * (680 * ampScale + pulse * 85);
      d += `${i === 0 ? "M" : "L"} ${lx.toFixed(1)} ${ly.toFixed(1)} `;
    }
    return d;
  };

  const lissajousPrimary = buildLissajousPath(0, 1);
  const lissajousEcho = buildLissajousPath(0.35, 1.06);

  // B) Fourier Standing Wave Oscilloscope (Top & Bottom Acoustic Borders)
  const buildFourierWave = (baseY: number, flip: number) => {
    let d = "";
    const segments = 36;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * 1080;
      const norm = (i / segments) * Math.PI * 4;
      // Sum of 3 odd harmonics modulated by beat impact
      const yOffset =
        (Math.sin(norm + g * 0.35) * 28 +
          Math.sin(3 * norm - g * 0.6) * 18 * impact +
          Math.cos(5 * norm + g * 0.9) * 14 * pulse) *
        (0.35 + impact * 1.45) *
        flip;
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(0)} ${(baseY + yOffset).toFixed(
        1,
      )} `;
    }
    return d;
  };

  const topWavePath = buildFourierWave(310, 1);
  const bottomWavePath = buildFourierWave(1610, -1);

  // C) 3D Perspective Vanishing-Point Warp Corridor Lines
  const corridorLines = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const vx = 540 + camX * 0.18;
    const vy = 960 + camY * 0.18;
    const innerDist = 260 + ((g * 28 + i * 75) % 450);
    const outerDist = innerDist + 240 + impact * 220 + warpEnergy * 320;

    return {
      x1: vx + Math.cos(angle) * innerDist,
      y1: vy + Math.sin(angle) * innerDist * 1.45,
      x2: vx + Math.cos(angle) * outerDist,
      y2: vy + Math.sin(angle) * outerDist * 1.45,
      col: i % 3 === 0 ? accent : i % 3 === 1 ? PURE_WHITE : ELECTRIC_CYAN,
    };
  });

  // D) Lorenz-Inspired Vector Flow Field Shards (Angular Polygons, Zero Dots)
  const vectorShards = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 113 + index * 41;
    const t = g * 0.032 + i * 0.75;
    // Parametric Butterfly / Attractor trajectory
    const expTerm =
      Math.exp(Math.cos(t)) -
      2 * Math.cos(4 * t) -
      Math.pow(Math.sin(t / 12), 5);
    const fx = 540 + Math.sin(t) * expTerm * (145 + impact * 45);
    const fy = 960 + Math.cos(t) * expTerm * (230 + pulse * 55);

    // Derivative tangent vector for true velocity orientation
    const dt = 0.05;
    const nextExp =
      Math.exp(Math.cos(t + dt)) -
      2 * Math.cos(4 * (t + dt)) -
      Math.pow(Math.sin((t + dt) / 12), 5);
    const nx = 540 + Math.sin(t + dt) * nextExp * 145;
    const ny = 960 + Math.cos(t + dt) * nextExp * 230;
    const tangentDeg = (Math.atan2(ny - fy, nx - fx) * 180) / Math.PI;

    const len = 28 + (seed % 22) + impact * 34;
    const col = i % 3 === 0 ? accent : i % 3 === 1 ? PURE_WHITE : CRIMSON_CORE;

    return { x: fx, y: fy, deg: tangentDeg, len, col };
  });

  // ================================================
  // 05. GRITTY CINEMATIC CC & PRISMATIC DISPERSION
  // ================================================
  const ccContrast = 1.44 + impact * 0.34;
  const ccSat = 1.2 + pulse * 0.35;
  const ccBright = 0.95 + impact * 0.3 + warpEnergy * 0.25;
  const cinematicLUT = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  const prismSplit = impact * 32 + warpEnergy * 38 + offBeat * 10;
  const slashSweepProg =
    frame < OVERLAP_FRAMES + 3
      ? interpolate(frame, [0, OVERLAP_FRAMES + 3], [0, 1], CLAMP)
      : exitProg > 0
        ? exitProg
        : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOID_DARK,
        overflow: "hidden",
        perspective: 1100,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED ANAMORPHIC ECHO BACKDROP
      ============================================ */}
      {(index === 0 || frame >= OVERLAP_FRAMES) && (
        <AbsoluteFill
          style={{
            transform: `scale(${totalScale * 1.24}) rotate(${-rollZ * 0.5}deg)`,
            opacity: 0.44,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.85) saturate(0.45) brightness(0.4)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 02: 3D PERSPECTIVE MATRIX RIG + 5-LOUVER VENETIAN SHUTTER
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${rollZ}deg) scale(${totalScale})`,
        }}
      >
        {slices.map((sl, sIdx) => (
          <AbsoluteFill
            key={`louver-${sIdx}`}
            style={{
              clipPath: `inset(${sl.top - 0.3}% 0% ${sl.bottom - 0.3}% 0%)`,
              transform: `translate3d(${
                sl.slideOffset + sl.faultShear
              }%, 0, 0)`,
              opacity: sl.opacity,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: cinematicLUT,
              }}
            />
          </AbsoluteFill>
        ))}

        {/* High-Contrast Bleach-Bypass Micro-Grit Pass */}
        {frame >= OVERLAP_FRAMES && (
          <AbsoluteFill
            style={{
              mixBlendMode: "overlay",
              opacity: 0.48 + pulse * 0.22,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(1) contrast(2.5) brightness(0.9)",
              }}
            />
          </AbsoluteFill>
        )}

        {/* ============================================
            LAYER 03: PRISMATIC VELOCITY GLIDE & RGB DISPERSION
        ============================================ */}
        {(impact > 0.08 || warpEnergy > 0.08) && frame >= 3 && (
          <>
            {/* Warm Gold/Crimson Vector Glide Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: Math.min(0.65, impact * 0.45 + warpEnergy * 0.45),
                transform: `translate3d(${-prismSplit * dir}px, ${
                  prismSplit * 0.3
                }px, 0) scale(${1 + impact * 0.06})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(-25deg) saturate(5.5) contrast(1.6)",
                }}
              />
            </AbsoluteFill>

            {/* Electric Cyan Vector Glide Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: Math.min(0.6, impact * 0.4 + warpEnergy * 0.4),
                transform: `translate3d(${prismSplit * dir}px, ${
                  -prismSplit * 0.3
                }px, 0) scale(${1 + impact * 0.11})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(155deg) saturate(5.5) contrast(1.6)",
                }}
              />
            </AbsoluteFill>
          </>
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 04: TECTONIC FAULT-LINE GLITCH DISPLACEMENT
      ============================================ */}
      {(impact > 0.3 || subHarmonic > 0.78) && frame >= OVERLAP_FRAMES && (
        <AbsoluteFill
          style={{
            clipPath: `polygon(0% ${22 + ((g * 17) % 45)}%, 100% ${
              14 + ((g * 23) % 45)
            }%, 100% ${44 + ((g * 19) % 45)}%, 0% ${52 + ((g * 13) % 45)}%)`,
            transform: `translateX(${(random(`flt-${g}`) - 0.5) * 135}px) scale(${
              totalScale * 1.05
            })`,
            mixBlendMode: "hard-light",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter:
                "invert(0.9) sepia(1) hue-rotate(-30deg) saturate(6) contrast(2.3)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 05: MATHEMATICAL VECTOR GEOMETRY (ZERO CIRCLES!)
          - Lissajous 3D Phase Ribbons
          - Fourier Harmonic Waveforms
          - Vanishing-Point Warp Corridor
          - Triple Razor Claw/Blade Transition Sweep
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
            transform: `translate3d(${camX * 0.16}px, ${camY * 0.16}px, 0)`,
          }}
        >
          {/* 1. VANISHING-POINT PERSPECTIVE WARP CORRIDOR */}
          <g opacity={0.45 + impact * 0.5 + warpEnergy * 0.4}>
            {corridorLines.map((ln, i) => (
              <line
                key={`vp-line-${i}`}
                x1={ln.x1}
                y1={ln.y1}
                x2={ln.x2}
                y2={ln.y2}
                stroke={ln.col}
                strokeWidth={i % 2 === 0 ? 5 + impact * 8 : 2 + impact * 4}
                strokeLinecap="square"
              />
            ))}
          </g>

          {/* 2. LISSAJOUS 3D PARAMETRIC ENERGY RIBBONS (NO RINGS!) */}
          <g opacity={0.35 + impact * 0.6}>
            <path
              d={lissajousEcho}
              fill="none"
              stroke={accent}
              strokeWidth={14 + impact * 18}
              strokeDasharray="180 420"
              strokeDashoffset={-g * 26}
              opacity={0.45}
            />
            <path
              d={lissajousPrimary}
              fill="none"
              stroke={PURE_WHITE}
              strokeWidth={3 + impact * 5}
              strokeDasharray="220 380"
              strokeDashoffset={-g * 26}
              opacity={0.9}
            />
            <path
              d={lissajousPrimary}
              fill="none"
              stroke={ELECTRIC_CYAN}
              strokeWidth={6 + impact * 8}
              strokeDasharray="90 510"
              strokeDashoffset={g * 32}
              opacity={0.75}
            />
          </g>

          {/* 3. FOURIER HARMONIC STANDING WAVE OSCILLOSCOPES */}
          <g opacity={0.55 + pulse * 0.45}>
            {/* Top Harmonic Wave */}
            <path
              d={topWavePath}
              fill="none"
              stroke={accent}
              strokeWidth={8 + impact * 10}
              opacity={0.45}
            />
            <path
              d={topWavePath}
              fill="none"
              stroke={PURE_WHITE}
              strokeWidth={2.5 + impact * 3}
            />
            {/* Bottom Harmonic Wave */}
            <path
              d={bottomWavePath}
              fill="none"
              stroke={accent}
              strokeWidth={8 + impact * 10}
              opacity={0.45}
            />
            <path
              d={bottomWavePath}
              fill="none"
              stroke={PURE_WHITE}
              strokeWidth={2.5 + impact * 3}
            />
          </g>

          {/* 4. ANGULAR ISOMETRIC CORNER VECTOR LOCKS (ZERO ARCS) */}
          <g
            stroke={accent}
            strokeWidth={6 + impact * 6}
            fill="none"
            opacity={0.82}
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.96 + impact * 0.08})`,
            }}
          >
            {/* Top-Left Chevron Bracket */}
            <polyline points="110,510 110,380 240,380 280,420" />
            <line
              x1="110"
              y1="380"
              x2="175"
              y2="445"
              stroke={PURE_WHITE}
              strokeWidth="3"
            />
            {/* Top-Right Chevron Bracket */}
            <polyline points="970,510 970,380 840,380 800,420" />
            <line
              x1="970"
              y1="380"
              x2="905"
              y2="445"
              stroke={PURE_WHITE}
              strokeWidth="3"
            />
            {/* Bottom-Left Chevron Bracket */}
            <polyline points="110,1410 110,1540 240,1540 280,1500" />
            <line
              x1="110"
              y1="1540"
              x2="175"
              y2="1475"
              stroke={PURE_WHITE}
              strokeWidth="3"
            />
            {/* Bottom-Right Chevron Bracket */}
            <polyline points="970,1410 970,1540 840,1540 800,1500" />
            <line
              x1="970"
              y1="1540"
              x2="905"
              y2="1475"
              stroke={PURE_WHITE}
              strokeWidth="3"
            />
          </g>

          {/* 5. TRIPLE HYPER-BLADE / CLAW TRANSITION SWEEP ACROSS SCREEN */}
          {(slashSweepProg > 0.01 || impact > 0.44) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 2 === 0 ? -28 : 28}deg) scale(${
                  1.06 + impact * 0.22
                })`,
              }}
            >
              {[-230, 0, 230].map((offsetY, bIdx) => {
                const p = slashSweepProg > 0 ? slashSweepProg : impact;
                const swipeX = interpolate(
                  p,
                  [0, 1],
                  [-1500 - bIdx * 170, 1500 - bIdx * 170],
                  CLAMP,
                );
                const op = interpolate(
                  p,
                  [0, 0.18, 0.85, 1],
                  [0, 1, 0.95, 0],
                  CLAMP,
                );

                return (
                  <g
                    key={`blade-sweep-${bIdx}`}
                    transform={`translate(${swipeX}, ${960 + offsetY})`}
                    opacity={op}
                  >
                    {/* Angular Polygon Plasma Wake (No rounded circles) */}
                    <polygon
                      points="-1250,0 -150,-46 1150,0 -150,46"
                      fill={bIdx === 1 ? CRIMSON_CORE : accent}
                      opacity={0.68}
                    />
                    <polygon
                      points="-1050,0 -100,-22 1080,0 -100,22"
                      fill={accent}
                      opacity={0.92}
                    />
                    <polygon
                      points="-900,0 -60,-8 1040,0 -60,8"
                      fill={PURE_WHITE}
                    />
                    {/* Razor Diamond Tip Flare */}
                    <polygon
                      points="760,0 940,-28 1120,0 940,28"
                      fill={PURE_WHITE}
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: LORENZ VECTOR FLOW FIELD SHARDS (ANGULAR NEEDLES)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {vectorShards.map((vs, i) => (
          <div
            key={`vec-shard-${i}`}
            style={{
              position: "absolute",
              left: vs.x,
              top: vs.y,
              width: vs.len,
              height: 5,
              backgroundColor: vs.col,
              clipPath: "polygon(0% 50%, 30% 0%, 100% 50%, 30% 100%)",
              transform: `translate(-50%, -50%) rotate(${vs.deg}deg)`,
              opacity: 0.65 + pulse * 0.35,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: ANAMORPHIC LIGHT SWEEPS, VIGNETTE & EXPOSURE FLASHES
      ============================================ */}
      {/* Split-Tone Diagonal Atmosphere */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${accent}44 0%, transparent 40%, transparent 60%, ${ELECTRIC_CYAN}38 100%)`,
          mixBlendMode: "screen",
          opacity: 0.42 + pulse * 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Deep Cinematic Edge Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 36%, rgba(3,3,6,0.58) 76%, rgba(3,3,6,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Linear Anamorphic Streak Flash (Horizontal Razor Beam on Beat) */}
      <AbsoluteFill
        style={{
          top: "47%",
          height: 16 + impact * 52,
          background: `linear-gradient(90deg, transparent 0%, ${accent}99 20%, ${PURE_WHITE} 50%, ${ELECTRIC_CYAN}99 80%, transparent 100%)`,
          transform: `scaleY(${0.3 + impact * 1.5 + warpEnergy})`,
          opacity: impact * 0.65 + warpEnergy * 0.55,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Cut & Beat Exposure Strobe */}
      <AbsoluteFill
        style={{
          backgroundColor: PURE_WHITE,
          mixBlendMode: "overlay",
          opacity: warpEnergy * 0.72 + impact * 0.28,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: PULSING CHAMFERED VECTOR BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 14}px solid ${accent}`,
          opacity: 0.44 + impact * 0.56,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: SAFE ZONE BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT ANGULAR VECTOR BRAND WATERMARK (NO EMOJIS, NO CIRCLES) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(3, 3, 6, 0.88)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${ELECTRIC_CYAN}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterImpulse * -65}px) scale(${
              1 + impact * 0.06
            })`,
          }}
        >
          {/* Triple Kinetic Vector Bars */}
          <div style={{ display: "flex", gap: 4, transform: "skewX(-24deg)" }}>
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: accent,
                transform: `scaleY(${0.7 + pulse * 0.5})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: PURE_WHITE,
                transform: `scaleY(${0.7 + offBeat * 0.5})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: ELECTRIC_CYAN,
                transform: `scaleY(${0.7 + subHarmonic * 0.5})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: PURE_WHITE,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT MATHEMATICAL TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 20px",
            backgroundColor: "rgba(3, 3, 6, 0.84)",
            borderLeft: `6px solid ${accent}`,
            borderTop: `2px solid ${ELECTRIC_CYAN}`,
            transform: `translateX(${enterImpulse * -55}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 24,
              fontWeight: 800,
              color: accent,
              letterSpacing: 4,
              lineHeight: 1.1,
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
              fontWeight: 700,
              color: PURE_WHITE,
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

export const WolverineClawSlash: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#030306" overlap={OVERLAP_FRAMES} Scene={Scene} />
);
