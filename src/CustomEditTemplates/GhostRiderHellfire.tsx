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
import { loadFont } from "@remotion/google-fonts/MetalMania";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const ABYSS_BLACK = "#040100";
const HELLFIRE_ORANGE = "#FF4500";
const BRIMSTONE_RED = "#D90404";
const MOLTEN_YELLOW = "#FFB700";
const SOUL_WHITE = "#FFF8E7";
const ABYSS_TEAL = "#003B46";

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

  const accent = brand.color || HELLFIRE_ORANGE;
  const brandName = brand.name || "SPIRIT OF VENGEANCE";

  // ================================================
  // 01. HELLFIRE BEAT & ENGINE REV SYNCHRONIZATION
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 2.9);
  const subBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.7);
  const chainRattle = beatPulse(g * 2, bpm, 1.4);

  // ================================================
  // 02. VELOCITY SPEED RAMPING (HELL-CYCLE THROTTLE S-CURVE)
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const velocityFlow =
    u < 0.22
      ? interpolate(u, [0, 0.22], [0, 0.46], CLAMP)
      : u < 0.78
      ? interpolate(u, [0.22, 0.78], [0.46, 0.54], CLAMP)
      : interpolate(u, [0.78, 1], [0.54, 1], CLAMP);

  const enterBurn = Math.pow(interpolate(frame, [0, 8], [1, 0], CLAMP), 2.4);
  const exitBurn = Math.pow(
    interpolate(frame, [Math.max(0, duration - 8), duration], [0, 1], CLAMP),
    2.4
  );
  const burnSpike = Math.min(1, enterBurn + exitBurn);

  // ================================================
  // 03. HEAVY EARTH-SHAKE & 9:16 FULL-BLEED CAMERA RIG
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;

  // Always >= 1.18 scale so violent shakes/rotations NEVER expose black bars on 9:16
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.35], CLAMP);
  const throttleZoom = enterBurn * 0.65 + exitBurn * 0.75 + impact * 0.14;
  const totalScale = baseScale + throttleZoom + pulse * 0.045;

  const whipX = (enterBurn * 520 - exitBurn * 580) * dir;
  const whipY = (enterBurn * -260 + exitBurn * 300) * dir;

  // Heavy Earth-Shake on Beat Impact
  const earthQuake = impact * 38 + burnSpike * 22 + pulse * 8;
  const shakeX =
    Math.sin(g * 3.2) * earthQuake + (random(`grx-${g}`) - 0.5) * impact * 34;
  const shakeY =
    Math.cos(g * 2.7) * earthQuake + (random(`gry-${g}`) - 0.5) * impact * 30;

  const camX = whipX + shakeX;
  const camY = whipY + shakeY;

  const camRot =
    (enterBurn * 15 - exitBurn * 18) * dir +
    Math.sin(g * 0.28) * 2.2 +
    (random(`grr-${g}`) - 0.5) * impact * 7.5;

  // ================================================
  // 04. PROCEDURAL FIRE DISSOLVE & MELTED FILM TRANSITION
  // ================================================
  // Generates a jagged 12-peak flame wave that engulfs the screen during cuts
  const dissolveLevel = interpolate(
    burnSpike,
    [0, 1],
    [-15, 115],
    CLAMP
  );

  const buildFlamePolygon = (offset: number, amp: number) => {
    let pts = "0% 0%, 100% 0%, ";
    for (let i = 10; i >= 0; i--) {
      const px = i * 10;
      const flicker = Math.sin(g * 0.85 + i * 1.9 + index) * amp;
      const py = Math.max(
        0,
        Math.min(100, 100 - (dissolveLevel + offset + flicker))
      );
      pts += `${px}% ${py.toFixed(1)}%${i > 0 ? ", " : ""}`;
    }
    return `polygon(${pts})`;
  };

  // Hero image clips inside the unburned region; glowing magma peeks around the edges
  const heroFlameClip =
    burnSpike > 0.02 ? buildFlamePolygon(0, 14) : undefined;
  const charEdgeClip =
    burnSpike > 0.02 ? buildFlamePolygon(-9, 18) : undefined;
  const magmaEdgeClip =
    burnSpike > 0.02 ? buildFlamePolygon(-18, 22) : undefined;

  // ================================================
  // 05. HELLISH COLOR GRADING (ORANGE & TEAL / BLACK & RED)
  // ================================================
  const hdrContrast = 1.44 + impact * 0.35;
  const hdrSat = 1.28 + pulse * 0.38;
  const hdrBright = 0.94 + impact * 0.32 + burnSpike * 0.28;
  const hellishFilter = `contrast(${hdrContrast}) saturate(${hdrSat}) brightness(${hdrBright}) sepia(0.22) hue-rotate(-10deg)`;

  // ================================================
  // 06. FLOATING SPARK / ASH PARTICLES (RISING CONVECTION)
  // ================================================
  const sparks = Array.from({ length: 16 }, (_, i) => {
    const seed = i * 79 + index * 31;
    const sway = Math.sin(g * 0.09 + i * 1.4) * (55 + (i % 3) * 35);
    const x =
      ((random(`spx-${seed}`) * 1080 + sway + camX * 0.25) % 1160) - 40;
    const speed = 18 + (i % 5) * 8 + burnSpike * 32;
    const y = 1980 - ((g * speed + random(`spy-${seed}`) * 1920) % 2120);
    const size = 6 + (i % 4) * 5 + pulse * 8;
    const rot = g * (5 + (i % 4) * 3) * (i % 2 === 0 ? 1 : -1);
    const col =
      i % 4 === 0
        ? SOUL_WHITE
        : i % 3 === 0
        ? MOLTEN_YELLOW
        : i % 2 === 0
        ? accent
        : BRIMSTONE_RED;
    return { x, y, size, rot, col };
  });

  // ================================================
  // 07. GHOST TRAILS & PENANCE STARE SKULL DISTORTION MATH
  // ================================================
  const trailPower = Math.min(1, impact * 0.95 + burnSpike * 0.9);
  const skullFlash =
    impact > 0.48
      ? interpolate(impact, [0.48, 1], [0, 0.92], CLAMP)
      : frame < 3 && index % 2 === 0
      ? 0.85
      : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: ABYSS_BLACK, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: HELLFIRE CORE AMBIENT BACKDROP (100% 9:16 GUARANTEE)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.22}) rotate(${-camRot * 0.5}deg)`,
          opacity: 0.55,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter:
              "invert(0.15) sepia(1) hue-rotate(-50deg) saturate(6) contrast(1.8) brightness(0.65)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: FIRE DISSOLVE MELTED FILM LAYERS (MAGMA & CHAR RIMS)
      ============================================ */}
      {burnSpike > 0.02 && (
        <>
          {/* Outer White-Hot Magma Dissolve Lip */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(0deg, ${SOUL_WHITE} 0%, ${MOLTEN_YELLOW} 45%, ${accent} 100%)`,
              clipPath: magmaEdgeClip,
              mixBlendMode: "screen",
            }}
          />
          {/* Mid Scorched Crimson Blister Lip */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(0deg, ${MOLTEN_YELLOW} 0%, ${BRIMSTONE_RED} 65%, ${ABYSS_BLACK} 100%)`,
              clipPath: charEdgeClip,
            }}
          />
        </>
      )}

      {/* ============================================
          LAYER 03: HERO 9:16 PORTRAIT + FIRE DISSOLVE MASK + CAMERA RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
          clipPath: heroFlameClip,
        }}
      >
        {/* Base Hellish HDR Graded Image */}
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: hellishFilter,
          }}
        />

        {/* High-Contrast HDR Grit & Crushed Black Overlay Pass */}
        <AbsoluteFill
          style={{
            mixBlendMode: "overlay",
            opacity: 0.52 + pulse * 0.25,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(1) contrast(2.5) brightness(0.9)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 04: GHOST TRAILS (HIGH-VELOCITY FLAME MOTION ECHOES)
        ============================================ */}
        {trailPower > 0.05 && (
          <>
            {/* Trail 1: Molten Yellow Afterimage */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: trailPower * 0.44,
                transform: `translate3d(${-trailPower * 38 * dir}px, ${-trailPower * 22}px, 0) scale(${1 + trailPower * 0.06}) rotate(${-trailPower * 2.2}deg)`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(-35deg) saturate(5.5) contrast(1.6)",
                }}
              />
            </AbsoluteFill>

            {/* Trail 2: Brimstone Red Afterimage */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: trailPower * 0.35,
                transform: `translate3d(${trailPower * 42 * dir}px, ${-trailPower * 36}px, 0) scale(${1 + trailPower * 0.12}) rotate(${trailPower * 3.4}deg)`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(-55deg) saturate(6.5) contrast(1.7)",
                }}
              />
            </AbsoluteFill>

            {/* Trail 3: Deep Hellfire Radial Zoom Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "lighten",
                opacity: trailPower * 0.28,
                transform: `scale(${1 + trailPower * 0.19})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.9) saturate(2.2) brightness(1.15)",
                }}
              />
            </AbsoluteFill>
          </>
        )}

        {/* ============================================
            LAYER 05: PENANCE STARE X-RAY BURN FLASH
        ============================================ */}
        {skullFlash > 0.05 && (
          <AbsoluteFill
            style={{
              opacity: skullFlash * 0.68,
              mixBlendMode: "hard-light",
              transform: `scale(${1 + skullFlash * 0.04})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "invert(1) sepia(1) hue-rotate(-50deg) saturate(7) contrast(2.8)",
              }}
            />
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: GLITCH & SKULL DISTORTION TEAR BARS
      ============================================ */}
      {(impact > 0.26 || chainRattle > 0.78) && (
        <AbsoluteFill
          style={{
            clipPath: `inset(${18 + ((g * 19) % 54)}% 0% ${22 + ((g * 23) % 48)}% 0%)`,
            transform: `translateX(${(random(`gr-tear-${g}`) - 0.5) * 130}px) scale(${totalScale * 1.05}) skewX(${(random(`gr-sk-${g}`) - 0.5) * 16}deg)`,
            mixBlendMode: "hard-light",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter:
                "invert(0.9) sepia(1) hue-rotate(-50deg) saturate(6) contrast(2.4)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 07: CORE HELLFIRE, CHAINS & FLAMING SKULL OVERLAY (SVG)
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
            transform: `translate3d(${camX * 0.22}px, ${camY * 0.22}px, 0)`,
          }}
        >
          {/* ROARING BOTTOM HELLFIRE TONGUES */}
          <g
            style={{
              transformOrigin: "540px 1920px",
              transform: `scaleY(${0.75 + pulse * 0.45 + burnSpike * 0.8})`,
            }}
          >
            <path
              d={`M -60 1920 Q 120 ${1580 - Math.sin(g * 0.5) * 110} 280 1920 Q 440 ${1490 - Math.cos(g * 0.6) * 130} 580 1920 Q 740 ${1540 - Math.sin(g * 0.7) * 120} 900 1920 Q 1020 ${1600 - Math.cos(g * 0.5) * 100} 1140 1920 Z`}
              fill={BRIMSTONE_RED}
              opacity={0.55}
            />
            <path
              d={`M -20 1920 Q 180 ${1660 - Math.cos(g * 0.65) * 95} 360 1920 Q 540 ${1560 - Math.sin(g * 0.55) * 115} 720 1920 Q 880 ${1650 - Math.cos(g * 0.6) * 90} 1100 1920 Z`}
              fill={accent}
              opacity={0.75}
            />
            <path
              d={`M 60 1920 Q 260 ${1740 - Math.sin(g * 0.75) * 80} 480 1920 Q 640 ${1680 - Math.cos(g * 0.7) * 90} 840 1920 Q 960 ${1760 - Math.sin(g * 0.6) * 70} 1060 1920 Z`}
              fill={MOLTEN_YELLOW}
              opacity={0.85}
            />
          </g>

          {/* WHIPPING RED-HOT HELLFIRE CHAINS (DIAGONAL SLASHES) */}
          <g
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.94 + impact * 0.15}) rotate(${camRot * 0.3}deg)`,
            }}
          >
            {/* Chain 1: Outer Magma Glow -> Mid Orange -> White-Hot Link Core */}
            <line
              x1="-120"
              y1="1480"
              x2="1200"
              y2="440"
              stroke={BRIMSTONE_RED}
              strokeWidth={36 + impact * 24}
              strokeDasharray="48 26"
              strokeDashoffset={-g * 28}
              strokeLinecap="round"
              opacity={0.42 + impact * 0.4}
            />
            <line
              x1="-120"
              y1="1480"
              x2="1200"
              y2="440"
              stroke={accent}
              strokeWidth={16 + impact * 12}
              strokeDasharray="48 26"
              strokeDashoffset={-g * 28}
              strokeLinecap="round"
              opacity={0.85}
            />
            <line
              x1="-120"
              y1="1480"
              x2="1200"
              y2="440"
              stroke={SOUL_WHITE}
              strokeWidth={5 + impact * 4}
              strokeDasharray="30 44"
              strokeDashoffset={-g * 28}
              strokeLinecap="round"
              opacity={0.95}
            />

            {/* Chain 2: Crossing Counter-Chain */}
            <line
              x1="-120"
              y1="480"
              x2="1200"
              y2="1440"
              stroke={BRIMSTONE_RED}
              strokeWidth={32 + impact * 20}
              strokeDasharray="44 28"
              strokeDashoffset={g * 26}
              strokeLinecap="round"
              opacity={0.38 + impact * 0.4}
            />
            <line
              x1="-120"
              y1="480"
              x2="1200"
              y2="1440"
              stroke={MOLTEN_YELLOW}
              strokeWidth={13 + impact * 10}
              strokeDasharray="44 28"
              strokeDashoffset={g * 26}
              strokeLinecap="round"
              opacity={0.8}
            />
            <line
              x1="-120"
              y1="480"
              x2="1200"
              y2="1440"
              stroke={SOUL_WHITE}
              strokeWidth={4 + impact * 4}
              strokeDasharray="26 46"
              strokeDashoffset={g * 26}
              strokeLinecap="round"
              opacity={0.9}
            />

            {/* HELL-CYCLE SPEEDOMETER / BRIMSTONE VORTEX RING */}
            <circle
              cx="540"
              cy="960"
              r={395 + pulse * 26}
              fill="none"
              stroke={accent}
              strokeWidth={10 + impact * 12}
              strokeDasharray="90 50 20 50"
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${g * 3.6}deg)`,
                opacity: 0.65,
              }}
            />
            <circle
              cx="540"
              cy="960"
              r={315 - impact * 20}
              fill="none"
              stroke={MOLTEN_YELLOW}
              strokeWidth="6"
              strokeDasharray="140 180"
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${-g * 4.8}deg)`,
                opacity: 0.75,
              }}
            />
          </g>

          {/* SKULL DISTORTION & PENANCE STARE PHANTOM (FLASHES ON BEAT IMPACT) */}
          <g
            style={{
              transformOrigin: "540px 920px",
              transform: `translate3d(${(random(`skx-${g}`) - 0.5) * 45}px, ${(random(`sky-${g}`) - 0.5) * 35}px, 0) scale(${0.78 + impact * 1.15}) rotate(${(random(`skr-${g}`) - 0.5) * 14}deg)`,
              opacity: 0.16 + skullFlash * 0.78,
            }}
          >
            {/* Outer Hellfire Skull Crag Silhouette */}
            <path
              d="M 540 620 C 370 620 290 745 315 900 C 325 965 365 1015 395 1055 L 415 1195 L 665 1195 L 685 1055 C 715 1015 755 965 765 900 C 790 745 710 620 540 620 Z"
              fill="none"
              stroke={accent}
              strokeWidth={18 + impact * 16}
              strokeLinejoin="round"
            />
            <path
              d="M 540 620 C 370 620 290 745 315 900 C 325 965 365 1015 395 1055 L 415 1195 L 665 1195 L 685 1055 C 715 1015 755 965 765 900 C 790 745 710 620 540 620 Z"
              fill="none"
              stroke={SOUL_WHITE}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Blazing Left & Right Skull Eye Sockets */}
            <polygon
              points="375,850 485,820 495,915 395,930"
              fill={MOLTEN_YELLOW}
            />
            <polygon
              points="705,850 595,820 585,915 685,930"
              fill={MOLTEN_YELLOW}
            />
            <circle cx="445" cy="875" r={16 + impact * 25} fill={SOUL_WHITE} />
            <circle cx="635" cy="875" r={16 + impact * 25} fill={SOUL_WHITE} />
            {/* Nasal Cavity & Grimacing Jaw Teeth */}
            <polygon points="540,925 505,1010 575,1010" fill={BRIMSTONE_RED} />
            <line
              x1="445"
              y1="1095"
              x2="445"
              y2="1185"
              stroke={MOLTEN_YELLOW}
              strokeWidth="12"
            />
            <line
              x1="495"
              y1="1095"
              x2="495"
              y2="1185"
              stroke={MOLTEN_YELLOW}
              strokeWidth="12"
            />
            <line
              x1="540"
              y1="1095"
              x2="540"
              y2="1185"
              stroke={MOLTEN_YELLOW}
              strokeWidth="12"
            />
            <line
              x1="585"
              y1="1095"
              x2="585"
              y2="1185"
              stroke={MOLTEN_YELLOW}
              strokeWidth="12"
            />
            <line
              x1="635"
              y1="1095"
              x2="635"
              y2="1185"
              stroke={MOLTEN_YELLOW}
              strokeWidth="12"
            />
          </g>
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 08: FLOATING SPARK / ASH PARTICLES
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {sparks.map((sp, i) => (
          <div
            key={`gr-spark-${i}`}
            style={{
              position: "absolute",
              left: sp.x,
              top: sp.y,
              width: sp.size,
              height: sp.size * 2.5,
              backgroundColor: sp.col,
              clipPath: "polygon(50% 0%, 100% 45%, 50% 100%, 0% 45%)",
              transform: `rotate(${sp.rot}deg)`,
              opacity: 0.6 + pulse * 0.4,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 09: HELLISH LUT GRADE, MELTED FILM BURN & VIGNETTE
      ============================================ */}
      {/* Split-Tone Orange & Teal / Black & Red Hellish Grading */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(145deg, ${ABYSS_TEAL}88 0%, transparent 42%, ${BRIMSTONE_RED}66 78%, ${HELLFIRE_ORANGE}99 100%)`,
          mixBlendMode: "color",
          opacity: 0.58,
          pointerEvents: "none",
        }}
      />

      {/* Aggressive Dark Abyss Vignette (Preserves 9:16 subject clarity) */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 34%, rgba(4,1,0,0.62) 74%, rgba(4,1,0,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Melted Celluloid Film Burn Blisters (Top-Right & Bottom-Left Corners) */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(circle at ${92 - burnSpike * 18}% ${10 + subBeat * 8}%, ${SOUL_WHITE} 0%, ${MOLTEN_YELLOW}aa 12%, ${accent}77 26%, transparent 45%),
            radial-gradient(circle at ${8 + burnSpike * 18}% ${88 - pulse * 8}%, ${SOUL_WHITE} 0%, ${accent}aa 14%, ${BRIMSTONE_RED}77 28%, transparent 48%)
          `,
          mixBlendMode: "screen",
          opacity: 0.48 + burnSpike * 0.5 + impact * 0.35,
          pointerEvents: "none",
        }}
      />

      {/* Gritty Scorched Film Grain Scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.26) 0px, rgba(0,0,0,0.26) 2px, transparent 2px, transparent 5px)",
          opacity: 0.48,
          pointerEvents: "none",
        }}
      />

      {/* Heavy Earth-Shake Impact Flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${SOUL_WHITE} 0%, ${MOLTEN_YELLOW} 40%, ${BRIMSTONE_RED} 100%)`,
          mixBlendMode: "overlay",
          opacity: impact * 0.55 + burnSpike * 0.65,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 10: MOLTEN HELLFIRE BORDER FRAME
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${7 + impact * 15}px solid ${accent}`,
          opacity: 0.45 + impact * 0.55,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `3px solid ${MOLTEN_YELLOW}`,
          opacity: 0.4 + impact * 0.6,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 11: SAFE ZONE BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT SCORCHED METAL BRAND WATERMARK (NO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(4, 1, 0, 0.88)",
            borderLeft: `8px solid ${accent}`,
            borderBottom: `2px solid ${MOLTEN_YELLOW}`,
            clipPath:
              "polygon(0 0, 95% 0, 100% 34%, 100% 100%, 5% 100%, 0 66%)",
            transform: `translateX(${enterBurn * -65}px) scale(${1 + impact * 0.07})`,
          }}
        >
          <div
            style={{
              width: 13,
              height: 13,
              backgroundColor: MOLTEN_YELLOW,
              border: `3px solid ${BRIMSTONE_RED}`,
              transform: `rotate(45deg) scale(${0.85 + chainRattle * 0.6})`,
            }}
          />
          <span
            style={{
              fontFamily,
              color: SOUL_WHITE,
              fontSize: 32,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT HELL-CYCLE TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 20px",
            backgroundColor: "rgba(4, 1, 0, 0.84)",
            borderLeft: `6px solid ${BRIMSTONE_RED}`,
            borderTop: `2px solid ${MOLTEN_YELLOW}`,
            transform: `translateX(${enterBurn * -55}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 28,
              color: MOLTEN_YELLOW,
              letterSpacing: 4,
              lineHeight: 1.05,
            }}
          >
            {`CUT ${(index + 1).toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`}
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 18,
              color: SOUL_WHITE,
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

export const GhostRiderHellfire: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#040100" overlap={0} Scene={Scene} />
);