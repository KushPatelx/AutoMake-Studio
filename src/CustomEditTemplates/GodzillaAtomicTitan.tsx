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
import { loadFont } from "@remotion/google-fonts/Teko";

const { fontFamily } = loadFont("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const ABYSS_TRENCH = "#020508";
const ATOMIC_BLUE = "#00E5FF";
const CHERENKOV_COBALT = "#0055FF";
const EVOLVED_MAGENTA = "#FF007F";
const MAGMA_EMBER = "#FF4D00";
const PLASMA_CORE = "#F0FFFF";

const OVERLAP_FRAMES = 9;

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

  const accent = brand.color || ATOMIC_BLUE;
  const brandName = brand.name || "KING OF MONSTERS";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const stomp = beatPulseAt(g, beatFrames, 3.2);
  const roarSurge = beatPulseAt(g + 4, beatFrames, 2.1);
  const dorsalCharge = beatPulseAt(g + 8, beatFrames, 1.5);

  // ================================================
  // 02. SEISMIC SLAM & WHIP-DOWN VELOCITY RAMPING
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const velocityFlow =
    u < 0.22
      ? interpolate(u, [0, 0.22], [0, 0.46], CLAMP)
      : u < 0.78
      ? interpolate(u, [0.22, 0.78], [0.46, 0.54], CLAMP)
      : interpolate(u, [0.78, 1], [0.54, 1], CLAMP);

  const enterCut =
    index === 0
      ? 1
      : interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], CLAMP);
  const exitCut = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP
  );

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 9, stiffness: 290, mass: 0.42 },
  });

  const enterSlam = Math.pow(1 - enterCut, 2.5);
  const exitSlam = Math.pow(exitCut, 2.5);
  const transitionForce = Math.min(1, enterSlam + exitSlam);

  // ================================================
  // 03. ROAR ZOOM-IN, WHIP-DOWN & EARTHQUAKE SKEW SHAKE
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;
  const cutType = index % 3;

  // Base scale >= 1.18 so violent seismic shakes & skews NEVER show black edges on 9:16
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.34], CLAMP);
  const roarZoom =
    cutType === 0
      ? enterSlam * 0.72 + exitSlam * 0.48
      : (1 - enterSpring) * 0.48 + exitSlam * 0.68;
  const beatZoom = stomp * 0.16 + pulse * 0.05;
  const totalScale = Math.max(1.16, baseScale + roarZoom + beatZoom);

  // Whip-Down & Seismic Slam Vertical Drop Math
  const whipDownY =
    cutType === 1
      ? enterSlam * -880 + exitSlam * 920
      : (enterSlam * -380 + exitSlam * 420) * dir;
  const slamBounceY =
    Math.abs(Math.sin(pulse * Math.PI * 2.5)) * stomp * 52 - stomp * 24;

  const whipSideX = (enterSlam * 420 - exitSlam * 460) * dir;

  // Heavy Kaiju Earthquake & Skew Distortion on Beat
  const quakeAmp = stomp * 38 + transitionForce * 24 + pulse * 8;
  const quakeX =
    Math.sin(g * 3.6) * quakeAmp + (random(`gx-${g}`) - 0.5) * stomp * 32;
  const quakeY =
    Math.cos(g * 2.9) * quakeAmp + (random(`gy-${g}`) - 0.5) * stomp * 36;

  const camX = whipSideX + quakeX;
  const camY = whipDownY + slamBounceY + quakeY;

  const camRot =
    (enterSlam * 11 - exitSlam * 13) * dir +
    Math.sin(g * 0.22) * 1.6 +
    (random(`gr-${g}`) - 0.5) * stomp * 6;

  // Earthquake Skew Shake (Shears the frame horizontally & vertically on heavy stomps)
  const skewX =
    Math.sin(g * 4.2) * stomp * 6.5 +
    (enterSlam - exitSlam) * 9 * dir;
  const skewY = Math.cos(g * 3.8) * stomp * 4.5;

  // ================================================
  // 04. HEAT DISTORTION SHIMMER & SEISMIC FAULT BANDS
  // ================================================
  // 6 Horizontal Heat-Wave / Fault-Line Bands that shimmer with thermal radiation
  // and slam into place during Whip-Down / Seismic Slam transitions
  const heatBands = [0, 1, 2, 3, 4, 5].map((bIdx) => {
    const stagger = bIdx * 1.1;
    const bEnter =
      index === 0
        ? 1
        : interpolate(frame, [stagger, stagger + 5.2], [0, 1], CLAMP);
    const bEase = 1 - Math.pow(1 - bEnter, 3);

    const bExit = Math.pow(
      interpolate(
        frame,
        [duration + bIdx * 0.9, duration + OVERLAP_FRAMES],
        [0, 1],
        CLAMP
      ),
      2.3
    );

    const alt = bIdx % 2 === 0 ? 1 : -1;
    // Continuous thermal refraction wave + beat fault shear
    const heatWaveX =
      Math.sin(g * 0.45 + bIdx * 1.6) * (0.4 + pulse * 0.9 + stomp * 2.8);
    const slamShiftY = (1 - bEase) * -95 + bExit * 105;
    const slamShiftX = (1 - bEase) * 45 * alt;

    return {
      top: bIdx * (100 / 6),
      bottom: 100 - (bIdx + 1) * (100 / 6),
      shiftX: heatWaveX + slamShiftX,
      shiftY: slamShiftY,
      opacity: interpolate(bEase, [0, 0.15, 1], [0, 1, 1], CLAMP),
    };
  });

  // ================================================
  // 05. DARK MONARCH CINEMATIC COLOR GRADING (CC)
  // ================================================
  const ccContrast = 1.44 + stomp * 0.32;
  const ccSat = 1.18 + pulse * 0.36;
  const ccBright = 0.92 + stomp * 0.28 + transitionForce * 0.22;
  const godzillaCC = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  const shockwaveShift = stomp * 34 + transitionForce * 38;

  // ================================================
  // 06. ATOMIC BEAM WIPE, DORSAL FINS & RADIOACTIVE EMBERS
  // ================================================
  const beamWipeProg =
    frame < OVERLAP_FRAMES + 4
      ? interpolate(frame, [0, OVERLAP_FRAMES + 4], [0, 1], CLAMP)
      : exitCut > 0
      ? exitCut
      : 0;

  // A) Jagged Cherenkov Plasma Lightning Wrapping Around the Atomic Breath
  const boltSeed = Math.floor(g / 2);
  const buildAtomicArc = (offsetY: number, id: number) => {
    let pts = "";
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const bx = -120 + t * 1320;
      const by =
        1650 -
        t * 1400 +
        offsetY +
        (random(`ga-${boltSeed}-${id}-${s}`) - 0.5) * 160;
      pts += `${bx.toFixed(0)},${by.toFixed(0)} `;
    }
    return pts;
  };
  const plasmaArc1 = buildAtomicArc(-50, 1);
  const plasmaArc2 = buildAtomicArc(50, 2);

  // B) Godzilla Jagged Dorsal Plates (Charging up the spine from bottom to top on beat!)
  const dorsalPlates = [0, 1, 2, 3, 4, 5].map((dIdx) => {
    const py = 1540 - dIdx * 195;
    const chargeWave = Math.max(
      0,
      Math.sin(g * 0.35 - dIdx * 0.55) * 0.5 + stomp * 0.85
    );
    const spanW = 75 + dIdx * 10 + chargeWave * 65;

    return {
      leftFin: `40,${py + 70} ${40 + spanW},${py + 25} ${
        40 + spanW * 0.55
      },${py - 10} ${40 + spanW * 0.9},${py - 45} 40,${py - 70}`,
      rightFin: `1040,${py + 70} ${1040 - spanW},${py + 25} ${
        1040 - spanW * 0.55
      },${py - 10} ${1040 - spanW * 0.9},${py - 45} 1040,${py - 70}`,
      glowOp: 0.25 + chargeWave * 0.7,
      col: dIdx % 2 === 0 ? accent : EVOLVED_MAGENTA,
    };
  });

  // C) Roar Zoom-In Acoustic Shockwave Polygons (Angular Octagonal Expansion, Zero Circles)
  const roarShockwaves = [0, 1, 2].map((wIdx) => {
    const expand = ((g * 22 + wIdx * 240) % 720) / 720;
    const rx = 180 + expand * 520 + stomp * 85;
    const ry = 260 + expand * 780 + stomp * 110;
    const cx = 540;
    const cy = 780; // Roar origin zone

    const pts = `
      ${cx - rx * 0.45},${cy - ry}
      ${cx + rx * 0.45},${cy - ry}
      ${cx + rx},${cy - ry * 0.45}
      ${cx + rx},${cy + ry * 0.45}
      ${cx + rx * 0.45},${cy + ry}
      ${cx - rx * 0.45},${cy + ry}
      ${cx - rx},${cy + ry * 0.45}
      ${cx - rx},${cy - ry * 0.45}
    `;

    return {
      pts,
      op: (1 - expand) * (0.35 + stomp * 0.65),
      thick: (1 - expand) * (10 + stomp * 16),
      col: wIdx % 2 === 0 ? accent : PLASMA_CORE,
    };
  });

  // D) Radioactive Fallout Ash & Atomic Embers (15 deterministic particles)
  const embers = Array.from({ length: 15 }, (_, i) => {
    const seed = i * 89 + index * 31;
    const sway = Math.sin(g * 0.08 + i * 1.4) * 85;
    const x =
      ((random(`emx-${seed}`) * 1080 + sway + camX * 0.2) % 1160) - 40;
    const speed = 18 + (i % 5) * 9 + transitionForce * 34 + stomp * 20;
    const y = 1980 - ((g * speed + random(`emy-${seed}`) * 1920) % 2120);
    const size = 7 + (i % 4) * 5 + pulse * 8;
    const rot = g * (5 + (i % 3) * 3) * (i % 2 === 0 ? 1 : -1);
    const col =
      i % 4 === 0
        ? PLASMA_CORE
        : i % 3 === 0
        ? accent
        : i % 2 === 0
        ? MAGMA_EMBER
        : EVOLVED_MAGENTA;
    return { x, y, size, rot, col };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: ABYSS_TRENCH,
        overflow: "hidden",
        opacity: index === 0 ? 1 : enterCut,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED ABYSSAL RADIATION BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.22}) rotate(${-camRot * 0.45}deg)`,
          opacity: 0.44,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.7) saturate(0.45) brightness(0.38)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + EARTHQUAKE SKEW + HEAT DISTORTION RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) skew(${skewX}deg, ${skewY}deg) scale(${totalScale})`,
        }}
      >
        {heatBands.map((hb, bIdx) => (
          <AbsoluteFill
            key={`heat-band-${bIdx}`}
            style={{
              clipPath: `inset(${Math.max(0, hb.top - 0.35)}% 0% ${Math.max(
                0,
                hb.bottom - 0.35
              )}% 0%)`,
              transform: `translate3d(${hb.shiftX}%, ${hb.shiftY}%, 0)`,
              opacity: hb.opacity,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: godzillaCC,
              }}
            />
          </AbsoluteFill>
        ))}

        {/* Dark Cinematic CC Gritty Shadow Pass */}
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
              filter: "grayscale(1) contrast(2.4) brightness(0.88)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 03: ROAR ZOOM-IN & SEISMIC SLAM ECHOES (TRANSFORM-ONLY)
        ============================================ */}
        {(stomp > 0.08 || transitionForce > 0.08) && (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: Math.min(0.52, stomp * 0.45 + transitionForce * 0.4),
                transform: `translate3d(${-shockwaveShift * dir}px, ${
                  shockwaveShift * 0.45
                }px, 0) scale(${1 + stomp * 0.07})`,
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
                opacity: Math.min(0.38, stomp * 0.34 + transitionForce * 0.3),
                transform: `translate3d(${shockwaveShift * dir}px, ${
                  -shockwaveShift * 0.45
                }px, 0) scale(${1 + stomp * 0.13})`,
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
          LAYER 04: GODZILLA ATOMIC BREATH & TITAN AURA ENGINE (SVG)
          - Charging Jagged Dorsal Plates (Left & Right Flanks)
          - Roar Zoom-In Octagonal Acoustic Shockwaves
          - Cherenkov Plasma Lightning Arcs
          - Concentrated Atomic Beam Wipe Across Screen
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
          {/* 1. ROAR ZOOM-IN OCTAGONAL ACOUSTIC SHOCKWAVES */}
          {(stomp > 0.15 || roarSurge > 0.25) && (
            <g>
              {roarShockwaves.map((rw, i) => (
                <polygon
                  key={`roar-wave-${i}`}
                  points={rw.pts}
                  fill="none"
                  stroke={rw.col}
                  strokeWidth={rw.thick}
                  opacity={rw.op}
                />
              ))}
            </g>
          )}

          {/* 2. CHARGING JAGGED DORSAL PLATES (BIO-NUCLEAR IGNITION UP THE SPINE) */}
          <g>
            {dorsalPlates.map((df, i) => (
              <g key={`dorsal-plate-${i}`} opacity={df.glowOp}>
                <polygon
                  points={df.leftFin}
                  fill="none"
                  stroke={df.col}
                  strokeWidth={6 + stomp * 8}
                  strokeLinejoin="miter"
                />
                <polygon
                  points={df.leftFin}
                  fill={df.col}
                  opacity={0.35 + stomp * 0.4}
                />
                <polygon
                  points={df.rightFin}
                  fill="none"
                  stroke={df.col}
                  strokeWidth={6 + stomp * 8}
                  strokeLinejoin="miter"
                />
                <polygon
                  points={df.rightFin}
                  fill={df.col}
                  opacity={0.35 + stomp * 0.4}
                />
              </g>
            ))}
          </g>

          {/* 3. CHERENKOV PLASMA LIGHTNING ARCS */}
          {(stomp > 0.22 || transitionForce > 0.25) && (
            <g opacity={Math.min(1, stomp * 1.35 + transitionForce)}>
              <polyline
                points={plasmaArc1}
                fill="none"
                stroke={accent}
                strokeWidth={36 + stomp * 26}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={plasmaArc1}
                fill="none"
                stroke={PLASMA_CORE}
                strokeWidth={5 + stomp * 5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={plasmaArc2}
                fill="none"
                stroke={EVOLVED_MAGENTA}
                strokeWidth={32 + stomp * 22}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.38}
              />
              <polyline
                points={plasmaArc2}
                fill="none"
                stroke={PLASMA_CORE}
                strokeWidth={4 + stomp * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* 4. ATOMIC BEAM WIPE (CONCENTRATED CHERENKOV RADIATION TORCH) */}
          {(beamWipeProg > 0.01 || stomp > 0.44) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 2 === 0 ? -38 : 38}deg) scale(${
                  1.08 + stomp * 0.25
                })`,
              }}
            >
              {(() => {
                const p = beamWipeProg > 0 ? beamWipeProg : stomp;
                const beamX = interpolate(p, [0, 1], [-1550, 1550], CLAMP);
                const beamWidth = interpolate(
                  p,
                  [0, 0.45, 1],
                  [40, 320 + stomp * 180, 60],
                  CLAMP
                );
                const op = interpolate(
                  p,
                  [0, 0.15, 0.85, 1],
                  [0, 1, 0.95, 0],
                  CLAMP
                );

                return (
                  <g
                    transform={`translate(${beamX}, 960)`}
                    opacity={op}
                  >
                    {/* Outer Cherenkov Cobalt / Magenta Ionization Wake */}
                    <polygon
                      points={`-1500,0 -200,${-beamWidth * 1.45} 1450,0 -200,${
                        beamWidth * 1.45
                      }`}
                      fill={CHERENKOV_COBALT}
                      opacity={0.68}
                    />
                    {/* Mid Atomic Cyan / Evolved Pink Plasma Torrent */}
                    <polygon
                      points={`-1350,0 -150,${-beamWidth * 0.85} 1350,0 -150,${
                        beamWidth * 0.85
                      }`}
                      fill={accent}
                      opacity={0.92}
                    />
                    {/* Inner White-Hot Thermonuclear Core Beam */}
                    <polygon
                      points={`-1200,0 -100,${-beamWidth * 0.35} 1280,0 -100,${
                        beamWidth * 0.35
                      }`}
                      fill={PLASMA_CORE}
                    />
                    {/* Atomic Impact Starburst Diamond at Beam Tip */}
                    <polygon
                      points="750,0 1050,-110 1350,0 1050,110"
                      fill={PLASMA_CORE}
                    />
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: RADIOACTIVE FALLOUT ASH & MAGMA EMBERS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {embers.map((em, i) => (
          <div
            key={`godzilla-ember-${i}`}
            style={{
              position: "absolute",
              left: em.x,
              top: em.y,
              width: em.size,
              height: em.size * 2.5,
              backgroundColor: em.col,
              clipPath: "polygon(50% 0%, 100% 35%, 65% 100%, 0% 65%)",
              transform: `rotate(${em.rot}deg)`,
              opacity: 0.68 + pulse * 0.32,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: DARK CINEMATIC CC VIGNETTE, HEAT HAZE & ATOMIC FLASH
      ============================================ */}
      {/* Split-Tone Atomic Blue & Scorched Magma Atmosphere */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(155deg, ${accent}55 0%, transparent 40%, transparent 58%, ${MAGMA_EMBER}55 100%)`,
          mixBlendMode: "screen",
          opacity: 0.46 + pulse * 0.44,
          pointerEvents: "none",
        }}
      />

      {/* Deep Trench Noir Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 34%, rgba(2,5,8,0.62) 74%, rgba(2,5,8,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Rising Thermal Heat-Haze Horizon Glow */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(0deg, ${accent}77 0%, ${CHERENKOV_COBALT}33 28%, transparent 55%)`,
          mixBlendMode: "screen",
          opacity: 0.4 + stomp * 0.55,
          pointerEvents: "none",
        }}
      />

      {/* Atomic Breath Over-Exposure Ignition Flash */}
      <AbsoluteFill
        style={{
          backgroundColor: PLASMA_CORE,
          mixBlendMode: "overlay",
          opacity: transitionForce * 0.72 + stomp * 0.34,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING CHERENKOV RADIATION BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${7 + stomp * 15}px solid ${accent}`,
          opacity: 0.46 + stomp * 0.54,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `3px solid ${PLASMA_CORE}`,
          opacity: 0.4 + dorsalCharge * 0.55,
          transform: `scale(${0.978 - pulse * 0.008})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: SAFE ZONE MONARCH BRAND WATERMARK & TELEMETRY
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
        {/* TOP-LEFT MONARCH TITAN WATERMARK BADGE (ZERO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "8px 26px",
            backgroundColor: "rgba(2, 5, 8, 0.9)",
            borderLeft: `8px solid ${accent}`,
            borderRight: `3px solid ${EVOLVED_MAGENTA}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 34%, 100% 100%, 6% 100%, 0 66%)",
            transform: `translateX(${enterSlam * -60}px) scale(${
              1 + stomp * 0.07
            })`,
          }}
        >
          {/* Dorsal Fin Radiation Meter Bars */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 24,
              transform: "skewX(-20deg)",
            }}
          >
            <div
              style={{
                width: 5,
                height: 14,
                backgroundColor: accent,
                transform: `scaleY(${0.7 + pulse * 0.5})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 20,
                backgroundColor: PLASMA_CORE,
                transform: `scaleY(${0.7 + stomp * 0.5})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 24,
                backgroundColor: EVOLVED_MAGENTA,
                transform: `scaleY(${0.7 + dorsalCharge * 0.5})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: PLASMA_CORE,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT SEISMIC TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "6px 20px",
            backgroundColor: "rgba(2, 5, 8, 0.86)",
            borderLeft: `6px solid ${accent}`,
            borderTop: `2px solid ${MAGMA_EMBER}`,
            transform: `translateX(${enterSlam * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 32,
              fontWeight: 700,
              color: accent,
              letterSpacing: 4,
              lineHeight: 1,
            }}
          >
            {`CUT ${(index + 1).toString().padStart(2, "0")}/${total
              .toString()
              .padStart(2, "0")}`}
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 21,
              fontWeight: 600,
              color: PLASMA_CORE,
              letterSpacing: 3,
              lineHeight: 1,
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

export const GodzillaAtomicTitan: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#020508"
    overlap={OVERLAP_FRAMES}
    Scene={Scene}
  />
);