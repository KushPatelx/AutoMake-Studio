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
import { loadFont } from "@remotion/google-fonts/Rajdhani";

const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const STARK_OBSIDIAN = "#030509";
const HOT_ROD_RED = "#E60026";
const TITANIUM_GOLD = "#FFB800";
const JARVIS_CYAN = "#00F0FF";
const ARC_CORE_WHITE = "#F4FFFF";

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

  const accent = brand.color || HOT_ROD_RED;
  const brandName = brand.name || "MARK LXXXV";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const repulsorBlast = beatPulseAt(g, beatFrames, 3.2);
  const subThruster = beatPulseAt(g + 4, beatFrames, 1.9);
  const hudScanTick = beatPulseAt(g + 8, beatFrames, 1.4);

  // ================================================
  // 02. VELOCITY / SMOOTH SPEED RAMPING (TWIXTOR S-CURVE)
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const velocityFlow =
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
    config: { damping: 10, stiffness: 295, mass: 0.38 },
  });

  const enterWarp = Math.pow(1 - enterCut, 2.5);
  const exitWarp = Math.pow(exitCut, 2.5);
  const thrusterSurge = Math.min(1, enterWarp + exitWarp);

  // ================================================
  // 03. ZOOM-IN / PULL-OUT KEYFRAMES & MOTION-TILE WRAP
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;
  const isPullOut = index % 2 === 0;

  // Base scale >= 1.18 guarantees 100% 9:16 portrait coverage with zero black edges
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.32], CLAMP);
  const keyframeZoom = isPullOut
    ? enterWarp * 0.72 - exitWarp * 0.14
    : (1 - enterSpring) * 0.46 + exitWarp * 0.68;
  const beatZoom =
    repulsorBlast * 0.14 +
    Math.sin(pulse * Math.PI * 2.5) * repulsorBlast * 0.06;
  const totalScale = Math.max(1.16, baseScale + keyframeZoom + beatZoom);

  // Wrap-Around Whip Slide & Supersonic Flight Banking
  const wrapSlideX = (enterWarp * 680 - exitWarp * 720) * dir;
  const wrapSlideY = (enterWarp * -290 + exitWarp * 320) * dir;

  // Impact Shake on Repulsor Blast & Cut Transitions
  const shakeAmp = repulsorBlast * 34 + thrusterSurge * 24 + pulse * 7;
  const shakeX =
    Math.sin(g * 3.6) * shakeAmp +
    (random(`imx-${g}`) - 0.5) * repulsorBlast * 28;
  const shakeY =
    Math.cos(g * 3.0) * shakeAmp +
    (random(`imy-${g}`) - 0.5) * repulsorBlast * 24;

  const camX = wrapSlideX + shakeX;
  const camY = wrapSlideY + shakeY;

  const bankRot =
    (enterWarp * 14 - exitWarp * 16) * dir +
    Math.sin(g * 0.24) * 1.8 +
    (random(`imr-${g}`) - 0.5) * repulsorBlast * 6;

  // ================================================
  // 04. NANOTECH HEX-PLATE WRAP SHUTTER TRANSITION
  // ================================================
  // 6 Interlocking Armor Faceplate Louvers that wrap and lock in from alternating sides
  const armorPlates = [0, 1, 2, 3, 4, 5].map((pIdx) => {
    const distFromCenter = Math.abs(pIdx - 2.5);
    const delay = distFromCenter * 1.3;
    const pEnter =
      index === 0
        ? 1
        : interpolate(frame, [delay, delay + 5.2], [0, 1], CLAMP);
    const pEase = 1 - Math.pow(1 - pEnter, 3);

    const pExit = Math.pow(
      interpolate(
        frame,
        [duration + distFromCenter * 1.1, duration + OVERLAP_FRAMES],
        [0, 1],
        CLAMP
      ),
      2.4
    );

    const alt = pIdx % 2 === 0 ? 1 : -1;
    // Wrap-slide displacement + mechanical HUD recoil on beat
    const wrapOffsetX =
      (1 - pEase) * 115 * alt +
      pExit * 120 * -alt +
      (repulsorBlast > 0.45 ? (pIdx - 2.5) * repulsorBlast * 12 * alt : 0);

    return {
      top: pIdx * (100 / 6),
      bottom: 100 - (pIdx + 1) * (100 / 6),
      wrapOffsetX,
      opacity: interpolate(pEase, [0, 0.15, 1], [0, 1, 1], CLAMP),
    };
  });

  // ================================================
  // 05. BLACK & WHITE IMPACT FRAMES + METALLIC CC GRADE
  // ================================================
  // Triggers high-contrast Black & White impact frame on cut start or peak repulsor beat
  const isBWImpactFrame =
    (frame >= 1 && frame <= 3) || (repulsorBlast > 0.68 && g % 2 === 0);

  const ccContrast = isBWImpactFrame ? 2.45 : 1.4 + repulsorBlast * 0.3;
  const ccSat = isBWImpactFrame ? 0 : 1.24 + pulse * 0.34;
  const ccBright = isBWImpactFrame
    ? 1.12
    : 0.96 + repulsorBlast * 0.26 + thrusterSurge * 0.22;

  const starkFilter = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  // Directional Blur & RGB Chromatic Aberration Shift
  const blurPower = Math.min(1, repulsorBlast * 0.92 + thrusterSurge * 0.95);
  const rgbShift = repulsorBlast * 32 + thrusterSurge * 38 + subThruster * 12;

  // ================================================
  // 06. JARVIS HELMET HUD & WELDING SPARKS MATH (NO EYES)
  // ================================================
  // A) Left & Right Vertical Helmet Pitch Ladder Ticks (Scrolling Flight Alt/Vel Scales)
  const pitchTicks = [-3, -2, -1, 0, 1, 2, 3].map((tIdx) => {
    const scrollY = ((g * 14 + tIdx * 110) % 770) - 385;
    const yPos = 960 + scrollY;
    const isMajor = tIdx % 2 === 0;
    return {
      yPos,
      len: isMajor ? 52 + repulsorBlast * 25 : 26,
      op:
        interpolate(Math.abs(scrollY), [0, 260, 385], [0.85, 0.5, 0], CLAMP) *
        (0.55 + pulse * 0.45),
    };
  });

  // B) Bottom Helmet Visor Telemetry Waveform Equalizer Bars (12 angular bars)
  const visorBars = Array.from({ length: 12 }, (_, i) => {
    const bx = 310 + i * 42;
    const waveH =
      18 +
      Math.abs(Math.sin(g * 0.45 + i * 0.9)) * 45 +
      repulsorBlast * 65 * ((i % 3) * 0.4 + 0.4);
    return {
      bx,
      waveH,
      col:
        i % 3 === 0
          ? JARVIS_CYAN
          : i % 3 === 1
          ? TITANIUM_GOLD
          : ARC_CORE_WHITE,
    };
  });

  // C) Hot-Rod Welding & Thruster Sparks (15 deterministic angular sparks)
  const sparks = Array.from({ length: 15 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const angle = -1.1 + (random(`spa-${seed}`) - 0.5) * 0.9;
    const speed = 22 + (i % 5) * 10 + thrusterSurge * 36;
    const travel = (g * speed + random(`spt-${seed}`) * 2000) % 2150;

    const x =
      ((random(`spx-${seed}`) * 1080 +
        Math.cos(angle) * travel * 0.5 +
        camX * 0.2) %
        1160) -
      40;
    const y = 1980 - (travel % 2100);
    const len = 16 + (i % 4) * 10 + repulsorBlast * 24;
    const col =
      i % 3 === 0
        ? TITANIUM_GOLD
        : i % 3 === 1
        ? ARC_CORE_WHITE
        : JARVIS_CYAN;

    return { x, y, len, col, rot: (angle * 180) / Math.PI + 65 };
  });

  // D) Optical Repulsor Flare Wipe Progress
  const flareWipeProg =
    frame < OVERLAP_FRAMES + 4
      ? interpolate(frame, [0, OVERLAP_FRAMES + 4], [0, 1], CLAMP)
      : exitCut > 0
      ? exitCut
      : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: STARK_OBSIDIAN,
        overflow: "hidden",
        opacity: index === 0 ? 1 : enterCut,
      }}
    >
      {/* ============================================
          LAYER 01: MOTION-TILE WRAP ECHO BACKDROP (9:16 BLEED GUARANTEE)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `translate3d(${-camX * 0.35}px, ${-camY * 0.35}px, 0) scale(${
            totalScale * 1.24
          }) rotate(${-bankRot * 0.5}deg)`,
          opacity: 0.45,
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
          LAYER 02: HERO 9:16 PORTRAIT + NANOTECH WRAP PLATES + CAMERA RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${bankRot}deg) scale(${totalScale})`,
        }}
      >
        {armorPlates.map((pl, pIdx) => (
          <AbsoluteFill
            key={`armor-plate-${pIdx}`}
            style={{
              clipPath: `inset(${Math.max(0, pl.top - 0.35)}% 0% ${Math.max(
                0,
                pl.bottom - 0.35
              )}% 0%)`,
              transform: `translate3d(${pl.wrapOffsetX}%, 0, 0)`,
              opacity: pl.opacity,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: starkFilter,
              }}
            />
          </AbsoluteFill>
        ))}

        {/* Metallic Specular Micro-Contrast Pass */}
        <AbsoluteFill
          style={{
            mixBlendMode: "overlay",
            opacity: isBWImpactFrame ? 0.85 : 0.48 + pulse * 0.22,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(1) contrast(2.6) brightness(0.9)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 03: DIRECTIONAL BLUR & RGB CHROMATIC ABERRATION
        ============================================ */}
        {blurPower > 0.06 && (
          <>
            {/* Pass 1: Directional Wrap Blur + Hot-Rod Red / Gold Chromatic Split */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.45,
                transform: `translate3d(${-rgbShift * dir}px, ${
                  rgbShift * 0.22
                }px, 0) scaleX(${1 + blurPower * 0.055})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(-35deg) saturate(5.5) contrast(1.55)",
                }}
              />
            </AbsoluteFill>

            {/* Pass 2: Directional Wrap Blur + JARVIS Cyan Chromatic Split */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.42,
                transform: `translate3d(${rgbShift * dir}px, ${
                  -rgbShift * 0.22
                }px, 0) scaleX(${1 + blurPower * 0.055})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(155deg) saturate(5.5) contrast(1.55)",
                }}
              />
            </AbsoluteFill>

            {/* Pass 3: Keyframe Zoom-Out Velocity Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "lighten",
                opacity: blurPower * 0.32,
                transform: `scale(${1 + blurPower * 0.13})`,
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
          LAYER 04: JARVIS HELMET VISOR HUD & OPTICAL FLARE WIPE (SVG - NO EYES)
          - Top & Bottom Curved/Angular Helmet Visor Perimeter Framing
          - Left & Right Flight Pitch/Altitude Ladder Scales
          - Triangular Mark-85 Unibeam Chest-Core Vector Lock (Zero Circles/Eyes)
          - Anamorphic Optical Repulsor Flare Wipe Across Screen
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
            transform: `translate3d(${camX * 0.15}px, ${camY * 0.15}px, 0)`,
          }}
        >
          {/* 1. HELMET INTERNAL VISOR PERIMETER CONTOUR LINES */}
          <g
            fill="none"
            opacity={0.78}
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.97 + repulsorBlast * 0.04})`,
            }}
          >
            {/* Top Visor Brow Ridge HUD Line */}
            <polyline
              points="70,360 220,250 420,285 540,315 660,285 860,250 1010,360"
              stroke={JARVIS_CYAN}
              strokeWidth={4 + repulsorBlast * 4}
            />
            <polyline
              points="110,385 235,280 430,310 540,338 650,310 845,280 970,385"
              stroke={TITANIUM_GOLD}
              strokeWidth="2"
              strokeDasharray="40 20"
              strokeDashoffset={-g * 8}
            />

            {/* Bottom Chin-Guard Helmet HUD Contour */}
            <polyline
              points="70,1560 210,1685 410,1650 540,1695 670,1650 870,1685 1010,1560"
              stroke={JARVIS_CYAN}
              strokeWidth={4 + repulsorBlast * 4}
            />
            <polyline
              points="110,1535 230,1650 420,1620 540,1660 660,1620 850,1650 970,1535"
              stroke={accent}
              strokeWidth="3"
            />
          </g>

          {/* 2. LEFT & RIGHT FLIGHT PITCH / ALTITUDE LADDER SCALES */}
          <g>
            {pitchTicks.map((tk, i) => (
              <g key={`pitch-tk-${i}`} opacity={tk.op}>
                {/* Left Visor Pitch Rung */}
                <polyline
                  points={`85,${tk.yPos} ${85 + tk.len},${tk.yPos} ${
                    85 + tk.len + 12
                  },${tk.yPos + 14}`}
                  fill="none"
                  stroke={i % 2 === 0 ? JARVIS_CYAN : TITANIUM_GOLD}
                  strokeWidth="3.5"
                />
                {/* Right Visor Pitch Rung */}
                <polyline
                  points={`995,${tk.yPos} ${995 - tk.len},${tk.yPos} ${
                    995 - tk.len - 12
                  },${tk.yPos + 14}`}
                  fill="none"
                  stroke={i % 2 === 0 ? JARVIS_CYAN : TITANIUM_GOLD}
                  strokeWidth="3.5"
                />
              </g>
            ))}
          </g>

          {/* 3. BOTTOM VISOR EQUALIZER TELEMETRY SPECTRUM */}
          <g opacity={0.75}>
            {visorBars.map((vb, i) => (
              <rect
                key={`visor-bar-${i}`}
                x={vb.bx}
                y={1610 - vb.waveH}
                width="18"
                height={vb.waveH}
                fill={vb.col}
              />
            ))}
          </g>

          {/* 4. ANGULAR NANOTECH TARGETING LOCK & CHEST-ARC TRIANGLE (NO CIRCLES/EYES) */}
          <g
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.92 + repulsorBlast * 0.16}) rotate(${
                bankRot * 0.25
              }deg)`,
              opacity: 0.35 + repulsorBlast * 0.6,
            }}
          >
            {/* Outer Chamfered Hexagonal Armor Lock */}
            <polygon
              points="340,460 740,460 940,960 740,1460 340,1460 140,960"
              fill="none"
              stroke={JARVIS_CYAN}
              strokeWidth={4 + repulsorBlast * 6}
              strokeDasharray="180 240"
              strokeDashoffset={-g * 22}
            />
            {/* Mark-85 Triangular Chest Arc-Reactor Vector Core */}
            <polygon
              points="360,780 720,780 540,1160"
              fill="none"
              stroke={TITANIUM_GOLD}
              strokeWidth={6 + repulsorBlast * 10}
              strokeDasharray="140 100"
              strokeDashoffset={g * 18}
            />
            <polygon
              points="410,815 670,815 540,1090"
              fill="none"
              stroke={ARC_CORE_WHITE}
              strokeWidth={3 + repulsorBlast * 4}
            />
          </g>

          {/* 5. OPTICAL REPULSOR FLARE WIPE TRANSITION */}
          {(flareWipeProg > 0.01 || repulsorBlast > 0.44) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 2 === 0 ? -22 : 22}deg) scale(${
                  1.06 + repulsorBlast * 0.22
                })`,
              }}
            >
              {(() => {
                const p = flareWipeProg > 0 ? flareWipeProg : repulsorBlast;
                const flareX = interpolate(p, [0, 1], [-1500, 1500], CLAMP);
                const op = interpolate(
                  p,
                  [0, 0.15, 0.85, 1],
                  [0, 1, 0.95, 0],
                  CLAMP
                );

                return (
                  <g
                    transform={`translate(${flareX}, 960)`}
                    opacity={op}
                  >
                    {/* Wide Horizontal Anamorphic Cyan Repulsor Wing */}
                    <polygon
                      points="-1650,0 0,-70 1650,0 0,70"
                      fill={JARVIS_CYAN}
                      opacity={0.75}
                    />
                    {/* Mid Titanium Gold & Hot-Rod Red Optical Streak */}
                    <polygon
                      points="-1400,0 0,-34 1400,0 0,34"
                      fill={TITANIUM_GOLD}
                      opacity={0.92}
                    />
                    {/* Razor White-Hot Unibeam Core */}
                    <polygon
                      points="-1200,0 0,-11 1200,0 0,11"
                      fill={ARC_CORE_WHITE}
                    />
                    {/* Vertical & Diagonal Starburst Prisms */}
                    <polygon
                      points="0,-720 -26,0 0,720 26,0"
                      fill={accent}
                      opacity={0.85}
                    />
                    <polygon
                      points="0,-520 -9,0 0,520 9,0"
                      fill={ARC_CORE_WHITE}
                    />
                    <polygon
                      points="-260,-260 0,-20 260,260 0,20"
                      fill={JARVIS_CYAN}
                      opacity={0.85}
                    />
                    <polygon
                      points="260,-260 0,-20 -260,260 0,20"
                      fill={TITANIUM_GOLD}
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
          LAYER 05: WELDING & THRUSTER SPARKS OVERLAY
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {sparks.map((sp, i) => (
          <div
            key={`stark-spark-${i}`}
            style={{
              position: "absolute",
              left: sp.x,
              top: sp.y,
              width: sp.len,
              height: 4,
              backgroundColor: sp.col,
              clipPath: "polygon(0% 50%, 30% 0%, 100% 50%, 30% 100%)",
              transform: `rotate(${sp.rot}deg)`,
              opacity: 0.7 + pulse * 0.3,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: OPTICAL FLARES, SCANLINES, VIGNETTE & B&W FLASH
      ============================================ */}
      {/* Hot-Rod Red, Titanium Gold & JARVIS Cyan Atmosphere */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${accent}52 0%, transparent 40%, transparent 60%, ${JARVIS_CYAN}48 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.46,
          pointerEvents: "none",
        }}
      />

      {/* Deep Helmet Visor Edge Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 36%, rgba(3,5,9,0.58) 76%, rgba(3,5,9,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle JARVIS Holographic Scanline Grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.05) 0px, rgba(0, 240, 255, 0.05) 2px, transparent 2px, transparent 6px)",
          pointerEvents: "none",
        }}
      />

      {/* Repulsor Optical Lens Flare & B&W Impact Strobe */}
      <AbsoluteFill
        style={{
          backgroundColor: ARC_CORE_WHITE,
          mixBlendMode: "overlay",
          opacity: thrusterSurge * 0.72 + repulsorBlast * 0.32,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING MARK-85 ARMOR BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + repulsorBlast * 14}px solid ${accent}`,
          opacity: 0.45 + repulsorBlast * 0.55,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `2px solid ${TITANIUM_GOLD}`,
          opacity: 0.4 + subThruster * 0.55,
          transform: `scale(${0.978 - pulse * 0.008})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: SAFE ZONE STARK BRAND WATERMARK & TELEMETRY
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
        {/* TOP-LEFT STARK INDUSTRIES / MARK-85 WATERMARK (ZERO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "9px 26px",
            backgroundColor: "rgba(3, 5, 9, 0.88)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${TITANIUM_GOLD}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterWarp * -60}px) scale(${
              1 + repulsorBlast * 0.06
            })`,
          }}
        >
          {/* Triangular Arc Core & Armor Power Bars */}
          <div style={{ display: "flex", gap: 4, transform: "skewX(-22deg)" }}>
            <div
              style={{
                width: 4,
                height: 22,
                backgroundColor: accent,
                transform: `scaleY(${0.75 + pulse * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 22,
                backgroundColor: TITANIUM_GOLD,
                transform: `scaleY(${0.75 + hudScanTick * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 22,
                backgroundColor: JARVIS_CYAN,
                transform: `scaleY(${0.75 + subThruster * 0.45})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: ARC_CORE_WHITE,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT JARVIS TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "8px 20px",
            backgroundColor: "rgba(3, 5, 9, 0.84)",
            borderLeft: `6px solid ${JARVIS_CYAN}`,
            borderTop: `2px solid ${TITANIUM_GOLD}`,
            transform: `translateX(${enterWarp * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 27,
              fontWeight: 700,
              color: TITANIUM_GOLD,
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
              fontSize: 18,
              fontWeight: 700,
              color: JARVIS_CYAN,
              letterSpacing: 3,
              opacity: 0.92,
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

export const IronManMark85HUD: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#030509"
    overlap={OVERLAP_FRAMES}
    Scene={Scene}
  />
);