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
import { loadFont } from "@remotion/google-fonts/Syne";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

const BERNABEU_OBSIDIAN = "#030408";
const GALACTICO_GOLD = "#F5B800";
const ROYAL_SAPPHIRE = "#0A38FF";
const ELECTRIC_AZURE = "#00E5FF";
const PURE_BLANCO = "#F8FAFC";

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

  const accent = brand.color || GALACTICO_GOLD;
  const brandName = brand.name || "BELLIGOL JB5";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const impact = beatPulseAt(g, beatFrames, 3.2);
  const subBeat = beatPulseAt(g + 4, beatFrames, 2.0);
  const microPulse = beatPulseAt(g + 8, beatFrames, 1.4);

  // ================================================
  // 02. VELOCITY / TWIXTOR SLOW-MO & SPEED RAMP WARP
  // ================================================
  // S-Curve time remapping: High-velocity warp entry -> Suspended Twixtor slow-mo -> High-velocity exit
  const u = Math.min(1, Math.max(0, frame / span));
  const twixtorTime =
    u < 0.22
      ? interpolate(u, [0, 0.22], [0, 0.47], CLAMP)
      : u < 0.78
      ? interpolate(u, [0.22, 0.78], [0.47, 0.53], CLAMP)
      : interpolate(u, [0.78, 1], [0.53, 1], CLAMP);

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
    config: { damping: 10, stiffness: 290, mass: 0.38 },
  });

  const enterWarp = Math.pow(1 - enterCut, 2.6);
  const exitWarp = Math.pow(exitCut, 2.6);
  const rampVelocity = Math.min(1, enterWarp + exitWarp);

  // ================================================
  // 03. 4-MODE CAMERA: PULL-OUT, WHIP PAN, 3D SPIN & JUMP PUNCH
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;
  const cutMode = index % 4;

  // Jump Cut Punch-In on heavy Mid-Cut Beat + Pull-Out Zoom-Out on Entry
  // Base scale >= 1.18 guarantees 100% 9:16 portrait coverage with zero black bars
  const baseScale = interpolate(twixtorTime, [0, 1], [1.18, 1.3], CLAMP);
  const pullOutZoom =
    cutMode === 0 || cutMode === 2
      ? enterWarp * 0.74 - exitWarp * 0.14
      : (1 - enterSpring) * 0.45 + exitWarp * 0.68;

  const jumpCutPunch =
    (impact > 0.62 ? 0.13 : 0) +
    impact * 0.12 +
    Math.sin(pulse * Math.PI * 2.5) * impact * 0.06;

  const totalScale = Math.max(1.16, baseScale + pullOutZoom + jumpCutPunch);

  // Whip Pan / Motion Blur Swipe Coordinates
  const whipPanX =
    cutMode === 1
      ? (enterWarp * 920 - exitWarp * 960) * dir
      : (enterWarp * 460 - exitWarp * 500) * dir;
  const whipPanY =
    cutMode === 2
      ? (enterWarp * -680 + exitWarp * 720) * dir
      : (enterWarp * -210 + exitWarp * 240) * dir;

  // Beat-Synced Impact Shake
  const shakeAmp = impact * 32 + rampVelocity * 22 + pulse * 7;
  const shakeX =
    Math.sin(g * 3.5) * shakeAmp + (random(`bx-${g}`) - 0.5) * impact * 28;
  const shakeY =
    Math.cos(g * 2.9) * shakeAmp + (random(`by-${g}`) - 0.5) * impact * 24;

  const camX = whipPanX + shakeX;
  const camY = whipPanY + shakeY;

  // Spin / 3D Rotation Matrix (Perspective Tilt X, Y & Roll Z)
  const spin3DX =
    Math.sin(g * 0.06) * 5 +
    (enterWarp * 28 - exitWarp * 30) * dir +
    impact * 9 * dir;
  const spin3DY =
    cutMode === 3
      ? (enterWarp * 58 - exitWarp * 62) * dir
      : Math.cos(g * 0.05) * 6 + (enterWarp * -24 + exitWarp * 26) * dir;
  const spinRollZ =
    (cutMode === 3
      ? (enterWarp * 36 - exitWarp * 40) * dir
      : (enterWarp * 12 - exitWarp * 14) * dir) +
    (random(`br-${g}`) - 0.5) * impact * 6;

  // ================================================
  // 04. SPEED RAMP WARP SLATS & GLITCH SLICE DISPLACEMENT
  // ================================================
  // 5 Horizontal Kinetic Slats for Whip-Pan / Glitch Transition
  const warpSlats = [0, 1, 2, 3, 4].map((sIdx) => {
    const distFromCenter = Math.abs(sIdx - 2);
    const delay = distFromCenter * 1.3;
    const sEnter =
      index === 0
        ? 1
        : interpolate(frame, [delay, delay + 5.2], [0, 1], CLAMP);
    const sEase = 1 - Math.pow(1 - sEnter, 3);

    const sExit = Math.pow(
      interpolate(
        frame,
        [duration + distFromCenter * 1.1, duration + OVERLAP_FRAMES],
        [0, 1],
        CLAMP
      ),
      2.4
    );

    const alt = sIdx % 2 === 0 ? 1 : -1;
    // Glitch horizontal tear on beat impact + Whip-Pan slat offset
    const glitchShift =
      impact > 0.48
        ? (random(`gl-sl-${g}-${sIdx}`) - 0.5) * impact * 18
        : 0;
    const swipeOffset =
      (1 - sEase) * 115 * alt + sExit * 120 * -alt + glitchShift;

    return {
      top: sIdx * 20,
      bottom: 80 - sIdx * 20,
      swipeOffset,
      opacity: interpolate(sEase, [0, 0.15, 1], [0, 1, 1], CLAMP),
    };
  });

  // ================================================
  // 05. 4K CC (COLOR CORRECTION) & SHARPEN MICRO-CONTRAST
  // ================================================
  // Crisp stadium highlights, deep obsidian shadows, golden warm midtones
  const ccContrast = 1.4 + impact * 0.3;
  const ccSat = 1.22 + pulse * 0.32;
  const ccBright = 0.96 + impact * 0.26 + rampVelocity * 0.22;
  const cc4KFilter = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  // Directional Blur & Radial Zoom Blur Power (Simulated via fast multi-pass transform echoes)
  const blurPower = Math.min(1, impact * 0.92 + rampVelocity * 0.95);
  const rgbShift = impact * 34 + rampVelocity * 42 + subBeat * 12;

  // ================================================
  // 06. FILM GRAIN, DUST MOTES & LENS FLARE WIPE MATH
  // ================================================
  const flareWipeProg =
    frame < OVERLAP_FRAMES + 4
      ? interpolate(frame, [0, OVERLAP_FRAMES + 4], [0, 1], CLAMP)
      : exitCut > 0
      ? exitCut
      : 0;

  // 14 Deterministic Bernabeu Gold Dust & Film Grain Specks
  const dustSpecks = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const drift = Math.sin(g * 0.07 + i * 1.5) * 90;
    const x =
      ((random(`dx-${seed}`) * 1080 + drift + camX * 0.2) % 1160) - 40;
    const speed = 15 + (i % 5) * 8 + rampVelocity * 30;
    const y = 1980 - ((g * speed + random(`dy-${seed}`) * 1920) % 2120);
    const size = 5 + (i % 4) * 4 + pulse * 6;
    const rot = g * (4 + (i % 3) * 3) * (i % 2 === 0 ? 1 : -1);
    const col =
      i % 3 === 0 ? accent : i % 3 === 1 ? PURE_BLANCO : ELECTRIC_AZURE;
    return { x, y, size, rot, col };
  });

  // Procedural Stadium Lightning / Energy Filament
  const boltSeed = Math.floor(g / 2);
  const buildGoldFilament = (baseX: number, id: number) => {
    let pts = `${baseX},0 `;
    let cx = baseX;
    for (let s = 1; s <= 8; s++) {
      const ny = s * 240;
      cx += (random(`jb-fl-${boltSeed}-${id}-${s}`) - 0.5) * 185;
      pts += `${cx.toFixed(0)},${ny} `;
    }
    return pts;
  };
  const leftFilament = buildGoldFilament(210, 1);
  const rightFilament = buildGoldFilament(870, 2);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BERNABEU_OBSIDIAN,
        overflow: "hidden",
        perspective: 1150,
        opacity: index === 0 ? 1 : enterCut,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED MOTION-TILE MIRROR BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.24}) rotate(${-spinRollZ * 0.5}deg)`,
          opacity: 0.44,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.75) saturate(0.45) brightness(0.4)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + 3D SPIN + 4K CC & SHARPEN RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${spin3DX}deg) rotateY(${spin3DY}deg) rotateZ(${spinRollZ}deg) scale(${totalScale})`,
        }}
      >
        {warpSlats.map((sl, sIdx) => (
          <AbsoluteFill
            key={`warp-slat-${sIdx}`}
            style={{
              clipPath: `inset(${Math.max(0, sl.top - 0.35)}% 0% ${Math.max(
                0,
                sl.bottom - 0.35
              )}% 0%)`,
              transform: `translate3d(${sl.swipeOffset}%, 0, 0)`,
              opacity: sl.opacity,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: cc4KFilter,
              }}
            />
          </AbsoluteFill>
        ))}

        {/* 4K High-Pass Sharpen & Micro-Contrast Luminance Layer */}
        <AbsoluteFill
          style={{
            mixBlendMode: "overlay",
            opacity: 0.5 + pulse * 0.24,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(1) contrast(2.65) brightness(0.92)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 03: DIRECTIONAL BLUR, RADIAL ZOOM BLUR & RGB SPLIT
        ============================================ */}
        {blurPower > 0.06 && (
          <>
            {/* Pass 1: Directional Whip-Pan Blur + Warm Galactico Gold RGB Split */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.45,
                transform: `translate3d(${-rgbShift * dir}px, ${
                  rgbShift * 0.25
                }px, 0) scaleX(${1 + blurPower * 0.05})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(-15deg) saturate(5) contrast(1.55)",
                }}
              />
            </AbsoluteFill>

            {/* Pass 2: Directional Whip-Pan Blur + Royal Sapphire RGB Split */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.4,
                transform: `translate3d(${rgbShift * dir}px, ${
                  -rgbShift * 0.25
                }px, 0) scaleX(${1 + blurPower * 0.05})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(175deg) saturate(5) contrast(1.55)",
                }}
              />
            </AbsoluteFill>

            {/* Pass 3: Radial / Zoom Blur Concentric Expansion Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "lighten",
                opacity: blurPower * 0.34,
                transform: `scale(${1 + blurPower * 0.14}) rotate(${
                  blurPower * 2.4 * dir
                }deg)`,
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
          LAYER 04: BELLIGOL OPEN-ARMS AURA & LENS FLARE WIPE (SVG)
          - Open-Arms Celebration Wingspan Vectors (Zero Circles)
          - Bernabeu Crown Prism Geometry
          - High-Voltage Royal Gold Filaments
          - Anamorphic Lens Flare Wipe Across Screen
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
          {/* 1. BELLIGOL OPEN-ARMS CELEBRATION WINGSPAN RAYS (EXPANDING V-WINGS) */}
          <g
            opacity={0.38 + impact * 0.58}
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.92 + impact * 0.18 + pulse * 0.06})`,
            }}
          >
            {[-260, -130, 0, 130, 260].map((yOff, wIdx) => {
              const spanW = 490 - Math.abs(wIdx - 2) * 55 + impact * 95;
              const liftY = 140 + Math.abs(wIdx - 2) * 35 + pulse * 45;
              return (
                <g key={`belligol-wing-${wIdx}`}>
                  {/* Left Open-Arm Ray */}
                  <polyline
                    points={`440,${960 + yOff} ${540 - spanW},${
                      960 + yOff - liftY
                    } ${540 - spanW + 65},${960 + yOff - liftY - 35}`}
                    fill="none"
                    stroke={wIdx % 2 === 0 ? accent : PURE_BLANCO}
                    strokeWidth={wIdx === 2 ? 10 + impact * 10 : 4 + impact * 5}
                    strokeLinecap="square"
                    strokeDasharray="240 160"
                    strokeDashoffset={-g * 22}
                  />
                  {/* Right Open-Arm Ray */}
                  <polyline
                    points={`640,${960 + yOff} ${540 + spanW},${
                      960 + yOff - liftY
                    } ${540 + spanW - 65},${960 + yOff - liftY - 35}`}
                    fill="none"
                    stroke={wIdx % 2 === 0 ? accent : PURE_BLANCO}
                    strokeWidth={wIdx === 2 ? 10 + impact * 10 : 4 + impact * 5}
                    strokeLinecap="square"
                    strokeDasharray="240 160"
                    strokeDashoffset={-g * 22}
                  />
                </g>
              );
            })}
          </g>

          {/* 2. ROYAL GOLD & ELECTRIC AZURE STADIUM FILAMENTS */}
          {(impact > 0.22 || rampVelocity > 0.28) && (
            <g opacity={Math.min(1, impact * 1.35 + rampVelocity)}>
              <polyline
                points={leftFilament}
                fill="none"
                stroke={accent}
                strokeWidth={34 + impact * 24}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={leftFilament}
                fill="none"
                stroke={PURE_BLANCO}
                strokeWidth={5 + impact * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={rightFilament}
                fill="none"
                stroke={ELECTRIC_AZURE}
                strokeWidth={34 + impact * 24}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={rightFilament}
                fill="none"
                stroke={PURE_BLANCO}
                strokeWidth={5 + impact * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* 3. CHAMFERED 4K BROADCAST TELEMETRY LOCK (ZERO CIRCLES) */}
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
            <polyline points="105,510 105,375 245,375 285,415" />
            <polyline points="975,510 975,375 835,375 795,415" />
            <polyline points="105,1410 105,1545 245,1545 285,1505" />
            <polyline points="975,1410 975,1545 835,1545 795,1505" />
          </g>

          {/* 4. ANAMORPHIC LENS FLARE WIPE TRANSITION */}
          {(flareWipeProg > 0.01 || impact > 0.45) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 2 === 0 ? -24 : 24}deg) scale(${
                  1.06 + impact * 0.22
                })`,
              }}
            >
              {(() => {
                const p = flareWipeProg > 0 ? flareWipeProg : impact;
                const flareX = interpolate(p, [0, 1], [-1450, 1450], CLAMP);
                const flareY = 960 + (p - 0.5) * 420 * dir;
                const op = interpolate(
                  p,
                  [0, 0.15, 0.85, 1],
                  [0, 1, 0.95, 0],
                  CLAMP
                );

                return (
                  <g
                    transform={`translate(${flareX}, ${flareY})`}
                    opacity={op}
                  >
                    {/* Wide Horizontal Anamorphic Sapphire Streak */}
                    <polygon
                      points="-1600,0 0,-65 1600,0 0,65"
                      fill={ROYAL_SAPPHIRE}
                      opacity={0.75}
                    />
                    {/* Mid Galactico Gold Anamorphic Blade */}
                    <polygon
                      points="-1400,0 0,-32 1400,0 0,32"
                      fill={accent}
                      opacity={0.92}
                    />
                    {/* Razor White-Hot Anamorphic Core */}
                    <polygon
                      points="-1200,0 0,-10 1200,0 0,10"
                      fill={PURE_BLANCO}
                    />
                    {/* Vertical & Diagonal Starburst Prisms at Flare Center */}
                    <polygon
                      points="0,-650 -24,0 0,650 24,0"
                      fill={accent}
                      opacity={0.85}
                    />
                    <polygon
                      points="0,-480 -9,0 0,480 9,0"
                      fill={PURE_BLANCO}
                    />
                    <polygon
                      points="-220,-220 0,-18 220,220 0,18"
                      fill={ELECTRIC_AZURE}
                      opacity={0.85}
                    />
                    <polygon
                      points="220,-220 0,-18 -220,220 0,18"
                      fill={ELECTRIC_AZURE}
                      opacity={0.85}
                    />
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: FILM GRAIN & GOLDEN STADIUM DUST OVERLAYS
      ============================================ */}
      {/* Animated Fine Cinema Film Grain Matrix */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            repeating-linear-gradient(${
              (g * 47) % 180
            }deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px),
            repeating-linear-gradient(${
              ((g * 73) + 90) % 180
            }deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 2px, transparent 2px, transparent 5px)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Floating Bernabeu Gold Dust Motes */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {dustSpecks.map((ds, i) => (
          <div
            key={`jb-dust-${i}`}
            style={{
              position: "absolute",
              left: ds.x,
              top: ds.y,
              width: ds.size,
              height: ds.size * 2.2,
              backgroundColor: ds.col,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              transform: `rotate(${ds.rot}deg)`,
              opacity: 0.62 + pulse * 0.38,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: VIGNETTE, DARK EDGES & FLASH / EXPOSURE BURN
      ============================================ */}
      {/* Split-Tone Galactico Gold & Royal Sapphire Grade */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${accent}52 0%, transparent 42%, transparent 58%, ${ROYAL_SAPPHIRE}52 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.46,
          pointerEvents: "none",
        }}
      />

      {/* Deep Vignette & Dark Edges (Keeps 9:16 subject crisp in the center) */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 34%, rgba(3,4,8,0.6) 74%, rgba(3,4,8,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Flash / Exposure Burn on Beat & Cut Transitions */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at ${50 + dir * 28}% ${
            28 + subBeat * 15
          }%, ${PURE_BLANCO} 0%, ${accent}aa 24%, transparent 58%),
            radial-gradient(circle at ${50 - dir * 28}% ${
            72 - pulse * 15
          }%, ${PURE_BLANCO} 0%, ${ELECTRIC_AZURE}99 22%, transparent 55%)
          `,
          mixBlendMode: "screen",
          opacity: impact * 0.65 + rampVelocity * 0.6,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          backgroundColor: PURE_BLANCO,
          mixBlendMode: "overlay",
          opacity: rampVelocity * 0.72 + impact * 0.3,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING GALACTICO GOLD & AZURE FRAME
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 14}px solid ${accent}`,
          opacity: 0.45 + impact * 0.55,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `2px solid ${PURE_BLANCO}`,
          opacity: 0.38 + subBeat * 0.58,
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
        {/* TOP-LEFT BELLIGOL GALACTICO WATERMARK (NO EMOJIS, ZERO CIRCLES) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(3, 4, 8, 0.88)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${ELECTRIC_AZURE}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterWarp * -60}px) scale(${
              1 + impact * 0.06
            })`,
          }}
        >
          {/* JB5 Crown / Open-Arms Geometric Bars */}
          <div style={{ display: "flex", gap: 4, transform: "skewX(-24deg)" }}>
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: accent,
                transform: `scaleY(${0.75 + pulse * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 24,
                backgroundColor: PURE_BLANCO,
                transform: `scaleY(${0.75 + impact * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: ELECTRIC_AZURE,
                transform: `scaleY(${0.75 + microPulse * 0.45})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: PURE_BLANCO,
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

        {/* BOTTOM-LEFT 4K BROADCAST TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 20px",
            backgroundColor: "rgba(3, 4, 8, 0.84)",
            borderLeft: `6px solid ${accent}`,
            borderTop: `2px solid ${ELECTRIC_AZURE}`,
            transform: `translateX(${enterWarp * -50}px)`,
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
              color: PURE_BLANCO,
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

export const BellinghamGalacticoAura: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#030408"
    overlap={OVERLAP_FRAMES}
    Scene={Scene}
  />
);