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

const TURIN_NOIR = "#040507";
const BALLON_GOLD = "#E6B84C";
const LES_BLEUS_BLUE = "#0E4BEF";
const BIANCO_IVORY = "#F5F7FA";
const CALCIO_SLATE = "#94A3B8";
const PITCH_INK = "#000000";

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
  const duration = Math.max(2, seg.duration);

  const accent = brand.color || BALLON_GOLD;
  const brandName = brand.name || "ZIZOU MAESTRO";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const strikeImpact = beatPulseAt(g, beatFrames, 3.1);
  const flashTransient = beatPulseAt(g, beatFrames, 4.6);
  const velvetAfterglow = beatPulseAt(Math.max(0, g - 3), beatFrames, 2.2);

  // ================================================
  // 02. MAESTRO VELOCITY RAMP & NON-FADE TRANSITIONS
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const maestroGlide =
    u < 0.22
      ? interpolate(u, [0, 0.22], [0, 0.46], CLAMP)
      : u < 0.78
      ? interpolate(u, [0.22, 0.78], [0.46, 0.54], CLAMP)
      : interpolate(u, [0.78, 1], [0.54, 1], CLAMP);

  const enterLen = Math.min(8, Math.max(1, Math.floor(duration / 2)));
  const exitLen = Math.min(7, Math.max(1, Math.floor(duration / 2)));
  const exitStart = Math.max(0, duration - exitLen);

  const silkSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 245, mass: 0.46 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterCurve = index === 0 ? 0 : Math.pow(1 - enterProg, 2.35);
  const exitCurve = Math.pow(exitProg, 2.45);
  const enterSnap = index === 0 ? 0 : 1 - silkSpring;
  const cutMomentum = Math.min(1, enterCurve + exitCurve);

  const isRouletteCut = index % 2 === 0;
  const dir = isRouletteCut ? 1 : -1;

  // 4 Mixed Non-Fade Zidane Transitions:
  // 0: Marseille Roulette 3D Pirouette Flip
  // 1: Bianconeri 5-Stripe Vertical Shutter
  // 2: Glasgow Volley Parabolic Whip-Arc
  // 3: Panenka Hang-Time Pull-Out Zoom
  const transMode = index % 4;
  const isPirouetteMode = transMode === 0;
  const isStripeShutter = transMode === 1;
  const isVolleyWhip = transMode === 2;
  const isPanenkaZoom = transMode === 3;

  // ================================================
  // 03. CAMERA RIG: ROULETTE 3D PIVOT, VOLLEY ARC & SHAKE
  // ================================================
  // Base scale >= 1.20 guarantees 9:16 portrait images NEVER expose black bars
  const baseScale = interpolate(maestroGlide, [0, 1], [1.2, 1.32], CLAMP);

  const modeZoom = isPanenkaZoom
    ? enterCurve * 0.74 + exitCurve * 0.68
    : isPirouetteMode
    ? enterCurve * 0.3 + exitCurve * 0.28
    : Math.max(0, enterSnap) * 0.34 + exitCurve * 0.4;

  const beatPump =
    strikeImpact * 0.14 +
    velvetAfterglow * 0.055 +
    Math.sin(pulse * Math.PI * 2.4) * strikeImpact * 0.05;
  const totalScale = Math.max(1.18, baseScale + modeZoom + beatPump);

  // Mode 0: Marseille Roulette 3D Spin-Turn
  const rouletteY = isPirouetteMode
    ? (enterCurve * 86 - exitCurve * 82) * dir
    : 0;
  const rouletteX = isPirouetteMode
    ? (enterCurve * -14 + exitCurve * 14) * dir
    : 0;

  // Mode 2: Glasgow Volley Parabolic Whip-Arc
  const volleyX = isVolleyWhip
    ? (enterCurve * 900 - exitCurve * 940) * dir
    : isPanenkaZoom
    ? (enterCurve * 220 - exitCurve * 240) * dir
    : 0;
  const volleyY = isVolleyWhip
    ? Math.sin(enterCurve * Math.PI) * -360 -
      enterCurve * 220 +
      Math.sin(exitCurve * Math.PI) * 340 +
      exitCurve * 220
    : isPanenkaZoom
    ? enterCurve * -180 + exitCurve * 200
    : 0;

  // Refined Heavy Stadium Impact Shake
  const shakeAmp =
    strikeImpact * 32 +
    flashTransient * 16 +
    velvetAfterglow * 14 +
    cutMomentum * 20 +
    pulse * 5;
  const shakeX =
    Math.sin(g * 3.6) * shakeAmp +
    (random(`zzx-${g}`) - 0.5) * strikeImpact * 26;
  const shakeY =
    Math.cos(g * 3.0) * shakeAmp +
    (random(`zzy-${g}`) - 0.5) * strikeImpact * 24;

  const camX = volleyX + shakeX;
  const camY = volleyY + shakeY;

  const camRot =
    (isVolleyWhip
      ? (enterCurve * 15 - exitCurve * 17) * dir
      : isPanenkaZoom
      ? (enterCurve * -12 + exitCurve * 14) * dir
      : (enterCurve * 6 - exitCurve * 7) * dir) +
    Math.sin(g * 0.2) * 1.4 +
    (random(`zzr-${g}`) - 0.5) * strikeImpact * 5.2;

  // ================================================
  // 04. BIANCONERI 5-STRIPE VERTICAL SHUTTER (MODE 1)
  // ================================================
  const bianconeriCols = [0, 1, 2, 3, 4].map((cIdx) => {
    const dist = Math.abs(cIdx - 2);
    const delay = dist * 1.2;
    const endF = Math.max(delay + 1, Math.min(enterLen + 2, delay + 5.2));
    const cEnter =
      index === 0 ? 1 : interpolate(frame, [delay, endF], [0, 1], CLAMP);
    const cEase = 1 - Math.pow(1 - cEnter, 3);

    const colExitStart = Math.min(
      duration - 1,
      Math.max(0, exitStart - (2 - dist) * 0.8)
    );
    const cExit = Math.pow(
      interpolate(frame, [colExitStart, duration], [0, 1], CLAMP),
      2.3
    );

    const alt = cIdx % 2 === 0 ? 1 : -1;
    const shiftY = (1 - cEase) * 108 * alt + cExit * 112 * -alt;

    return {
      left: cIdx * 20,
      right: 80 - cIdx * 20,
      shiftY,
    };
  });

  // ================================================
  // 05. 2000s CALCIO CINEMA CC + B&W BIANCONERI DROP FLASH
  // ================================================
  // Brief classic B&W Juventus/Calcio flash on the single sharpest beat peak (Zero invert)
  const isClassicBWBeat = flashTransient > 0.72 && g % 2 === 0;
  const ccContrast = isClassicBWBeat ? 1.95 : 1.4 + strikeImpact * 0.28;
  const ccSat = isClassicBWBeat ? 0.08 : 1.12 + pulse * 0.3;
  const ccBright =
    (isClassicBWBeat ? 1.08 : 0.95) +
    flashTransient * 0.24 +
    cutMomentum * 0.16;
  const calcioGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  // Silk Gold & Les Bleus Royal Blue Chromatic Blur on Beat Drops
  const silkBlur = Math.min(
    1,
    strikeImpact * 0.92 + velvetAfterglow * 0.42 + cutMomentum * 0.8
  );
  const silkShift =
    strikeImpact * 34 + velvetAfterglow * 20 + cutMomentum * 36;

  // ================================================
  // 06. ALTERNATING MAESTRO VISUALS: ROULETTE RIBBONS vs VOLLEY ARC
  // ================================================
  const transProg =
    frame < enterLen + 3 && index > 0
      ? interpolate(frame, [0, enterLen + 3], [0, 1], CLAMP)
      : frame >= exitStart
      ? exitProg
      : 0;

  // Even Cuts: Sweeping Marseille Roulette Silk Ribbons (No circles — fluid S-curves)
  const showRouletteRibbons =
    isRouletteCut && (transProg > 0.01 || strikeImpact > 0.36);

  // Odd Cuts: Glasgow 2002 Left-Foot Volley Arc sweeping to Top-Corner Bins
  const showVolleyArc =
    !isRouletteCut && (transProg > 0.01 || strikeImpact > 0.36);

  // 20 Luxury Gold Leaf Flecks & Stadium Marble Dust Particles
  const maestroParticles = Array.from({ length: 20 }, (_, i) => {
    const seed = i * 97 + index * 37;
    const kind = i % 3; // 0: Ballon d'Or Gold Leaf, 1: Bianco Ivory Shard, 2: Les Bleus Spark
    const sway =
      Math.sin(g * (0.06 + kind * 0.018) + i * 1.5) * (75 + (i % 4) * 28);
    const x =
      ((random(`zz-px-${seed}`) * 1080 + sway + camX * 0.16) % 1160) - 40;
    const speed = 15 + (i % 5) * 8 + cutMomentum * 30;
    const y = 1980 - ((g * speed + random(`zz-py-${seed}`) * 1920) % 2120);
    const size = 6 + (i % 4) * 4 + pulse * 6;
    const rot = g * (3.5 + (i % 4) * 2.5) * (i % 2 === 0 ? 1 : -1);
    const col =
      kind === 0 ? accent : kind === 1 ? BIANCO_IVORY : LES_BLEUS_BLUE;
    return { x, y, size, rot, col, kind };
  });

  const renderHeroLayers = () => (
    <>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: calcioGrade,
        }}
      />

      {/* Classic Bianconeri Silver-Gelatin Micro-Contrast Pass */}
      <AbsoluteFill
        style={{
          mixBlendMode: "overlay",
          opacity: isClassicBWBeat ? 0.65 : 0.44 + pulse * 0.2,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(1) contrast(2.4) brightness(0.92)",
          }}
        />
      </AbsoluteFill>

      {/* BEAT-DROP GOLD & ROYAL BLUE SILK CHROMATIC MOTION BLUR */}
      {silkBlur > 0.06 && (
        <>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: silkBlur * 0.42,
              transform: `translate3d(${-silkShift * dir}px, ${
                silkShift * 0.2
              }px, 0) scale(${1 + silkBlur * 0.05})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(-14deg) saturate(4.8) contrast(1.5)",
              }}
            />
          </AbsoluteFill>

          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: silkBlur * 0.36,
              transform: `translate3d(${silkShift * dir}px, ${
                -silkShift * 0.2
              }px, 0) scale(${1 + silkBlur * 0.095})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(185deg) saturate(5) contrast(1.5)",
              }}
            />
          </AbsoluteFill>

          <AbsoluteFill
            style={{
              mixBlendMode: "lighten",
              opacity: silkBlur * 0.24,
              transform: `scale(${1 + silkBlur * 0.13})`,
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
    </>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: TURIN_NOIR,
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED DELLE ALPI MIDNIGHT BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.22}) rotate(${-camRot * 0.4}deg)`,
          opacity: 0.42,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(0.6) contrast(1.65) brightness(0.36)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + 4 MIXED MAESTRO TRANSITIONS
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${rouletteX}deg) rotateY(${rouletteY}deg) rotateZ(${camRot}deg) scale(${totalScale})`,
        }}
      >
        {isStripeShutter && cutMomentum > 0.01 ? (
          bianconeriCols.map((col, cIdx) => (
            <AbsoluteFill
              key={`juve-col-${cIdx}`}
              style={{
                clipPath: `inset(0% ${Math.max(
                  0,
                  col.right - 0.35
                )}% 0% ${Math.max(0, col.left - 0.35)}%)`,
                transform: `translate3d(0, ${col.shiftY}%, 0)`,
              }}
            >
              {renderHeroLayers()}
            </AbsoluteFill>
          ))
        ) : (
          renderHeroLayers()
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 03: BIANCONERI SUBTLE PINSTRIPES & STADIUM ATMOSPHERE
      ============================================ */}
      {/* Ultra-Subtle Juventus Bianconeri Vertical Pinstripe Texture */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(245, 247, 250, 0.035) 0px, rgba(245, 247, 250, 0.035) 48px, rgba(0, 0, 0, 0.06) 48px, rgba(0, 0, 0, 0.06) 96px)",
          opacity: isStripeShutter ? 0.95 : 0.45 + pulse * 0.25,
          pointerEvents: "none",
        }}
      />

      {/* Split-Tone Ballon d'Or Gold & Les Bleus Royal Blue Atmosphere */}
      <AbsoluteFill
        style={{
          background: isRouletteCut
            ? `linear-gradient(145deg, ${accent}46 0%, transparent 42%, transparent 62%, ${BIANCO_IVORY}28 100%)`
            : `linear-gradient(145deg, ${LES_BLEUS_BLUE}44 0%, transparent 42%, transparent 62%, ${accent}46 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Deep Turin Stadium Night Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(4,5,7,0.56) 76%, rgba(4,5,7,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 04: ZIDANE MAESTRO GEOMETRY (SVG - ZERO CIRCLES, CLEAN)
          - Even Cuts: Marseille Roulette Silk S-Ribbons
          - Odd Cuts: Glasgow Volley Top-Corner Trajectory Arc
          - Minimal Italian Calcio Corner Pitch Lines
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
            transform: `translate3d(${camX * 0.14}px, ${camY * 0.14}px, 0)`,
          }}
        >
          {/* 1. ARCHITECTURAL SERIE A PITCH CORNER BRACKETS */}
          <g
            stroke={accent}
            strokeWidth={4 + strikeImpact * 4}
            fill="none"
            opacity={0.75 + pulse * 0.2}
          >
            <polyline points="96,495 96,365 226,365" />
            <polyline points="984,495 984,365 854,365" />
            <polyline points="96,1425 96,1555 226,1555" />
            <polyline points="984,1425 984,1555 854,1555" />
          </g>

          {/* 2. EVEN CUTS: MARSEILLE ROULETTE SILK PIROUETTE RIBBONS */}
          {showRouletteRibbons && (
            <g>
              {(() => {
                const p = transProg > 0 ? transProg : strikeImpact;
                const op = interpolate(
                  p,
                  [0, 0.15, 0.85, 1],
                  [0, 0.94, 0.88, 0],
                  CLAMP
                );
                const wave = Math.sin(p * Math.PI * 1.5 + g * 0.18) * 260;

                return (
                  <g opacity={op}>
                    {/* Primary Ballon d'Or Gold Pirouette Silk Ribbon */}
                    <path
                      d={`M -120 ${1520 + wave * 0.35} C 280 ${
                        1180 - wave
                      }, 800 ${740 + wave}, 1200 ${400 - wave * 0.35}`}
                      fill="none"
                      stroke={accent}
                      strokeWidth={34 + strikeImpact * 22}
                      strokeDasharray="620 340"
                      strokeDashoffset={-p * 1400 - g * 18}
                      strokeLinecap="round"
                      opacity={0.62}
                    />
                    <path
                      d={`M -120 ${1520 + wave * 0.35} C 280 ${
                        1180 - wave
                      }, 800 ${740 + wave}, 1200 ${400 - wave * 0.35}`}
                      fill="none"
                      stroke={BIANCO_IVORY}
                      strokeWidth={7 + strikeImpact * 5}
                      strokeDasharray="520 380"
                      strokeDashoffset={-p * 1400 - g * 18}
                      strokeLinecap="round"
                    />
                    {/* Counter-Spinning Bianco Ivory Silk Echo */}
                    <path
                      d={`M 1200 ${1460 - wave * 0.3} C 780 ${
                        1080 + wave * 0.8
                      }, 300 ${840 - wave * 0.8}, -120 ${460 + wave * 0.3}`}
                      fill="none"
                      stroke={BIANCO_IVORY}
                      strokeWidth={12 + strikeImpact * 10}
                      strokeDasharray="460 440"
                      strokeDashoffset={p * 1300 + g * 14}
                      strokeLinecap="round"
                      opacity={0.55}
                    />
                  </g>
                );
              })()}
            </g>
          )}

          {/* 3. ODD CUTS: GLASGOW VOLLEY TOP-CORNER TRAJECTORY STREAK */}
          {showVolleyArc && (
            <g>
              {(() => {
                const p = transProg > 0 ? transProg : strikeImpact;
                const op = interpolate(
                  p,
                  [0, 0.14, 0.85, 1],
                  [0, 0.96, 0.9, 0],
                  CLAMP
                );
                const tipT = interpolate(p, [0, 1], [0.05, 1], CLAMP);
                // Quadratic Bezier point at tipT from bottom-left volley to top-right postage stamp
                const x0 = -80;
                const y0 = 1780;
                const cx = 360;
                const cy = 620;
                const x1 = 1040;
                const y1 = 240;

                const inv = 1 - tipT;
                const tipX =
                  inv * inv * x0 + 2 * inv * tipT * cx + tipT * tipT * x1;
                const tipY =
                  inv * inv * y0 + 2 * inv * tipT * cy + tipT * tipT * y1;

                return (
                  <g opacity={op}>
                    {/* Les Bleus Royal Blue Outer Volley Wake */}
                    <path
                      d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`}
                      fill="none"
                      stroke={LES_BLEUS_BLUE}
                      strokeWidth={42 + strikeImpact * 24}
                      strokeDasharray="780 1600"
                      strokeDashoffset={1600 - p * 2350}
                      strokeLinecap="round"
                      opacity={0.62}
                    />
                    {/* Ballon d'Or Gold Volley Arc */}
                    <path
                      d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`}
                      fill="none"
                      stroke={accent}
                      strokeWidth={18 + strikeImpact * 12}
                      strokeDasharray="680 1600"
                      strokeDashoffset={1600 - p * 2350}
                      strokeLinecap="round"
                      opacity={0.92}
                    />
                    {/* White-Hot Precision Core */}
                    <path
                      d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`}
                      fill="none"
                      stroke={BIANCO_IVORY}
                      strokeWidth={5 + strikeImpact * 4}
                      strokeDasharray="580 1600"
                      strokeDashoffset={1600 - p * 2350}
                      strokeLinecap="round"
                    />
                    {/* Crisp 4-Spike Diamond Flare Leading the Volley Tip */}
                    <g transform={`translate(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`}>
                      <polygon
                        points="-135,0 0,-14 135,0 0,14"
                        fill={BIANCO_IVORY}
                      />
                      <polygon
                        points="0,-135 -14,0 0,135 14,0"
                        fill={accent}
                      />
                    </g>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: GOLD LEAF & BIANCONERI STADIUM PARTICLES (20 PARTICLES)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {maestroParticles.map((pt, i) => (
          <div
            key={`zz-pt-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.size,
              height: pt.kind === 2 ? pt.size * 2.4 : pt.size * 1.8,
              backgroundColor: pt.col,
              clipPath:
                pt.kind === 0
                  ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                  : "polygon(25% 0%, 100% 35%, 75% 100%, 0% 65%)",
              transform: `rotate(${pt.rot}deg)`,
              opacity: 0.66 + pulse * 0.34,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: STADIUM FLOODLIGHT BLOOM & CLEAN HAIRLINE BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 46%, ${BIANCO_IVORY} 0%, ${accent}88 34%, transparent 72%)`,
          mixBlendMode: "overlay",
          opacity: cutMomentum * 0.54 + flashTransient * 0.34,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          border: `4px solid ${accent}`,
          opacity: 0.44 + strikeImpact * 0.52,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: SAFE ZONE MAESTRO BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT BIANCONERI & BALLON D'OR WATERMARK BADGE */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(4, 5, 7, 0.92)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${BIANCO_IVORY}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 34%, 100% 100%, 6% 100%, 0 66%)",
            transform: `translateX(${enterCurve * -45}px) scale(${
              1 + strikeImpact * 0.06
            })`,
          }}
        >
          {/* Classic Juventus Bianconeri Black-White-Gold Crest Bars */}
          <div style={{ display: "flex", gap: 4, transform: "skewX(-18deg)" }}>
            <div
              style={{
                width: 5,
                height: 24,
                backgroundColor: BIANCO_IVORY,
                transform: `scaleY(${0.78 + pulse * 0.4})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 24,
                backgroundColor: PITCH_INK,
                border: `1px solid ${CALCIO_SLATE}`,
                transform: `scaleY(${0.78 + strikeImpact * 0.4})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 24,
                backgroundColor: accent,
                transform: `scaleY(${0.78 + velvetAfterglow * 0.4})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: BIANCO_IVORY,
              fontSize: 36,
              letterSpacing: 5,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT SERIE A BROADCAST TELEMETRY HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "8px 20px",
            backgroundColor: "rgba(4, 5, 7, 0.88)",
            borderLeft: `6px solid ${isRouletteCut ? accent : LES_BLEUS_BLUE}`,
            borderTop: `2px solid ${BIANCO_IVORY}`,
            transform: `translateX(${enterCurve * -40}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 30,
              color: accent,
              letterSpacing: 4,
              lineHeight: 1.02,
            }}
          >
            {`CUT ${(index + 1).toString().padStart(2, "0")}/${total
              .toString()
              .padStart(2, "0")}`}
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 19,
              color: BIANCO_IVORY,
              letterSpacing: 3,
              lineHeight: 1.05,
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

export const ZidaneMaestroRoulette: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#040507"
    overlap={0}
    Scene={Scene}
  />
);