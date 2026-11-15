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

// Sanctum palette: indigo void, sling-ring orange/gold, cloak crimson, parchment
const SANCTUM_VOID = "#07050C";
const SLING_ORANGE = "#E8892B";
const MYSTIC_GOLD = "#D9A441";
const CLOAK_CRIMSON = "#8E1B1B";
const ARCANE_INDIGO = "#2B2260";
const PARCHMENT_CREAM = "#F1E6CC";

const OVERLAP_FRAMES = 10;
const WIPE_FEATHER = 26;

// Portal centers alternate every cut so no two portals open the same way
const PORTAL_CENTERS = [
  { x: 540, y: 960 },
  { x: 340, y: 710 },
  { x: 740, y: 1210 },
  { x: 340, y: 1210 },
  { x: 740, y: 710 },
  { x: 540, y: 820 },
];

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

  const accent = brand.color || SLING_ORANGE;
  const brandName = brand.name || "SORCERER SUPREME";

  // ================================================
  // 01. BEAT SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const thud = beatPulseAt(g, beatFrames, 3.1);
  const sub = beatPulseAt(g + 5, beatFrames, 1.6);
  const candle =
    0.9 + Math.sin(g * 0.29) * 0.05 + (random(`cdl-${g}`) - 0.5) * 0.06;

  // ================================================
  // 02. VELOCITY RAMP + LANDING
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const drift =
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

  const landSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 170, mass: 0.7 },
  });
  const enterGlide = isFirst ? 0 : Math.max(0, 1 - landSpring);
  const exitGlide = Math.pow(exitCut, 2.2);
  const warpEnergy = Math.min(1, enterGlide + exitGlide);

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

  // ================================================
  // 03. CAMERA: slow dolly + mirror-dimension drift + beat impact
  // ================================================
  const baseScale = interpolate(drift, [0, 1], [1.18, 1.28], CLAMP);
  const totalScale = Math.max(
    1.16,
    baseScale +
      enterGlide * 0.1 +
      exitGlide * 0.12 +
      thud * 0.045 +
      pulse * 0.01,
  );

  const camX =
    vec.vx * enterGlide * 120 -
    vec.vx * exitGlide * 70 +
    Math.sin(g * 0.06) * 6 +
    Math.sin(g * 2.7) * thud * 16 +
    (random(`bsx-${g}`) - 0.5) * thud * 12;
  const camY =
    vec.vy * enterGlide * 150 -
    vec.vy * exitGlide * 90 +
    Math.cos(g * 0.05) * 5 +
    thud * 12 +
    Math.cos(g * 2.3) * thud * 14 +
    (random(`bsy-${g}`) - 0.5) * thud * 12;
  const camRot =
    vec.rot * 0.25 * enterGlide -
    vec.rot * 0.35 * exitGlide +
    Math.sin(g * 0.04) * 1.0 +
    (random(`bsr-${g}`) - 0.5) * thud * 1.8;

  // ================================================
  // 04. SLING-RING PORTAL TRANSITION
  //     New shot opens inside a growing portal. Spinning rune rings and
  //     orange sparks ride the edge. Old shot twists away and dims.
  // ================================================
  const wipeActive = !isFirst && frame < OVERLAP_FRAMES;
  const wipeT = interpolate(frame, [0, OVERLAP_FRAMES - 1], [0, 1], CLAMP);
  const wipeE =
    wipeT < 0.5
      ? 4 * wipeT * wipeT * wipeT
      : 1 - Math.pow(-2 * wipeT + 2, 3) / 2;
  const portal = PORTAL_CENTERS[index % PORTAL_CENTERS.length];
  const wipeR = 120 + wipeE * 1460;
  const wipeMask = wipeActive
    ? `radial-gradient(circle at ${portal.x}px ${portal.y}px, #000 ${wipeR}px, transparent ${
        wipeR + WIPE_FEATHER
      }px)`
    : undefined;
  const ringOpacity = interpolate(
    wipeT,
    [0, 0.1, 0.8, 1],
    [0, 1, 1, 0],
    CLAMP,
  );

  const portalSparks = wipeActive
    ? Array.from({ length: 40 }, (_, i) => {
        const k = `ps-${index}-${i}`;
        const phase = (frame * 0.16 + random(`${k}-p`)) % 1;
        const ang =
          (i / 40) * Math.PI * 2 +
          random(`${k}-a`) * 0.4 +
          frame * 0.12 * (i % 2 === 0 ? 1 : -1);
        const rr = wipeR + 10 + phase * (40 + random(`${k}-r`) * 70);
        const x = portal.x + Math.cos(ang) * rr;
        const y = portal.y + Math.sin(ang) * rr;
        const len = 14 + random(`${k}-l`) * 26;
        return {
          x1: x,
          y1: y,
          x2: x - Math.sin(ang) * len,
          y2: y + Math.cos(ang) * len,
          op: (1 - phase) * ringOpacity,
          col: i % 3 === 0 ? PARCHMENT_CREAM : i % 3 === 1 ? accent : MYSTIC_GOLD,
          w: 1.5 + random(`${k}-w`) * 2.2,
        };
      })
    : [];

  // ================================================
  // 05. GRADE: indigo shadows, amber lights, readable (no heavy darkening)
  // ================================================
  const lamp = isFirst ? 0 : Math.exp(-frame / 5) * 0.1;
  const grade = `contrast(${1.12 + thud * 0.08}) saturate(${
    1.08 + pulse * 0.1
  }) brightness(${(1.04 + lamp + thud * 0.08) * candle})`;
  const echo = thud * 26 + warpEnergy * 10;

  // ================================================
  // 06. MANDALA GEOMETRY (shield sigil) + FLOATING SPARKS
  // ================================================
  const sq = (off: number, r: number) =>
    [0, 1, 2, 3]
      .map((k) => {
        const a = ((k * 90 + off) * Math.PI) / 180;
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
      })
      .join(" ");

  const outerTicks = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const r1 = 382;
    const r2 = i % 3 === 0 ? 440 : 418;
    return {
      x1: Math.cos(a) * r1,
      y1: Math.sin(a) * r1,
      x2: Math.cos(a) * r2,
      y2: Math.sin(a) * r2,
      main: i % 3 === 0,
    };
  });
  const runes = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 262;
    const r2 = r1 + 10 + random(`rn-${i}`) * 22;
    return {
      x1: Math.cos(a) * r1,
      y1: Math.sin(a) * r1,
      x2: Math.cos(a) * r2,
      y2: Math.sin(a) * r2,
    };
  });

  const sparks = Array.from({ length: 56 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 3; // 0 diamond spark, 1 soft ember, 2 cream mote
    const sway =
      Math.sin(g * 0.05 + i * 1.3) * (45 + (i % 4) * 22) +
      Math.cos(g * 0.027 + i) * 24;
    const rawX = random(`sx-${seed}`) * 1080 + sway + camX * 0.18;
    const x = (((rawX % 1160) + 1160) % 1160) - 40;
    const speed =
      kind === 1 ? 2.4 + (i % 4) * 0.9 : 3.4 + (i % 5) * 1.3 + warpEnergy * 3;
    const y = 1980 - ((g * speed + random(`sy-${seed}`) * 2000) % 2120);
    const size = kind === 0 ? 6 + (i % 4) * 2.5 : kind === 1 ? 5 + (i % 3) * 2 : 3;
    const rot = g * (3 + (i % 4) * 2) * (i % 2 === 0 ? 1 : -1);
    const flick = 0.55 + random(`sf-${seed}-${Math.floor(g / 3)}`) * 0.45;
    const col =
      kind === 0 ? (i % 2 === 0 ? accent : MYSTIC_GOLD) : kind === 1 ? SLING_ORANGE : PARCHMENT_CREAM;
    return { x, y, size, rot, flick, col, kind };
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundColor: SANCTUM_VOID,
          overflow: "hidden",
          WebkitMaskImage: wipeMask,
          maskImage: wipeMask,
        }}
      >
        {/* ============================================
            LAYER 01: BACKDROP (full-bleed safety)
        ============================================ */}
        <AbsoluteFill
          style={{
            transform: `scale(${totalScale * 1.24}) rotate(${-camRot * 0.45}deg)`,
            opacity: 0.42,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "contrast(1.4) saturate(0.7) brightness(0.45) blur(6px)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 02: HERO + CAMERA RIG + TIME-STONE AFTERIMAGES
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
              filter: grade,
            }}
          />
          <AbsoluteFill
            style={{ mixBlendMode: "overlay", opacity: 0.3 + pulse * 0.1 }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(1) contrast(1.7) brightness(1.02)",
              }}
            />
          </AbsoluteFill>

          {echo > 4 && (
            <>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: Math.min(0.2, echo * 0.006),
                  transform: `translate3d(${-echo * dir}px, ${-echo * 0.3}px, 0) rotate(${
                    -echo * 0.04 * dir
                  }deg) scale(${1 + echo * 0.0015})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "sepia(1) saturate(2.2) contrast(1.2) brightness(0.9)",
                  }}
                />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: Math.min(0.16, echo * 0.005),
                  transform: `translate3d(${echo * dir}px, ${echo * 0.3}px, 0) rotate(${
                    echo * 0.04 * dir
                  }deg) scale(${1 + echo * 0.0025})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "grayscale(0.4) sepia(0.6) hue-rotate(200deg) saturate(1.4) brightness(0.8)",
                  }}
                />
              </AbsoluteFill>
            </>
          )}
        </AbsoluteFill>

        {/* ============================================
            LAYER 03: SPLIT-TONE (indigo shadows / amber lights)
        ============================================ */}
        <AbsoluteFill
          style={{
            background: `linear-gradient(160deg, ${ARCANE_INDIGO}99 0%, transparent 48%, ${SLING_ORANGE}55 100%)`,
            mixBlendMode: "soft-light",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />

        {/* Mystic haze: slow drifting amber nebula */}
        <AbsoluteFill
          style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: 0.16 + sub * 0.05 }}
        >
          <svg
            width="1500"
            height="2200"
            style={{
              position: "absolute",
              left: -210,
              top: -140,
              transform: `translate(${frame * 0.8 * dir}px, ${-frame * 0.9}px)`,
            }}
          >
            <filter
              id={`strange-haze-${index}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1500"
              height="2200"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.004 0.01"
                numOctaves="4"
                seed={index * 7 + 3}
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.85  0 0 0 0 0.52  0 0 0 0 0.22  2.2 0 0 0 -0.95"
              />
            </filter>
            <rect
              width="1500"
              height="2200"
              filter={`url(#strange-haze-${index})`}
            />
          </svg>
        </AbsoluteFill>

        {/* ============================================
            LAYER 04: SHIELD MANDALA (rotates always, flares on the beat)
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
              opacity: 0.2 + thud * 0.36 + pulse * 0.08,
            }}
          >
            <g
              transform={`translate(540 960) rotate(${g * 0.35 * dir}) scale(${
                1 + thud * 0.06
              })`}
            >
              <circle r="470" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="6 10" />
              <circle r="450" fill="none" stroke={PARCHMENT_CREAM} strokeWidth="1.5" opacity="0.6" />
              <circle
                r="360"
                fill="none"
                stroke={MYSTIC_GOLD}
                strokeWidth="2.5"
                strokeDasharray="30 12 4 12"
                strokeDashoffset={g * 1.5}
              />
              {outerTicks.map((t, i) => (
                <line
                  key={`tick-${i}`}
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke={t.main ? accent : PARCHMENT_CREAM}
                  strokeWidth={t.main ? 3 : 1.5}
                  opacity={t.main ? 0.95 : 0.55}
                />
              ))}
              <g transform={`rotate(${-g * 0.7 * dir})`}>
                <polygon points={sq(0, 330)} fill="none" stroke={accent} strokeWidth="3" />
                <polygon points={sq(45, 330)} fill="none" stroke={MYSTIC_GOLD} strokeWidth="3" />
                <circle r="250" fill="none" stroke={PARCHMENT_CREAM} strokeWidth="1.5" opacity="0.7" />
                {runes.map((r, i) => (
                  <line
                    key={`rune-${i}`}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke={accent}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                ))}
                <circle r="170" fill="none" stroke={accent} strokeWidth="2.5" strokeDasharray="3 14" />
              </g>
            </g>
          </svg>
        </AbsoluteFill>

        {/* ============================================
            LAYER 05: SLING-RING SPARKS (floating, many)
        ============================================ */}
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
          {sparks.map((sp, i) => (
            <div
              key={`strange-spark-${i}`}
              style={{
                position: "absolute",
                left: sp.x,
                top: sp.y,
                width: sp.size,
                height: sp.kind === 0 ? sp.size * 2.3 : sp.size,
                backgroundColor: sp.col,
                borderRadius: sp.kind === 0 ? 0 : "50%",
                clipPath:
                  sp.kind === 0
                    ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                    : undefined,
                boxShadow:
                  sp.kind === 1 ? `0 0 ${sp.size * 2}px ${sp.col}77` : undefined,
                transform: `rotate(${sp.rot}deg)`,
                opacity: (sp.kind === 2 ? 0.55 : 0.55 + sp.flick * 0.4) + sub * 0.1,
              }}
            />
          ))}
        </AbsoluteFill>

        {/* ============================================
            LAYER 06: VIGNETTE, BEAT BLOOM, EXIT DIM
        ============================================ */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 46%, transparent ${
              40 + pulse * 2
            }%, rgba(7,5,12,0.42) 74%, rgba(7,5,12,0.9) 100%)`,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, ${SLING_ORANGE}55 0%, ${CLOAK_CRIMSON}22 38%, transparent 62%)`,
            mixBlendMode: "screen",
            opacity: thud * 0.4,
            pointerEvents: "none",
          }}
        />
        {exitCut > 0 && (
          <AbsoluteFill
            style={{
              backgroundColor: SANCTUM_VOID,
              opacity: exitCut * 0.5,
              pointerEvents: "none",
            }}
          />
        )}

        {/* ============================================
            LAYER 07: SAFE ZONE BRAND + TELEMETRY
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
              backgroundColor: "rgba(7, 5, 12, 0.9)",
              borderLeft: `7px solid ${accent}`,
              borderRight: `3px solid ${CLOAK_CRIMSON}`,
              clipPath:
                "polygon(0 0, 95% 0, 100% 34%, 100% 100%, 5% 100%, 0 66%)",
              transform: `translateX(${enterGlide * -60}px) scale(${
                1 + thud * 0.05
              })`,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: CLOAK_CRIMSON,
                  transform: `scaleY(${0.75 + pulse * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: PARCHMENT_CREAM,
                  transform: `scaleY(${0.75 + thud * 0.45})`,
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 22,
                  backgroundColor: accent,
                  transform: `scaleY(${0.75 + sub * 0.45})`,
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
              backgroundColor: "rgba(7, 5, 12, 0.86)",
              borderLeft: `6px solid ${CLOAK_CRIMSON}`,
              borderTop: `2px solid ${accent}`,
              transform: `translateX(${enterGlide * -50}px)`,
            }}
          >
            <div
              style={{
                fontFamily,
                fontSize: 24,
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
                color: PARCHMENT_CREAM,
                letterSpacing: 3,
                opacity: 0.9,
              }}
            >
              {`TC ${(g / fps).toFixed(2)}S // ${bpm} BPM`}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 6, left: 16, right: 16 }}>
            <ProgressBar
              progress={(g / Math.max(1, totalFrames)) * 100}
              accent={accent}
              height={6}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ============================================
          PORTAL RINGS + EDGE SPARKS (outside the mask so never clipped)
      ============================================ */}
      {wipeActive && ringOpacity > 0.01 && (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: ringOpacity }}>
          <svg width="1080" height="1920" viewBox="0 0 1080 1920">
            <circle
              cx={portal.x}
              cy={portal.y}
              r={wipeR + 10}
              fill="none"
              stroke={accent}
              strokeWidth={30}
              opacity={0.2}
            />
            <circle
              cx={portal.x}
              cy={portal.y}
              r={wipeR + 10}
              fill="none"
              stroke={accent}
              strokeWidth={8}
              opacity={0.95}
            />
            <circle
              cx={portal.x}
              cy={portal.y}
              r={wipeR + 10}
              fill="none"
              stroke={PARCHMENT_CREAM}
              strokeWidth={2}
            />
            <circle
              cx={portal.x}
              cy={portal.y}
              r={Math.max(1, wipeR - 18)}
              fill="none"
              stroke={MYSTIC_GOLD}
              strokeWidth={14}
              strokeDasharray="3 16"
              strokeDashoffset={-frame * 14}
              opacity={0.85}
            />
            <circle
              cx={portal.x}
              cy={portal.y}
              r={Math.max(1, wipeR - 46)}
              fill="none"
              stroke={accent}
              strokeWidth={3}
              strokeDasharray="60 24 10 24"
              strokeDashoffset={frame * 18}
              opacity={0.7}
            />
            {portalSparks.map((s, i) => (
              <line
                key={`portal-spark-${i}`}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={s.col}
                strokeWidth={s.w}
                strokeLinecap="round"
                opacity={s.op}
              />
            ))}
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const DoctorStrangeSanctumAura: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#07050C" overlap={OVERLAP_FRAMES} Scene={Scene} />
);