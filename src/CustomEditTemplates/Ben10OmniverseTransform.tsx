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
import { loadFont } from "@remotion/google-fonts/Orbitron";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

const OMNIVERSE_BLACK = "#030604";
const OMNITRIX_GREEN = "#39FF14";
const ACID_LIME = "#B4FF00";
const DEEP_GALVAN = "#0B2915";
const BIO_WHITE = "#EEFFEE";
const CORE_BLACK = "#000000";

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

  const accent = brand.color || OMNITRIX_GREEN;
  const brandName = brand.name || "OMNIVERSE";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const omniDrop = beatPulseAt(g, beatFrames, 3.0);
  const flashPeak = beatPulseAt(g, beatFrames, 4.5);
  const dnaAftershock = beatPulseAt(Math.max(0, g - 3), beatFrames, 2.2);

  // ================================================
  // 02. NON-SLASH VELOCITY CURVES & TRANSITION TIMING
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const velocityFlow =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.46], CLAMP)
      : u < 0.8
        ? interpolate(u, [0.2, 0.8], [0.46, 0.54], CLAMP)
        : interpolate(u, [0.8, 1], [0.54, 1], CLAMP);

  const enterLen = Math.min(9, Math.max(1, Math.floor(duration / 2)));
  const exitLen = Math.min(7, Math.max(1, Math.floor(duration / 2)));
  const exitStart = Math.min(duration - 1, Math.max(0, duration - exitLen));

  const dialSpring = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 300, mass: 0.38 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterCurve = index === 0 ? 0 : Math.pow(1 - enterProg, 2.2);
  const exitCurve = Math.pow(exitProg, 2.4);
  const enterSnap = index === 0 ? 0 : 1 - dialSpring;
  const transformEnergy = Math.min(1, enterCurve + exitCurve);

  const dir = index % 2 === 0 ? 1 : -1;

  // 4 Unique Ben 10 Omniverse Transitions (ZERO SLASHES, ZERO FADES):
  // 0: Omnitrix Hourglass Shutter Snap
  // 1: DNA Double-Helix Vertical Wave Columns
  // 2: Omnitrix Core Slam Zoom-Pop
  // 3: Holographic Alien Selector 3D Carousel Flip
  const transMode = index % 4;
  const isHourglassCut = transMode === 0;
  const isDnaColumnsCut = transMode === 1;
  const isCoreSlamCut = transMode === 2;
  const isHoloFlipCut = transMode === 3;

  // ================================================
  // 03. CAMERA RIG: DIAL SLAM, HOLOGRAM FLIP & SHAKE
  // ================================================
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.32], CLAMP);

  const modeZoom = isCoreSlamCut
    ? enterCurve * 0.78 + exitCurve * 0.72
    : isHourglassCut
      ? enterCurve * 0.34 + exitCurve * 0.32
      : Math.max(0, enterSnap) * 0.28 + exitCurve * 0.34;

  const beatZoom =
    omniDrop * 0.15 +
    dnaAftershock * 0.06 +
    Math.sin(pulse * Math.PI * 2.6) * omniDrop * 0.055;
  const totalScale = Math.max(1.16, baseScale + modeZoom + beatZoom);

  const holoFlipY = isHoloFlipCut
    ? (enterCurve * 84 - exitCurve * 78) * dir
    : 0;
  const holoFlipX = isHoloFlipCut
    ? (enterCurve * -14 + exitCurve * 14) * dir
    : 0;

  const slamY = isCoreSlamCut ? enterCurve * -190 + exitCurve * 210 : 0;

  const shakeAmp =
    omniDrop * 36 +
    flashPeak * 18 +
    dnaAftershock * 14 +
    transformEnergy * 22 +
    pulse * 6;
  const shakeX =
    Math.sin(g * 3.9) * shakeAmp + (random(`b10x-${g}`) - 0.5) * omniDrop * 30;
  const shakeY =
    Math.cos(g * 3.2) * shakeAmp + (random(`b10y-${g}`) - 0.5) * omniDrop * 28;

  const camX = shakeX;
  const camY = slamY + shakeY;

  const camRot =
    (isCoreSlamCut
      ? (enterCurve * -14 + exitCurve * 16) * dir
      : (enterCurve * 6 - exitCurve * 7) * dir) +
    Math.sin(g * 0.22) * 1.4 +
    (random(`b10r-${g}`) - 0.5) * omniDrop * 6;

  // ================================================
  // 04. OMNITRIX HOURGLASS SHUTTER & DNA WAVE MATH
  // ================================================
  const hourglassOpen = isHourglassCut
    ? Math.min(
        index === 0 ? 1 : interpolate(frame, [0, enterLen], [0.06, 1], CLAMP),
        interpolate(frame, [exitStart, duration], [1, 0.06], CLAMP),
      )
    : 1;

  const hgEdgeTop = 50 * hourglassOpen;
  const hgEdgeMid = 50 * Math.pow(hourglassOpen, 1.85);
  const hourglassClip = `polygon(${(50 - hgEdgeTop).toFixed(2)}% 0%, ${(
    50 + hgEdgeTop
  ).toFixed(2)}% 0%, ${(50 + hgEdgeMid).toFixed(2)}% 50%, ${(
    50 + hgEdgeTop
  ).toFixed(2)}% 100%, ${(50 - hgEdgeTop).toFixed(2)}% 100%, ${(
    50 - hgEdgeMid
  ).toFixed(2)}% 50%)`;

  const dnaColumns = [0, 1, 2, 3, 4].map((cIdx) => {
    const dist = Math.abs(cIdx - 2);
    const delay = dist * 1.3;
    const cEnter =
      index === 0
        ? 1
        : interpolate(
            frame,
            [delay, Math.min(enterLen + 2, delay + 5.5)],
            [0, 1],
            CLAMP,
          );
    const cEase = 1 - Math.pow(1 - cEnter, 3);
    const cExit = Math.pow(
      interpolate(
        frame,
        [Math.max(0, exitStart - (2 - dist) * 0.8), duration],
        [0, 1],
        CLAMP,
      ),
      2.3,
    );

    const alt = cIdx % 2 === 0 ? 1 : -1;
    const shiftY = (1 - cEase) * 105 * alt + cExit * 110 * -alt;

    return {
      left: cIdx * 20,
      right: 80 - cIdx * 20,
      shiftY,
    };
  });

  // ================================================
  // 05. OMNIVERSE BLACK & GREEN CC + TRANSFORMATION FLASH
  // ================================================
  const isGreenTransformPop = index > 0 && frame <= 3;
  const ccContrast = 1.44 + omniDrop * 0.32;
  const ccSat = isGreenTransformPop ? 1.65 : 1.16 + pulse * 0.3;
  const ccBright =
    (isGreenTransformPop ? 1.15 : 0.94) +
    flashPeak * 0.28 +
    transformEnergy * 0.18;
  const omniverseGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  const bioEchoPower = Math.min(
    1,
    omniDrop * 0.92 + dnaAftershock * 0.45 + transformEnergy * 0.85,
  );
  const bioShift = omniDrop * 34 + dnaAftershock * 18 + transformEnergy * 38;

  // ================================================
  // 06. SINGLE SEMI-TRANSPARENT DIAGONAL DNA STRAND & CENTER OMNITRIX LOGO
  // ================================================
  // Single diagonal double-helix sweeping across the entire 9:16 canvas
  const buildDiagonalHelix = () => {
    const x0 = dir > 0 ? -90 : 1170;
    const y0 = 2010;
    const x1 = dir > 0 ? 1170 : -90;
    const y1 = -90;

    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;

    let strandA = "";
    let strandB = "";
    const rungs: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      col: string;
    }> = [];

    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x0 + dx * t;
      const by = y0 + dy * t;
      const theta = i * 0.62 - g * 0.16;
      const amp = 68 + omniDrop * 20;
      const offset = Math.sin(theta) * amp;

      const ax = bx + nx * offset;
      const ay = by + ny * offset;
      const sx = bx - nx * offset;
      const sy = by - ny * offset;

      strandA += `${i === 0 ? "M" : "L"} ${ax.toFixed(1)} ${ay.toFixed(1)} `;
      strandB += `${i === 0 ? "M" : "L"} ${sx.toFixed(1)} ${sy.toFixed(1)} `;

      if (i % 2 === 0 && i > 0 && i < steps) {
        rungs.push({
          x1: ax,
          y1: ay,
          x2: sx,
          y2: sy,
          col: i % 4 === 0 ? BIO_WHITE : ACID_LIME,
        });
      }
    }
    return { strandA, strandB, rungs };
  };

  const diagonalHelix = buildDiagonalHelix();

  // Alternating Center Omnitrix Logo Rotation:
  // Outer dial rotates CW on even cuts / CCW on odd cuts + snaps on beat;
  // Inner Omnitrix hourglass alternates back-and-forth like selecting an alien!
  const outerDialRot =
    (g * 2.2 + enterCurve * 75 - exitCurve * 75 + omniDrop * 16) * dir;
  const innerCoreRot = Math.sin(g * 0.095) * 42 * dir - omniDrop * 24 * dir;
  const omnitrixScale = 0.88 + omniDrop * 0.18 + transformEnergy * 0.14;
  const omnitrixOpacity = Math.min(
    0.72,
    0.26 + omniDrop * 0.34 + transformEnergy * 0.22,
  );

  // ================================================
  // 07. 34 DENSE OMNIVERSE BIO-ENERGY PARTICLES
  // ================================================
  const bioParticles = Array.from({ length: 34 }, (_, i) => {
    const seed = i * 83 + index * 41;
    const pKind = i % 3; // 0: Hexagon cell, 1: Acid-Lime diamond spark, 2: Tiny bio-mote
    const sway =
      Math.sin(g * (0.065 + pKind * 0.02) + i * 1.4) * (65 + (i % 4) * 28);
    const x =
      ((random(`b10px-${seed}`) * 1080 + sway + camX * 0.15) % 1160) - 40;
    const speed =
      14 + (i % 6) * 8 + transformEnergy * 34 + (pKind === 1 ? 10 : 0);
    const y = 1980 - ((g * speed + random(`b10py-${seed}`) * 1920) % 2120);
    const size =
      pKind === 2
        ? 4 + (i % 3) * 3
        : pKind === 1
          ? 6 + (i % 4) * 4 + pulse * 5
          : 9 + (i % 4) * 5 + pulse * 6;
    const rot = g * (3 + (i % 5) * 2.5) * (i % 2 === 0 ? 1 : -1);
    const col = i % 5 === 0 ? BIO_WHITE : i % 3 === 0 ? ACID_LIME : accent;
    return { x, y, size, rot, col, pKind };
  });

  // Green Transformation Burst Flash Intensity
  const greenFlashBurst = Math.min(
    1,
    enterCurve * 0.92 + exitCurve * 0.85 + flashPeak * 0.65,
  );

  const renderHeroLayers = () => (
    <>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: omniverseGrade,
        }}
      />

      {/* Crisp Omniverse Ink-Black Contrast Pass */}
      <AbsoluteFill
        style={{
          mixBlendMode: "overlay",
          opacity: 0.46 + pulse * 0.2,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(1) contrast(2.45) brightness(0.9)",
          }}
        />
      </AbsoluteFill>

      {/* Emerald Bio-Energy Chromatic Echoes on Beat & Transitions */}
      {bioEchoPower > 0.06 && (
        <>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: bioEchoPower * 0.46,
              transform: `translate3d(${-bioShift * dir}px, ${
                bioShift * 0.18
              }px, 0) scale(${1 + bioEchoPower * 0.055})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(78deg) saturate(6.5) contrast(1.55)",
              }}
            />
          </AbsoluteFill>

          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: bioEchoPower * 0.36,
              transform: `translate3d(${bioShift * dir}px, ${
                -bioShift * 0.18
              }px, 0) scale(${1 + bioEchoPower * 0.1})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(48deg) saturate(5.5) contrast(1.55)",
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
        backgroundColor: OMNIVERSE_BLACK,
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED GALVAN GREEN-BLACK BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.2}) rotate(${-camRot * 0.35}deg)`,
          opacity: 0.42,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter:
              "sepia(1) hue-rotate(75deg) saturate(3.2) contrast(1.6) brightness(0.32)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + 4 NON-SLASH OMNIVERSE TRANSITIONS
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${holoFlipX}deg) rotateY(${holoFlipY}deg) rotateZ(${camRot}deg) scale(${totalScale})`,
        }}
      >
        {isHourglassCut && hourglassOpen < 0.995 ? (
          <AbsoluteFill style={{ clipPath: hourglassClip }}>
            {renderHeroLayers()}
          </AbsoluteFill>
        ) : isDnaColumnsCut && transformEnergy > 0.01 ? (
          dnaColumns.map((col, cIdx) => (
            <AbsoluteFill
              key={`dna-col-${cIdx}`}
              style={{
                clipPath: `inset(0% ${Math.max(
                  0,
                  col.right - 0.35,
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
          LAYER 03: OMNIVERSE TECH SCANLINES & GREEN ATMOSPHERE
      ============================================ */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(57, 255, 20, 0.06) 0px, rgba(57, 255, 20, 0.06) 2px, transparent 2px, transparent 7px)",
          opacity: isHoloFlipCut ? 0.95 : 0.45 + pulse * 0.35,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          background: `linear-gradient(145deg, ${accent}48 0%, transparent 38%, transparent 62%, ${DEEP_GALVAN}99 100%)`,
          mixBlendMode: "screen",
          opacity: 0.46 + pulse * 0.4,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(3,6,4,0.58) 76%, rgba(0,0,0,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 04: SINGLE SEMI-TRANSPARENT DIAGONAL DNA STRAND & CENTER OMNITRIX LOGO (SCREEN SVG)
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
            transform: `translate3d(${camX * 0.12}px, ${camY * 0.12}px, 0)`,
          }}
        >
          {/* 1. SINGLE SEMI-TRANSPARENT DIAGONAL DNA DOUBLE-HELIX STRAND */}
          <g opacity={0.22 + omniDrop * 0.18 + pulse * 0.06}>
            {diagonalHelix.rungs.map((rg, rIdx) => (
              <line
                key={`diag-rung-${rIdx}`}
                x1={rg.x1}
                y1={rg.y1}
                x2={rg.x2}
                y2={rg.y2}
                stroke={rg.col}
                strokeWidth={3 + omniDrop * 2.5}
                opacity={0.75}
              />
            ))}
            <path
              d={diagonalHelix.strandA}
              fill="none"
              stroke={accent}
              strokeWidth={6 + omniDrop * 5}
              strokeLinecap="round"
            />
            <path
              d={diagonalHelix.strandB}
              fill="none"
              stroke={ACID_LIME}
              strokeWidth={4.5 + omniDrop * 3.5}
              strokeLinecap="round"
            />
          </g>

          {/* 2. CENTER ALTERNATING ROTATING OMNITRIX LOGO (OMNIVERSE DIAL + HOURGLASS) */}
          <g
            transform={`translate(540, 960) scale(${omnitrixScale})`}
            opacity={omnitrixOpacity}
          >
            {/* OUTER OMNITRIX DIAL BEZEL (Alternates CW / CCW per cut) */}
            <g transform={`rotate(${outerDialRot})`}>
              {/* Outer Beveled Octagonal Omniverse Casing */}
              <polygon
                points="-145,-340 145,-340 340,-145 340,145 145,340 -145,340 -340,145 -340,-145"
                fill="none"
                stroke={accent}
                strokeWidth={10 + omniDrop * 8}
              />
              {/* Inner Technical Dial Track */}
              <circle
                cx="0"
                cy="0"
                r="278"
                fill="none"
                stroke={ACID_LIME}
                strokeWidth="4"
                strokeDasharray="62 35"
              />
              {/* 4 Signature Omnitrix Bezel Lock Notches */}
              {[0, 90, 180, 270].map((deg) => (
                <g key={`omni-notch-${deg}`} transform={`rotate(${deg})`}>
                  <polygon
                    points="-26,-360 26,-360 18,-312 -18,-312"
                    fill={accent}
                  />
                  <line
                    x1="0"
                    y1="-296"
                    x2="0"
                    y2="-248"
                    stroke={BIO_WHITE}
                    strokeWidth="5"
                  />
                </g>
              ))}
            </g>

            {/* INNER OMNITRIX HOURGLASS INSIGNIA (Alternates back-and-forth opposite to dial) */}
            <g transform={`rotate(${innerCoreRot})`}>
              {/* Outer Hourglass Faceplate Ring */}
              <circle
                cx="0"
                cy="0"
                r="212"
                fill="none"
                stroke={accent}
                strokeWidth={7 + omniDrop * 5}
                opacity="0.85"
              />
              {/* Iconic Green Omnitrix Hourglass Core */}
              <polygon
                points="-145,-168 145,-168 28,0 145,168 -145,168 -28,0"
                fill={accent}
                fillOpacity={0.22 + omniDrop * 0.25}
                stroke={accent}
                strokeWidth={11 + omniDrop * 7}
                strokeLinejoin="miter"
              />
              {/* Razor White Inner Hourglass Highlight */}
              <polygon
                points="-118,-148 118,-148 14,0 118,148 -118,148 -14,0"
                fill="none"
                stroke={BIO_WHITE}
                strokeWidth="3.5"
                opacity="0.9"
              />
              {/* Left & Right Interlocking Side Triangles */}
              <polygon
                points="-195,-118 -72,0 -195,118"
                fill="none"
                stroke={ACID_LIME}
                strokeWidth="6"
                opacity="0.8"
              />
              <polygon
                points="195,-118 72,0 195,118"
                fill="none"
                stroke={ACID_LIME}
                strokeWidth="6"
                opacity="0.8"
              />
            </g>
          </g>

          {/* 3. SLEEK OMNIVERSE ANGULAR CORNER BRACKETS */}
          <g
            stroke={accent}
            strokeWidth={5 + omniDrop * 4}
            fill="none"
            opacity={0.78}
          >
            <polyline points="105,500 105,370 235,370" />
            <polyline points="975,500 975,370 845,370" />
            <polyline points="105,1420 105,1550 235,1550" />
            <polyline points="975,1420 975,1550 845,1550" />
          </g>
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: MODE 0 SOLID BLACK & GREEN HOURGLASS SHUTTERS (NORMAL BLEND SVG)
      ============================================ */}
      {isHourglassCut && hourglassOpen < 0.995 && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            {(() => {
              const topXLeft = (50 - hgEdgeTop) * 10.8;
              const midXLeft = (50 - hgEdgeMid) * 10.8;
              const topXRight = (50 + hgEdgeTop) * 10.8;
              const midXRight = (50 + hgEdgeMid) * 10.8;
              const edgeGlow = 10 + transformEnergy * 18;

              return (
                <g>
                  <polygon
                    points={`-20,-20 ${topXLeft.toFixed(1)},-20 ${midXLeft.toFixed(
                      1,
                    )},960 ${topXLeft.toFixed(1)},1940 -20,1940`}
                    fill={CORE_BLACK}
                  />
                  <polygon
                    points={`1100,-20 ${topXRight.toFixed(
                      1,
                    )},-20 ${midXRight.toFixed(1)},960 ${topXRight.toFixed(
                      1,
                    )},1940 1100,1940`}
                    fill={CORE_BLACK}
                  />
                  <polyline
                    points={`${topXLeft.toFixed(1)},0 ${midXLeft.toFixed(
                      1,
                    )},960 ${topXLeft.toFixed(1)},1920`}
                    fill="none"
                    stroke={accent}
                    strokeWidth={edgeGlow}
                  />
                  <polyline
                    points={`${topXLeft.toFixed(1)},0 ${midXLeft.toFixed(
                      1,
                    )},960 ${topXLeft.toFixed(1)},1920`}
                    fill="none"
                    stroke={BIO_WHITE}
                    strokeWidth={4}
                  />
                  <polyline
                    points={`${topXRight.toFixed(1)},0 ${midXRight.toFixed(
                      1,
                    )},960 ${topXRight.toFixed(1)},1920`}
                    fill="none"
                    stroke={accent}
                    strokeWidth={edgeGlow}
                  />
                  <polyline
                    points={`${topXRight.toFixed(1)},0 ${midXRight.toFixed(
                      1,
                    )},960 ${topXRight.toFixed(1)},1920`}
                    fill="none"
                    stroke={BIO_WHITE}
                    strokeWidth={4}
                  />
                </g>
              );
            })()}
          </svg>
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 06: 34 DENSE OMNIVERSE BIO-ENERGY PARTICLES
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {bioParticles.map((pt, i) => (
          <div
            key={`b10-bio-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.size,
              height: pt.pKind === 1 ? pt.size * 2.1 : pt.size * 1.15,
              backgroundColor: pt.col,
              clipPath:
                pt.pKind === 0
                  ? "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
                  : pt.pKind === 1
                    ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                    : "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
              transform: `rotate(${pt.rot}deg)`,
              opacity:
                pt.pKind === 2 ? 0.55 + pulse * 0.45 : 0.72 + pulse * 0.28,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: SIGNATURE OMNITRIX GREEN TRANSFORMATION FLASHES
      ============================================ */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${BIO_WHITE} 0%, ${accent}cc 32%, ${ACID_LIME}55 62%, transparent 88%)`,
          mixBlendMode: "screen",
          transform: `scale(${0.75 + greenFlashBurst * 0.65})`,
          opacity: greenFlashBurst * 0.78,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          backgroundColor: isGreenTransformPop ? accent : BIO_WHITE,
          mixBlendMode: "overlay",
          opacity: greenFlashBurst * 0.68,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: CLEAN PULSING OMNIVERSE HAIRLINE BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `4px solid ${accent}`,
          opacity: 0.48 + omniDrop * 0.52,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: SAFE ZONE OMNIVERSE WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT OMNITRIX HOURGLASS BRAND WATERMARK */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(3, 6, 4, 0.92)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${ACID_LIME}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterCurve * -45}px) scale(${
              1 + omniDrop * 0.06
            })`,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26">
            <rect
              x="1"
              y="1"
              width="24"
              height="24"
              rx="4"
              fill={CORE_BLACK}
              stroke={accent}
              strokeWidth="2"
            />
            <polygon
              points="4,3 22,3 14.5,13 22,23 4,23 11.5,13"
              fill={accent}
            />
          </svg>
          <span
            style={{
              fontFamily,
              color: BIO_WHITE,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT GALVAN TELEMETRY HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(3, 6, 4, 0.88)",
            borderLeft: `6px solid ${accent}`,
            borderTop: `2px solid ${ACID_LIME}`,
            transform: `translateX(${enterCurve * -40}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 23,
              fontWeight: 900,
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
              fontSize: 14,
              fontWeight: 700,
              color: BIO_WHITE,
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

export const Ben10OmniverseTransform: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#030604" overlap={0} Scene={Scene} />
);
