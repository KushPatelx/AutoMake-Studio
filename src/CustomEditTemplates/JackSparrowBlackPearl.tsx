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

const ABYSS_OCEAN = "#02070A";
const AZTEC_GOLD = "#E5A93C";
const SPECTRAL_TEAL = "#19E6C8";
const DEEP_SEA_CYAN = "#0A5C6B";
const MOONLIGHT_MIST = "#E6F4F7";
const CURSED_RUM = "#6E1614";
const INK_SHADOW = "#010406";

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
  const duration = Math.max(2, seg.duration);

  const accent = brand.color || AZTEC_GOLD;
  const brandName = brand.name || "BLACK PEARL";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (beatPulseAt CONTRACT)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const cannonHit = beatPulseAt(g, beatFrames, 3.1);
  const ghostlyEcho = beatPulseAt(Math.max(0, g - 4), beatFrames, 2.2);
  const seaSwellBeat = beatPulseAt(g + 3, beatFrames, 1.6);

  // ================================================
  // 02. HIGH-SEAS VELOCITY RAMP & NON-FADE TRANSITIONS
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const velocityFlow =
    u < 0.22
      ? interpolate(u, [0, 0.22], [0, 0.46], CLAMP)
      : u < 0.78
      ? interpolate(u, [0.22, 0.78], [0.46, 0.54], CLAMP)
      : interpolate(u, [0.78, 1], [0.54, 1], CLAMP);

  const enterLen = Math.min(8, Math.max(1, Math.floor(duration / 2)));
  const exitLen = Math.min(7, Math.max(1, Math.floor(duration / 2)));
  const exitStart = Math.min(duration - 1, Math.max(0, duration - exitLen));

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 255, mass: 0.44 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterCurve = index === 0 ? 0 : Math.pow(1 - enterProg, 2.4);
  const exitCurve = Math.pow(exitProg, 2.4);
  const surgeEnergy = Math.min(1, enterCurve + exitCurve);

  // Strictly alternate signature pirate effects so the screen stays crisp:
  // Even cuts -> Mystical Ocean Wave Surge + Fading Ship Wheel
  // Odd cuts  -> Jack Sparrow Cutlass Slash + Spectral Jolly Roger Callback
  const isWaveCut = index % 2 === 0;
  const dir = isWaveCut ? 1 : -1;

  // 4 Mixed Non-Fade Transitions:
  // 0: Ocean Swell Whip-Slide | 1: Cutlass Diagonal Split
  // 2: Magic Compass 3D Flip  | 3: Horizon Pull-Out Zoom
  const transMode = index % 4;

  // ================================================
  // 03. SHIP-DECK SWELL CAMERA RIG & MIXED TRANSITIONS
  // ================================================
  // Base scale >= 1.18 ensures 9:16 portrait images NEVER expose black edges
  const baseScale = interpolate(velocityFlow, [0, 1], [1.18, 1.32], CLAMP);

  const modeZoom =
    transMode === 3
      ? enterCurve * 0.72 + exitCurve * 0.62
      : transMode === 2
      ? (1 - enterSpring) * 0.28 + exitCurve * 0.24
      : (1 - enterSpring) * 0.36 + exitCurve * 0.42;

  const beatZoom =
    cannonHit * 0.14 +
    ghostlyEcho * 0.055 +
    Math.sin(pulse * Math.PI * 2.4) * cannonHit * 0.05;
  const totalScale = Math.max(1.16, baseScale + modeZoom + beatZoom);

  // Mode 2: Magic Compass 3D Flip
  const compassFlipY =
    transMode === 2 ? (enterCurve * 80 - exitCurve * 74) * dir : 0;
  const compassFlipX =
    transMode === 2 ? (enterCurve * -14 + exitCurve * 14) * dir : 0;

  // Mode 0: Ocean Wave Swell Whip-Slide (Curved buoyancy arc)
  const waveSlideX =
    transMode === 0
      ? (enterCurve * 880 - exitCurve * 920) * dir
      : transMode === 3
      ? (enterCurve * 240 - exitCurve * 260) * dir
      : 0;
  const waveSlideY =
    transMode === 0
      ? Math.sin(enterCurve * Math.PI) * -320 +
        Math.sin(exitCurve * Math.PI) * 340
      : transMode === 3
      ? (enterCurve * -180 + exitCurve * 200) * dir
      : 0;

  // Mode 1: Cutlass Diagonal Split-Slide
  const cutlassSplit =
    transMode === 1 ? enterCurve * 64 + exitCurve * 70 : 0;

  // Continuous Pirate Ship Ocean Sway + Cannonball Beat Shake
  const deckSwayX = Math.sin(g * 0.075) * 14;
  const deckSwayY = Math.cos(g * 0.09) * 18;
  const shakeAmp = cannonHit * 32 + ghostlyEcho * 14 + surgeEnergy * 20 + pulse * 6;
  const shakeX =
    Math.sin(g * 3.5) * shakeAmp + (random(`js-x-${g}`) - 0.5) * cannonHit * 26;
  const shakeY =
    Math.cos(g * 2.9) * shakeAmp + (random(`js-y-${g}`) - 0.5) * cannonHit * 24;

  const camX = waveSlideX + deckSwayX + shakeX;
  const camY = waveSlideY + deckSwayY + shakeY;

  const camRot =
    (transMode === 0
      ? (enterCurve * 12 - exitCurve * 14) * dir
      : transMode === 3
      ? (enterCurve * -14 + exitCurve * 16) * dir
      : (enterCurve * 6 - exitCurve * 7) * dir) +
    Math.sin(g * 0.085) * 2.4 +
    (random(`js-r-${g}`) - 0.5) * cannonHit * 5.5;

  // ================================================
  // 04. MOONLIT CARIBBEAN CINEMATIC CC & SPECTRAL BLUR
  // ================================================
  const ccContrast = 1.38 + cannonHit * 0.28;
  const ccSat = 1.14 + pulse * 0.3;
  const ccBright = 0.93 + cannonHit * 0.24 + surgeEnergy * 0.16;
  const caribbeanGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright}) sepia(0.16)`;

  // Beat-drop Spectral Teal & Aztec Gold Chromatic Motion Blur
  const spectralBlur = Math.min(
    1,
    cannonHit * 0.92 + ghostlyEcho * 0.42 + surgeEnergy * 0.72
  );
  const spectralShift = cannonHit * 34 + ghostlyEcho * 20 + surgeEnergy * 32;

  // ================================================
  // 05. WAVES, SHIP WHEEL, CUTLASS & JOLLY ROGER MATH
  // ================================================
  const transProg =
    frame < enterLen + 3 && index > 0
      ? interpolate(frame, [0, enterLen + 3], [0, 1], CLAMP)
      : frame >= exitStart
      ? exitProg
      : 0;

  // Fading Ship Wheel (Gentle ghostly fade-in/out over the cut, anchored off-center)
  const wheelFade =
    interpolate(u, [0, 0.22, 0.72, 1], [0, 0.34, 0.34, 0], CLAMP) *
    (0.85 + pulse * 0.35);
  const wheelRot = g * 0.85 * dir + enterCurve * 42 * dir;

  // Dynamic Curling Ocean Wave Path Builder for Wave Transitions
  const buildWavePath = (
    baseY: number,
    amp: number,
    phase: number,
    thickness: number
  ) => {
    const c1 = baseY - amp * Math.sin(phase);
    const c2 = baseY + amp * Math.cos(phase + 0.8);
    const c3 = baseY - amp * Math.sin(phase + 1.9);
    const bottomY = baseY + thickness;
    return `M -120 ${baseY} Q 180 ${c1} 420 ${baseY} T 920 ${c2} T 1220 ${c3} L 1220 ${bottomY} Q 860 ${
      bottomY + amp * 0.6
    } 520 ${bottomY} T -120 ${bottomY} Z`;
  };

  // 22 Mystical Particles (Aztec Gold Dust, Ghostly Seafoam Motes & Sea Spray)
  const seaParticles = Array.from({ length: 22 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const kind = i % 3; // 0: Aztec Gold Dust, 1: Spectral Teal Wisp, 2: Moonlit Sea Spray
    const currentSway =
      Math.sin(g * (0.055 + kind * 0.02) + i * 1.4) * (85 + (i % 4) * 30);
    const x =
      ((random(`js-px-${seed}`) * 1080 + currentSway + camX * 0.16) % 1160) -
      40;
    const speed = 13 + (i % 5) * 7 + surgeEnergy * 28 + (kind === 2 ? 12 : 0);
    const y = 1980 - ((g * speed + random(`js-py-${seed}`) * 1920) % 2120);
    const size =
      kind === 2 ? 4 + (i % 3) * 3 : 6 + (i % 4) * 4 + pulse * 6;
    const rot = g * (3 + (i % 4) * 2.5) * (i % 2 === 0 ? 1 : -1);
    const col =
      kind === 0
        ? accent
        : kind === 1
        ? SPECTRAL_TEAL
        : MOONLIGHT_MIST;

    return { x, y, size, rot, col, kind };
  });

  const renderHeroLayers = () => (
    <>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: caribbeanGrade,
        }}
      />

      {/* Deep Cinematic Moonlight Contrast Pass */}
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
            filter: "grayscale(1) contrast(2.35) brightness(0.9)",
          }}
        />
      </AbsoluteFill>

      {/* BEAT-DROP SPECTRAL TEAL & AZTEC GOLD CHROMATIC MOTION BLUR */}
      {spectralBlur > 0.06 && (
        <>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: spectralBlur * 0.42,
              transform: `translate3d(${-spectralShift * dir}px, ${
                spectralShift * 0.2
              }px, 0) scale(${1 + spectralBlur * 0.05})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(135deg) saturate(4.8) contrast(1.5)",
              }}
            />
          </AbsoluteFill>

          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: spectralBlur * 0.38,
              transform: `translate3d(${spectralShift * dir}px, ${
                -spectralShift * 0.2
              }px, 0) scale(${1 + spectralBlur * 0.09})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(-10deg) saturate(4.5) contrast(1.5)",
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
        backgroundColor: ABYSS_OCEAN,
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED MIDNIGHT SEA BACKDROP
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
            filter: "contrast(1.65) saturate(0.45) brightness(0.35)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + MIXED PIRATE TRANSITIONS
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${compassFlipX}deg) rotateY(${compassFlipY}deg) rotateZ(${camRot}deg) scale(${totalScale})`,
        }}
      >
        {transMode === 1 && cutlassSplit > 0.5 ? (
          <>
            {/* Cutlass Upper-Left Severed Half */}
            <AbsoluteFill
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 0% 100%)",
                transform: `translate3d(${-cutlassSplit}%, ${
                  -cutlassSplit * 0.5
                }%, 0)`,
              }}
            >
              {renderHeroLayers()}
            </AbsoluteFill>
            {/* Cutlass Lower-Right Severed Half */}
            <AbsoluteFill
              style={{
                clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
                transform: `translate3d(${cutlassSplit}%, ${
                  cutlassSplit * 0.5
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
          LAYER 03: MYSTICAL CARIBBEAN FOG & MOONLIT SEA MIST
      ============================================ */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse at ${30 + Math.sin(g * 0.04) * 28}% 92%, ${SPECTRAL_TEAL}42 0%, ${DEEP_SEA_CYAN}28 34%, transparent 66%),
            radial-gradient(ellipse at ${72 - Math.cos(g * 0.035) * 25}% 12%, ${accent}38 0%, transparent 56%)
          `,
          mixBlendMode: "screen",
          opacity: 0.52 + pulse * 0.36,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 04: PIRATES OF THE CARIBBEAN SIGNATURE SVG ENGINE
          - Fading Ghostly Ship Wheel (Off-center atmospheric depth)
          - Even Cuts: Surging Mystical Ocean Wave Transition Wipe
          - Odd Cuts: Jack Sparrow Curved Cutlass Slash + Jolly Roger Callback
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
            transform: `translate3d(${camX * 0.14}px, ${camY * 0.14}px, 0)`,
          }}
        >
          {/* 1. FADING GHOSTLY SHIP HELM WHEEL (Subtle & Atmospheric, Off-Center) */}
          {wheelFade > 0.01 && (
            <g
              transform={`translate(${isWaveCut ? 860 : 220}, ${
                isWaveCut ? 440 : 1380
              }) rotate(${wheelRot}) scale(${0.88 + seaSwellBeat * 0.08})`}
              opacity={wheelFade}
              fill="none"
            >
              {/* Outer Wooden Wheel Rim */}
              <circle
                cx="0"
                cy="0"
                r="225"
                stroke={accent}
                strokeWidth="16"
                opacity="0.7"
              />
              <circle
                cx="0"
                cy="0"
                r="195"
                stroke={SPECTRAL_TEAL}
                strokeWidth="4"
                strokeDasharray="36 18"
                opacity="0.85"
              />
              {/* Inner Hub Ring */}
              <circle
                cx="0"
                cy="0"
                r="48"
                stroke={accent}
                strokeWidth="12"
              />
              <circle cx="0" cy="0" r="18" fill={MOONLIGHT_MIST} opacity="0.65" />

              {/* 8 Carved Pirate Helm Spokes & Protruding Handles */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <g key={`helm-spoke-${deg}`} transform={`rotate(${deg})`}>
                  <line
                    x1="0"
                    y1="-48"
                    x2="0"
                    y2="-282"
                    stroke={accent}
                    strokeWidth="11"
                    strokeLinecap="round"
                  />
                  {/* Turned Handle Tip */}
                  <polygon
                    points="-10,-265 10,-265 6,-302 -6,-302"
                    fill={MOONLIGHT_MIST}
                    opacity="0.8"
                  />
                  {/* Decorative Mid-Spoke Collar */}
                  <rect
                    x="-11"
                    y="-145"
                    width="22"
                    height="14"
                    fill={SPECTRAL_TEAL}
                    opacity="0.7"
                  />
                </g>
              ))}
            </g>
          )}

          {/* 2. NAUTICAL COMPASS CORNER LOCKS (MAP-CHART AESTHETIC) */}
          <g
            stroke={accent}
            strokeWidth={4 + cannonHit * 3}
            fill="none"
            opacity={0.7 + pulse * 0.25}
          >
            <polyline points="92,495 92,360 228,360" />
            <polyline points="988,495 988,360 852,360" />
            <polyline points="92,1425 92,1560 228,1560" />
            <polyline points="988,1425 988,1560 852,1560" />
          </g>

          {/* 3. EVEN CUTS: SURGING MYSTICAL OCEAN WAVE WIPE TRANSITION */}
          {isWaveCut && (transProg > 0.01 || cannonHit > 0.45) && (
            <g>
              {(() => {
                const p = transProg > 0 ? transProg : cannonHit;
                const waveY = interpolate(p, [0, 1], [2180, -480], CLAMP);
                const waveOp = interpolate(
                  p,
                  [0, 0.14, 0.82, 1],
                  [0, 0.94, 0.88, 0],
                  CLAMP
                );
                const phase = g * 0.28 + index * 1.4;

                return (
                  <g opacity={waveOp}>
                    {/* Deep Abyssal Surge Under-Wave */}
                    <path
                      d={buildWavePath(waveY + 135, 130, phase, 420)}
                      fill={DEEP_SEA_CYAN}
                      opacity="0.78"
                    />
                    {/* Mid Ghostly Davy-Jones Seafoam Wave */}
                    <path
                      d={buildWavePath(waveY + 45, 115, phase + 1.1, 240)}
                      fill={SPECTRAL_TEAL}
                      opacity="0.82"
                    />
                    {/* Luminous Moonlit Foam Crest Edge */}
                    <path
                      d={buildWavePath(waveY, 95, phase + 2.1, 68)}
                      fill={MOONLIGHT_MIST}
                      opacity="0.95"
                    />
                    {/* Aztec Gold Cursed Shimmer Crest */}
                    <path
                      d={buildWavePath(waveY + 95, 105, phase + 0.5, 24)}
                      fill={accent}
                      opacity="0.85"
                    />
                  </g>
                );
              })()}
            </g>
          )}

          {/* 4. ODD CUTS: JACK SPARROW CUTLASS SWORD SLASH + JOLLY ROGER CALLBACK */}
          {!isWaveCut && (
            <>
              {/* SPECTRAL JOLLY ROGER CALLBACK (Clean Vector Skull + Crossed Cutlasses on Beat Drop) */}
              {(cannonHit > 0.28 || surgeEnergy > 0.35) && (
                <g
                  transform={`translate(540, 860) scale(${
                    0.82 + cannonHit * 0.32
                  }) rotate(${camRot * 0.35})`}
                  opacity={Math.min(
                    0.56,
                    cannonHit * 0.55 + surgeEnergy * 0.35
                  )}
                >
                  {/* Crossed Cutlass Blades Behind Skull */}
                  <g stroke={accent} strokeWidth="10" fill="none">
                    <path d="M -230 190 Q 0 10 235 -175" />
                    <path d="M 230 190 Q 0 10 -235 -175" />
                  </g>
                  <g stroke={MOONLIGHT_MIST} strokeWidth="4" fill="none">
                    <path d="M -230 190 Q 0 10 235 -175" />
                    <path d="M 230 190 Q 0 10 -235 -175" />
                  </g>
                  {/* Minimalist Angular Pirate Skull Silhouette */}
                  <polygon
                    points="-95,-115 95,-115 128,-30 98,55 58,92 58,140 -58,140 -58,92 -98,55 -128,-30"
                    fill={INK_SHADOW}
                    stroke={MOONLIGHT_MIST}
                    strokeWidth="7"
                  />
                  {/* Bandana Brow Slash */}
                  <path
                    d="M -112 -72 Q 0 -105 112 -72"
                    fill="none"
                    stroke={accent}
                    strokeWidth="14"
                  />
                  {/* Hollow Eye Sockets & Nasal Cavity */}
                  <polygon
                    points="-68,-25 -20,-18 -26,24 -72,18"
                    fill={SPECTRAL_TEAL}
                    opacity="0.9"
                  />
                  <polygon
                    points="68,-25 20,-18 26,24 72,18"
                    fill={SPECTRAL_TEAL}
                    opacity="0.9"
                  />
                  <polygon
                    points="0,30 16,62 -16,62"
                    fill={SPECTRAL_TEAL}
                    opacity="0.85"
                  />
                  {/* Teeth Grid Lines */}
                  <g stroke={MOONLIGHT_MIST} strokeWidth="4">
                    <line x1="-26" y1="102" x2="-26" y2="140" />
                    <line x1="0" y1="102" x2="0" y2="140" />
                    <line x1="26" y1="102" x2="26" y2="140" />
                  </g>
                </g>
              )}

              {/* JACK SPARROW CURVED CUTLASS SWORD SLASH TRANSITION */}
              {(transProg > 0.01 || cannonHit > 0.44) && (
                <g
                  style={{
                    transformOrigin: "540px 960px",
                    transform: `rotate(${index % 4 === 1 ? -34 : 34}deg) scale(${
                      1.05 + cannonHit * 0.2
                    })`,
                  }}
                >
                  {(() => {
                    const p = transProg > 0 ? transProg : cannonHit;
                    const slashX = interpolate(p, [0, 1], [-1450, 1500], CLAMP);
                    const op = interpolate(
                      p,
                      [0, 0.14, 0.85, 1],
                      [0, 1, 0.94, 0],
                      CLAMP
                    );

                    return (
                      <g transform={`translate(${slashX}, 960)`} opacity={op}>
                        {/* Outer Spectral Seafoam Saber Wake */}
                        <path
                          d="M -1350 90 Q 0 -170 1240 -25 Q 20 -35 -1350 135 Z"
                          fill={SPECTRAL_TEAL}
                          opacity="0.65"
                        />
                        {/* Mid Aztec Gold Cursed Slash Trail */}
                        <path
                          d="M -1150 65 Q 30 -120 1200 -20 Q 30 -40 -1150 95 Z"
                          fill={accent}
                          opacity="0.9"
                        />
                        {/* Gleaming Curved Cutlass Steel Edge */}
                        <path
                          d="M -920 45 Q 60 -88 1180 -18 Q 60 -52 -920 62 Z"
                          fill={MOONLIGHT_MIST}
                        />
                        {/* Brass Basket-Hilt Guard Silhouette at Trailing Grip */}
                        <path
                          d="M -920 30 Q -855 -35 -815 48 Q -855 110 -920 68 Z"
                          fill="none"
                          stroke={accent}
                          strokeWidth="12"
                        />
                      </g>
                    );
                  })()}
                </g>
              )}
            </>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: AZTEC GOLD DUST, SEAFOAM WISPS & OCEAN SPRAY (22 PARTICLES)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {seaParticles.map((pt, i) => (
          <div
            key={`potc-pt-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.size,
              height: pt.kind === 2 ? pt.size * 2.8 : pt.size * 1.9,
              backgroundColor: pt.col,
              clipPath:
                pt.kind === 0
                  ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                  : pt.kind === 1
                  ? "polygon(25% 0%, 100% 35%, 75% 100%, 0% 65%)"
                  : "polygon(50% 0%, 100% 70%, 50% 100%, 0% 70%)",
              transform: `rotate(${pt.rot}deg)`,
              opacity: 0.65 + pulse * 0.35,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: MYSTICAL GREEN-FLASH GLOW, VIGNETTE & FLASH
      ============================================ */}
      {/* Pirates Split Atmosphere: Abyssal Teal & Warm Lantern Gold */}
      <AbsoluteFill
        style={{
          background: isWaveCut
            ? `linear-gradient(150deg, ${SPECTRAL_TEAL}48 0%, transparent 42%, transparent 60%, ${accent}48 100%)`
            : `linear-gradient(150deg, ${accent}48 0%, transparent 42%, transparent 60%, ${CURSED_RUM}55 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.42,
          pointerEvents: "none",
        }}
      />

      {/* Deep High-Seas Midnight Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 36%, rgba(2,7,10,0.6) 75%, rgba(2,7,10,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* "Green Flash" / Cannonball Beat Impact Bloom */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${MOONLIGHT_MIST} 0%, ${
            isWaveCut ? SPECTRAL_TEAL : accent
          }88 34%, transparent 72%)`,
          mixBlendMode: "overlay",
          opacity: surgeEnergy * 0.56 + cannonHit * 0.3,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: PULSING AZTEC GOLD & SPECTRAL TEAL BORDER
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + cannonHit * 11}px solid ${accent}`,
          opacity: 0.44 + cannonHit * 0.52,
          transform: `scale(${0.986 - pulse * 0.008})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          border: `2px solid ${SPECTRAL_TEAL}`,
          opacity: 0.38 + seaSwellBeat * 0.48,
          transform: `scale(${0.978 - pulse * 0.006})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 08: SAFE ZONE PIRATE BRAND WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT JOLLY ROGER / AZTEC GOLD PLAQUE WATERMARK */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(2, 7, 10, 0.9)",
            borderLeft: `7px solid ${accent}`,
            borderRight: `3px solid ${SPECTRAL_TEAL}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${enterCurve * -45}px) scale(${
              1 + cannonHit * 0.06
            })`,
          }}
        >
          {/* Minimalist Crossed Cutlass Emblem (Vector, Zero Emojis) */}
          <svg width="26" height="26" viewBox="0 0 26 26">
            <line
              x1="4"
              y1="22"
              x2="22"
              y2="4"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="4"
              x2="22"
              y2="22"
              stroke={MOONLIGHT_MIST}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="13" cy="13" r="3.5" fill={SPECTRAL_TEAL} />
          </svg>
          <span
            style={{
              fontFamily,
              color: MOONLIGHT_MIST,
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

        {/* BOTTOM-LEFT NAUTICAL COMPASS TELEMETRY HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(2, 7, 10, 0.86)",
            borderLeft: `6px solid ${isWaveCut ? SPECTRAL_TEAL : accent}`,
            borderTop: `2px solid ${isWaveCut ? accent : CURSED_RUM}`,
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
              color: MOONLIGHT_MIST,
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

export const JackSparrowBlackPearl: React.FC<EditProps> = (props) => (
  <EditVideo
    {...props}
    bg="#02070A"
    overlap={0}
    Scene={Scene}
  />
);