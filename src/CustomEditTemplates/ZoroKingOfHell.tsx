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
import { loadFont } from "@remotion/google-fonts/BebasNeue";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const ABYSS = "#030106";
const ENMA_GREEN = "#00FF66";
const HAKI_PURPLE = "#B829FF";
const CONQUEROR_GOLD = "#FFD700";
const CONQUEROR_RED = "#FF003C";
const BLADE_WHITE = "#F4FFF8";

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

  const accent = brand.color || ENMA_GREEN;
  const brandName = brand.name || "KING OF HELL";

  // ================================================
  // 01. HAKI BEAT & ONIGIRI SYNCHRONIZATION MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 2.9);
  const subBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.7);
  const hakiTremor = beatPulse(g * 2, bpm, 1.4);

  // ================================================
  // 02. TWIXTOR VELOCITY / SMOOTH SLOW-MO S-CURVE
  // ================================================
  const u = Math.min(1, Math.max(0, frame / span));
  const twixtorCurve =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.46], CLAMP)
      : u < 0.8
      ? interpolate(u, [0.2, 0.8], [0.46, 0.54], CLAMP)
      : interpolate(u, [0.8, 1], [0.54, 1], CLAMP);

  // Twin Sword Enter & Exit Timing (Seamless Overlap)
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

  const enterWhip = Math.pow(1 - enterCut, 2.3);
  const exitWhip = Math.pow(exitCut, 2.3);
  const slashVelocity = Math.min(1, enterWhip + exitWhip);

  // ================================================
  // 03. CAMERA SHAKE, BLUR BOUNCE & SEAMLESS SLIDE/ZOOM
  // ================================================
  const dir = index % 2 === 0 ? 1 : -1;

  // Always >= 1.18 scale so 9:16 portrait stays 100% full-bleed with zero black bars
  const baseScale = interpolate(twixtorCurve, [0, 1], [1.18, 1.34], CLAMP);
  const blurBounceZoom =
    impact * 0.15 + pulse * 0.05 + enterWhip * 0.45 + exitWhip * 0.55;
  const totalScale = baseScale + blurBounceZoom;

  const seamlessSlideX = (enterWhip * 420 - exitWhip * 460) * dir;
  const seamlessSlideY = (enterWhip * -220 + exitWhip * 240) * dir;

  // Heavy Slash Camera Shake
  const shakePower = impact * 34 + slashVelocity * 24 + pulse * 8;
  const shakeX =
    Math.sin(g * 3.3) * shakePower + (random(`zx-${g}`) - 0.5) * impact * 30;
  const shakeY =
    Math.cos(g * 2.8) * shakePower + (random(`zy-${g}`) - 0.5) * impact * 26;

  const camX = seamlessSlideX + shakeX;
  const camY = seamlessSlideY + shakeY;

  const camRot =
    (enterWhip * 14 - exitWhip * 16) * dir +
    Math.sin(g * 0.24) * 1.8 +
    (random(`zr-${g}`) - 0.5) * impact * 6.5;

  // ================================================
  // 04. TWIN SWORDS MASKING SEAMLESS TRANSITION
  // ================================================
  // As the next cut overlaps on top (index > 0), two crossed swords (Enma & Wado Ichimonji)
  // slice open a diamond/X-portal in the incoming scene while the outgoing scene's halves slide apart!
  const portalSpread = interpolate(enterCut, [0, 1], [0, 145], CLAMP);
  const incomingMask =
    index > 0 && frame < OVERLAP_FRAMES
      ? `polygon(
          ${Math.max(0, 50 - portalSpread)}% 0%,
          ${Math.min(100, 50 + portalSpread)}% 0%,
          100% ${Math.max(0, 50 - portalSpread)}%,
          100% ${Math.min(100, 50 + portalSpread)}%,
          ${Math.min(100, 50 + portalSpread)}% 100%,
          ${Math.max(0, 50 - portalSpread)}% 100%,
          0% ${Math.min(100, 50 + portalSpread)}%,
          0% ${Math.max(0, 50 - portalSpread)}%
        )`
      : undefined;

  // Outgoing Twin-Katana Split Displacement (Halves get severed and pushed apart on exit)
  const splitPush = exitWhip * 240 + (impact > 0.65 ? impact * 28 : 0);

  // ================================================
  // 05. B&W MANGA-TO-ANIME FLASH & DARK HIGH-CONTRAST CC
  // ================================================
  // Flashes stark black-and-white manga ink on cut start or heavy beat, then explodes into neon color
  const isMangaFlash =
    (frame >= 1 && frame <= 4) || (impact > 0.64 && g % 2 === 0);

  const ccContrast = isMangaFlash ? 2.45 : 1.44 + impact * 0.35;
  const ccSat = isMangaFlash ? 0 : 1.32 + pulse * 0.42;
  const ccBright = isMangaFlash
    ? 1.12
    : 0.94 + impact * 0.28 + slashVelocity * 0.22;

  const zoroCC = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  // ================================================
  // 06. ENMA GREEN & PURPLE HAKI AURA WISPS (PARTICLES)
  // ================================================
  const hakiWisps = Array.from({ length: 15 }, (_, i) => {
    const seed = i * 83 + index * 37;
    const wave = Math.sin(g * 0.08 + i * 1.5) * (65 + (i % 3) * 35);
    const x =
      ((random(`hx-${seed}`) * 1080 + wave + camX * 0.25) % 1160) - 40;
    const speed = 16 + (i % 5) * 8 + slashVelocity * 30;
    const y = 1980 - ((g * speed + random(`hy-${seed}`) * 1920) % 2100);
    const w = 6 + (i % 4) * 5 + pulse * 8;
    const rot = g * (5 + (i % 3) * 3) * (i % 2 === 0 ? 1 : -1);
    const col =
      i % 3 === 0 ? accent : i % 3 === 1 ? HAKI_PURPLE : BLADE_WHITE;
    return { x, y, w, rot, col };
  });

  // Procedural Conqueror's Haki Black/Purple/Green Lightning Bolts
  const hakiSeed = Math.floor(g / 2);
  const makeHakiBolt = (sx: number, sy: number, ex: number, ey: number, id: number) => {
    let pts = `${sx},${sy} `;
    for (let s = 1; s <= 6; s++) {
      const t = s / 7;
      const bx = sx + (ex - sx) * t + (random(`hb-x-${hakiSeed}-${id}-${s}`) - 0.5) * 190;
      const by = sy + (ey - sy) * t + (random(`hb-y-${hakiSeed}-${id}-${s}`) - 0.5) * 190;
      pts += `${bx.toFixed(0)},${by.toFixed(0)} `;
    }
    pts += `${ex},${ey}`;
    return pts;
  };

  const bolt1 = makeHakiBolt(120, 180, 960, 1740, 1);
  const bolt2 = makeHakiBolt(960, 220, 120, 1700, 2);

  // Twin Sword Transition Progress (0 -> 1 during cut entry or exit)
  const swordSlashProg =
    frame < OVERLAP_FRAMES + 4
      ? interpolate(frame, [0, OVERLAP_FRAMES + 4], [0, 1], CLAMP)
      : exitCut > 0
      ? exitCut
      : 0;

  const blurBouncePower = Math.min(1, impact * 0.92 + slashVelocity * 0.9);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: ABYSS,
        overflow: "hidden",
        clipPath: incomingMask,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED HAKI AMBIENT BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.22}) rotate(${-camRot * 0.5}deg)`,
          opacity: 0.48,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.8) saturate(1.6) brightness(0.42) hue-rotate(85deg)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + TWIN-SWORD SPLIT HALVES
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
        }}
      >
        {/* TOP-LEFT SEVERED HALF (Slides diagonally on sword cut / impact) */}
        <AbsoluteFill
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 0% 100%)",
            transform: `translate3d(${-splitPush}px, ${-splitPush * 0.65}px, 0)`,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: zoroCC,
            }}
          />
        </AbsoluteFill>

        {/* BOTTOM-RIGHT SEVERED HALF (Slides opposite way on sword cut / impact) */}
        <AbsoluteFill
          style={{
            clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
            transform: `translate3d(${splitPush}px, ${splitPush * 0.65}px, 0)`,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: zoroCC,
            }}
          />
        </AbsoluteFill>

        {/* Dark High-Contrast CC Grit Overlay Pass */}
        <AbsoluteFill
          style={{
            mixBlendMode: "overlay",
            opacity: isMangaFlash ? 0.85 : 0.48 + pulse * 0.22,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(1) contrast(2.6) brightness(0.88)",
            }}
          />
        </AbsoluteFill>

        {/* ============================================
            LAYER 03: BLUR BOUNCE & HAKI CHROMATIC SPLIT (GREEN / PURPLE)
        ============================================ */}
        {blurBouncePower > 0.05 && (
          <>
            {/* Enma Green Radial Blur Bounce Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurBouncePower * 0.46,
                transform: `translate3d(${-blurBouncePower * 32 * dir}px, ${blurBouncePower * -16}px, 0) scale(${1 + blurBouncePower * 0.07})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(75deg) saturate(6) contrast(1.65)",
                }}
              />
            </AbsoluteFill>

            {/* Purple Haki Radial Blur Bounce Echo */}
            <AbsoluteFill
              style={{
                mixBlendMode: "screen",
                opacity: blurBouncePower * 0.42,
                transform: `translate3d(${blurBouncePower * 32 * dir}px, ${blurBouncePower * 16}px, 0) scale(${1 + blurBouncePower * 0.13})`,
              }}
            >
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "sepia(1) hue-rotate(245deg) saturate(6) contrast(1.65)",
                }}
              />
            </AbsoluteFill>
          </>
        )}
      </AbsoluteFill>

      {/* ============================================
          LAYER 04: VHS GLITCH TEAR BARS & MANGA HALFTONE FLASH
      ============================================ */}
      {(impact > 0.28 || hakiTremor > 0.76) && (
        <AbsoluteFill
          style={{
            clipPath: `inset(${16 + ((g * 19) % 56)}% 0% ${20 + ((g * 23) % 50)}% 0%)`,
            transform: `translateX(${(random(`z-vhs-${g}`) - 0.5) * 125}px) scale(${totalScale * 1.04}) skewX(${(random(`z-sk-${g}`) - 0.5) * 15}deg)`,
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
                "invert(0.92) sepia(1) hue-rotate(250deg) saturate(6) contrast(2.4)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 05: TWIN SWORDS CUT TRANSITION + ENMA & HAKI NEON GLOW (SVG)
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
          {/* CONQUEROR'S HAKI LIGHTNING ARCS (PURPLE & ENMA GREEN) */}
          {(impact > 0.2 || slashVelocity > 0.25) && (
            <g opacity={Math.min(1, impact * 1.35 + slashVelocity)}>
              {/* Bolt 1: Purple Haki Aura -> White-Hot Core */}
              <polyline
                points={bolt1}
                fill="none"
                stroke={HAKI_PURPLE}
                strokeWidth={36 + impact * 26}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={bolt1}
                fill="none"
                stroke={CONQUEROR_RED}
                strokeWidth={14 + impact * 12}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.78}
              />
              <polyline
                points={bolt1}
                fill="none"
                stroke={BLADE_WHITE}
                strokeWidth={4 + impact * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Bolt 2: Enma Green Aura -> White-Hot Core */}
              <polyline
                points={bolt2}
                fill="none"
                stroke={accent}
                strokeWidth={34 + impact * 24}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={bolt2}
                fill="none"
                stroke={HAKI_PURPLE}
                strokeWidth={13 + impact * 10}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
              />
              <polyline
                points={bolt2}
                fill="none"
                stroke={BLADE_WHITE}
                strokeWidth={4 + impact * 4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* SANTORYU DEMON AURA VORTEX RINGS */}
          <g
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${0.9 + impact * 0.18}) rotate(${camRot * 0.3}deg)`,
            }}
          >
            <circle
              cx="540"
              cy="960"
              r={410 + pulse * 28}
              fill="none"
              stroke={accent}
              strokeWidth={10 + impact * 14}
              strokeDasharray="120 70 30 70"
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${g * 3.8}deg)`,
                opacity: 0.68,
              }}
            />
            <circle
              cx="540"
              cy="960"
              r={330 - impact * 22}
              fill="none"
              stroke={HAKI_PURPLE}
              strokeWidth={12 + impact * 10}
              strokeDasharray="160 140"
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${-g * 4.6}deg)`,
                opacity: 0.78,
              }}
            />

            {/* Zoro Demon Eye Scarlet/Green Slash Flare */}
            <g
              style={{
                transformOrigin: "540px 660px",
                transform: `scale(${0.75 + impact * 1.05})`,
                opacity: 0.35 + impact * 0.65,
              }}
            >
              <ellipse
                cx="460"
                cy="660"
                rx="115"
                ry="22"
                fill={accent}
                opacity="0.5"
              />
              <ellipse cx="460" cy="660" rx="55" ry="7" fill={BLADE_WHITE} />
              <ellipse
                cx="620"
                cy="660"
                rx="115"
                ry="22"
                fill={HAKI_PURPLE}
                opacity="0.5"
              />
              <ellipse cx="620" cy="660" rx="55" ry="7" fill={BLADE_WHITE} />
            </g>
          </g>

          {/* ============================================
              TWIN KATANAS (ENMA & WADO ICHIMONJI) X-SLASH TRANSITION
              Slices across the screen on every cut & pulses on heavy beats!
          ============================================ */}
          {(swordSlashProg > 0.01 || impact > 0.38) && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `scale(${0.92 + pulse * 0.18 + impact * 0.15})`,
              }}
            >
              {/* SWORD 1: ENMA (PURPLE & GREEN HAKI KATANA SLASHING TOP-LEFT TO BOTTOM-RIGHT) */}
              <g
                style={{
                  transformOrigin: "540px 960px",
                  transform: `rotate(38deg) translateX(${interpolate(
                    swordSlashProg > 0 ? swordSlashProg : impact,
                    [0, 1],
                    [-1100, 180],
                    CLAMP
                  )}px)`,
                }}
              >
                {/* Enma Haki Wake Trail */}
                <path
                  d="M -950 960 L 950 925 L 1180 960 L 950 995 Z"
                  fill={HAKI_PURPLE}
                  opacity={0.55 + pulse * 0.35}
                />
                <path
                  d="M -850 960 L 950 942 L 1140 960 L 950 978 Z"
                  fill={accent}
                  opacity={0.85}
                />
                {/* Katana Steel Blade & White-Hot Edge */}
                <path
                  d="M -550 946 L 880 946 L 1060 960 L 880 974 L -550 974 Z"
                  fill={BLADE_WHITE}
                />
                {/* Trefoil Gold Tsuba (Handguard) & Lilac/Gold Tsuka Handle */}
                <rect
                  x="-575"
                  y="895"
                  width="26"
                  height="130"
                  rx="10"
                  fill={CONQUEROR_GOLD}
                />
                <rect
                  x="-860"
                  y="944"
                  width="285"
                  height="32"
                  rx="6"
                  fill={HAKI_PURPLE}
                  stroke={CONQUEROR_GOLD}
                  strokeWidth="4"
                />
              </g>

              {/* SWORD 2: WADO ICHIMONJI (ENMA GREEN & WHITE KATANA SLASHING TOP-RIGHT TO BOTTOM-LEFT) */}
              <g
                style={{
                  transformOrigin: "540px 960px",
                  transform: `rotate(142deg) translateX(${interpolate(
                    swordSlashProg > 0 ? swordSlashProg : impact,
                    [0, 1],
                    [-1100, 180],
                    CLAMP
                  )}px)`,
                }}
              >
                {/* Emerald Wind Wake Trail */}
                <path
                  d="M -950 960 L 950 925 L 1180 960 L 950 995 Z"
                  fill={accent}
                  opacity={0.55 + pulse * 0.35}
                />
                <path
                  d="M -850 960 L 950 942 L 1140 960 L 950 978 Z"
                  fill={HAKI_PURPLE}
                  opacity={0.82}
                />
                {/* Katana Steel Blade & White-Hot Edge */}
                <path
                  d="M -550 946 L 880 946 L 1060 960 L 880 974 L -550 974 Z"
                  fill={BLADE_WHITE}
                />
                {/* Circular Gold Tsuba & White Tsuka Handle */}
                <rect
                  x="-575"
                  y="895"
                  width="24"
                  height="130"
                  rx="12"
                  fill={CONQUEROR_GOLD}
                />
                <rect
                  x="-860"
                  y="944"
                  width="285"
                  height="32"
                  rx="6"
                  fill={BLADE_WHITE}
                  stroke={accent}
                  strokeWidth="4"
                />
              </g>

              {/* CENTER CLASH SPARK FLARE WHERE TWIN BLADES CROSS */}
              <circle
                cx="540"
                cy="960"
                r={45 + impact * 110 + swordSlashProg * 75}
                fill={BLADE_WHITE}
                opacity={0.75}
              />
              <circle
                cx="540"
                cy="960"
                r={95 + impact * 180 + swordSlashProg * 140}
                fill="none"
                stroke={accent}
                strokeWidth={14 + impact * 20}
                opacity={0.65}
              />
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: RISING ENMA GREEN & PURPLE HAKI FLAME WISPS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {hakiWisps.map((w, i) => (
          <div
            key={`haki-wisp-${i}`}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              width: w.w,
              height: w.w * 2.8,
              backgroundColor: w.col,
              clipPath: "polygon(50% 0%, 100% 40%, 50% 100%, 0% 40%)",
              transform: `rotate(${w.rot}deg)`,
              opacity: 0.62 + pulse * 0.38,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: DARK CC VIGNETTE, VHS SCANLINES & HAKI EXPOSURE HALOS
      ============================================ */}
      {/* Split-Tone Enma Green & Purple Haki Atmosphere Grade */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${accent}55 0%, transparent 42%, transparent 58%, ${HAKI_PURPLE}66 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.46,
          pointerEvents: "none",
        }}
      />

      {/* Deep Dark High-Contrast Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 35%, rgba(3,1,6,0.58) 75%, rgba(3,1,6,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* VHS Scanline & Manga Halftone Grid Overlay */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0, 255, 102, 0.06) 0px, rgba(0, 255, 102, 0.06) 2px, transparent 2px, transparent 5px)",
          pointerEvents: "none",
        }}
      />

      {/* Manga-to-Anime B&W Impact Strobe Flash */}
      <AbsoluteFill
        style={{
          backgroundColor: BLADE_WHITE,
          mixBlendMode: "overlay",
          opacity: slashVelocity * 0.72 + impact * 0.32,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: PULSING ENMA & HAKI DUAL NEON BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 14}px solid ${accent}`,
          opacity: 0.45 + impact * 0.55,
          transform: `scale(${0.986 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `3px solid ${HAKI_PURPLE}`,
          opacity: 0.45 + subBeat * 0.55,
          transform: `scale(${0.978 - pulse * 0.008})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: SAFE ZONE BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT KING OF HELL BRAND WATERMARK (NO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(3, 1, 6, 0.88)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${HAKI_PURPLE}`,
            clipPath:
              "polygon(0 0, 95% 0, 100% 34%, 100% 100%, 5% 100%, 0 66%)",
            transform: `translateX(${enterWhip * -60}px) scale(${1 + impact * 0.06})`,
          }}
        >
          <div
            style={{
              width: 13,
              height: 13,
              backgroundColor: accent,
              border: `3px solid ${HAKI_PURPLE}`,
              transform: `rotate(45deg) scale(${0.85 + hakiTremor * 0.55})`,
            }}
          />
          <span
            style={{
              fontFamily,
              color: BLADE_WHITE,
              fontSize: 36,
              letterSpacing: 5,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT SANTORYU TELEMETRY HUD (Strictly allowed copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "8px 20px",
            backgroundColor: "rgba(3, 1, 6, 0.84)",
            borderLeft: `6px solid ${HAKI_PURPLE}`,
            borderBottom: `2px solid ${accent}`,
            transform: `translateX(${enterWhip * -50}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 30,
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
              fontSize: 20,
              color: BLADE_WHITE,
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

export const ZoroKingOfHell: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#030106"
    overlap={OVERLAP_FRAMES}
    Scene={Scene}
  />
);