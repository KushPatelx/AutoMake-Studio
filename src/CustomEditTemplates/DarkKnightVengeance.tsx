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
import { loadFont } from "@remotion/google-fonts/Teko";

const { fontFamily } = loadFont("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const ABYSS = "#020205";
const CRIMSON = "#DC0E2A";
const AMBER = "#FF9900";
const STEEL = "#7C98B3";
const WHITE = "#F4F7FA";

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

  const accent = brand.color || CRIMSON;
  const brandName = brand.name || "VENGEANCE";

  // ================================================
  // 01. GOTHAM BEAT & SUB-HARMONIC AUDIO MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 2.5);
  const offBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.5);
  const rapidPulse = beatPulse(g * 2, bpm, 1.2);

  // ================================================
  // 02. ENTER / EXIT SPRINGS & TIMING CURVES
  // ================================================
  const enter = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 250, mass: 0.42 },
  });

  const exit = interpolate(
    frame,
    [Math.max(0, duration - 11), duration],
    [0, 1],
    CLAMP
  );

  const visible = 1 - exit;

  // ================================================
  // 03. AGGRESSIVE 9:16 CAMERA & WRAP KINEMATICS
  // ================================================
  // Always >= 1.15 so edge shakes/rotations NEVER expose black bars
  const slowCreep = interpolate(frame, [0, duration], [1.15, 1.29], CLAMP);
  const warpZoomIn = (1 - enter) * 0.48;
  const warpZoomOut = Math.pow(exit, 2.2) * 0.55;
  const beatPunch = impact * 0.11 + pulse * 0.04;
  const cameraScale = slowCreep + warpZoomIn + warpZoomOut + beatPunch;

  const dir = index % 2 === 0 ? 1 : -1;
  const slideWrapX =
    (1 - enter) * 420 * dir - Math.pow(exit, 2) * 460 * dir;
  const slideWrapY =
    (1 - enter) * -220 * dir + Math.pow(exit, 2) * 240 * dir;

  const trauma = impact * 26 + pulse * 9;
  const shakeX =
    (Math.sin(g * 2.3) * trauma + (random(`sx-${g}`) - 0.5) * impact * 30) *
    visible;
  const shakeY =
    (Math.cos(g * 1.9) * trauma + (random(`sy-${g}`) - 0.5) * impact * 26) *
    visible;

  const camX = slideWrapX + shakeX;
  const camY = slideWrapY + shakeY;

  const camRot =
    (1 - enter) * 12 * dir +
    Math.pow(exit, 2) * -15 * dir +
    Math.sin(g * 0.25) * 1.8 +
    (random(`sr-${g}`) - 0.5) * impact * 6;

  // ================================================
  // 04. MULTI-MODE WRAP & SLIDE TRANSITION MASKS
  // ================================================
  const cutType = index % 4;
  const wrapInset = interpolate(enter, [0, 1], [46, 0], CLAMP);

  // 4-Slice Bat-Blade Stagger
  const blade1 = interpolate(frame, [0, 5], [105, 0], CLAMP);
  const blade2 = interpolate(frame, [1, 6], [-105, 0], CLAMP);
  const blade3 = interpolate(frame, [2, 7], [105, 0], CLAMP);
  const blade4 = interpolate(frame, [3, 8], [-105, 0], CLAMP);

  // Diagonal Wing Wrap Polygon
  const wingSpread = interpolate(enter, [0, 1], [48, 0], CLAMP);
  const wingPolygon = `polygon(
    ${wingSpread}% 0%,
    ${100 - wingSpread}% 0%,
    100% ${wingSpread}%,
    100% ${100 - wingSpread}%,
    ${100 - wingSpread}% 100%,
    ${wingSpread}% 100%,
    0% ${100 - wingSpread}%,
    0% ${wingSpread}%
  )`;

  // ================================================
  // 05. SHATTER GLASS EXIT ENGINE (8 RADIAL SHARDS)
  // ================================================
  const shards = Array.from({ length: 8 }, (_, i) => {
    const a1 = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    const mid = (a1 + a2) / 2;

    const x1 = 50 + Math.cos(a1) * 95;
    const y1 = 50 + Math.sin(a1) * 95;
    const x2 = 50 + Math.cos(a2) * 95;
    const y2 = 50 + Math.sin(a2) * 95;

    const power = Math.pow(exit, 1.65);
    const dist = power * (360 + (i % 3) * 130);
    const tx = Math.cos(mid) * dist;
    const ty = Math.sin(mid) * dist + power * 90;
    const rot = power * (28 + i * 9) * (i % 2 === 0 ? 1 : -1);
    const sc = 1 - power * 0.18;

    return {
      clipPath: `polygon(50% 50%, ${x1.toFixed(1)}% ${y1.toFixed(1)}%, ${x2.toFixed(1)}% ${y2.toFixed(1)}%)`,
      tx,
      ty,
      rot,
      sc,
    };
  });

  // ================================================
  // 06. GOTHAM RAIN, EMBERS & SHADOW BATS (OPTIMIZED)
  // ================================================
  const rainStreaks = Array.from({ length: 12 }, (_, i) => {
    const seed = i * 73 + index * 19;
    const x = ((random(`rx-${seed}`) * 1200 + g * 14) % 1240) - 80;
    const speed = 55 + random(`rs-${seed}`) * 35;
    const y = ((g * speed + random(`ry-${seed}`) * 2000) % 2300) - 200;
    const len = 110 + random(`rl-${seed}`) * 140 + impact * 80;
    const op = 0.18 + random(`ro-${seed}`) * 0.28 + pulse * 0.2;
    return { x, y, len, op };
  });

  const embers = Array.from({ length: 10 }, (_, i) => {
    const seed = i * 131 + index * 43;
    const baseAng = random(`ea-${seed}`) * Math.PI * 2;
    const ang = baseAng + g * 0.035 * (i % 2 === 0 ? 1 : -1);
    const rad = 160 + random(`er-${seed}`) * 520 + impact * 95;
    const x = Math.cos(ang) * rad;
    const y =
      Math.sin(ang) * rad * 1.4 - ((g * (6 + (i % 4) * 3)) % 400) + 200;
    const sz = 6 + random(`es-${seed}`) * 14 + pulse * 8;
    const col = i % 3 === 0 ? accent : i % 3 === 1 ? AMBER : WHITE;
    return { x, y, sz, col, rot: g * 7 * (i % 2 === 0 ? 1 : -1) };
  });

  const batSwarm = Array.from({ length: 6 }, (_, i) => {
    const seed = i * 59 + index * 11;
    const burst = frame < 14 ? interpolate(frame, [0, 14], [0, 1], CLAMP) : exit;
    const angle = (i / 6) * Math.PI * 2 + seed;
    const dist = burst * (680 + i * 90);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist * 1.2 - burst * 180;
    const flap = Math.sin(g * 1.6 + i * 2) * 28;
    const scale = interpolate(burst, [0, 0.3, 1], [0.2, 1.4, 0], CLAMP);
    return { x, y, flap, scale, rot: (angle * 180) / Math.PI + 90 };
  });

  // ================================================
  // 07. DARK KNIGHT COLOR GRADE & LIGHTNING FLASH MATH
  // ================================================
  const rgbSplit = impact * 30 + offBeat * 10 + exit * 40;
  const lightning =
    impact > 0.68 || (frame < 4 && index % 2 === 0)
      ? interpolate(impact, [0.68, 1], [0.25, 0.85], CLAMP)
      : 0;

  const imgFilter = `contrast(${1.28 + impact * 0.25}) saturate(${0.72 + pulse * 0.28}) brightness(${0.92 + impact * 0.18})`;

  return (
    <AbsoluteFill style={{ backgroundColor: ABYSS, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: DARK AMBIENT ECHO WRAP BACKDROP (GUARANTEES 9:16 BLEED)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${cameraScale * 1.18}) rotate(${-camRot * 0.5}deg)`,
          opacity: 0.38,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.6) saturate(0.4) brightness(0.45)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + WRAP/SLIDE ENGINE (ACTIVE BEFORE EXIT)
      ============================================ */}
      {exit === 0 && (
        <AbsoluteFill
          style={{
            transformOrigin: "center center",
            transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${cameraScale})`,
            clipPath:
              cutType === 1
                ? `inset(${wrapInset * 0.5}% ${wrapInset}% ${wrapInset * 0.5}% ${wrapInset}%)`
                : cutType === 2
                ? wingPolygon
                : undefined,
          }}
        >
          {cutType === 0 && frame < 9 ? (
            <AbsoluteFill>
              <AbsoluteFill
                style={{
                  clipPath: "inset(0% 0% 74.5% 0%)",
                  transform: `translateX(${blade1}%) skewX(-12deg)`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: imgFilter,
                  }}
                />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  clipPath: "inset(25% 0% 49.5% 0%)",
                  transform: `translateX(${blade2}%) skewX(12deg)`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: imgFilter,
                  }}
                />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  clipPath: "inset(50% 0% 24.5% 0%)",
                  transform: `translateX(${blade3}%) skewX(-12deg)`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: imgFilter,
                  }}
                />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  clipPath: "inset(75% 0% 0% 0%)",
                  transform: `translateX(${blade4}%) skewX(12deg)`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: imgFilter,
                  }}
                />
              </AbsoluteFill>
            </AbsoluteFill>
          ) : (
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: imgFilter,
              }}
            />
          )}

          {/* CRIMSON VENGEANCE RGB SPLIT */}
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: interpolate(impact, [0, 1], [0.15, 0.75], CLAMP),
              transform: `translate3d(${-rgbSplit}px, ${rgbSplit * 0.2}px, 0)`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "sepia(1) hue-rotate(-55deg) saturate(5) contrast(1.4)",
              }}
            />
          </AbsoluteFill>

          {/* GOTHAM STEEL-BLUE RGB SPLIT */}
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: interpolate(impact, [0, 1], [0.12, 0.65], CLAMP),
              transform: `translate3d(${rgbSplit}px, ${-rgbSplit * 0.2}px, 0)`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "sepia(1) hue-rotate(175deg) saturate(4) contrast(1.4)",
              }}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 03: SHATTER GLASS EXIT ENGINE (ACTIVE ON CUT EXIT)
      ============================================ */}
      {exit > 0 && (
        <AbsoluteFill
          style={{
            transformOrigin: "center center",
            transform: `translate3d(${camX * 0.4}px, ${camY * 0.4}px, 0) scale(${cameraScale})`,
          }}
        >
          {shards.map((sh, i) => (
            <AbsoluteFill
              key={`shard-${i}`}
              style={{
                clipPath: sh.clipPath,
                transformOrigin: "center center",
                transform: `translate3d(${sh.tx}px, ${sh.ty}px, 0) rotate(${sh.rot}deg) scale(${sh.sc})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: `contrast(1.45) saturate(0.8) brightness(${1.1 - exit * 0.4})`,
                }}
              />
              <AbsoluteFill
                style={{
                  backgroundColor: i % 2 === 0 ? accent : WHITE,
                  mixBlendMode: "overlay",
                  opacity: exit * 0.45,
                }}
              />
            </AbsoluteFill>
          ))}
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 04: HORIZONTAL GLITCH TEAR BARS ON BEAT IMPACT
      ============================================ */}
      {impact > 0.3 && (
        <AbsoluteFill
          style={{
            clipPath: `inset(${18 + ((g * 19) % 55)}% 0% ${22 + ((g * 23) % 50)}% 0%)`,
            transform: `translateX(${(random(`tear-${g}`) - 0.5) * 110}px) scale(${cameraScale * 1.05})`,
            mixBlendMode: "hard-light",
            opacity: impact * 0.9,
            pointerEvents: "none",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "invert(0.2) contrast(2) sepia(1) hue-rotate(-50deg) saturate(4)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 05: BAT-BLADE SLIDE PANELS & LASER SLASHES
      ============================================ */}
      <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
        {[accent, ABYSS, WHITE, accent].map((col, i) => {
          const sweep = interpolate(
            frame,
            [0, 4 + i, 10 + i],
            [1400 * (i % 2 === 0 ? 1 : -1), 0, -1500 * (i % 2 === 0 ? 1 : -1)],
            CLAMP
          );
          const op = interpolate(frame, [0, 3, 10], [0, 0.92, 0], CLAMP);
          return (
            <div
              key={`blade-${i}`}
              style={{
                position: "absolute",
                top: `${18 + i * 19}%`,
                left: "-20%",
                width: "140%",
                height: i % 2 === 0 ? 42 : 12,
                backgroundColor: col,
                clipPath: "polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)",
                transform: `translate3d(${sweep}px, 0, 0) rotate(-18deg)`,
                opacity: op,
                mixBlendMode: col === ABYSS ? "normal" : "screen",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: GOTHAM NOIR RAIN & RISING FIRE EMBERS
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: "rotate(11deg) scale(1.15)",
          pointerEvents: "none",
        }}
      >
        {rainStreaks.map((r, i) => (
          <div
            key={`rain-${i}`}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: 2,
              height: r.len,
              background: `linear-gradient(180deg, transparent, ${STEEL}, ${WHITE})`,
              opacity: r.op * visible,
              mixBlendMode: "screen",
            }}
          />
        ))}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {embers.map((em, i) => (
          <div
            key={`em-${i}`}
            style={{
              position: "absolute",
              width: em.sz,
              height: em.sz * 1.8,
              backgroundColor: em.col,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              transform: `translate3d(${em.x}px, ${em.y}px, 0) rotate(${em.rot}deg)`,
              opacity: (0.45 + pulse * 0.5) * visible,
              mixBlendMode: "screen",
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: BAT-COMPUTER TACTICAL HUD, SONAR & SWARM (SVG)
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
          style={{ opacity: 0.85 * visible }}
        >
          {/* Expanding Bat-Sonar Pulse Wave */}
          <circle
            cx="540"
            cy="960"
            r={interpolate(pulse, [0, 1], [720, 160], CLAMP)}
            fill="none"
            stroke={accent}
            strokeWidth={2 + impact * 14}
            opacity={impact * 0.75}
          />

          {/* Outer Detective Mode Rotating Ring */}
          <circle
            cx="540"
            cy="960"
            r={445 + pulse * 22}
            fill="none"
            stroke={STEEL}
            strokeWidth="3"
            strokeDasharray="16 32 60 32"
            style={{
              transformOrigin: "540px 960px",
              transform: `rotate(${g * 1.8}deg)`,
              opacity: 0.45,
            }}
          />

          {/* Crimson Target Lock Segmented Ring */}
          <circle
            cx="540"
            cy="960"
            r={335 - impact * 20}
            fill="none"
            stroke={accent}
            strokeWidth="9"
            strokeDasharray="110 190"
            style={{
              transformOrigin: "540px 960px",
              transform: `rotate(${-g * 3.6}deg) scale(${0.96 + impact * 0.12})`,
              opacity: 0.75,
            }}
          />

          {/* Sharp Gothic Target Crosshair */}
          <g
            stroke={WHITE}
            strokeWidth="4"
            opacity="0.6"
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${1 + impact * 0.15})`,
            }}
          >
            <path d="M 540 420 L 540 490 M 540 1430 L 540 1500 M 80 960 L 150 960 M 930 960 L 1000 960" />
            <path d="M 160 520 L 160 460 L 220 460" stroke={accent} strokeWidth="7" fill="none" />
            <path d="M 920 520 L 920 460 L 860 460" stroke={accent} strokeWidth="7" fill="none" />
            <path d="M 160 1400 L 160 1460 L 220 1460" stroke={accent} strokeWidth="7" fill="none" />
            <path d="M 920 1400 L 920 1460 L 860 1460" stroke={accent} strokeWidth="7" fill="none" />
          </g>

          {/* Center Bat-Crest Impact Silhouette (Flashes on Heavy Beat) */}
          <g
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.65 + impact * 1.25}) rotate(${camRot * 0.5}deg)`,
              opacity: impact * 0.55,
            }}
          >
            <path
              d="M 540 910 L 558 935 L 580 905 L 592 940 L 740 915 C 690 955 665 985 650 1020 C 610 995 575 1005 540 1045 C 505 1005 470 995 430 1020 C 415 985 390 955 340 915 L 488 940 L 500 905 L 522 935 Z"
              fill="none"
              stroke={accent}
              strokeWidth="8"
            />
          </g>

          {/* Flying Bat Swarm on Transition */}
          {batSwarm.map((b, i) => (
            <g
              key={`bat-${i}`}
              style={{
                transformOrigin: "540px 960px",
                transform: `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.rot}deg) scale(${b.scale})`,
              }}
            >
              <path
                d={`M 540 ${950 + b.flap * 0.2} L 555 960 L 620 ${930 - b.flap} L 585 975 L 540 968 L 495 975 L 460 ${930 - b.flap} L 525 960 Z`}
                fill={i % 2 === 0 ? accent : ABYSS}
                stroke={WHITE}
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Shatter Cracks Overlay on Exit */}
          {exit > 0.05 && (
            <g
              stroke={WHITE}
              strokeWidth={2 + exit * 5}
              opacity={exit * 0.85}
            >
              <line x1="540" y1="960" x2="120" y2="220" />
              <line x1="540" y1="960" x2="980" y2="310" />
              <line x1="540" y1="960" x2="1040" y2="1120" />
              <line x1="540" y1="960" x2="860" y2="1780" />
              <line x1="540" y1="960" x2="190" y2="1690" />
              <line x1="540" y1="960" x2="40" y2="890" />
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 08: GOTHAM NOIR VIGNETTE, SEARCHLIGHT & LIGHTNING
      ============================================ */}
      {/* Deep Noir Shadow Vignette (Preserves full 9:16 portrait center) */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(2,2,5,0.55) 76%, rgba(2,2,5,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Sweeping Gotham Sky Searchlight Beam */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${115 + Math.sin(g * 0.05) * 25}deg, transparent 25%, ${WHITE}22 48%, ${accent}33 50%, transparent 72%)`,
          mixBlendMode: "screen",
          opacity: 0.4 + pulse * 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Gotham Thunderstorm Lightning Strike */}
      <AbsoluteFill
        style={{
          backgroundColor: WHITE,
          mixBlendMode: "overlay",
          opacity: lightning,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: accent,
          mixBlendMode: "screen",
          opacity: impact * 0.32,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: PULSING ARMOR TECH FRAME
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${4 + impact * 10}px solid ${accent}`,
          opacity: 0.35 + pulse * 0.55,
          transform: `scale(${0.986 - pulse * 0.008})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 10: SAFE ZONE BRAND WATERMARK & BAT-HUD
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
        {/* TOP-LEFT DARK KNIGHT BRAND WATERMARK */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 22px",
            backgroundColor: "rgba(2, 2, 5, 0.85)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `2px solid ${STEEL}`,
            clipPath: "polygon(0 0, 96% 0, 100% 28%, 100% 100%, 4% 100%, 0 72%)",
            transform: `translateY(${interpolate(enter, [0, 1], [-45, 0], CLAMP)}px) scale(${1 + pulse * 0.05})`,
          }}
        >
          <span style={{ fontSize: 28 }}>{"\u{1F987}"}</span>
          <span
            style={{
              fontFamily,
              color: WHITE,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: accent,
              transform: `rotate(45deg) scale(${0.8 + rapidPulse * 0.6})`,
            }}
          />
        </div>

        {/* BOTTOM-LEFT BAT-COMPUTER TELEMETRY (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "6px 18px",
            backgroundColor: "rgba(2, 2, 5, 0.78)",
            borderLeft: `5px solid ${accent}`,
            transform: `translateX(${interpolate(enter, [0, 1], [-50, 0], CLAMP)}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 32,
              fontWeight: 700,
              color: accent,
              letterSpacing: 4,
              lineHeight: 1.05,
            }}
          >
            {`CUT ${(index + 1).toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`}
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 22,
              fontWeight: 600,
              color: STEEL,
              letterSpacing: 3,
              lineHeight: 1,
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

export const DarkKnightVengeance: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#020205" overlap={0} Scene={Scene} />
);