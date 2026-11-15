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
import { loadFont } from "@remotion/google-fonts/BodoniModa";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

const OLD_TRAFFORD_NOIR = "#050406";
const UNITED_CRIMSON = "#D90429";
const GALACTICO_GOLD = "#E5B842";
const ROYAL_PLATINUM = "#F8FAFC";
const FLOODLIGHT_ICE = "#E2E8F0";

const OVERLAP_FRAMES = 10;
const WIPE_FEATHER = 44;

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
  const isFirst = index === 0;

  const accent = brand.color || GALACTICO_GOLD;
  const brandName = brand.name || "DB7 ICON";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const freeKickStrike = beatPulseAt(g, beatFrames, 3.1);
  const paparazziPop = beatPulseAt(g + 3, beatFrames, 2.2);
  const subHarmonic = beatPulseAt(g + 7, beatFrames, 1.5);

  // ================================================
  // 02. MAGNUS-EFFECT CURVED VELOCITY RAMPING
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const magnusCurve =
    u < 0.24
      ? interpolate(u, [0, 0.24], [0, 0.46], CLAMP)
      : u < 0.76
        ? interpolate(u, [0.24, 0.76], [0.46, 0.54], CLAMP)
        : interpolate(u, [0.76, 1], [0.54, 1], CLAMP);

  const exitCut = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP,
  );

  // Smooth, critically-damped landing (no bounce, never goes negative)
  const bendSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 190, mass: 0.7 },
  });

  const enterArc = isFirst ? 0 : Math.max(0, 1 - bendSpring);
  const exitArc = Math.pow(exitCut, 2.4);
  const swerveEnergy = Math.min(1, enterArc + exitArc);

  // ================================================
  // 03. "BEND IT LIKE BECKHAM" BANANA-CURVE CAMERA RIG
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;

  // Base scale >= 1.18 guarantees 100% 9:16 portrait coverage with zero black edges
  const baseScale = interpolate(magnusCurve, [0, 1], [1.18, 1.3], CLAMP);
  const strikeZoom =
    index % 2 === 0
      ? enterArc * 0.2 - exitArc * 0.05
      : enterArc * 0.14 + exitArc * 0.16;
  const beatPump =
    freeKickStrike * 0.13 +
    Math.sin(pulse * Math.PI * 2) * freeKickStrike * 0.05;
  const totalScale = Math.max(1.16, baseScale + strikeZoom + beatPump);

  // Gentle parabolic swerve: arcs in, settles, drifts out the same way
  const curveX =
    Math.sin(enterArc * Math.PI * 0.85) * 180 * dir -
    Math.sin(exitArc * Math.PI * 0.85) * 150 * dir;
  const curveY =
    Math.pow(enterArc, 1.7) * -120 +
    Math.sin(enterArc * Math.PI) * 70 * dir +
    Math.pow(exitArc, 1.7) * 110;

  // Beat impact shake (transition energy contributes only a little)
  const rippleAmp = freeKickStrike * 26 + swerveEnergy * 6 + pulse * 6;
  const shakeX =
    Math.sin(g * 3.3) * rippleAmp +
    (random(`dbx-${g}`) - 0.5) * freeKickStrike * 22;
  const shakeY =
    Math.cos(g * 2.7) * rippleAmp +
    (random(`dby-${g}`) - 0.5) * freeKickStrike * 18;

  const camX = curveX + shakeX;
  const camY = curveY + shakeY;

  const camRot =
    enterArc * 4 * dir -
    exitArc * 5 * dir +
    Math.sin(g * 0.2) * 1.5 +
    (random(`dbr-${g}`) - 0.5) * freeKickStrike * 4.5;

  // ================================================
  // 04. CURVED MAGNUS WIPE TRANSITION
  //     New shot is revealed by a huge arcing edge (like a free-kick
  //     curve) sweeping across the previous shot, alternating sides.
  //     A crimson/gold/white ribbon rides the edge.
  // ================================================
  const wipeActive = !isFirst && frame < OVERLAP_FRAMES;
  const wipeT = interpolate(frame, [0, OVERLAP_FRAMES - 1], [0, 1], CLAMP);
  const wipeE =
    wipeT < 0.5 ? 2 * wipeT * wipeT : 1 - Math.pow(-2 * wipeT + 2, 2) / 2;
  const wipeCx = dir > 0 ? -700 : 1780;
  const wipeCy = index % 4 < 2 ? 1150 : 800;
  const wipeR = 600 + wipeE * 1900;
  const wipeMask = wipeActive
    ? `radial-gradient(circle at ${wipeCx}px ${wipeCy}px, #000 ${wipeR}px, transparent ${
        wipeR + WIPE_FEATHER
      }px)`
    : undefined;
  const ribbonOpacity = interpolate(
    wipeT,
    [0, 0.12, 0.82, 1],
    [0, 1, 1, 0],
    CLAMP,
  );

  // ================================================
  // 05. 90s/2000s EDITORIAL GLOSSY MAGAZINE & STADIUM HDR GRADE
  // ================================================
  const ccContrast = 1.38 + freeKickStrike * 0.26;
  const ccSat = 1.16 + pulse * 0.28;
  const ccBright = 0.96 + freeKickStrike * 0.24 + swerveEnergy * 0.08;
  const beckhamEditorialCC = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  const swerveBlur = Math.min(1, freeKickStrike * 0.88 + swerveEnergy * 0.45);
  const prismShift = freeKickStrike * 28 + swerveEnergy * 14 + subHarmonic * 10;

  // ================================================
  // 06. MAGNUS FREE-KICK RIBBONS & CONFESSION SPARKS
  // ================================================
  const freeKickArcs = [0, 1, 2].map((aIdx) => {
    const startX = dir > 0 ? -80 : 1160;
    const startY = 1860 + aIdx * 45;
    const ctrl1X = dir > 0 ? 1120 + aIdx * 60 : -40 - aIdx * 60;
    const ctrl1Y = 1320 - aIdx * 50 - pulse * 70;
    const ctrl2X = dir > 0 ? 940 - aIdx * 50 : 140 + aIdx * 50;
    const ctrl2Y = 580 + aIdx * 40 - freeKickStrike * 90;
    const endX = dir > 0 ? 140 : 940;
    const endY = 220 + aIdx * 35;

    return {
      d: `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`,
      col: aIdx === 0 ? accent : aIdx === 1 ? ROYAL_PLATINUM : UNITED_CRIMSON,
      thick: aIdx === 1 ? 5 + freeKickStrike * 6 : 12 + freeKickStrike * 14,
      dashOffset: -g * (34 + aIdx * 6),
    };
  });

  const goldenSparks = Array.from({ length: 16 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const windSwerve =
      Math.sin(g * 0.065 + i * 1.4) * (95 + (i % 3) * 40) * dir;
    const x =
      ((random(`db-sx-${seed}`) * 1080 + windSwerve + camX * 0.18) % 1160) - 40;
    const speed = 17 + (i % 5) * 8 + swerveEnergy * 10;
    const y = 1980 - ((g * speed + random(`db-sy-${seed}`) * 1920) % 2120);
    const w = 7 + (i % 4) * 5 + pulse * 6;
    const rot = g * (4 + (i % 4) * 3) * (i % 2 === 0 ? 1 : -1);
    const col =
      i % 3 === 0 ? accent : i % 3 === 1 ? ROYAL_PLATINUM : UNITED_CRIMSON;
    return { x, y, w, rot, col };
  });

  // Paparazzi / stadium camera flash bulb positions (triggered on beat)
  const flashBulbs = [
    { fx: 240, fy: 520 },
    { fx: 840, fy: 1400 },
  ];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundColor: OLD_TRAFFORD_NOIR,
          overflow: "hidden",
          WebkitMaskImage: wipeMask,
          maskImage: wipeMask,
        }}
      >
        {/* ============================================
            LAYER 01: 9:16 FULL-BLEED ROYAL VELVET BACKDROP
        ============================================ */}
        <AbsoluteFill
          style={{
            transform: `scale(${totalScale * 1.24}) rotate(${-camRot * 0.45}deg)`,
            opacity: 0.44,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.7) saturate(0.4) brightness(0.38)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 02: HERO 9:16 PORTRAIT + MAGNUS BANANA-CURVE RIG
        ============================================ */}
        <AbsoluteFill
          style={{
            transformOrigin: "center center",
            transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: beckhamEditorialCC,
            }}
          />

          {/* Editorial High-Fashion Silver Halide Contrast Pass */}
          <AbsoluteFill
            style={{
              mixBlendMode: "overlay",
              opacity: 0.46 + pulse * 0.22,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(1) contrast(2.45) brightness(0.92)",
              }}
            />
          </AbsoluteFill>

          {/* ============================================
              LAYER 03: SWERVE MOTION BLUR & PRISM SPLIT
          ============================================ */}
          {swerveBlur > 0.05 && (
            <>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: swerveBlur * 0.26,
                  transform: `translate3d(${-prismShift * dir}px, ${
                    -prismShift * 0.35
                  }px, 0) rotate(${-swerveBlur * 1.4 * dir}deg) scale(${
                    1 + swerveBlur * 0.04
                  })`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "sepia(1) hue-rotate(-25deg) saturate(3.2) contrast(1.4)",
                  }}
                />
              </AbsoluteFill>

              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: swerveBlur * 0.22,
                  transform: `translate3d(${prismShift * dir}px, ${
                    prismShift * 0.35
                  }px, 0) rotate(${swerveBlur * 1.4 * dir}deg) scale(${
                    1 + swerveBlur * 0.07
                  })`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "sepia(1) hue-rotate(175deg) saturate(2.8) contrast(1.4)",
                  }}
                />
              </AbsoluteFill>

              <AbsoluteFill
                style={{
                  mixBlendMode: "lighten",
                  opacity: swerveBlur * 0.22,
                  transform: `scale(${1 + swerveBlur * 0.1})`,
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
            LAYER 04: BECKHAM SIGNATURE AURA & FREE-KICK GEOMETRY (SVG)
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
            {/* 1. TOP-CORNER "POSTAGE STAMP" GOAL NET MESH RIPPLE */}
            <g
              opacity={0.28 + freeKickStrike * 0.55}
              style={{
                transformOrigin: dir > 0 ? "180px 260px" : "900px 260px",
                transform: `scale(${1 + freeKickStrike * 0.18}) skewX(${
                  freeKickStrike * 8 * dir
                }deg)`,
              }}
            >
              {[0, 1, 2, 3, 4].map((gIdx) => {
                const offset = gIdx * 65;
                return (
                  <g
                    key={`net-mesh-${gIdx}`}
                    stroke={FLOODLIGHT_ICE}
                    strokeWidth="2"
                  >
                    <line
                      x1="60"
                      y1={140 + offset}
                      x2="1020"
                      y2={140 + offset + 120 * dir}
                      opacity={0.35}
                    />
                    <line
                      x1={140 + gIdx * 200}
                      y1="100"
                      x2={80 + gIdx * 200}
                      y2="520"
                      opacity={0.35}
                    />
                  </g>
                );
              })}
            </g>

            {/* 2. MAGNUS-EFFECT BANANA FREE-KICK TRAJECTORY RIBBONS */}
            <g opacity={0.55 + freeKickStrike * 0.45 + swerveEnergy * 0.15}>
              {freeKickArcs.map((arc, i) => (
                <path
                  key={`magnus-arc-${i}`}
                  d={arc.d}
                  fill="none"
                  stroke={arc.col}
                  strokeWidth={arc.thick}
                  strokeLinecap="round"
                  strokeDasharray={i === 1 ? "340 240" : "460 320"}
                  strokeDashoffset={arc.dashOffset}
                  opacity={i === 1 ? 0.95 : 0.52}
                />
              ))}
            </g>

            {/* 3. ICONIC "7" GEOMETRIC WATERMARK SILHOUETTE ON HEAVY BEAT */}
            {(freeKickStrike > 0.25 || swerveEnergy > 0.3) && (
              <g
                style={{
                  transformOrigin: "540px 960px",
                  transform: `scale(${0.92 + freeKickStrike * 0.22}) rotate(${
                    camRot * 0.3
                  }deg)`,
                  opacity: Math.min(
                    0.65,
                    freeKickStrike * 0.6 + swerveEnergy * 0.2,
                  ),
                }}
              >
                <polygon
                  points="310,520 790,520 790,630 515,1420 385,1420 655,635 310,635"
                  fill="none"
                  stroke={accent}
                  strokeWidth={8 + freeKickStrike * 10}
                />
                <polygon
                  points="325,535 775,535 775,615 505,1405 405,1405 675,620 325,620"
                  fill="none"
                  stroke={ROYAL_PLATINUM}
                  strokeWidth="2.5"
                  strokeDasharray="220 140"
                  strokeDashoffset={-g * 24}
                />
              </g>
            )}

            {/* 4. PAPARAZZI 8-POINTED STARBURST CAMERA FLASHES */}
            {(freeKickStrike > 0.3 || paparazziPop > 0.45) && (
              <g>
                {flashBulbs.map((fb, fIdx) => {
                  const active =
                    (g + fIdx * 3) % 4 === 0
                      ? freeKickStrike
                      : paparazziPop * 0.8;
                  if (active < 0.25) return null;
                  const sc = 0.6 + active * 1.1;
                  return (
                    <g
                      key={`paparazzi-${fIdx}`}
                      transform={`translate(${fb.fx}, ${fb.fy}) scale(${sc}) rotate(${
                        g * 4 + fIdx * 22
                      })`}
                      opacity={Math.min(1, active * 1.2)}
                    >
                      <polygon
                        points="-140,-140 0,-12 140,140 0,12"
                        fill={ROYAL_PLATINUM}
                      />
                      <polygon
                        points="140,-140 0,-12 -140,140 0,12"
                        fill={ROYAL_PLATINUM}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* 5. BESPOKE SAVILE ROW / GALACTICO CORNER BRACKETS */}
            <g
              stroke={accent}
              strokeWidth={5 + freeKickStrike * 5}
              fill="none"
              opacity={0.8}
              style={{
                transformOrigin: "540px 960px",
                transform: `scale(${0.96 + freeKickStrike * 0.06})`,
              }}
            >
              <polyline points="95,510 95,370 235,370" />
              <polyline points="985,510 985,370 845,370" />
              <polyline points="95,1410 95,1550 235,1550" />
              <polyline points="985,1410 985,1550 845,1550" />
            </g>
          </svg>
        </AbsoluteFill>

        {/* ============================================
            LAYER 05: BALLON D'OR GOLD CONFETTI & STADIUM SPARKS
        ============================================ */}
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
          {goldenSparks.map((sp, i) => (
            <div
              key={`db7-spark-${i}`}
              style={{
                position: "absolute",
                left: sp.x,
                top: sp.y,
                width: sp.w,
                height: sp.w * 2.3,
                backgroundColor: sp.col,
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                transform: `rotate(${sp.rot}deg)`,
                opacity: 0.68 + pulse * 0.32,
              }}
            />
          ))}
        </AbsoluteFill>

        {/* ============================================
            LAYER 06: STADIUM FLOODLIGHT HALO, VIGNETTE & FLASH
        ============================================ */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${UNITED_CRIMSON}48 0%, transparent 42%, transparent 58%, ${accent}52 100%)`,
            mixBlendMode: "screen",
            opacity: 0.46 + pulse * 0.44,
            pointerEvents: "none",
          }}
        />

        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at 50% 48%, transparent 35%, rgba(5,4,6,0.58) 75%, rgba(5,4,6,0.95) 100%)",
            pointerEvents: "none",
          }}
        />

        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${dir > 0 ? 22 : 78}% 24%, ${ROYAL_PLATINUM} 0%, ${accent}aa 28%, transparent 65%)`,
            mixBlendMode: "screen",
            opacity: freeKickStrike * 0.62 + swerveEnergy * 0.2,
            pointerEvents: "none",
          }}
        />

        <AbsoluteFill
          style={{
            backgroundColor: ROYAL_PLATINUM,
            mixBlendMode: "overlay",
            opacity: swerveEnergy * 0.12 + freeKickStrike * 0.28,
            pointerEvents: "none",
          }}
        />

        {/* Outgoing shot sinks into noir while the next one sweeps in */}
        {exitCut > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: OLD_TRAFFORD_NOIR,
              opacity: exitCut * 0.45,
              pointerEvents: "none",
            }}
          />
        )}

        {/* ============================================
            LAYER 07: PULSING ROYAL GOLD & CRIMSON FRAME
        ============================================ */}
        <AbsoluteFill
          style={{
            border: `${6 + freeKickStrike * 12}px solid ${accent}`,
            opacity: 0.45 + freeKickStrike * 0.55,
            transform: `scale(${0.986 - pulse * 0.008})`,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            border: `2px solid ${ROYAL_PLATINUM}`,
            opacity: 0.36 + subHarmonic * 0.52,
            transform: `scale(${0.978 - pulse * 0.006})`,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />

        {/* ============================================
            LAYER 08: SAFE ZONE DB7 BRAND WATERMARK & TELEMETRY
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
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 26px",
              backgroundColor: "rgba(5, 4, 6, 0.9)",
              borderLeft: `7px solid ${accent}`,
              borderRight: `3px solid ${UNITED_CRIMSON}`,
              clipPath:
                "polygon(0 0, 95% 0, 100% 34%, 100% 100%, 5% 100%, 0 66%)",
              transform: `translateX(${enterArc * -60}px) scale(${
                1 + freeKickStrike * 0.06
              })`,
            }}
          >
            <div
              style={{ display: "flex", gap: 4, transform: "skewX(-22deg)" }}
            >
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: UNITED_CRIMSON,
                  transform: `scaleY(${0.75 + pulse * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: ROYAL_PLATINUM,
                  transform: `scaleY(${0.75 + freeKickStrike * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: accent,
                  transform: `scaleY(${0.75 + subHarmonic * 0.45})`,
                }}
              />
            </div>
            <span
              style={{
                fontFamily,
                color: ROYAL_PLATINUM,
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

          <div
            style={{
              position: "absolute",
              bottom: 26,
              left: 16,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              padding: "8px 20px",
              backgroundColor: "rgba(5, 4, 6, 0.86)",
              borderLeft: `6px solid ${UNITED_CRIMSON}`,
              borderTop: `2px solid ${accent}`,
              transform: `translateX(${enterArc * -50}px)`,
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
                color: FLOODLIGHT_ICE,
                letterSpacing: 3,
                opacity: 0.92,
              }}
            >
              {`TC ${(g / fps).toFixed(2)}S // ${bpm} BPM`}
            </div>
          </div>

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

      {/* ============================================
          WIPE EDGE RIBBON: crimson / gold / white arc riding the sweep
          (outside the masked scene so it is never clipped)
      ============================================ */}
      {wipeActive && ribbonOpacity > 0.01 && (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: ribbonOpacity }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <circle
              cx={wipeCx}
              cy={wipeCy}
              r={wipeR + WIPE_FEATHER * 0.5}
              fill="none"
              stroke={UNITED_CRIMSON}
              strokeWidth={36}
              opacity={0.55}
            />
            <circle
              cx={wipeCx}
              cy={wipeCy}
              r={wipeR + WIPE_FEATHER * 0.5}
              fill="none"
              stroke={accent}
              strokeWidth={12}
              opacity={0.95}
            />
            <circle
              cx={wipeCx}
              cy={wipeCy}
              r={wipeR + WIPE_FEATHER * 0.5}
              fill="none"
              stroke={ROYAL_PLATINUM}
              strokeWidth={3}
            />
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const DavidBeckhamGoldenBend: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#050406" overlap={OVERLAP_FRAMES} Scene={Scene} />
);
