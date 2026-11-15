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
import { loadFont } from "@remotion/google-fonts/Orbitron";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

const CYBER_DARK = "#02060D";
const ANDROID_CYAN = "#00F0FF";
const VIKING_ELECTRIC = "#3B82F6";
const THERMAL_MAGENTA = "#FF0055";
const THERMAL_GOLD = "#FFE600";
const ICE_WHITE = "#F0F8FF";

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

  const accent = brand.color || ANDROID_CYAN;
  const brandName = brand.name || "CYBORG 9";

  // ================================================
  // 01. CYBORG BEAT & SUB-HARMONIC SYNCHRONIZATION
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 2.7);
  const subBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.8);
  const glitchTick = beatPulse(g * 2, bpm, 1.4);

  // ================================================
  // 02. VELOCITY SPEED-RAMP & TWIXTOR FLOW (S-CURVE)
  // ================================================
  // Hyper-fast cyber entry -> Zero-gravity slow-mo mid-cut -> Warp-speed exit
  const u = Math.min(1, Math.max(0, frame / duration));
  const velocityCurve =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.45], CLAMP)
      : u < 0.8
      ? interpolate(u, [0.2, 0.8], [0.45, 0.55], CLAMP)
      : interpolate(u, [0.8, 1], [0.55, 1], CLAMP);

  const enterWhip = Math.pow(interpolate(frame, [0, 7], [1, 0], CLAMP), 2.8);
  const exitWhip = Math.pow(
    interpolate(frame, [Math.max(0, duration - 7), duration], [0, 1], CLAMP),
    2.8
  );
  const speedSpike = Math.min(1, enterWhip + exitWhip);

  // ================================================
  // 03. SMOOTH CYBER-VELOCITY CAMERA & 4-MODE TRANSITIONS
  // ================================================
  const transMode = index % 4;
  const dir = index % 2 === 0 ? 1 : -1;

  // Always >= 1.18 scale so 9:16 portrait stays 100% full-bleed during shakes
  const baseScale = interpolate(velocityCurve, [0, 1], [1.18, 1.32], CLAMP);
  const warpZoom =
    transMode === 0
      ? enterWhip * 0.72 + exitWhip * 0.82
      : enterWhip * 0.32 + exitWhip * 0.38;
  const beatZoom = impact * 0.12 + pulse * 0.04;
  const totalScale = baseScale + warpZoom + beatZoom;

  const whipX =
    transMode === 1
      ? (enterWhip * 850 - exitWhip * 900) * dir
      : (enterWhip * 260 - exitWhip * 300) * dir;
  const whipY =
    transMode === 2
      ? (enterWhip * -680 + exitWhip * 720) * dir
      : (enterWhip * -120 + exitWhip * 140) * dir;

  // High-frequency mechanical cyborg tremor on beat impact
  const tremor = impact * 30 + speedSpike * 20;
  const shakeX =
    Math.sin(g * 3.1) * tremor + (random(`hx-${g}`) - 0.5) * impact * 26;
  const shakeY =
    Math.cos(g * 2.6) * tremor + (random(`hy-${g}`) - 0.5) * impact * 22;

  const camX = whipX + shakeX;
  const camY = whipY + shakeY;

  const camRot =
    (transMode === 3
      ? (enterWhip * 34 - exitWhip * 38) * dir
      : (enterWhip * 9 - exitWhip * 12) * dir) +
    Math.sin(g * 0.22) * 1.6 +
    (random(`hr-${g}`) - 0.5) * impact * 5.5;

  // Cyber Hex-Gate Transition Wipe (for Mode 2)
  const gateOpen = interpolate(speedSpike, [0, 1], [0, 47], CLAMP);
  const cyberGateClip = `polygon(
    0% ${gateOpen}%,
    50% 0%,
    100% ${gateOpen}%,
    100% ${100 - gateOpen}%,
    50% 100%,
    0% ${100 - gateOpen}%
  )`;

  // ================================================
  // 04. HIGH-CONTRAST HDR GRUNGY LUT & X-RAY/THERMAL FLASH
  // ================================================
  // Metallic nordic cold shadows, hyper-detailed micro-contrast, radiant highlights
  const hdrContrast = 1.42 + impact * 0.32;
  const hdrSat = 1.15 + pulse * 0.35;
  const hdrBright = 0.96 + impact * 0.25 + speedSpike * 0.25;
  const grungyHDRFilter = `contrast(${hdrContrast}) saturate(${hdrSat}) brightness(${hdrBright})`;

  // X-Ray / Predator Thermal Vision Flash triggers on heavy beat peaks & cut entries
  const xrayFlash =
    impact > 0.52
      ? interpolate(impact, [0.52, 1], [0, 0.92], CLAMP)
      : frame < 3 && index % 2 === 1
      ? 0.85
      : 0;

  // ================================================
  // 05. VIKING LIGHTNING BOLTS & PLASMA SPARKS (DETERMINISTIC)
  // ================================================
  // Procedural jagged lightning paths from sky to ground
  const boltSeed = Math.floor(g / 2);
  const makeBolt = (startX: number, offsetSeed: number) => {
    let pts = `${startX},0 `;
    let cx = startX;
    for (let s = 1; s <= 8; s++) {
      const ny = s * 240;
      cx += (random(`b-${boltSeed}-${offsetSeed}-${s}`) - 0.5) * 240;
      pts += `${cx.toFixed(0)},${ny} `;
    }
    return pts;
  };
  const boltLeft = makeBolt(260, 1);
  const boltRight = makeBolt(820, 2);

  // Rising Nordic Plasma & Cyber Data Particles
  const particles = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 83 + index * 29;
    const x =
      ((random(`px-${seed}`) * 1080 +
        Math.sin(g * 0.05 + i) * 120 +
        camX * 0.25) %
        1160) -
      40;
    const speed = 15 + (i % 4) * 7 + speedSpike * 28;
    const y = 1960 - ((g * speed + random(`py-${seed}`) * 1920) % 2080);
    const size = 6 + (i % 3) * 5 + pulse * 7;
    const col =
      i % 3 === 0 ? accent : i % 3 === 1 ? ICE_WHITE : THERMAL_MAGENTA;
    return { x, y, size, col, isHex: i % 2 === 0 };
  });

  const motionBlur = Math.min(1, impact * 0.9 + speedSpike * 0.95);

  return (
    <AbsoluteFill style={{ backgroundColor: CYBER_DARK, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED CYBER MIRROR BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.2}) rotate(${-camRot * 0.5}deg)`,
          opacity: 0.42,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.75) saturate(0.5) brightness(0.42)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + HDR GRUNGY GRADE + VELOCITY RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
          clipPath:
            transMode === 2 && speedSpike > 0.02 ? cyberGateClip : undefined,
        }}
      >
        {/* Base High-Contrast HDR Grungy Image */}
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: grungyHDRFilter,
          }}
        />

        {/* HDR Micro-Contrast Grunge Enhancement Pass (Overlay Blend) */}
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
              filter: "grayscale(1) contrast(2.4) brightness(0.95)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 03: VELOCITY RADIAL & DIRECTIONAL STREAK BLUR
        ============================================ */}
        {motionBlur > 0.06 && (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: motionBlur * 0.38,
                transform: `translate3d(${motionBlur * 32 * dir}px, 0, 0) scale(${1 + motionBlur * 0.06})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "sepia(1) hue-rotate(155deg) saturate(4.5) contrast(1.5)",
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: motionBlur * 0.32,
                transform: `translate3d(${motionBlur * -32 * dir}px, 0, 0) scale(${1 + motionBlur * 0.12})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "sepia(1) hue-rotate(290deg) saturate(4.5) contrast(1.5)",
                }}
              />
            </AbsoluteFill>
          </>
        )}

        {/* ============================================
            LAYER 04: X-RAY / THERMAL VISION FLASH OVERLAY
        ============================================ */}
        {xrayFlash > 0.01 && (
          <AbsoluteFill
            style={{
              opacity: xrayFlash,
              transform: `scale(${1 + xrayFlash * 0.03})`,
            }}
          >
            {/* Inverted X-Ray Skeleton / Infrared Heat Signature */}
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: `invert(1) contrast(2.6) sepia(1) hue-rotate(${
                  index % 2 === 0 ? 155 : 285
                }deg) saturate(6) brightness(1.15)`,
              }}
            />
            {/* Thermal Heat-Map False Color Gradient Map */}
            <AbsoluteFill
              style={{
                background: `radial-gradient(circle at 50% 42%, ${THERMAL_GOLD}aa 0%, ${THERMAL_MAGENTA}99 38%, ${ANDROID_CYAN}88 72%, ${CYBER_DARK} 100%)`,
                mixBlendMode: "color",
              }}
            />
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: CYBERPUNK GLITCH SCAN-SLICE DISPLACEMENT
      ============================================ */}
      {(impact > 0.28 || glitchTick > 0.75) && (
        <AbsoluteFill
          style={{
            clipPath: `inset(${20 + ((g * 19) % 52)}% 0% ${22 + ((g * 23) % 48)}% 0%)`,
            transform: `translateX(${(random(`cyb-gl-${g}`) - 0.5) * 115}px) scale(${totalScale * 1.04})`,
            mixBlendMode: "hard-light",
            opacity: 0.88,
            pointerEvents: "none",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "invert(0.85) sepia(1) hue-rotate(160deg) saturate(5) contrast(2)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 06: VIKING LIGHTNING & CYBERPUNK NEON GLOW (SVG)
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
            transform: `translate3d(${camX * 0.2}px, ${camY * 0.2}px, 0)`,
          }}
        >
          {/* VIKING THUNDERSTORM LIGHTNING ARCS (3-Layer Neon Glow) */}
          {(impact > 0.22 || speedSpike > 0.3) && (
            <g opacity={Math.min(1, impact * 1.3 + speedSpike)}>
              {/* Left Bolt: Outer Cyan Halo -> Mid Electric -> White Core */}
              <polyline
                points={boltLeft}
                fill="none"
                stroke={accent}
                strokeWidth={34 + impact * 25}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
              />
              <polyline
                points={boltLeft}
                fill="none"
                stroke={VIKING_ELECTRIC}
                strokeWidth={14 + impact * 10}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
              <polyline
                points={boltLeft}
                fill="none"
                stroke={ICE_WHITE}
                strokeWidth={4 + impact * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Right Bolt: Outer Halo -> Mid Electric -> White Core */}
              <polyline
                points={boltRight}
                fill="none"
                stroke={accent}
                strokeWidth={30 + impact * 22}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
              />
              <polyline
                points={boltRight}
                fill="none"
                stroke={ANDROID_CYAN}
                strokeWidth={12 + impact * 8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
              <polyline
                points={boltRight}
                fill="none"
                stroke={ICE_WHITE}
                strokeWidth={3 + impact * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* CYBERPUNK ANDROID NEON SPINE & TARGETING HUD */}
          <g
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.92 + impact * 0.16}) rotate(${camRot * 0.25}deg)`,
            }}
          >
            {/* Expanding Cyber Shockwave Hex-Ring */}
            <polygon
              points="540,460 970,710 970,1210 540,1460 110,1210 110,710"
              fill="none"
              stroke={accent}
              strokeWidth={18 + impact * 22}
              opacity={0.22 + impact * 0.35}
              style={{
                transformOrigin: "540px 960px",
                transform: `scale(${0.75 + pulse * 0.35}) rotate(${g * 1.5}deg)`,
              }}
            />
            <polygon
              points="540,460 970,710 970,1210 540,1460 110,1210 110,710"
              fill="none"
              stroke={ICE_WHITE}
              strokeWidth={3 + impact * 4}
              opacity={0.6 + impact * 0.4}
              style={{
                transformOrigin: "540px 960px",
                transform: `scale(${0.75 + pulse * 0.35}) rotate(${g * 1.5}deg)`,
              }}
            />

            {/* Rotating Android Biometric Lock Ring */}
            <circle
              cx="540"
              cy="960"
              r={370 - impact * 18}
              fill="none"
              stroke={accent}
              strokeWidth="10"
              strokeDasharray="140 90 30 90"
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${-g * 3.4}deg)`,
                opacity: 0.75,
              }}
            />
            <circle
              cx="540"
              cy="960"
              r={290 + subBeat * 22}
              fill="none"
              stroke={THERMAL_MAGENTA}
              strokeWidth="5"
              strokeDasharray="60 140"
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${g * 4.5}deg)`,
                opacity: 0.65,
              }}
            />

            {/* CYBORG EYE / CORE LASER FLARE (Upper Subject Zone) */}
            <g
              style={{
                transformOrigin: "540px 670px",
                transform: `scale(${0.75 + impact * 0.95})`,
                opacity: 0.35 + impact * 0.65,
              }}
            >
              <ellipse cx="465" cy="670" rx="105" ry="20" fill={accent} opacity="0.45" />
              <ellipse cx="465" cy="670" rx="50" ry="7" fill={ICE_WHITE} />
              <ellipse cx="615" cy="670" rx="105" ry="20" fill={accent} opacity="0.45" />
              <ellipse cx="615" cy="670" rx="50" ry="7" fill={ICE_WHITE} />
            </g>

            {/* Neon Tech Corner Brackets */}
            <g stroke={accent} strokeWidth="8" fill="none" opacity="0.88">
              <path d="M 140 540 L 140 450 L 230 450" />
              <path d="M 940 540 L 940 450 L 850 450" />
              <path d="M 140 1380 L 140 1470 L 230 1470" />
              <path d="M 940 1380 L 940 1470 L 850 1470" />
            </g>
          </g>
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: CYBER DATA & VIKING SPARK PARTICLES
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {particles.map((pt, i) => (
          <div
            key={`cyb-pt-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.size,
              height: pt.isHex ? pt.size : pt.size * 3.2,
              backgroundColor: pt.col,
              clipPath: pt.isHex
                ? "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
                : undefined,
              opacity: 0.55 + pulse * 0.45,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 08: GRUNGY CRT SCANLINES, HALOS & VIGNETTE
      ============================================ */}
      {/* Deep Grungy Shadow Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 36%, rgba(2,6,13,0.55) 75%, rgba(2,6,13,0.94) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Android HUD Scanline Grid Texture */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.07) 0px, rgba(0, 240, 255, 0.07) 2px, transparent 2px, transparent 6px)",
          pointerEvents: "none",
        }}
      />

      {/* Cyberpunk Neon Edge Glow & Beat Exposure Halo */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 45%, ${accent}55 82%, ${THERMAL_MAGENTA}77 100%)`,
          mixBlendMode: "screen",
          opacity: 0.3 + pulse * 0.55,
          pointerEvents: "none",
        }}
      />

      {/* Velocity Cut Electric Strobe */}
      <AbsoluteFill
        style={{
          backgroundColor: ICE_WHITE,
          mixBlendMode: "overlay",
          opacity: speedSpike * 0.75 + impact * 0.28,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: PULSING NEON LASER FRAME
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 14}px solid ${accent}`,
          opacity: 0.42 + impact * 0.58,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `2px solid ${ICE_WHITE}`,
          opacity: 0.35 + impact * 0.65,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 10: SAFE ZONE BRAND WATERMARK & ANDROID HUD (NO EMOJIS)
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
        {/* TOP-LEFT CYBER-ANDROID BRAND WATERMARK (ZERO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(2, 6, 13, 0.86)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${THERMAL_MAGENTA}`,
            clipPath:
              "polygon(0 0, 95% 0, 100% 32%, 100% 100%, 5% 100%, 0 68%)",
            transform: `translateX(${enterWhip * -60}px) scale(${1 + impact * 0.06})`,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: ICE_WHITE,
              border: `3px solid ${accent}`,
              transform: `rotate(45deg) scale(${0.85 + pulse * 0.55})`,
            }}
          />
          <span
            style={{
              fontFamily,
              color: ICE_WHITE,
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

        {/* BOTTOM-LEFT ANDROID TELEMETRY (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 20px",
            backgroundColor: "rgba(2, 6, 13, 0.82)",
            borderLeft: `6px solid ${accent}`,
            borderTop: `2px solid ${THERMAL_MAGENTA}`,
            transform: `translateX(${enterWhip * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 24,
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
              fontSize: 15,
              fontWeight: 700,
              color: ICE_WHITE,
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

export const HaalandCyborgViking: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#02060D" overlap={0} Scene={Scene} />
);