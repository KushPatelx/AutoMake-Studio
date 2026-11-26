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
  weights: ["700", "900"],
  subsets: ["latin"],
});

const CURSED_ABYSS = "#050103";
const SHRINE_CRIMSON = "#DC0028";
const BLACK_FLASH_RED = "#FF002B";
const FUGA_ORANGE = "#FF5500";
const FUGA_GOLD = "#FFC800";
const YUJI_CYAN = "#00E5FF";
const BONE_WHITE = "#FFF4F4";
const INK_BLACK = "#000000";

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

  const accent = brand.color || SHRINE_CRIMSON;
  const brandName = brand.name || "KING OF CURSES";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC + DIVERGENT FIST LAG
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const impact = beatPulseAt(g, beatFrames, 3.2);
  const divergentFist = beatPulseAt(Math.max(0, g - 4), beatFrames, 2.4);
  const shrineTremor = beatPulseAt(g + 3, beatFrames, 1.8);

  // ================================================
  // 02. VELOCITY RAMP & NON-FADE TRANSITION TIMING
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const velocityFlow =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.46], CLAMP)
      : u < 0.8
        ? interpolate(u, [0.2, 0.8], [0.46, 0.54], CLAMP)
        : interpolate(u, [0.8, 1], [0.54, 1], CLAMP);

  const enterLen = Math.min(8, Math.max(1, Math.floor(duration / 2)));
  const exitLen = Math.min(7, Math.max(1, Math.floor(duration / 2)));
  const exitStart = Math.max(0, duration - exitLen);

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 270, mass: 0.42 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterCurve = index === 0 ? 0 : Math.pow(1 - enterProg, 2.4);
  const exitCurve = Math.pow(exitProg, 2.4);
  const cutSurge = Math.min(1, enterCurve + exitCurve);

  // Strictly alternate transition effects:
  // Even cuts -> Fire Arrow (Fuga) | Odd cuts -> Black Flash (Kokusen)
  const isFireArrowCut = index % 2 === 0;
  const dir = isFireArrowCut ? 1 : -1;

  // 4 Mixed Non-Fade Transitions (No opacity fades!)
  // 0: 3D Flip | 1: Diagonal Whip-Slide | 2: Zoom-Warp Pull-Out | 3: Cleave Split-Slide
  const transMode = index % 4;

  // ================================================
  // 03. CAMERA RIG + ORIGINAL SHAKE + 4 MIXED TRANSITIONS
  // ================================================
  // Base scale >= 1.18 ensures 9:16 portrait images NEVER show black bars
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.32], CLAMP);

  const modeZoom =
    transMode === 2
      ? enterCurve * 0.72 + exitCurve * 0.65
      : transMode === 0
        ? (1 - enterSpring) * 0.28 + exitCurve * 0.24
        : (1 - enterSpring) * 0.36 + exitCurve * 0.42;

  const beatZoom =
    impact * 0.14 +
    divergentFist * 0.06 +
    Math.sin(pulse * Math.PI * 2.5) * impact * 0.05;
  const totalScale = Math.max(1.16, baseScale + modeZoom + beatZoom);

  // Mode 0: 3D Perspective Flip (rotateY / slight rotateX)
  const flipY = transMode === 0 ? (enterCurve * 82 - exitCurve * 76) * dir : 0;
  const flipX = transMode === 0 ? (enterCurve * -14 + exitCurve * 14) * dir : 0;

  // Mode 1: Diagonal Whip-Slide
  const whipX =
    transMode === 1
      ? (enterCurve * 920 - exitCurve * 960) * dir
      : transMode === 2
        ? (enterCurve * 260 - exitCurve * 280) * dir
        : 0;
  const whipY =
    transMode === 1
      ? (enterCurve * -540 + exitCurve * 580) * dir
      : transMode === 2
        ? (enterCurve * -180 + exitCurve * 200) * dir
        : 0;

  // Mode 3: Cleave Diagonal Split-Slide
  const cleaveSplit = transMode === 3 ? enterCurve * 65 + exitCurve * 72 : 0;

  // Original Balanced Shake Level
  const quakePower =
    impact * 36 + divergentFist * 16 + cutSurge * 22 + pulse * 6;
  const shakeX =
    Math.sin(g * 3.7) * quakePower + (random(`skx-${g}`) - 0.5) * impact * 30;
  const shakeY =
    Math.cos(g * 3.1) * quakePower + (random(`sky-${g}`) - 0.5) * impact * 26;

  const camX = whipX + shakeX;
  const camY = whipY + shakeY;

  const camRot =
    (transMode === 1
      ? (enterCurve * 14 - exitCurve * 16) * dir
      : transMode === 2
        ? (enterCurve * -16 + exitCurve * 18) * dir
        : (enterCurve * 7 - exitCurve * 8) * dir) +
    Math.sin(g * 0.24) * 1.6 +
    (random(`skr-${g}`) - 0.5) * impact * 6;

  const skewX =
    (transMode === 1 ? (enterCurve - exitCurve) * 12 * dir : 0) +
    (!isFireArrowCut ? Math.sin(g * 4.2) * impact * 4.5 : 0);

  // ================================================
  // 04. DARK JUJUTSU CC + BEAT-DROP RGB BLUR
  // ================================================
  const ccContrast = 1.42 + impact * 0.3;
  const ccSat = 1.2 + pulse * 0.34;
  const ccBright = 0.95 + impact * 0.24 + cutSurge * 0.18;
  const cursedGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  // RGB Blur intensity driven cleanly by beat drops & transitions
  const rgbBlurPower = Math.min(
    1,
    impact * 0.95 + divergentFist * 0.45 + cutSurge * 0.75,
  );
  const rgbShift = impact * 38 + divergentFist * 22 + cutSurge * 34;

  // ================================================
  // 05. ALTERNATING TRANSITIONS: FIRE ARROW vs BLACK FLASH RIFT
  // ================================================
  const transProg =
    frame < enterLen + 3 && index > 0
      ? interpolate(frame, [0, enterLen + 3], [0, 1], CLAMP)
      : frame >= exitStart
        ? exitProg
        : 0;

  // Black Flash Spatial Rift Lightning (ONLY on Odd Cuts)
  const bfSeed = Math.floor(g / 2);
  const buildSpatialRift = (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    id: number,
  ) => {
    let pts = `${sx},${sy} `;
    for (let s = 1; s <= 7; s++) {
      const t = s / 8;
      const jx =
        sx + (ex - sx) * t + (random(`bfx-${bfSeed}-${id}-${s}`) - 0.5) * 195;
      const jy =
        sy + (ey - sy) * t + (random(`bfy-${bfSeed}-${id}-${s}`) - 0.5) * 195;
      pts += `${jx.toFixed(0)},${jy.toFixed(0)} `;
    }
    pts += `${ex},${ey}`;
    return pts;
  };

  const showBlackFlash = !isFireArrowCut && (transProg > 0.01 || impact > 0.38);
  const spatialRiftBolts = showBlackFlash
    ? [
        buildSpatialRift(80, 160, 1000, 1760, 1),
        buildSpatialRift(1000, 220, 80, 1700, 2),
        buildSpatialRift(180, 960, 920, 420, 3),
      ]
    : [];

  // Fire Arrow (Fuga) Visibility (ONLY on Even Cuts)
  const showFireArrow = isFireArrowCut && (transProg > 0.01 || impact > 0.5);

  // ================================================
  // 06. COHESIVE CURSED PARTICLES (16 CLEAN PARTICLES)
  // ================================================
  const cursedParticles = Array.from({ length: 16 }, (_, i) => {
    const seed = i * 89 + index * 37;
    const sway = Math.sin(g * 0.075 + i * 1.5) * (70 + (i % 3) * 35);
    const x = ((random(`cpx-${seed}`) * 1080 + sway + camX * 0.18) % 1160) - 40;
    const speed = 17 + (i % 5) * 9 + cutSurge * 30;
    const y = 1980 - ((g * speed + random(`cpy-${seed}`) * 1920) % 2120);
    const size = 6 + (i % 4) * 4 + pulse * 7;
    const rot = g * (5 + (i % 3) * 3) * (i % 2 === 0 ? 1 : -1);

    // Match particles to the cut's active technique for zero visual clutter
    const col = isFireArrowCut
      ? i % 3 === 0
        ? FUGA_GOLD
        : i % 2 === 0
          ? FUGA_ORANGE
          : BONE_WHITE
      : i % 3 === 0
        ? YUJI_CYAN
        : i % 2 === 0
          ? BLACK_FLASH_RED
          : BONE_WHITE;

    return { x, y, size, rot, col };
  });

  const renderHeroLayers = () => (
    <>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: cursedGrade,
        }}
      />

      {/* Crisp Dark Manga Contrast Overlay */}
      <AbsoluteFill
        style={{
          mixBlendMode: "overlay",
          opacity: 0.44 + pulse * 0.2,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(1) contrast(2.4) brightness(0.9)",
          }}
        />
      </AbsoluteFill>

      {/* BEAT-DROP RGB CHROMATIC MOTION BLUR (FAST MULTI-PASS) */}
      {rgbBlurPower > 0.06 && (
        <>
          {/* Red / Sukuna Crimson Blur Pass */}
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: rgbBlurPower * 0.46,
              transform: `translate3d(${-rgbShift * dir}px, ${
                rgbShift * 0.22
              }px, 0) scale(${1 + rgbBlurPower * 0.055})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(-55deg) saturate(5.5) contrast(1.55)",
              }}
            />
          </AbsoluteFill>

          {/* Cyan / Yuji Divergent Fist Blur Pass */}
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: rgbBlurPower * 0.42,
              transform: `translate3d(${rgbShift * dir}px, ${
                -rgbShift * 0.22
              }px, 0) scale(${1 + rgbBlurPower * 0.095})`,
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

          {/* Radial Zoom Motion Blur Ghost Pass */}
          <AbsoluteFill
            style={{
              mixBlendMode: "lighten",
              opacity: rgbBlurPower * 0.26,
              transform: `scale(${1 + rgbBlurPower * 0.14})`,
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
        backgroundColor: CURSED_ABYSS,
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED AMBIENT BACKDROP (DURING 3D FLIP / SPLIT)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.2}) rotate(${-camRot * 0.4}deg)`,
          opacity: 0.42,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.7) saturate(0.5) brightness(0.36)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + MIXED TRANSITIONS + RGB BLUR
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${flipX}deg) rotateY(${flipY}deg) rotateZ(${camRot}deg) skewX(${skewX}deg) scale(${totalScale})`,
        }}
      >
        {transMode === 3 && cleaveSplit > 0.5 ? (
          <>
            {/* Cleave Upper-Left Severed Half */}
            <AbsoluteFill
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 0% 100%)",
                transform: `translate3d(${-cleaveSplit}%, ${
                  -cleaveSplit * 0.55
                }%, 0)`,
              }}
            >
              {renderHeroLayers()}
            </AbsoluteFill>
            {/* Cleave Lower-Right Severed Half */}
            <AbsoluteFill
              style={{
                clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
                transform: `translate3d(${cleaveSplit}%, ${
                  cleaveSplit * 0.55
                }%, 0)`,
              }}
            >
              {renderHeroLayers()}
            </AbsoluteFill>
          </>
        ) : (
          renderHeroLayers()
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 03: CLEAN BLACK FLASH SPATIAL RIFT & EDGE MARKINGS (NORMAL BLEND SVG)
          (Zero 4-pointed star, zero center clutter!)
      ============================================ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
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
          {/* Minimal Sukuna Double Wrist Markings on Far Left & Right Margins */}
          <g opacity={0.65 + pulse * 0.3}>
            <g stroke={INK_BLACK} strokeWidth="12" opacity="0.85">
              <line x1="20" y1="700" x2="95" y2="745" />
              <line x1="20" y1="755" x2="95" y2="800" />
              <line x1="1060" y1="700" x2="985" y2="745" />
              <line x1="1060" y1="755" x2="985" y2="800" />
            </g>
            <g stroke={accent} strokeWidth="3.5">
              <line x1="20" y1="700" x2="95" y2="745" />
              <line x1="20" y1="755" x2="95" y2="800" />
              <line x1="1060" y1="700" x2="985" y2="745" />
              <line x1="1060" y1="755" x2="985" y2="800" />
            </g>
          </g>

          {/* BLACK FLASH (KOKUSEN) SPATIAL RIFT LIGHTNING — ODD CUTS ONLY */}
          {showBlackFlash && (
            <g
              opacity={Math.min(
                1,
                Math.sin(transProg * Math.PI) * 1.2 + impact * 1.25,
              )}
            >
              {spatialRiftBolts.map((pts, bIdx) => (
                <g key={`spatial-rift-${bIdx}`}>
                  {/* Outer Crimson Spatial Distortion Aura */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={BLACK_FLASH_RED}
                    strokeWidth={32 + impact * 24}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    opacity={0.72}
                  />
                  {/* White-Hot Crack Outline */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={BONE_WHITE}
                    strokeWidth={20 + impact * 14}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    opacity={0.9}
                  />
                  {/* Pitch-Black Spatial Rift Core */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={INK_BLACK}
                    strokeWidth={13 + impact * 10}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                </g>
              ))}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 04: FUGA (FIRE ARROW) TRANSITION — EVEN CUTS ONLY (SCREEN BLEND SVG)
      ============================================ */}
      {showFireArrow && (
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
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 4 === 0 ? -34 : 34}deg) scale(${
                  1.04 + impact * 0.18
                })`,
              }}
            >
              {(() => {
                const p = transProg > 0 ? transProg : impact;
                const arrowX = interpolate(p, [0, 1], [-1450, 1550], CLAMP);
                const flameSpread = interpolate(
                  p,
                  [0, 0.45, 1],
                  [70, 270 + impact * 110, 90],
                  CLAMP,
                );
                const op = interpolate(
                  p,
                  [0, 0.12, 0.86, 1],
                  [0, 1, 0.95, 0],
                  CLAMP,
                );

                return (
                  <g transform={`translate(${arrowX}, 960)`} opacity={op}>
                    {/* Outer Divine Flame Conflagration Cone */}
                    <polygon
                      points={`-1550,0 -240,${-flameSpread * 1.4} 980,0 -240,${
                        flameSpread * 1.4
                      }`}
                      fill={SHRINE_CRIMSON}
                      opacity={0.7}
                    />
                    {/* Mid Fuga Molten Orange Flame Wake */}
                    <polygon
                      points={`-1350,0 -170,${-flameSpread * 0.82} 1060,0 -170,${
                        flameSpread * 0.82
                      }`}
                      fill={FUGA_ORANGE}
                      opacity={0.92}
                    />
                    {/* Incandescent Golden Arrow Shaft */}
                    <polygon
                      points="-1100,-22 880,-16 1180,0 880,16 -1100,22"
                      fill={FUGA_GOLD}
                    />
                    {/* White-Hot Core Filament */}
                    <polygon
                      points="-950,-7 860,-7 1220,0 860,7 -950,7"
                      fill={BONE_WHITE}
                    />
                    {/* Blazing Flame Arrowhead Fins */}
                    <polygon
                      points="760,0 640,-130 1240,0 640,130"
                      fill={FUGA_GOLD}
                      opacity={0.9}
                    />
                    <polygon
                      points="860,0 740,-70 1220,0 740,70"
                      fill={BONE_WHITE}
                    />
                    {/* Fletching Flame Feathers */}
                    <polygon
                      points="-920,0 -1160,-110 -780,-16 -1160,110"
                      fill={FUGA_ORANGE}
                    />
                  </g>
                );
              })()}
            </g>
          </svg>
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 05: CLEAN CURSED PARTICLES (MATCHED TO ACTIVE CUT)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {cursedParticles.map((pt, i) => (
          <div
            key={`jjk-pt-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.size,
              height: pt.size * 2.3,
              backgroundColor: pt.col,
              clipPath: isFireArrowCut
                ? "polygon(50% 0%, 100% 42%, 50% 100%, 0% 42%)"
                : "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              transform: `rotate(${pt.rot}deg)`,
              opacity: 0.68 + pulse * 0.32,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: ATMOSPHERE, VIGNETTE & BEAT FLASH
      ============================================ */}
      <AbsoluteFill
        style={{
          background: isFireArrowCut
            ? `linear-gradient(0deg, ${FUGA_ORANGE}55 0%, ${SHRINE_CRIMSON}28 30%, transparent 60%)`
            : `linear-gradient(145deg, ${accent}48 0%, transparent 42%, transparent 62%, ${YUJI_CYAN}38 100%)`,
          mixBlendMode: "screen",
          opacity: 0.42 + pulse * 0.42,
          pointerEvents: "none",
        }}
      />

      {/* Deep Domain Abyss Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 38%, rgba(5,1,3,0.58) 76%, rgba(5,1,3,0.94) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Clean Beat & Cut Impact Flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${BONE_WHITE} 0%, ${
            isFireArrowCut ? FUGA_GOLD : BLACK_FLASH_RED
          }88 35%, transparent 72%)`,
          mixBlendMode: "overlay",
          opacity: cutSurge * 0.55 + impact * 0.3,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING CURSED SHRINE BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 12}px solid ${accent}`,
          opacity: 0.45 + impact * 0.55,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `2px solid ${isFireArrowCut ? FUGA_GOLD : YUJI_CYAN}`,
          opacity: 0.38 + shrineTremor * 0.5,
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
        {/* TOP-LEFT CURSED SHRINE BRAND WATERMARK */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(5, 1, 3, 0.9)",
            borderLeft: `8px solid ${accent}`,
            borderRight: `3px solid ${isFireArrowCut ? FUGA_GOLD : YUJI_CYAN}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterCurve * -45}px) scale(${
              1 + impact * 0.06
            })`,
          }}
        >
          <div style={{ display: "flex", gap: 4, transform: "skewX(-24deg)" }}>
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
                backgroundColor: FUGA_GOLD,
                transform: `scaleY(${0.75 + impact * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 22,
                backgroundColor: YUJI_CYAN,
                transform: `scaleY(${0.75 + divergentFist * 0.45})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: BONE_WHITE,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT CURSED ENERGY TELEMETRY HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(5, 1, 3, 0.86)",
            borderLeft: `6px solid ${isFireArrowCut ? FUGA_ORANGE : accent}`,
            borderTop: `2px solid ${isFireArrowCut ? FUGA_GOLD : YUJI_CYAN}`,
            transform: `translateX(${enterCurve * -40}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 25,
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
              fontSize: 15,
              fontWeight: 700,
              color: BONE_WHITE,
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

export const SukunaMalevolentShrine: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#050103" overlap={0} Scene={Scene} />
);
