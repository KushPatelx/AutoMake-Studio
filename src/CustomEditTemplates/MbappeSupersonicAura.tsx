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
  beatPulse,
} from "../editShared";
import { loadFont } from "@remotion/google-fonts/ChakraPetch";

const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const BERNABEU_NIGHT = "#02040A";
const ROYAL_GOLD = "#FFD700";
const SONIC_BLUE = "#0055FF";
const TURBO_CYAN = "#00F0FF";
const FRENCH_RED = "#FF003C";
const PURE_WHITE = "#FFFFFF";

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

  const accent = brand.color || ROYAL_GOLD;
  const brandName = brand.name || "KM9 MACH";

  // ================================================
  // 01. SUPERSONIC SPRINT & BEAT ACCELERATION MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const sonicBoom = beatPulse(g, bpm, 3.1);
  const subStep = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.7);
  const stepoverTick = beatPulse(g * 2, bpm, 1.4);

  // ================================================
  // 02. NITRO VELOCITY SPEED-RAMPING (TWIXTOR CURVE)
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const velocityFlow =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.47], CLAMP)
      : u < 0.8
      ? interpolate(u, [0.2, 0.8], [0.47, 0.53], CLAMP)
      : interpolate(u, [0.8, 1], [0.53, 1], CLAMP);

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
    config: { damping: 11, stiffness: 280, mass: 0.38 },
  });

  const enterWhip = Math.pow(1 - enterCut, 2.5);
  const exitWhip = Math.pow(exitCut, 2.5);
  const machSurge = Math.min(1, enterWhip + exitWhip);

  // ================================================
  // 03. STEPOVER WHIP-PAN CAMERA & 9:16 FULL-BLEED RIG
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;

  // Always >= 1.18 scale so 9:16 portrait images NEVER expose black edges
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.32], CLAMP);
  const nitroZoom =
    index % 2 === 0
      ? enterWhip * 0.65 + exitWhip * 0.45
      : (1 - enterSpring) * 0.48 + exitWhip * 0.68;
  const beatPump = sonicBoom * 0.14 + pulse * 0.04;
  const totalScale = baseScale + nitroZoom + beatPump;

  // Stepover feint lateral snap + kinetic impact shake
  const feintX =
    (enterWhip * 560 - exitWhip * 600) * dir +
    Math.sin(pulse * Math.PI * 2) * sonicBoom * 34 * dir;
  const feintY = (enterWhip * -220 + exitWhip * 240) * dir;

  const shakeAmp = sonicBoom * 28 + machSurge * 20;
  const shakeX =
    Math.sin(g * 3.4) * shakeAmp + (random(`mx-${g}`) - 0.5) * sonicBoom * 24;
  const shakeY =
    Math.cos(g * 2.8) * shakeAmp + (random(`my-${g}`) - 0.5) * sonicBoom * 20;

  const camX = feintX + shakeX;
  const camY = feintY + shakeY;

  const camRot =
    (enterWhip * 13 - exitWhip * 15) * dir +
    Math.sin(g * 0.25) * 1.8 +
    (random(`mr-${g}`) - 0.5) * sonicBoom * 5.5;

  // ================================================
  // 04. SUPERSONIC CHEVRON / MACH-CONE SHUTTER SLICES
  // ================================================
  // 5 Horizontal Aerodynamic Strips that snap into alignment at Mach speed
  const aeroBands = [0, 1, 2, 3, 4].map((bIdx) => {
    const distFromCenter = Math.abs(bIdx - 2);
    const delay = distFromCenter * 1.5;
    const bandProg =
      index === 0
        ? 1
        : interpolate(frame, [delay, delay + 5.2], [0, 1], CLAMP);
    const bandEase = 1 - Math.pow(1 - bandProg, 3);

    const bandExit = Math.pow(
      interpolate(
        frame,
        [duration + distFromCenter * 1.2, duration + OVERLAP_FRAMES],
        [0, 1],
        CLAMP
      ),
      2.3
    );

    const alt = bIdx % 2 === 0 ? 1 : -1;
    const slipstreamX =
      (1 - bandEase) * 115 * alt +
      bandExit * 120 * -alt +
      (sonicBoom > 0.42 ? (bIdx - 2) * sonicBoom * 14 * alt : 0);

    return {
      top: bIdx * 20,
      bottom: 80 - bIdx * 20,
      slipstreamX,
      opacity: interpolate(bandEase, [0, 0.15, 1], [0, 1, 1], CLAMP),
    };
  });

  // ================================================
  // 05. CHAMPIONS LEAGUE HDR GRADE (CLEAN & FAST, NO INVERT)
  // ================================================
  const uclContrast = 1.38 + sonicBoom * 0.28;
  const uclSat = 1.22 + pulse * 0.34;
  const uclBright = 0.97 + sonicBoom * 0.24 + machSurge * 0.22;
  const uclFilter = `contrast(${uclContrast}) saturate(${uclSat}) brightness(${uclBright})`;

  const afterimageShift = sonicBoom * 32 + machSurge * 36;

  // ================================================
  // 06. NON-CIRCULAR SUPERSONIC GEOMETRY (MACH CONES & LIGHTNING)
  // ================================================
  // A) 4 Nested Supersonic Mach-Cone Chevrons (Aerodynamic V-Wings, Zero Circles)
  const machChevrons = [0, 1, 2, 3].map((cIdx) => {
    const flow = ((g * 24 + cIdx * 220) % 880) - 440;
    const tipY = 960 + flow * dir;
    const wingY = tipY - 260 * dir;
    const spreadX = 460 + cIdx * 45 + sonicBoom * 80;
    return {
      points: `${540 - spreadX},${wingY} 540,${tipY} ${540 + spreadX},${wingY}`,
      col:
        cIdx % 3 === 0 ? accent : cIdx % 3 === 1 ? TURBO_CYAN : PURE_WHITE,
      op:
        interpolate(Math.abs(flow), [0, 220, 440], [0.85, 0.55, 0], CLAMP) *
        (0.4 + sonicBoom * 0.6),
    };
  });

  // B) Mbappe Signature Crossed-Arms "X" Slash Geometry
  const xSlashProg =
    frame < OVERLAP_FRAMES + 3
      ? interpolate(frame, [0, OVERLAP_FRAMES + 3], [0, 1], CLAMP)
      : exitCut > 0
      ? exitCut
      : 0;

  // C) High-Voltage Speed Lightning Trails (Left & Right Wing Sprints)
  const boltSeed = Math.floor(g / 2);
  const buildSprintBolt = (baseX: number, id: number) => {
    let pts = `${baseX},1920 `;
    let cx = baseX;
    for (let s = 1; s <= 8; s++) {
      const ny = 1920 - s * 240;
      cx += (random(`mb-${boltSeed}-${id}-${s}`) - 0.5) * 190;
      pts += `${cx.toFixed(0)},${ny} `;
    }
    return pts;
  };
  const leftWingBolt = buildSprintBolt(220, 1);
  const rightWingBolt = buildSprintBolt(860, 2);

  // D) Supersonic Diamond Speed-Streaks (14 fast angular shards)
  const speedStreaks = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 89 + index * 29;
    const x =
      ((random(`sx-${seed}`) * 1080 + camX * 0.2) % 1140) - 30;
    const speed = 28 + (i % 5) * 12 + machSurge * 40;
    const y = 1980 - ((g * speed + random(`sy-${seed}`) * 1920) % 2120);
    const h = 45 + (i % 4) * 35 + sonicBoom * 65 + machSurge * 80;
    const col =
      i % 4 === 0
        ? FRENCH_RED
        : i % 3 === 0
        ? accent
        : i % 2 === 0
        ? TURBO_CYAN
        : PURE_WHITE;
    return { x, y, h, col };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BERNABEU_NIGHT, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED STADIUM AMBIENT BACKDROP
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
              filter: "contrast(1.65) saturate(0.5) brightness(0.4)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + 5-BAND SLIPSTREAM SHUTTER
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
        }}
      >
        {aeroBands.map((band, bIdx) => (
          <AbsoluteFill
            key={`aero-band-${bIdx}`}
            style={{
              clipPath: `inset(${Math.max(0, band.top - 0.3)}% 0% ${Math.max(
                0,
                band.bottom - 0.3
              )}% 0%)`,
              transform: `translate3d(${band.slipstreamX}%, 0, 0)`,
              opacity: band.opacity,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: uclFilter,
              }}
            />
          </AbsoluteFill>
        ))}

        {/* ============================================
            LAYER 03: SPEED-CLONE AFTERIMAGES (TRANSFORM-ONLY, FAST)
        ============================================ */}
        {(sonicBoom > 0.08 || machSurge > 0.08) && frame >= 3 && (
          <>
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: Math.min(0.5, sonicBoom * 0.42 + machSurge * 0.38),
                transform: `translate3d(${-afterimageShift * dir}px, 0, 0) scale(${
                  1 + sonicBoom * 0.05
                })`,
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
                opacity: Math.min(0.38, sonicBoom * 0.32 + machSurge * 0.3),
                transform: `translate3d(${afterimageShift * dir}px, 0, 0) scale(${
                  1 + sonicBoom * 0.1
                })`,
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
          LAYER 04: MBAPPE SUPERSONIC AURA ENGINE (SVG - ZERO CIRCLES)
          - Aerodynamic Mach-Cone V-Chevrons
          - Wing-Sprint High-Voltage Lightning Trails
          - Angular Diamond Speed Telemetry Framing
          - Signature Crossed-Arms "X" Twin-Laser Transition Slash
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
          {/* 1. SUPERSONIC MACH-CONE V-CHEVRON SHOCKWAVES */}
          <g>
            {machChevrons.map((ch, i) => (
              <g key={`mach-chev-${i}`} opacity={ch.op}>
                <polyline
                  points={ch.points}
                  fill="none"
                  stroke={ch.col}
                  strokeWidth={16 + sonicBoom * 18}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  opacity={0.45}
                />
                <polyline
                  points={ch.points}
                  fill="none"
                  stroke={PURE_WHITE}
                  strokeWidth={4 + sonicBoom * 4}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </g>
            ))}
          </g>

          {/* 2. DUAL WING-SPRINT ELECTRIC LIGHTNING TRAILS */}
          {(sonicBoom > 0.22 || machSurge > 0.28) && (
            <g opacity={Math.min(1, sonicBoom * 1.35 + machSurge)}>
              {/* Left Wing Royal Gold / White Bolt */}
              <polyline
                points={leftWingBolt}
                fill="none"
                stroke={accent}
                strokeWidth={36 + sonicBoom * 26}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={leftWingBolt}
                fill="none"
                stroke={PURE_WHITE}
                strokeWidth={5 + sonicBoom * 5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Right Wing Turbo Cyan / Blue Bolt */}
              <polyline
                points={rightWingBolt}
                fill="none"
                stroke={TURBO_CYAN}
                strokeWidth={36 + sonicBoom * 26}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={rightWingBolt}
                fill="none"
                stroke={PURE_WHITE}
                strokeWidth={5 + sonicBoom * 5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* 3. ANGULAR AERODYNAMIC HUD BRACKETS (ZERO CIRCLES) */}
          <g
            stroke={accent}
            strokeWidth={6 + sonicBoom * 6}
            fill="none"
            opacity={0.82}
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.95 + sonicBoom * 0.08})`,
            }}
          >
            {/* Outer Diamond Speed Lock */}
            <polygon
              points="540,350 960,960 540,1570 120,960"
              stroke={TURBO_CYAN}
              strokeWidth={3 + pulse * 4}
              strokeDasharray="180 260"
              strokeDashoffset={-g * 24}
              opacity={0.65}
            />
            {/* Corner Velocity Fins */}
            <polyline points="110,520 110,390 250,390" />
            <polyline points="970,520 970,390 830,390" />
            <polyline points="110,1400 110,1530 250,1530" />
            <polyline points="970,1400 970,1530 830,1530" />
          </g>

          {/* 4. SIGNATURE CROSSED-ARMS CELEBRATION "X" LASER WIPE */}
          {(xSlashProg > 0.01 || sonicBoom > 0.44) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `scale(${1 + sonicBoom * 0.22})`,
              }}
            >
              {[1, -1].map((armDir, aIdx) => {
                const p = xSlashProg > 0 ? xSlashProg : sonicBoom;
                const slide = interpolate(p, [0, 1], [-1500, 1500], CLAMP);
                const op = interpolate(
                  p,
                  [0, 0.18, 0.85, 1],
                  [0, 1, 0.95, 0],
                  CLAMP
                );

                return (
                  <g
                    key={`km-x-${aIdx}`}
                    transform={`translate(540, 960) rotate(${
                      armDir * 36
                    }) translate(${slide * armDir}, 0)`}
                    opacity={op}
                  >
                    <polygon
                      points="-1350,0 -150,-48 1250,0 -150,48"
                      fill={aIdx === 0 ? accent : TURBO_CYAN}
                      opacity={0.72}
                    />
                    <polygon
                      points="-1100,0 -100,-20 1150,0 -100,20"
                      fill={SONIC_BLUE}
                      opacity={0.9}
                    />
                    <polygon
                      points="-950,0 -60,-8 1080,0 -60,8"
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
          LAYER 05: VERTICAL SUPERSONIC WIND STREAKS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {speedStreaks.map((st, i) => (
          <div
            key={`speed-streak-${i}`}
            style={{
              position: "absolute",
              left: st.x,
              top: st.y,
              width: 4,
              height: st.h,
              backgroundColor: st.col,
              clipPath: "polygon(50% 0%, 100% 30%, 50% 100%, 0% 30%)",
              opacity: 0.65 + pulse * 0.35,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: STADIUM FLOODLIGHTS, VIGNETTE & SONIC FLASH
      ============================================ */}
      {/* Bernabeu Royal Gold & French Tricolor Atmosphere */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${SONIC_BLUE}55 0%, transparent 40%, transparent 60%, ${accent}55 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Deep Night Pitch Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(2,4,10,0.56) 76%, rgba(2,4,10,0.94) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Horizontal Anamorphic Stadium Floodlight Flare on Beat */}
      <AbsoluteFill
        style={{
          top: "46%",
          height: 18 + sonicBoom * 54,
          background: `linear-gradient(90deg, transparent 0%, ${TURBO_CYAN}99 22%, ${PURE_WHITE} 50%, ${accent}99 78%, transparent 100%)`,
          transform: `scaleY(${0.35 + sonicBoom * 1.4 + machSurge})`,
          opacity: sonicBoom * 0.65 + machSurge * 0.55,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Sonic Boom Strobe Flash */}
      <AbsoluteFill
        style={{
          backgroundColor: PURE_WHITE,
          mixBlendMode: "overlay",
          opacity: machSurge * 0.7 + sonicBoom * 0.28,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING GALACTICO NEON BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + sonicBoom * 14}px solid ${accent}`,
          opacity: 0.45 + sonicBoom * 0.55,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `2px solid ${TURBO_CYAN}`,
          opacity: 0.4 + subStep * 0.55,
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
        {/* TOP-LEFT GALACTICO SPEED WATERMARK (NO EMOJIS, ZERO CIRCLES) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(2, 4, 10, 0.88)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${TURBO_CYAN}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterWhip * -60}px) scale(${
              1 + sonicBoom * 0.06
            })`,
          }}
        >
          {/* Tricolor / Galactico Speed Chevrons */}
          <div style={{ display: "flex", gap: 4, transform: "skewX(-26deg)" }}>
            <div
              style={{
                width: 5,
                height: 22,
                backgroundColor: SONIC_BLUE,
                transform: `scaleY(${0.75 + pulse * 0.45})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 22,
                backgroundColor: PURE_WHITE,
                transform: `scaleY(${0.75 + stepoverTick * 0.45})`,
              }}
            />
            <div
              style={{
                width: 5,
                height: 22,
                backgroundColor: FRENCH_RED,
                transform: `scaleY(${0.75 + subStep * 0.45})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: PURE_WHITE,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT SPEEDOMETER TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(2, 4, 10, 0.84)",
            borderLeft: `6px solid ${TURBO_CYAN}`,
            borderTop: `2px solid ${accent}`,
            transform: `translateX(${enterWhip * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 26,
              fontWeight: 700,
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
              fontSize: 16,
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

export const MbappeSupersonicAura: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#02040A"
    overlap={OVERLAP_FRAMES}
    Scene={Scene}
  />
);