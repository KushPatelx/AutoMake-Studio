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
import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

// Muted 1920s Birmingham palette (no saturated / glowing colors)
const COAL_SOOT = "#070504";
const VINTAGE_BRASS = "#B47B38";
const DULL_EMBER = "#8F5A2E";
const GUNPOWDER_SMOKE = "#8C857B";
const PARCHMENT_CREAM = "#E6DEC8";
const DRIED_CRIMSON = "#6E1414";

const OVERLAP_FRAMES = 10;
const IRIS_FEATHER = 170;
const IRIS_MAX_R = 1500;

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

  const accent = brand.color || VINTAGE_BRASS;
  const brandName = brand.name || "SHELBY COMPANY LTD";

  // ================================================
  // 01. SLOW BEAT BREATH (built for a heavy, slow track)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const thud = beatPulseAt(g, beatFrames, 2.4);
  const subThud = beatPulseAt(g + 4, beatFrames, 1.6);
  const filmFlicker = 0.95 + random(`flk-${g}`) * 0.05;
  const candle =
    0.88 + Math.sin(g * 0.31) * 0.06 + (random(`cdl-${g}`) - 0.5) * 0.08;

  // ================================================
  // 02. SILENT-FILM IRIS-IN + SMOKE CURTAIN TRANSITION
  //     New shot opens through a feathered circular iris while a
  //     cigarette-smoke curtain drifts across, old shot dims and sinks.
  // ================================================
  const T = interpolate(frame, [0, OVERLAP_FRAMES + 2], [0, 1], CLAMP);
  const irisT = 1 - Math.pow(1 - T, 3);
  const irisActive = !isFirst && T < 1;

  const directions = [
    { vx: -1, vy: 0, rot: -7 },
    { vx: 1, vy: 0, rot: 7 },
    { vx: 0, vy: -1, rot: 4 },
    { vx: 0, vy: 1, rot: -4 },
    { vx: -0.85, vy: -0.75, rot: -10 },
    { vx: 0.85, vy: -0.75, rot: 10 },
    { vx: -0.85, vy: 0.75, rot: 9 },
    { vx: 0.85, vy: 0.75, rot: -9 },
  ];
  const vec = directions[index % directions.length];
  const dir = index % 2 === 0 ? 1 : -1;

  const irisR = -IRIS_FEATHER + irisT * (IRIS_MAX_R + IRIS_FEATHER);
  const irisCx = 540 + vec.vx * 140;
  const irisCy = 960 + vec.vy * 180;
  const irisInner = Math.max(0, irisR);
  const irisOuter = Math.max(1, irisR + IRIS_FEATHER);
  const irisMask = irisActive
    ? `radial-gradient(circle at ${irisCx}px ${irisCy}px, #000 ${irisInner}px, transparent ${irisOuter}px)`
    : undefined;

  // Smoke curtain: peaks mid-transition then clears
  const veilWindow = OVERLAP_FRAMES + 8;
  const veil =
    isFirst || frame >= veilWindow
      ? 0
      : Math.sin(Math.PI * (frame / veilWindow)) * 0.36;

  // Old shot leaving: sinks into soot
  const exitCut = interpolate(
    frame,
    [duration, duration + OVERLAP_FRAMES],
    [0, 1],
    CLAMP,
  );
  const exitGlide = Math.pow(exitCut, 2);

  // ================================================
  // 03. CAMERA: SLOW DOLLY, WEIGHTED LANDING, 1920s GATE WEAVE
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const slowMoDrift =
    u < 0.24
      ? interpolate(u, [0, 0.24], [0, 0.46], CLAMP)
      : u < 0.76
        ? interpolate(u, [0.24, 0.76], [0.46, 0.54], CLAMP)
        : interpolate(u, [0.76, 1], [0.54, 1], CLAMP);

  const landSpring = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 120, mass: 0.9 },
  });
  const enterGlide = isFirst ? 0 : 1 - landSpring;

  const baseScale = interpolate(slowMoDrift, [0, 1], [1.18, 1.27], CLAMP);
  const totalScale = Math.max(
    1.16,
    baseScale +
      enterGlide * 0.08 +
      exitGlide * 0.08 +
      thud * 0.045 +
      pulse * 0.012,
  );

  // Projector gate slip: tiny vertical judder right after the cut
  const slipY = isFirst || frame >= 5 ? 0 : (1 - frame / 5) * 30 * dir;

  const weaveX = (random(`wx-${g}`) - 0.5) * 2.2 + Math.sin(g * 0.07) * 5;
  const weaveY = (random(`wy-${g}`) - 0.5) * 2.2 + Math.cos(g * 0.05) * 4;

  const camX =
    vec.vx * enterGlide * 110 -
    vec.vx * exitGlide * 60 +
    weaveX +
    Math.sin(g * 2.7) * thud * 16 +
    (random(`bsx-${g}`) - 0.5) * thud * 12;
  const camY =
    vec.vy * enterGlide * 140 -
    vec.vy * exitGlide * 80 +
    weaveY +
    slipY +
    thud * 12 +
    Math.cos(g * 2.3) * thud * 14 +
    (random(`bsy-${g}`) - 0.5) * thud * 12;
  const camRot =
    vec.rot * 0.2 * enterGlide -
    vec.rot * 0.12 * exitGlide +
    Math.sin(g * 0.1) * 0.35 +
    (random(`bsr-${g}`) - 0.5) * thud * 1.8;

  // ================================================
  // 04. 1920s GRADE: sepia silver-gelatin, readable, never neon
  // ================================================
  const lampSurge = isFirst ? 0 : Math.exp(-frame / 5) * 0.1;
  const ccContrast = 1.1 + thud * 0.05;
  const ccSat = 0.8 + pulse * 0.05;
  const ccBright = (1.08 + lampSurge + thud * 0.04) * filmFlicker;
  const grade = `grayscale(0.15) sepia(0.26) contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;
  const enterBlur = (enterGlide * 2 + thud * 0.5).toFixed(2);

  // ================================================
  // 05. ASH, COAL DUST & DULL EMBERS (many, soft, no glow)
  // ================================================
  const particles = Array.from({ length: 60 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const isEmber = i % 3 === 0;
    const soft = i % 9 === 0;
    const sway =
      Math.sin(g * 0.05 + i * 1.3) * (40 + (i % 4) * 20) +
      Math.cos(g * 0.025 + i) * 20;
    const rawX = random(`px-${seed}`) * 1080 + sway + camX * 0.18;
    const x = (((rawX % 1160) + 1160) % 1160) - 40;

    const speed = isEmber ? 2.6 + (i % 5) * 1.0 : 1.6 + (i % 4) * 0.7;
    const rawY = (g * speed + random(`py-${seed}`) * 2000) % 2120;
    const y = isEmber ? 1980 - rawY : rawY - 100;

    const size =
      (isEmber ? 3 + (i % 3) * 1.5 : 6 + (i % 4) * 3) * (soft ? 2.2 : 1);
    const rot = g * (1 + (i % 4)) * (i % 2 === 0 ? 1 : -1);
    const flick = 0.55 + random(`ef-${seed}-${Math.floor(g / 3)}`) * 0.45;
    const col = isEmber
      ? i % 2 === 0
        ? VINTAGE_BRASS
        : DULL_EMBER
      : i % 2 === 0
        ? GUNPOWDER_SMOKE
        : PARCHMENT_CREAM;
    return { x, y, size, rot, col, isEmber, flick, soft };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COAL_SOOT,
        overflow: "hidden",
        WebkitMaskImage: irisMask,
        maskImage: irisMask,
      }}
    >
      {/* ============================================
          LAYER 01: DARK BLURRED BACKDROP (full-bleed safety)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.24}) rotate(${-camRot * 0.45}deg)`,
          opacity: 0.4,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter:
              "contrast(1.4) saturate(0.3) brightness(0.45) sepia(0.4) blur(6px)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO + CAMERA RIG
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
            filter: `${grade} blur(${enterBlur}px)`,
          }}
        />
        <AbsoluteFill
          style={{
            mixBlendMode: "overlay",
            opacity: 0.3 + pulse * 0.08,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(1) contrast(1.6) brightness(1.05)",
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ============================================
          LAYER 03: SOFT SPLIT-TONE (steel shadows, warm lamp lows)
      ============================================ */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(150,165,172,0.7) 0%, rgba(220,210,196,0.4) 55%, rgba(255,232,200,0.9) 100%)",
          mixBlendMode: "multiply",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${
            50 + Math.sin(g * 0.04) * 14
          }% 104%, rgba(150,98,52,${0.14 * candle}) 0%, rgba(120,84,50,${
            0.06 * candle
          }) 40%, transparent 70%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Aged emulsion mottle: slow stains like old stock */}
      <AbsoluteFill
        style={{
          mixBlendMode: "multiply",
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <svg width="1080" height="1920">
          <filter
            id={`shelby-mottle-${index}`}
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1080"
            height="1920"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.004 0.006"
              numOctaves="3"
              seed={index * 13 + 5}
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.42  0 0 0 0 0.30  0 0 0 0 0.18  1.8 0 0 0 -0.45"
            />
          </filter>
          <rect
            width="1080"
            height="1920"
            filter={`url(#shelby-mottle-${index})`}
          />
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 04: DRIFTING CIGARETTE / COAL SMOKE
      ============================================ */}
      {[0, 1].map((layer) => (
        <AbsoluteFill
          key={`smoke-${layer}`}
          style={{
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: (layer === 0 ? 0.22 : 0.16) + pulse * 0.04,
            WebkitMaskImage:
              "linear-gradient(0deg, #000 0%, #000 30%, transparent 82%)",
            maskImage:
              "linear-gradient(0deg, #000 0%, #000 30%, transparent 82%)",
          }}
        >
          <svg
            width="1500"
            height="2200"
            style={{
              position: "absolute",
              left: -210,
              top: -140,
              transform: `translate(${
                (layer === 0 ? 1 : -1) * frame * (0.9 + layer * 0.5)
              }px, ${-frame * (0.7 + layer * 0.4)}px)`,
            }}
          >
            <filter
              id={`shelby-smoke-${index}-${layer}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1500"
              height="2200"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={layer === 0 ? "0.0035 0.009" : "0.006 0.014"}
                numOctaves="4"
                seed={index * 7 + layer * 11 + 3}
              />
              <feColorMatrix
                type="matrix"
                values={
                  layer === 0
                    ? "0 0 0 0 0.76  0 0 0 0 0.71  0 0 0 0 0.63  2.2 0 0 0 -0.9"
                    : "0 0 0 0 0.70  0 0 0 0 0.62  0 0 0 0 0.50  2.2 0 0 0 -0.95"
                }
              />
            </filter>
            <rect
              width="1500"
              height="2200"
              filter={`url(#shelby-smoke-${index}-${layer})`}
            />
          </svg>
        </AbsoluteFill>
      ))}

      {/* ============================================
          LAYER 05: TRANSITION SMOKE CURTAIN (sweeps across on the cut)
      ============================================ */}
      {veil > 0.01 && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: veil,
          }}
        >
          <svg
            width="1500"
            height="2200"
            style={{
              position: "absolute",
              left: -210,
              top: -140,
              transform: `translate(${(T - 0.5) * 900 * dir}px, ${
                (T - 0.5) * 820
              }px) rotate(${dir * 28}deg) scale(1.25)`,
            }}
          >
            <filter
              id={`shelby-veil-${index}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1500"
              height="2200"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.004 0.008"
                numOctaves="4"
                seed={index * 5 + 1}
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.68  0 0 0 0 0.63  0 0 0 0 0.55  2.1 0 0 0 -0.9"
              />
            </filter>
            <rect
              width="1500"
              height="2200"
              filter={`url(#shelby-veil-${index})`}
            />
          </svg>
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 06: SVG DETAILS (scratches, dust)
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
            transform: `translate3d(${camX * 0.14}px, ${camY * 0.14}px, 0)`,
          }}
        >
          {[0, 1].map((scIdx) => {
            const sx = random(`fsc-${Math.floor(g / 2)}-${scIdx}`) * 960 + 60;
            const op = random(`fso-${g}-${scIdx}`) * 0.28;
            return (
              <line
                key={`film-scratch-${scIdx}`}
                x1={sx}
                y1="0"
                x2={sx + (random(`fsd-${g}-${scIdx}`) - 0.5) * 8}
                y2="1920"
                stroke={PARCHMENT_CREAM}
                strokeWidth={scIdx === 0 ? 1.6 : 1}
                strokeDasharray="420 190 80 280"
                strokeDashoffset={-g * 60}
                opacity={op}
              />
            );
          })}

          {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => {
            const f2 = Math.floor(g / 2);
            if (random(`dst-${f2}-${d}`) < 0.5) return null;
            return (
              <circle
                key={`dust-${d}`}
                cx={random(`dsx-${f2}-${d}`) * 1080}
                cy={random(`dsy-${f2}-${d}`) * 1920}
                r={1 + random(`dsr-${f2}-${d}`) * 2.4}
                fill={PARCHMENT_CREAM}
                opacity={0.25 + random(`dso-${f2}-${d}`) * 0.35}
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: ASH, COAL DUST & DULL EMBERS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {particles.map((pt, i) => (
          <div
            key={`birmingham-pt-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.size,
              height: pt.isEmber ? pt.size : pt.size * 1.5,
              backgroundColor: pt.col,
              borderRadius: pt.isEmber ? "50%" : 0,
              clipPath: pt.isEmber
                ? undefined
                : "polygon(20% 0%, 100% 30%, 80% 100%, 0% 70%)",
              transform: `rotate(${pt.rot}deg)`,
              filter: pt.soft ? "blur(4px)" : undefined,
              opacity: pt.soft
                ? 0.3
                : pt.isEmber
                  ? 0.45 + pt.flick * 0.4
                  : 0.5 + subThud * 0.15,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 07b: BIRMINGHAM DRIZZLE (thin slanted rain, muted)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          {Array.from({ length: 34 }, (_, i) => {
            const sd = i * 53 + index * 19;
            const len = 60 + random(`rl-${sd}`) * 70;
            const speed = 38 + random(`rs-${sd}`) * 20;
            const x0 = random(`rx-${sd}`) * 1300;
            const y = ((g * speed + random(`ry-${sd}`) * 2300) % 2400) - 200;
            const x = x0 - y * 0.22 - 100;
            return (
              <line
                key={`rain-${i}`}
                x1={x}
                y1={y}
                x2={x - len * 0.22}
                y2={y + len}
                stroke={PARCHMENT_CREAM}
                strokeWidth={1 + random(`rw-${sd}`) * 1.2}
                strokeLinecap="round"
                opacity={0.08 + random(`ro-${sd}`) * 0.14}
              />
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* Old projector roll bar: faint brightness band drifting down */}
      <AbsoluteFill
        style={{
          top: ((g * 5) % 2600) - 400,
          height: 300,
          background:
            "linear-gradient(180deg, transparent, rgba(230,222,200,0.06), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: FILM GRAIN + SOFT VIGNETTE
      ============================================ */}
      <AbsoluteFill
        style={{
          mixBlendMode: "overlay",
          opacity: 0.22,
          pointerEvents: "none",
        }}
      >
        <svg width="1080" height="1920">
          <filter
            id={`shelby-grain-${index}`}
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1080"
            height="1920"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              seed={g % 997}
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
            />
          </filter>
          <rect
            width="1080"
            height="1920"
            filter={`url(#shelby-grain-${index})`}
          />
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 46%, transparent ${
            42 + pulse * 2
          }%, rgba(7,5,4,0.4) 74%, rgba(7,5,4,0.88) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Iris rim: old-lens dark edge that rides the opening circle */}
      {irisActive && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${irisCx}px ${irisCy}px, transparent ${Math.max(
              0,
              irisR - 170,
            )}px, rgba(7,5,4,0.65) ${irisInner}px)`,
            opacity: 1 - T,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Old shot sinking into soot as the next one opens */}
      {exitCut > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: COAL_SOOT,
            opacity: exitCut * 0.55,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ============================================
          LAYER 10: SAFE ZONE BRAND + TELEMETRY
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
            backgroundColor: "rgba(7, 5, 4, 0.92)",
            borderLeft: `6px solid ${accent}`,
            borderRight: `2px solid ${PARCHMENT_CREAM}`,
            borderTop: `1px solid rgba(180, 123, 56, 0.45)`,
            borderBottom: `1px solid rgba(180, 123, 56, 0.45)`,
            transform: `translateX(${enterGlide * -55}px) scale(${
              1 + thud * 0.03
            })`,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: PARCHMENT_CREAM,
                transform: `scaleY(${0.75 + pulse * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: accent,
                transform: `scaleY(${0.75 + thud * 0.45})`,
              }}
            />
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: DRIED_CRIMSON,
                transform: `scaleY(${0.75 + subThud * 0.45})`,
              }}
            />
          </div>
          <span
            style={{
              fontFamily,
              color: PARCHMENT_CREAM,
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

        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(7, 5, 4, 0.88)",
            borderLeft: `5px solid ${accent}`,
            borderBottom: `2px solid ${DRIED_CRIMSON}`,
            transform: `translateX(${enterGlide * -45}px)`,
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
              color: GUNPOWDER_SMOKE,
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
  );
};

export const ThomasShelbyPeakyAura: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#070504" overlap={OVERLAP_FRAMES} Scene={Scene} />
);
