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
import { loadFont } from "@remotion/google-fonts/RussoOne";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const SYMBIOTE_VOID = "#020204";
const LIQUID_BLACK = "#000000";
const VENOM_WHITE = "#F4F7FA";
const SYMBIOTE_VIOLET = "#8B2CF5";
const CARNAGE_RED = "#E6002E";
const WET_CYAN = "#00D8FF";

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

  const accent = brand.color || VENOM_WHITE;
  const brandName = brand.name || "WE ARE VENOM";

  // ================================================
  // 01. DYNAMIC TEMPO BEAT-SYNC (CRAZY BEAT DROPS)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const dropImpact = beatPulseAt(g, beatFrames, 3.0);
  const razorTransient = beatPulseAt(g, beatFrames, 4.6);
  const symbioteAftershock = beatPulseAt(Math.max(0, g - 3), beatFrames, 2.2);

  // ================================================
  // 02. VELOCITY RAMP & NON-FADE TRANSITION TIMING
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const velocityFlow =
    u < 0.18
      ? interpolate(u, [0, 0.18], [0, 0.47], CLAMP)
      : u < 0.82
        ? interpolate(u, [0.18, 0.82], [0.47, 0.53], CLAMP)
        : interpolate(u, [0.82, 1], [0.53, 1], CLAMP);

  const enterLen = Math.min(8, Math.max(1, Math.floor(duration / 2)));
  const exitLen = Math.min(7, Math.max(1, Math.floor(duration / 2)));
  const exitStart = Math.min(duration - 1, Math.max(0, duration - exitLen));

  const whipSpring = spring({
    frame,
    fps,
    config: { damping: 9.5, stiffness: 320, mass: 0.36 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterCurve = index === 0 ? 0 : Math.pow(1 - enterProg, 2.3);
  const exitCurve = Math.pow(exitProg, 2.5);
  const enterSnap = index === 0 ? 0 : 1 - whipSpring;
  const whipEnergy = Math.min(1, enterCurve + exitCurve);

  const dir = index % 2 === 0 ? 1 : -1;

  // 4 Mixed Non-Fade Transitions:
  // 0: Spiral Vortex Twist-Zoom | 1: Symbiote Tentacle Grab & 3D Flip
  // 2: Horizontal Whiplash Snap | 3: Symbiote Diagonal Tear Split
  const transMode = index % 4;
  const isSpiralCut = transMode === 0;
  const isTentacleCut = transMode === 1;

  // Sudden Mid-Cut Symbiote Tentacle Grab & 360° 3D Flip (Triggers periodically mid-clip)
  const hasMidTentacleFlip = duration >= 20 && index % 3 === 2;
  const midFlipStart = Math.floor(duration * 0.4);
  const midFlipEnd = midFlipStart + 10;
  const midFlipRaw = hasMidTentacleFlip
    ? interpolate(frame, [midFlipStart, midFlipEnd], [0, 1], CLAMP)
    : 0;
  const isMidFlipActive =
    hasMidTentacleFlip && frame >= midFlipStart && frame <= midFlipEnd;

  // Smooth cubic ease-in-out for the sudden 360° mid-cut flip
  const midFlipEase =
    midFlipRaw < 0.5
      ? 4 * midFlipRaw * midFlipRaw * midFlipRaw
      : 1 - Math.pow(-2 * midFlipRaw + 2, 3) / 2;
  const midFlipBell = Math.sin(midFlipRaw * Math.PI);

  // ================================================
  // 03. SPIRAL, TENTACLE 3D FLIP & WHIPLASH CAMERA RIG
  // ================================================
  // Base scale >= 1.20 guarantees 9:16 portrait images NEVER expose black bars
  const baseScale = interpolate(velocityFlow, [0, 1], [1.2, 1.33], CLAMP);

  // Spiral cuts zoom out/in dynamically to cover corners during 145° rotation
  const modeZoom = isSpiralCut
    ? enterCurve * 0.92 + exitCurve * 0.88
    : isTentacleCut
      ? Math.max(0, enterSnap) * 0.25 + exitCurve * 0.24
      : Math.max(0, enterSnap) * 0.34 + exitCurve * 0.42;

  // Slight pullback during the sudden mid-cut 3D flip so the flipping card feels dimensional
  const midFlipScaleDip = isMidFlipActive ? -midFlipBell * 0.16 : 0;

  const dropZoom =
    dropImpact * 0.16 +
    symbioteAftershock * 0.06 +
    Math.sin(pulse * Math.PI * 2.8) * dropImpact * 0.055;
  const totalScale = Math.max(
    1.04,
    baseScale + modeZoom + dropZoom + midFlipScaleDip,
  );

  // 3D Flip Angles (Tentacle Transition Flip + Sudden Mid-Cut 360° Flip)
  const transFlipY = isTentacleCut
    ? (enterCurve * 92 - exitCurve * 88) * dir
    : 0;
  const transFlipX = isTentacleCut
    ? (enterCurve * -18 + exitCurve * 16) * dir
    : 0;

  const midFlipY = isMidFlipActive ? midFlipEase * 360 * dir : 0;
  const midFlipX = isMidFlipActive ? midFlipBell * -14 * dir : 0;

  const flipY = transFlipY + midFlipY;
  const flipX = transFlipX + midFlipX;

  // Horizontal Whiplash Snap (Mode 2)
  const whipX = transMode === 2 ? (enterSnap * 940 - exitCurve * 980) * dir : 0;
  const whipY =
    transMode === 2 ? (enterSnap * -160 + exitCurve * 180) * dir : 0;

  // Symbiote Diagonal Tear Split (Mode 3)
  const tearSplit =
    transMode === 3 ? Math.max(0, enterSnap) * 68 + exitCurve * 76 : 0;

  // Crazy Beat-Drop Shake
  const shakeAmp =
    dropImpact * 40 +
    razorTransient * 20 +
    symbioteAftershock * 16 +
    whipEnergy * 22 +
    midFlipBell * 26 +
    pulse * 6;
  const shakeX =
    Math.sin(g * 4.1) * shakeAmp + (random(`vnx-${g}`) - 0.5) * dropImpact * 34;
  const shakeY =
    Math.cos(g * 3.4) * shakeAmp + (random(`vny-${g}`) - 0.5) * dropImpact * 30;

  const camX = whipX + shakeX;
  const camY = whipY + shakeY;

  // Spiral Vortex Rotation (Mode 0) + Whiplash Bank Rotation
  const spiralRot = isSpiralCut
    ? (enterCurve * 145 - exitCurve * 145) * dir
    : 0;
  const camRot =
    spiralRot +
    (transMode === 2
      ? (enterSnap * 15 - exitCurve * 17) * dir
      : (enterCurve * 7 - exitCurve * 8) * dir) +
    Math.sin(g * 0.25) * 1.5 +
    (random(`vnr-${g}`) - 0.5) * dropImpact * 7;

  // High-G Skew Distortion
  const whipSkewX =
    (transMode === 2 ? (enterSnap - exitCurve) * 15 * dir : 0) +
    Math.sin(g * 4.6) * dropImpact * 5.2;

  // ================================================
  // 04. GLOSSY WET-SYMBIOTE CC & BEAT-DROP RGB BLUR
  // ================================================
  const ccContrast = 1.44 + dropImpact * 0.34;
  const ccSat = 1.14 + pulse * 0.32;
  const ccBright = 0.94 + razorTransient * 0.26 + whipEnergy * 0.16;
  const symbioteGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  const rgbBlur = Math.min(
    1,
    dropImpact * 0.95 +
      symbioteAftershock * 0.42 +
      whipEnergy * 0.85 +
      midFlipBell * 0.85,
  );
  const rgbShift =
    dropImpact * 38 +
    symbioteAftershock * 20 +
    whipEnergy * 40 +
    midFlipBell * 36;

  // ================================================
  // 05. SPIRAL VORTEX ARMS & SYMBIOTE TENTACLE GRAB MATH
  // ================================================
  const transProg =
    frame < enterLen + 2 && index > 0
      ? interpolate(frame, [0, enterLen + 2], [0, 1], CLAMP)
      : frame >= exitStart
        ? exitProg
        : 0;

  // A) Logarithmic Spiral Vortex Arms (Mode 0 Transitions)
  const spiralActive = isSpiralCut && (whipEnergy > 0.03 || dropImpact > 0.48);
  const buildSpiralArm = (armOffset: number, swirlPhase: number) => {
    let d = "";
    const steps = 22;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const theta = t * Math.PI * 3.1 + armOffset + swirlPhase;
      const radius = 140 + Math.pow(t, 1.35) * 980;
      const x = 540 + Math.cos(theta) * radius;
      const y = 960 + Math.sin(theta) * radius * 1.25;
      d += `${s === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  };

  const spiralSpinPhase = (g * 0.38 + enterCurve * 4.5 - exitCurve * 4.5) * dir;
  const spiralArms = spiralActive
    ? [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((off) =>
        buildSpiralArm(off, spiralSpinPhase),
      )
    : [];

  // B) Symbiote Grabbing Tentacles (Active on Mode 1 Flip OR Sudden Mid-Cut 360° Flip)
  const tentacleGrabIntensity = isMidFlipActive
    ? midFlipBell
    : isTentacleCut
      ? Math.min(1, whipEnergy * 1.25)
      : 0;

  // Computes whip-like symbiote tentacle path from off-screen anchor to grab-tip on the flipping image
  const buildGrabTentacle = (
    anchorX: number,
    anchorY: number,
    tipX: number,
    tipY: number,
    wiggleSeed: number,
    thickness: number,
  ) => {
    const midX = (anchorX + tipX) * 0.5;
    const midY = (anchorY + tipY) * 0.5;
    const bend1 = Math.sin(g * 0.55 + wiggleSeed) * 145;
    const bend2 = Math.cos(g * 0.48 + wiggleSeed * 1.7) * 125;

    const dx = tipX - anchorX;
    const dy = tipY - anchorY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;

    const ax1 = anchorX + nx * thickness;
    const ay1 = anchorY + ny * thickness;
    const ax2 = anchorX - nx * thickness;
    const ay2 = anchorY - ny * thickness;

    const c1x = midX + bend1 + nx * (thickness * 0.55);
    const c1y = midY + bend2 + ny * (thickness * 0.55);
    const c2x = midX + bend1 - nx * (thickness * 0.55);
    const c2y = midY + bend2 - ny * (thickness * 0.55);

    const body = `M ${ax1.toFixed(1)} ${ay1.toFixed(1)} Q ${c1x.toFixed(
      1,
    )} ${c1y.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} Q ${c2x.toFixed(
      1,
    )} ${c2y.toFixed(1)} ${ax2.toFixed(1)} ${ay2.toFixed(1)} Z`;
    const spine = `M ${anchorX.toFixed(1)} ${anchorY.toFixed(
      1,
    )} Q ${(midX + bend1).toFixed(1)} ${(midY + bend2).toFixed(
      1,
    )} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`;

    return { body, spine };
  };

  // Track the moving grab points across the screen as the tentacles physically flip the frame
  const grabSweep = isMidFlipActive
    ? interpolate(midFlipRaw, [0, 0.25, 0.78, 1], [1220, 820, 180, -180], CLAMP)
    : dir > 0
      ? interpolate(transProg, [0, 0.5, 1], [-180, 680, 1240], CLAMP)
      : interpolate(transProg, [0, 0.5, 1], [1260, 400, -180], CLAMP);

  const grabTentacles =
    tentacleGrabIntensity > 0.02
      ? [
          buildGrabTentacle(
            isMidFlipActive ? 1160 : dir > 0 ? -90 : 1170,
            420,
            grabSweep,
            560 + Math.sin(g * 0.4) * 55,
            1.1,
            54,
          ),
          buildGrabTentacle(
            isMidFlipActive ? 1160 : dir > 0 ? -90 : 1170,
            960,
            grabSweep + (isMidFlipActive ? -60 : 60 * dir),
            960 + Math.cos(g * 0.45) * 65,
            2.4,
            66,
          ),
          buildGrabTentacle(
            isMidFlipActive ? -80 : dir > 0 ? 1170 : -90,
            1480,
            1080 - grabSweep * 0.75,
            1340 + Math.sin(g * 0.5 + 1) * 55,
            3.7,
            52,
          ),
        ]
      : [];

  // C) Symbiote Tear Tendril Whip on Mode 3 Split
  const showTearWhip =
    transMode === 3 && (whipEnergy > 0.04 || dropImpact > 0.48);

  // D) 18 Symbiote Ink Droplets & Glossy Liquid Sparks
  const gooParticles = Array.from({ length: 18 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const isInkDrop = i % 3 === 0;
    const sway = Math.sin(g * 0.09 + i * 1.5) * (65 + (i % 3) * 35);
    const x = ((random(`vpx-${seed}`) * 1080 + sway + camX * 0.16) % 1160) - 40;
    const speed = 20 + (i % 5) * 10 + whipEnergy * 34;
    const y = 1980 - ((g * speed + random(`vpy-${seed}`) * 1920) % 2120);
    const w = isInkDrop ? 10 + (i % 4) * 5 : 6 + (i % 3) * 4 + pulse * 6;
    const rot = g * (4 + (i % 3) * 3) * (i % 2 === 0 ? 1 : -1);

    const col = isInkDrop
      ? LIQUID_BLACK
      : i % 3 === 1
        ? VENOM_WHITE
        : i % 2 === 0
          ? SYMBIOTE_VIOLET
          : CARNAGE_RED;

    return { x, y, w, rot, col, isInkDrop };
  });

  const renderHeroLayers = () => (
    <>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: symbioteGrade,
        }}
      />

      {/* High-Gloss Liquid Ink Contrast Pass */}
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
            filter: "grayscale(1) contrast(2.5) brightness(0.9)",
          }}
        />
      </AbsoluteFill>

      {/* BEAT-DROP, SPIRAL & WHIPLASH CHROMATIC SYMBIOTE RGB BLUR */}
      {rgbBlur > 0.06 && (
        <>
          {/* Symbiote Violet Split Echo */}
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: rgbBlur * 0.45,
              transform: `translate3d(${-rgbShift * dir}px, ${
                rgbShift * 0.2
              }px, 0) rotate(${isSpiralCut ? -rgbBlur * 6 * dir : 0}deg) scale(${
                1 + rgbBlur * 0.055
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
                  "sepia(1) hue-rotate(255deg) saturate(5.5) contrast(1.55)",
              }}
            />
          </AbsoluteFill>

          {/* Wet-Sheen Electric Cyan Split Echo */}
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: rgbBlur * 0.4,
              transform: `translate3d(${rgbShift * dir}px, ${
                -rgbShift * 0.2
              }px, 0) rotate(${isSpiralCut ? rgbBlur * 6 * dir : 0}deg) scale(${
                1 + rgbBlur * 0.095
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
                  "sepia(1) hue-rotate(155deg) saturate(5.5) contrast(1.55)",
              }}
            />
          </AbsoluteFill>

          {/* Whiplash / Spiral Velocity Zoom Ghost */}
          <AbsoluteFill
            style={{
              mixBlendMode: "lighten",
              opacity: rgbBlur * 0.26,
              transform: `scale(${1 + rgbBlur * 0.14})`,
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
    </>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: SYMBIOTE_VOID,
        overflow: "hidden",
        perspective: 1150,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED DARK SYMBIOTE BACKDROP
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${Math.max(1.38, totalScale * 1.24)}) rotate(${
            -camRot * 0.35
          }deg)`,
          opacity: 0.44,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.75) saturate(0.4) brightness(0.34)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + SPIRAL / TENTACLE FLIP / WHIPLASH RIG
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${flipX}deg) rotateY(${flipY}deg) rotateZ(${camRot}deg) skewX(${whipSkewX}deg) scale(${totalScale})`,
        }}
      >
        {transMode === 3 && tearSplit > 0.5 ? (
          <>
            <AbsoluteFill
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 0% 100%)",
                transform: `translate3d(${-tearSplit}%, ${
                  -tearSplit * 0.52
                }%, 0)`,
              }}
            >
              {renderHeroLayers()}
            </AbsoluteFill>
            <AbsoluteFill
              style={{
                clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
                transform: `translate3d(${tearSplit}%, ${
                  tearSplit * 0.52
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
          LAYER 03: SYMBIOTE OILY ATMOSPHERE & BEAT DROP FLASH
      ============================================ */}
      <AbsoluteFill
        style={{
          background:
            index % 2 === 0
              ? `linear-gradient(145deg, ${SYMBIOTE_VIOLET}42 0%, transparent 40%, transparent 62%, ${WET_CYAN}34 100%)`
              : `linear-gradient(145deg, ${CARNAGE_RED}40 0%, transparent 40%, transparent 62%, ${SYMBIOTE_VIOLET}42 100%)`,
          mixBlendMode: "screen",
          opacity: 0.4 + pulse * 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Clean Deep Abyss Vignette (No Thick Goo Border!) */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 42%, rgba(2,2,4,0.52) 78%, rgba(0,0,0,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Crisp Beat-Drop & Flip Peak Over-Exposure Flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${VENOM_WHITE} 0%, ${
            index % 2 === 0 ? SYMBIOTE_VIOLET : CARNAGE_RED
          }77 36%, transparent 72%)`,
          mixBlendMode: "overlay",
          opacity:
            whipEnergy * 0.5 + razorTransient * 0.42 + midFlipBell * 0.45,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 04: SYMBIOTE LIQUID DROPLETS & VEIN SPARKS (18 PARTICLES)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {gooParticles.map((pt, i) => (
          <div
            key={`venom-pt-${i}`}
            style={{
              position: "absolute",
              left: pt.x,
              top: pt.y,
              width: pt.w,
              height: pt.isInkDrop ? pt.w * 2.4 : pt.w * 2.2,
              backgroundColor: pt.col,
              border: pt.isInkDrop
                ? "1.5px solid rgba(244, 247, 250, 0.55)"
                : "none",
              clipPath: pt.isInkDrop
                ? "polygon(50% 0%, 88% 58%, 68% 100%, 32% 100%, 12% 58%)"
                : "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              transform: `rotate(${pt.rot}deg)`,
              opacity: pt.isInkDrop ? 0.88 : 0.7 + pulse * 0.3,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: SPIRAL SYMBIOTE VORTEX + GRABBING FLIP TENDRILS (NORMAL BLEND SVG)
          (Zero thick border — tentacles & spiral vortex only strike during transitions/flips!)
      ============================================ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          {/* 1. MODE 0: SPIRAL SYMBIOTE VORTEX ARMS */}
          {spiralActive && (
            <g
              opacity={Math.min(0.95, whipEnergy * 1.25 + dropImpact * 0.65)}
              style={{
                transformOrigin: "540px 960px",
                transform: `scale(${0.92 + whipEnergy * 0.22})`,
              }}
            >
              {spiralArms.map((dPath, sIdx) => (
                <g key={`spiral-arm-${sIdx}`}>
                  {/* Outer Symbiote Violet Glow */}
                  <path
                    d={dPath}
                    fill="none"
                    stroke={sIdx === 1 ? CARNAGE_RED : SYMBIOTE_VIOLET}
                    strokeWidth={34 + whipEnergy * 24}
                    strokeLinecap="round"
                    opacity={0.55}
                  />
                  {/* Glossy White Specular Rim */}
                  <path
                    d={dPath}
                    fill="none"
                    stroke={VENOM_WHITE}
                    strokeWidth={22 + whipEnergy * 14}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                  {/* Pitch-Black Liquid Symbiote Vortex Core */}
                  <path
                    d={dPath}
                    fill="none"
                    stroke={LIQUID_BLACK}
                    strokeWidth={15 + whipEnergy * 10}
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          )}

          {/* 2. SUDDEN SYMBIOTE TENTACLES GRABBING & FLIPPING THE IMAGE (Mode 1 + Mid-Cut) */}
          {grabTentacles.length > 0 && (
            <g opacity={Math.min(1, tentacleGrabIntensity * 1.35)}>
              {grabTentacles.map((tn, tIdx) => (
                <g key={`grab-tentacle-${tIdx}`}>
                  {/* Iridescent Violet / Crimson Slime Aura */}
                  <path
                    d={tn.body}
                    fill="none"
                    stroke={tIdx === 1 ? CARNAGE_RED : SYMBIOTE_VIOLET}
                    strokeWidth={16 + dropImpact * 10}
                    strokeLinejoin="round"
                    opacity={0.65}
                  />
                  {/* Glossy White Wet-Liquid Edge */}
                  <path
                    d={tn.body}
                    fill={LIQUID_BLACK}
                    stroke={VENOM_WHITE}
                    strokeWidth={5}
                    strokeLinejoin="round"
                  />
                  {/* Specular Liquid Spine Highlight */}
                  <path
                    d={tn.spine}
                    fill="none"
                    stroke={VENOM_WHITE}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    opacity={0.82}
                  />
                </g>
              ))}
            </g>
          )}

          {/* 3. MODE 3: DIAGONAL SYMBIOTE TEAR TENDRIL SLASH */}
          {showTearWhip && (
            <g
              style={{
                transformOrigin: "540px 960px",
                transform: `rotate(${index % 2 === 0 ? -34 : 34}deg)`,
              }}
              opacity={Math.min(1, whipEnergy * 1.3 + dropImpact * 0.8)}
            >
              {(() => {
                const p = transProg > 0 ? transProg : dropImpact;
                const lashX = interpolate(p, [0, 1], [-1450, 1500], CLAMP);
                const waveY = Math.sin(g * 0.45) * 50;
                return (
                  <g transform={`translate(${lashX}, 960)`}>
                    <path
                      d={`M -1280 0 Q -180 ${-95 + waveY} 1120 0 Q -180 ${
                        95 + waveY
                      } -1280 0 Z`}
                      fill={SYMBIOTE_VIOLET}
                      opacity="0.7"
                    />
                    <path
                      d={`M -1200 0 Q -150 ${-64 + waveY} 1080 0 Q -150 ${
                        64 + waveY
                      } -1200 0 Z`}
                      fill={LIQUID_BLACK}
                      stroke={VENOM_WHITE}
                      strokeWidth="5"
                    />
                    <path
                      d={`M -960 0 Q -120 ${-14 + waveY * 0.5} 960 0`}
                      fill="none"
                      stroke={VENOM_WHITE}
                      strokeWidth="3.5"
                      opacity="0.85"
                    />
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: ULTRA-THIN CLEAN HAIRLINE BORDER (NO THICK GOO)
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `3px solid ${
            index % 2 === 0 ? SYMBIOTE_VIOLET : CARNAGE_RED
          }`,
          opacity: 0.42 + dropImpact * 0.52,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: SAFE ZONE SYMBIOTE BRAND WATERMARK & TELEMETRY
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
        {/* TOP-LEFT VENOM SYMBIOTE WATERMARK (ZERO EMOJIS) */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            borderLeft: `7px solid ${VENOM_WHITE}`,
            borderRight: `3px solid ${
              index % 2 === 0 ? SYMBIOTE_VIOLET : CARNAGE_RED
            }`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 35%, 100% 100%, 6% 100%, 0 65%)",
            transform: `translateX(${Math.max(0, enterSnap) * -45}px) scale(${
              1 + dropImpact * 0.06
            })`,
          }}
        >
          <svg width="26" height="24" viewBox="0 0 26 24">
            <polygon
              points="2,4 9,19 13,9 17,19 24,4 19,4 16,12 13,5 10,12 7,4"
              fill={VENOM_WHITE}
            />
          </svg>
          <span
            style={{
              fontFamily,
              color: VENOM_WHITE,
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT SYMBIOTE TELEMETRY HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: "8px 20px",
            backgroundColor: "rgba(0, 0, 0, 0.86)",
            borderLeft: `6px solid ${
              index % 2 === 0 ? SYMBIOTE_VIOLET : CARNAGE_RED
            }`,
            borderTop: `2px solid ${VENOM_WHITE}`,
            transform: `translateX(${Math.max(0, enterSnap) * -40}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 24,
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
              color: VENOM_WHITE,
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

export const VenomSymbioteWhiplash: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#020204" overlap={0} Scene={Scene} />
);
