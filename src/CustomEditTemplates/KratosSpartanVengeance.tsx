import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, SAFE, ProgressBar } from "../shared";
import {
  EditProps,
  EditSceneProps,
  EditVideo,
  beatPulse,
} from "../editShared";
import { loadFont } from "@remotion/google-fonts/Cinzel";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

const OBSIDIAN = "#040202";
const BLOOD_RED = "#D90416";
const SABER_ORANGE = "#FF5500";
const SABER_CORE = "#FFF5EB";
const ASH_GHOST = "#D8CFCB";

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

  const accent = brand.color || BLOOD_RED;
  const brandName = brand.name || "GHOST OF SPARTA";

  // ================================================
  // 01. BEAT & EXPOSURE SYNCHRONIZATION MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 2.8);
  const subBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.8);

  // ================================================
  // 02. TWIXTOR / VELOCITY SPEED-RAMP ENGINE (S-CURVE)
  // ================================================
  // Normalizes cut progress and applies an S-curve:
  // Violent entry velocity -> Slow-motion suspended mid-cut -> Violent exit velocity
  const u = Math.min(1, Math.max(0, frame / duration));
  const twixtorTime =
    u < 0.22
      ? interpolate(u, [0, 0.22], [0, 0.44], CLAMP)
      : u < 0.78
      ? interpolate(u, [0.22, 0.78], [0.44, 0.56], CLAMP)
      : interpolate(u, [0.78, 1], [0.56, 1], CLAMP);

  const enterRamp = Math.pow(
    interpolate(frame, [0, 8], [1, 0], CLAMP),
    2.6
  );
  const exitRamp = Math.pow(
    interpolate(frame, [Math.max(0, duration - 8), duration], [0, 1], CLAMP),
    2.6
  );
  const velocitySpike = Math.min(1, enterRamp + exitRamp);

  // ================================================
  // 03. NO-SHATTER VELOCITY TRANSITIONS (4 VARIATIONS)
  // ================================================
  // Instead of shattering, uses Whip-Zooms, Accordion Mirror-Tiles, & Blade-Scissor Wipes
  const transMode = index % 4;
  const dir = index % 2 === 0 ? 1 : -1;

  // Base scale >= 1.18 so extreme shakes/rotations NEVER expose black bars on 9:16
  const slowDrift = interpolate(twixtorTime, [0, 1], [1.18, 1.34], CLAMP);
  const zoomWhip =
    transMode === 0
      ? enterRamp * 0.75 + exitRamp * 0.85
      : enterRamp * 0.35 + exitRamp * 0.4;
  const beatPump = impact * 0.13 + pulse * 0.04;
  const totalScale = slowDrift + zoomWhip + beatPump;

  // Directional Whip-Slide & Rotational Spin
  const whipX =
    transMode === 1
      ? (enterRamp * 820 - exitRamp * 880) * dir
      : (enterRamp * 280 - exitRamp * 320) * dir;
  const whipY =
    transMode === 2
      ? (enterRamp * -650 + exitRamp * 680) * dir
      : (enterRamp * -140 + exitRamp * 160) * dir;

  // Heavy Impact Damped Oscillation Shake
  const shakeEnv = impact * 34 + velocitySpike * 22;
  const shakeX =
    Math.sin(g * 2.9) * shakeEnv + (random(`vx-${g}`) - 0.5) * impact * 28;
  const shakeY =
    Math.cos(g * 2.4) * shakeEnv + (random(`vy-${g}`) - 0.5) * impact * 24;

  const camX = whipX + shakeX;
  const camY = whipY + shakeY;

  const spinWhip =
    transMode === 3
      ? (enterRamp * 38 - exitRamp * 42) * dir
      : (enterRamp * 11 - exitRamp * 14) * dir;
  const camRot =
    spinWhip +
    Math.sin(g * 0.25) * 1.8 +
    (random(`vr-${g}`) - 0.5) * impact * 6.5;

  // Scissor-Cleave Clip Mask (Mode 2) & Portal Iris (Mode 3)
  const scissorGap = interpolate(velocitySpike, [0, 1], [0, 48], CLAMP);
  const scissorMask = `polygon(
    0% ${scissorGap}%,
    100% 0%,
    100% ${100 - scissorGap}%,
    0% 100%
  )`;

  // ================================================
  // 04. CC RADIAL BLUR & FAST BOX BLUR (MULTI-PASS ECHO)
  // ================================================
  // Remotion rule: avoid heavy CSS blur(). We simulate After Effects CC Radial Zoom Blur
  // and Fast Directional Box Blur by stacking 4 high-speed offset/scaled echo passes!
  const blurPower = Math.min(1, impact * 0.95 + velocitySpike * 0.9);

  // ================================================
  // 05. GRITTY LUT COLOR GRADING & EXPOSURE HALOS
  // ================================================
  // Bleach-bypass high contrast, crushed obsidian shadows, blown-out highlights on beat
  const exposure = 0.94 + impact * 0.42 + velocitySpike * 0.3;
  const contrast = 1.38 + impact * 0.35;
  const saturation = 0.68 + pulse * 0.35;
  const grittyLUT = `contrast(${contrast}) saturate(${saturation}) brightness(${exposure}) sepia(0.18) hue-rotate(-12deg)`;

  // ================================================
  // 06. SABER ENERGY ARCS & EMBER VORTEX MATH
  // ================================================
  const saberDash = (g * 38) % 1400;
  const saberGlow = 0.55 + impact * 0.45;

  const embers = Array.from({ length: 12 }, (_, i) => {
    const seed = i * 97 + index * 37;
    const x =
      ((random(`ex-${seed}`) * 1080 +
        Math.sin(g * 0.06 + i) * 140 +
        camX * 0.3) %
        1180) -
      50;
    const speed = 14 + (i % 4) * 6 + velocitySpike * 25;
    const y = 1980 - ((g * speed + random(`ey-${seed}`) * 1920) % 2100);
    const w = 5 + (i % 3) * 5 + pulse * 6;
    const col = i % 2 === 0 ? accent : i % 3 === 0 ? SABER_ORANGE : SABER_CORE;
    return { x, y, w, col, rot: g * 6 * (i % 2 === 0 ? 1 : -1) };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: OBSIDIAN, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: MOTION-TILE MIRROR BACKDROP (9:16 BLEED GUARANTEE)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.22}) rotate(${-camRot * 0.6}deg)`,
          opacity: 0.45,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.7) saturate(0.4) brightness(0.4)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + TWIXTOR CAMERA RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
          clipPath: transMode === 2 && velocitySpike > 0.02 ? scissorMask : undefined,
        }}
      >
        {/* Base Gritty LUT Image */}
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: grittyLUT,
          }}
        />

        {/* ============================================
            LAYER 03: FAST DIRECTIONAL BOX BLUR (3 HIGH-SPEED STREAK PASSES)
        ============================================ */}
        {blurPower > 0.08 && (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.36,
                transform: `translate3d(${blurPower * 34 * dir}px, ${blurPower * -14}px, 0) scaleX(${1 + blurPower * 0.04})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: grittyLUT,
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.28,
                transform: `translate3d(${blurPower * -34 * dir}px, ${blurPower * 14}px, 0) scaleX(${1 + blurPower * 0.04})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: grittyLUT,
                }}
              />
            </AbsoluteFill>
          </>
        )}

        {/* ============================================
            LAYER 04: CC RADIAL ZOOM BLUR (3 CONCENTRIC SPIN-ZOOM PASSES)
        ============================================ */}
        {blurPower > 0.05 && (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.42,
                transform: `scale(${1 + blurPower * 0.065}) rotate(${blurPower * 1.8}deg)`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.5) sepia(1) hue-rotate(-50deg) saturate(4.5)",
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurPower * 0.3,
                transform: `scale(${1 + blurPower * 0.13}) rotate(${-blurPower * 2.8}deg)`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.6) brightness(1.2)",
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                mixBlendMode: "overlay",
                opacity: blurPower * 0.24,
                transform: `scale(${1 + blurPower * 0.21}) rotate(${blurPower * 3.6}deg)`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.8) saturate(2)",
                }}
              />
            </AbsoluteFill>
          </>
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: TWIXTOR FRAME-ECHO GHOSTING (SLOMO TRAIL)
      ============================================ */}
      <AbsoluteFill
        style={{
          mixBlendMode: "lighten",
          opacity: (0.18 + subBeat * 0.28) * (1 - velocitySpike * 0.5),
          transform: `translate3d(${-camX * 0.35}px, ${-camY * 0.35}px, 0) scale(${totalScale * 1.04}) rotate(${-camRot * 0.3}deg)`,
          pointerEvents: "none",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.5) saturate(0.3) brightness(1.1)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: VIDEO COPILOT SABER EFFECT (BLADES & RAGE EYES)
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
            transform: `translate3d(${camX * 0.25}px, ${camY * 0.25}px, 0) scale(${1 + impact * 0.08})`,
          }}
        >
          {/* SABER BLADE ARC 1: Outer Aura -> Mid Flame -> White-Hot Core */}
          <g opacity={saberGlow}>
            <path
              d="M -80 1580 Q 520 920 1160 340"
              fill="none"
              stroke={accent}
              strokeWidth={46 + impact * 35}
              strokeLinecap="round"
              strokeDasharray="650 850"
              strokeDashoffset={-saberDash}
              opacity={0.38}
            />
            <path
              d="M -80 1580 Q 520 920 1160 340"
              fill="none"
              stroke={SABER_ORANGE}
              strokeWidth={18 + impact * 16}
              strokeLinecap="round"
              strokeDasharray="650 850"
              strokeDashoffset={-saberDash}
              opacity={0.78}
            />
            <path
              d="M -80 1580 Q 520 920 1160 340"
              fill="none"
              stroke={SABER_CORE}
              strokeWidth={5 + impact * 6}
              strokeLinecap="round"
              strokeDasharray="650 850"
              strokeDashoffset={-saberDash}
            />
          </g>

          {/* SABER BLADE ARC 2 (CROSSING CHAOS BLADE) */}
          <g opacity={saberGlow * 0.9}>
            <path
              d="M 1160 1520 Q 560 980 -80 380"
              fill="none"
              stroke={accent}
              strokeWidth={42 + impact * 32}
              strokeLinecap="round"
              strokeDasharray="580 900"
              strokeDashoffset={saberDash * 1.15}
              opacity={0.35}
            />
            <path
              d="M 1160 1520 Q 560 980 -80 380"
              fill="none"
              stroke={SABER_ORANGE}
              strokeWidth={16 + impact * 14}
              strokeLinecap="round"
              strokeDasharray="580 900"
              strokeDashoffset={saberDash * 1.15}
              opacity={0.75}
            />
            <path
              d="M 1160 1520 Q 560 980 -80 380"
              fill="none"
              stroke={SABER_CORE}
              strokeWidth={4 + impact * 5}
              strokeLinecap="round"
              strokeDasharray="580 900"
              strokeDashoffset={saberDash * 1.15}
            />
          </g>

          {/* SABER OMEGA RAGE EMBLEM (3-LAYER NEON CORE) */}
          <g
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.88 + impact * 0.28}) rotate(${camRot * 0.35}deg)`,
            }}
          >
            {/* Outer Blood Saber Haze */}
            <path
              d="M 320 1180 L 450 1180 L 470 1080 C 370 1010 340 880 395 770 C 450 660 630 660 685 770 C 740 880 710 1010 610 1080 L 630 1180 L 760 1180"
              fill="none"
              stroke={accent}
              strokeWidth={32 + impact * 28}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="480 320"
              strokeDashoffset={-g * 18}
              opacity={0.32 + impact * 0.4}
            />
            {/* Mid Molten Saber Core */}
            <path
              d="M 320 1180 L 450 1180 L 470 1080 C 370 1010 340 880 395 770 C 450 660 630 660 685 770 C 740 880 710 1010 610 1080 L 630 1180 L 760 1180"
              fill="none"
              stroke={SABER_ORANGE}
              strokeWidth={12 + impact * 10}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="480 320"
              strokeDashoffset={-g * 18}
              opacity={0.75}
            />
            {/* Inner White-Hot Filament */}
            <path
              d="M 320 1180 L 450 1180 L 470 1080 C 370 1010 340 880 395 770 C 450 660 630 660 685 770 C 740 880 710 1010 610 1080 L 630 1180 L 760 1180"
              fill="none"
              stroke={SABER_CORE}
              strokeWidth={3 + impact * 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="480 320"
              strokeDashoffset={-g * 18}
              opacity={0.95}
            />
          </g>

          {/* SPARTAN RAGE EYE-GLOW SABER FLARES (UPPER-CENTER SUBJECT ZONE) */}
          <g
            style={{
              transformOrigin: "540px 680px",
              transform: `scale(${0.7 + impact * 0.9})`,
              opacity: 0.25 + impact * 0.75,
            }}
          >
            {/* Left Eye Saber Flare */}
            <ellipse cx="465" cy="680" rx="95" ry="18" fill={accent} opacity="0.5" />
            <ellipse cx="465" cy="680" rx="55" ry="8" fill={SABER_ORANGE} opacity="0.85" />
            <ellipse cx="465" cy="680" rx="22" ry="4" fill={SABER_CORE} />
            {/* Right Eye Saber Flare */}
            <ellipse cx="615" cy="680" rx="95" ry="18" fill={accent} opacity="0.5" />
            <ellipse cx="615" cy="680" rx="55" ry="8" fill={SABER_ORANGE} opacity="0.85" />
            <ellipse cx="615" cy="680" rx="22" ry="4" fill={SABER_CORE} />
          </g>
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: RISING MOLTEN SABER SPARKS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {embers.map((em, i) => (
          <div
            key={`saber-sp-${i}`}
            style={{
              position: "absolute",
              left: em.x,
              top: em.y,
              width: em.w,
              height: em.w * 2.6,
              backgroundColor: em.col,
              borderRadius: "50%",
              transform: `rotate(${em.rot}deg)`,
              opacity: 0.55 + pulse * 0.45,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 08: FLASH & EXPOSURE HALOS + GRITTY LUT OVERLAYS
      ============================================ */}
      {/* Gritty Crushed-Black Film Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 32%, rgba(4,2,2,0.58) 72%, rgba(4,2,2,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Gritty Cinema Scanline / Film Texture */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)",
          opacity: 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Beat-Synced Exposure Halo Ring (Expanding Over-Exposure Bloom) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 46%, ${SABER_CORE} 0%, ${SABER_ORANGE}88 22%, ${accent}55 48%, transparent 72%)`,
          mixBlendMode: "screen",
          transform: `scale(${0.65 + impact * 0.95})`,
          opacity: impact * 0.52 + velocitySpike * 0.35,
          pointerEvents: "none",
        }}
      />

      {/* Edge Blood-Halo Burn on Beat */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 48%, ${accent}66 82%, ${SABER_ORANGE}99 100%)`,
          mixBlendMode: "screen",
          opacity: 0.25 + pulse * 0.55,
          pointerEvents: "none",
        }}
      />

      {/* Velocity Cut White-Out Exposure Flash */}
      <AbsoluteFill
        style={{
          backgroundColor: SABER_CORE,
          mixBlendMode: "overlay",
          opacity: velocitySpike * 0.72 + impact * 0.28,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: SABER ELECTRIC BORDER GLOW
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 14}px solid ${accent}`,
          opacity: 0.38 + impact * 0.6,
          transform: `scale(${0.988 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `${2 + impact * 4}px solid ${SABER_CORE}`,
          opacity: 0.3 + impact * 0.65,
          transform: `scale(${0.988 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 10: SAFE ZONE BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT SABER-LIT BRAND WATERMARK (NO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(4, 2, 2, 0.88)",
            borderLeft: `7px solid ${accent}`,
            borderBottom: `2px solid ${SABER_ORANGE}`,
            clipPath:
              "polygon(0 0, 96% 0, 100% 32%, 100% 100%, 4% 100%, 0 68%)",
            transform: `translateX(${enterRamp * -60}px) scale(${1 + impact * 0.06})`,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: SABER_CORE,
              border: `3px solid ${accent}`,
              transform: `rotate(45deg) scale(${0.85 + pulse * 0.55})`,
            }}
          />
          <span
            style={{
              fontFamily,
              color: SABER_CORE,
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: 5,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT VELOCITY TELEMETRY (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 20px",
            backgroundColor: "rgba(4, 2, 2, 0.82)",
            borderLeft: `6px solid ${accent}`,
            borderTop: `2px solid ${SABER_ORANGE}`,
            transform: `translateX(${enterRamp * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 25,
              fontWeight: 900,
              color: accent,
              letterSpacing: 4,
              lineHeight: 1.1,
            }}
          >
            {`CUT ${(index + 1).toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`}
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 16,
              fontWeight: 700,
              color: ASH_GHOST,
              letterSpacing: 3,
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

export const KratosSpartanVengeance: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#040202" overlap={0} Scene={Scene} />
);