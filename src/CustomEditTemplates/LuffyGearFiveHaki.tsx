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
import { loadFont } from "@remotion/google-fonts/Bangers";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const WARM_OBSIDIAN = "#0A0503";
const SUN_GOLD = "#FFD426";
const RYUO_AMBER = "#FF8C00";
const STRAW_CRIMSON = "#E62229";
const STEAM_WHITE = "#FFFDF7";
const STEAM_BLUSH = "#FFD6DF";
const GEAR5_CLOUD = "#F4F7FF";

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

  const accent = brand.color || SUN_GOLD;
  const brandName = brand.name || "LUFFY G5";

  // ================================================
  // 01. DRUMS OF LIBERATION BEAT-SYNC (beatPulseAt)
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const impact = beatPulseAt(g, beatFrames, 3.0);
  const flashPeak = beatPulseAt(g, beatFrames, 4.4);
  const steamBurst = beatPulseAt(Math.max(0, g - 2), beatFrames, 2.0);

  // ================================================
  // 02. GOMU GOMU ELASTIC SPRING & VELOCITY CURVE
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const rubberTime =
    u < 0.2
      ? interpolate(u, [0, 0.2], [0, 0.46], CLAMP)
      : u < 0.8
        ? interpolate(u, [0.2, 0.8], [0.46, 0.54], CLAMP)
        : interpolate(u, [0.8, 1], [0.54, 1], CLAMP);

  const enterLen = Math.min(9, Math.max(1, Math.floor(duration / 2)));
  const exitLen = Math.min(7, Math.max(1, Math.floor(duration / 2)));
  const exitStart = Math.min(duration - 1, Math.max(0, duration - exitLen));

  // Underdamped rubber band spring: stretches past target and snaps back elastically
  const rubberSpring = spring({
    frame,
    fps,
    config: { damping: 6.8, stiffness: 300, mass: 0.42 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterCurve = index === 0 ? 0 : Math.pow(1 - enterProg, 2.3);
  const exitCurve = Math.pow(exitProg, 2.5);
  const elasticOsc = index === 0 ? 0 : 1 - rubberSpring;
  const cutMomentum = Math.min(1, enterCurve + exitCurve);

  const dir = index % 2 === 0 ? 1 : -1;

  // 4 Distinct Gomu Gomu Attack Modes (Elastic Stretch + Alternating Flips):
  // 0: Jet Pistol (Horizontal Rubber Slingshot Stretch + Air Cannon)
  // 1: Jet Gatling (Alternating Horizontal 3D Flip + Rapid Punch Bursts)
  // 2: Bazooka / Red Roc (Vertical Rubber Stretch-Slam + Steam Explosion)
  // 3: Gear 5 Bounce (Alternating Vertical 3D Flip + Toon Squash-Stretch)
  const attackMode = index % 4;
  const isJetPistol = attackMode === 0;
  const isJetGatling = attackMode === 1;
  const isBazooka = attackMode === 2;
  const isGear5Bounce = attackMode === 3;

  // ================================================
  // 03. ELASTIC STRETCH, ALTERNATING FLIPS & CAMERA RIG
  // ================================================
  // Base scale >= 1.26 guarantees zero edge gaps during rubber squash-stretch
  const baseScale = interpolate(rubberTime, [0, 1], [1.26, 1.37], CLAMP);

  // Rhythmic Toon-Force Squash & Stretch on Beat Drops
  const beatSquashWave = Math.sin(pulse * Math.PI * 3.0) * impact * 0.095;

  let stretchX = 1 + beatSquashWave;
  let stretchY = 1 - beatSquashWave * 0.8;

  if (isJetPistol) {
    // Horizontal Gomu Gomu Slingshot Stretch
    stretchX += elasticOsc * 0.65 + exitCurve * 0.7;
    stretchY += -elasticOsc * 0.16 - exitCurve * 0.16;
  } else if (isBazooka) {
    // Vertical Gomu Gomu Bazooka Stretch-Slam
    stretchY += elasticOsc * 0.66 + exitCurve * 0.72;
    stretchX += -elasticOsc * 0.16 - exitCurve * 0.16;
  } else {
    // Elastic rubber rebound on alternating 3D flips
    stretchX += elasticOsc * 0.24 - exitCurve * 0.14;
    stretchY += -elasticOsc * 0.16 + exitCurve * 0.18;
  }

  const finalScaleX = Math.max(0.84, stretchX);
  const finalScaleY = Math.max(0.84, stretchY);

  const dropZoom =
    impact * 0.14 +
    steamBurst * 0.055 +
    Math.max(0, elasticOsc) * 0.2 +
    exitCurve * 0.24;
  const totalScale = Math.max(1.22, baseScale + dropZoom);

  // Alternating 3D Flips: Mode 1 flips Horizontally (Y-axis), Mode 3 flips Vertically (X-axis)
  const flipY = isJetGatling
    ? (enterCurve * 88 - exitCurve * 86) * dir + elasticOsc * -14 * dir
    : 0;
  const flipX = isGear5Bounce
    ? (enterCurve * 84 - exitCurve * 82) * dir + elasticOsc * -14 * dir
    : isJetGatling
      ? (enterCurve * -10 + exitCurve * 10) * dir
      : 0;

  // Rubber Slingshot Punch Translation
  const punchX = isJetPistol ? (elasticOsc * 720 - exitCurve * 840) * dir : 0;
  const punchY = isBazooka ? (elasticOsc * -900 + exitCurve * 960) * dir : 0;

  // Punch Impact Shake + Gatling Rapid Micro-Jitter
  const gatlingJitter = isJetGatling && impact > 0.2 ? 16 : 0;
  const shakeAmp =
    impact * 34 +
    flashPeak * 16 +
    steamBurst * 14 +
    cutMomentum * 20 +
    gatlingJitter +
    pulse * 5;
  const shakeX =
    Math.sin(g * 4.2) * shakeAmp + (random(`lfx-${g}`) - 0.5) * impact * 30;
  const shakeY =
    Math.cos(g * 3.5) * shakeAmp + (random(`lfy-${g}`) - 0.5) * impact * 26;

  const camX = punchX + shakeX;
  const camY = punchY + shakeY;

  const camRot =
    (isJetPistol
      ? (elasticOsc * 11 - exitCurve * 13) * dir
      : isBazooka
        ? (elasticOsc * -8 + exitCurve * 10) * dir
        : (enterCurve * 6 - exitCurve * 7) * dir) +
    Math.sin(g * 0.24) * 1.5 +
    (random(`lfr-${g}`) - 0.5) * impact * 5.8;

  const rubberSkewX =
    (isJetPistol ? (elasticOsc - exitCurve) * 14 * dir : 0) +
    Math.sin(g * 4.4) * impact * 4.2;

  // ================================================
  // 04. WARM SUN-GOD GOLD & GEAR 2 STEAM CC (BRIGHT & DYNAMIC)
  // ================================================
  const ccContrast = 1.38 + impact * 0.28;
  const ccSat = 1.24 + pulse * 0.34;
  const ccBright = 0.98 + flashPeak * 0.24 + cutMomentum * 0.16;
  const luffyGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  // Golden Ryuo & Warm Steam Chromatic Echo on Punch Impacts
  const echoPower = Math.min(
    1,
    impact * 0.92 + steamBurst * 0.45 + cutMomentum * 0.8,
  );
  const echoShift = impact * 32 + steamBurst * 18 + cutMomentum * 36;

  // ================================================
  // 05. HEAVY GEAR 2 / GEAR 5 VOLUMETRIC STEAM SYSTEM
  // ================================================
  // 6 Large Rising Volumetric Steam Billows (Surging from bottom & flanks)
  const steamBillows = [0, 1, 2, 3, 4, 5].map((sIdx) => {
    const lane = sIdx % 3; // 0: left, 1: center-low, 2: right
    const speed = 13 + (sIdx % 4) * 4.5 + cutMomentum * 26 + steamBurst * 14;
    const rawY = (g * speed + sIdx * 360) % 2180;
    const y = 2080 - rawY;
    const baseX = lane === 0 ? 150 : lane === 2 ? 930 : 540;
    const x =
      baseX + Math.sin(g * 0.065 + sIdx * 1.9) * (lane === 1 ? 190 : 120);
    const scX =
      1.25 +
      Math.sin(g * 0.045 + sIdx) * 0.28 +
      pulse * 0.22 +
      steamBurst * 0.28;
    const scY = 0.92 + Math.cos(g * 0.04 + sIdx) * 0.22 + impact * 0.18;
    const tint =
      sIdx % 3 === 0
        ? "rgba(255, 253, 247, 0.32)" // Dense Pure Gear 5 White Steam
        : sIdx % 3 === 1
          ? "rgba(255, 214, 223, 0.26)" // Hot Gear 2 Pinkish Steam
          : "rgba(255, 224, 130, 0.22)"; // Sun-Lit Golden Steam Haze

    return { x, y, scX, scY, tint };
  });

  // ================================================
  // 06. 30 HIGH-DENSITY PARTICLES (18 STEAM PUFFS + 12 GOLDEN HAKI SPARKS)
  // ================================================
  // A) 18 Rising Pressurized Steam Puff Particles (Soft swirling cloudlets)
  const steamParticles = Array.from({ length: 18 }, (_, i) => {
    const seed = i * 79 + index * 43;
    const speed = 14 + (i % 6) * 6 + cutMomentum * 30 + steamBurst * 14;
    const travel = (g * speed + random(`stpy-${seed}`) * 2040) % 2140;
    const life = travel / 2140; // 0 at bottom -> 1 at top
    const sway =
      Math.sin(g * (0.06 + (i % 3) * 0.02) + i * 1.4) * (75 + (i % 4) * 32);
    const x =
      ((random(`stpx-${seed}`) * 1080 + sway + camX * 0.12) % 1160) - 40;
    const y = 2020 - travel;
    // Steam puffs expand as they rise and dissolve gently near the top
    const baseSize = 18 + (i % 5) * 12;
    const size = baseSize * (0.75 + life * 1.15 + steamBurst * 0.35);
    const op =
      interpolate(life, [0, 0.12, 0.72, 1], [0, 0.62, 0.42, 0], CLAMP) *
      (0.8 + pulse * 0.28);
    const col = i % 3 === 0 ? STEAM_BLUSH : STEAM_WHITE;

    return { x, y, size, op, col };
  });

  // B) 12 Pure Golden Conqueror's Haki Sparks (ZERO black sparks!)
  const goldenSparks = Array.from({ length: 12 }, (_, i) => {
    const seed = i * 101 + index * 29;
    const angle = -1.25 + (random(`gsp-a-${seed}`) - 0.5) * 1.3;
    const speed = 26 + (i % 4) * 12 + cutMomentum * 42 + impact * 22;
    const travel = (g * speed + random(`gsp-t-${seed}`) * 2000) % 2140;
    const x =
      ((random(`gsp-x-${seed}`) * 1080 +
        Math.cos(angle) * travel * 0.55 +
        camX * 0.18) %
        1160) -
      40;
    const y = 1980 - travel;
    const len = 18 + (i % 4) * 12 + impact * 26;
    const thick = 4 + (i % 3) * 2;
    const rot = (angle * 180) / Math.PI + 75;
    const col = i % 3 === 0 ? SUN_GOLD : i % 3 === 1 ? STEAM_WHITE : RYUO_AMBER;

    return { x, y, len, thick, rot, col };
  });

  // ================================================
  // 07. GOMU GOMU ATTACK SVG ANIMATIONS & GOLDEN HAKI ARCS
  // ================================================
  const transProg =
    frame < enterLen + 3 && index > 0
      ? interpolate(frame, [0, enterLen + 3], [0, 1], CLAMP)
      : frame >= exitStart
        ? exitProg
        : 0;

  // A) Golden Conqueror's Haki / Ryuo Crackles (Pure Gold & Amber — ZERO Black!)
  const hakiSeed = Math.floor(g / 2);
  const buildGoldenHakiArc = (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    id: number,
  ) => {
    let pts = `${sx},${sy} `;
    for (let s = 1; s <= 6; s++) {
      const t = s / 7;
      const jx =
        sx + (ex - sx) * t + (random(`ghx-${hakiSeed}-${id}-${s}`) - 0.5) * 175;
      const jy =
        sy + (ey - sy) * t + (random(`ghy-${hakiSeed}-${id}-${s}`) - 0.5) * 175;
      pts += `${jx.toFixed(0)},${jy.toFixed(0)} `;
    }
    pts += `${ex},${ey}`;
    return pts;
  };

  const showGoldenHaki = impact > 0.28 || cutMomentum > 0.22;
  const goldenHakiBolts = showGoldenHaki
    ? [
        buildGoldenHakiArc(0, 340, 380, 740, 1),
        buildGoldenHakiArc(1080, 420, 700, 820, 2),
        buildGoldenHakiArc(0, 1560, 410, 1180, 3),
        buildGoldenHakiArc(1080, 1480, 670, 1120, 4),
      ]
    : [];

  // B) Mode 1: Gomu Gomu no Gatling Rapid-Fire Impact Positions (Perimeter Hammering)
  const gatlingStep = Math.floor(g / 2);
  const gatlingHits =
    isJetGatling && (impact > 0.16 || cutMomentum > 0.15)
      ? [0, 1, 2, 3, 4].map((hIdx) => {
          // Place punches around outer halo so Luffy's face stays clean
          const theta = (gatlingStep * 1.7 + hIdx * 1.25) % (Math.PI * 2);
          const radX = 330 + random(`gtx-${gatlingStep}-${hIdx}`) * 150;
          const radY = 460 + random(`gty-${gatlingStep}-${hIdx}`) * 240;
          const hx = 540 + Math.cos(theta) * radX;
          const hy = 940 + Math.sin(theta) * radY;
          const phase = ((g + hIdx * 2) % 6) / 6;
          const scale = 0.55 + phase * 1.15 + impact * 0.35;
          const op = (1 - phase) * Math.min(1, impact * 1.2 + cutMomentum);
          return { hx, hy, scale, op };
        })
      : [];

  // C) Pressurized Steam Ring Burst (Mode 2 Bazooka / Red Roc & Beat Drops)
  const bazookaBurstProg = isBazooka
    ? transProg > 0
      ? transProg
      : impact > 0.35
        ? 1 - impact
        : 0
    : 0;

  const renderHeroLayers = () => (
    <>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: luffyGrade,
        }}
      />

      {/* Crisp Anime Ink-Pop Contrast Pass */}
      <AbsoluteFill
        style={{
          mixBlendMode: "overlay",
          opacity: 0.38 + pulse * 0.2,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(1) contrast(2.2) brightness(0.95)",
          }}
        />
      </AbsoluteFill>

      {/* Golden Ryuo & Gear 2 Steam Motion Echoes */}
      {echoPower > 0.06 && (
        <>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: echoPower * 0.42,
              transform: `translate3d(${-echoShift * dir}px, ${
                echoShift * 0.18
              }px, 0) scale(${1 + echoPower * 0.05})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(-10deg) saturate(5.2) contrast(1.45)",
              }}
            />
          </AbsoluteFill>

          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: echoPower * 0.34,
              transform: `translate3d(${echoShift * dir}px, ${
                -echoShift * 0.18
              }px, 0) scale(${1 + echoPower * 0.09})`,
            }}
          >
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter:
                  "sepia(1) hue-rotate(-35deg) saturate(4.5) contrast(1.45)",
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
        backgroundColor: WARM_OBSIDIAN,
        overflow: "hidden",
        perspective: 1150,
      }}
    >
      {/* ============================================
          LAYER 01: 9:16 FULL-BLEED SUN-LIT BACKDROP (ZERO EDGE GAPS)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${Math.max(1.38, totalScale * 1.22)}) rotate(${
            -camRot * 0.35
          }deg)`,
          opacity: 0.46,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.5) saturate(0.85) brightness(0.42)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT + ELASTIC STRETCH + ALTERNATING FLIPS
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${flipX}deg) rotateY(${flipY}deg) rotateZ(${camRot}deg) skewX(${rubberSkewX}deg) scale(${
            totalScale * finalScaleX
          }, ${totalScale * finalScaleY})`,
        }}
      >
        {renderHeroLayers()}
      </AbsoluteFill>

      {/* ============================================
          LAYER 03: HEAVY GEAR 2 / GEAR 5 VOLUMETRIC STEAM BILLOWS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {steamBillows.map((st, sIdx) => (
          <div
            key={`luffy-billow-${sIdx}`}
            style={{
              position: "absolute",
              left: st.x,
              top: st.y,
              width: 780,
              height: 520,
              background: `radial-gradient(ellipse at 50% 50%, ${st.tint} 0%, rgba(255, 253, 247, 0.12) 45%, transparent 74%)`,
              transform: `translate(-50%, -50%) scale(${st.scX}, ${st.scY})`,
              opacity: 0.78 + pulse * 0.22,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* Dense Pressurized Bottom Steam Bank (Gear 2 & Gear 5 Vapor) */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(0deg, rgba(255,253,247,0.48) 0%, ${STEAM_BLUSH}38 22%, ${SUN_GOLD}20 42%, transparent 64%)`,
          mixBlendMode: "screen",
          opacity: 0.52 + steamBurst * 0.42,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 04: GOMU GOMU ATTACK ANIMATIONS & GOLDEN HAKI (SVG)
          - Mode 0 (Jet Pistol): Elastic Air-Cannon Pressure Rings
          - Mode 1 (Jet Gatling): Rapid-Fire Multi-Punch Impact Shockwaves
          - Mode 2 (Bazooka / Red Roc): Exploding Steam-Cloud Ring
          - Mode 3 (Gear 5 Bounce): Hagoromo Celestial Cloud Swirl
          - All Drops: Pure Golden Conqueror's Haki Crackles (ZERO Black!)
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
          {/* 1. PURE GOLDEN CONQUEROR'S HAKI / RYUO CRACKLES (NO BLACK CORE) */}
          {showGoldenHaki && (
            <g opacity={Math.min(0.96, impact * 1.25 + cutMomentum * 0.9)}>
              {goldenHakiBolts.map((pts, bIdx) => (
                <g key={`gold-haki-${bIdx}`}>
                  {/* Warm Red-Hawk Amber Outer Glow */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={RYUO_AMBER}
                    strokeWidth={28 + impact * 20}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.48}
                  />
                  {/* Pure Golden Conqueror Haki Arc */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={SUN_GOLD}
                    strokeWidth={11 + impact * 9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.92}
                  />
                  {/* White-Hot Electric Core */}
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={STEAM_WHITE}
                    strokeWidth={4 + impact * 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}
            </g>
          )}

          {/* 2. MODE 0 — GOMU GOMU NO JET PISTOL: ELASTIC AIR-CANNON RINGS */}
          {isJetPistol && (transProg > 0.01 || impact > 0.38) && (
            <g>
              {(() => {
                const p = transProg > 0 ? transProg : impact;
                const op = interpolate(
                  p,
                  [0, 0.12, 0.82, 1],
                  [0, 0.95, 0.85, 0],
                  CLAMP,
                );
                return (
                  <g opacity={op}>
                    {[0, 1, 2, 3].map((rIdx) => {
                      const ringP = Math.min(
                        1,
                        Math.max(0, p * 1.35 - rIdx * 0.12),
                      );
                      const rx =
                        dir > 0
                          ? interpolate(ringP, [0, 1], [-120, 1220], CLAMP)
                          : interpolate(ringP, [0, 1], [1200, -140], CLAMP);
                      const radY = 140 + rIdx * 85 + ringP * 240;
                      const radX = 34 + rIdx * 18 + ringP * 48;

                      return (
                        <g key={`jet-ring-${rIdx}`}>
                          {/* Pressurized White Steam Shock Ring */}
                          <ellipse
                            cx={rx}
                            cy={960}
                            rx={radX}
                            ry={radY}
                            fill="none"
                            stroke={rIdx % 2 === 0 ? STEAM_WHITE : SUN_GOLD}
                            strokeWidth={16 - rIdx * 2.5 + impact * 10}
                            opacity={0.85 - rIdx * 0.14}
                          />
                          {/* Elastic Jet Speed-Lines Trailing the Punch */}
                          <line
                            x1={rx - 360 * dir}
                            y1={960 - radY * 0.72}
                            x2={rx}
                            y2={960 - radY * 0.72}
                            stroke={SUN_GOLD}
                            strokeWidth="6"
                            strokeLinecap="round"
                            opacity="0.7"
                          />
                          <line
                            x1={rx - 360 * dir}
                            y1={960 + radY * 0.72}
                            x2={rx}
                            y2={960 + radY * 0.72}
                            stroke={STEAM_WHITE}
                            strokeWidth="5"
                            strokeLinecap="round"
                            opacity="0.7"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            </g>
          )}

          {/* 3. MODE 1 — GOMU GOMU NO JET GATLING: RAPID-FIRE PUNCH IMPACT BURSTS */}
          {gatlingHits.length > 0 && (
            <g>
              {gatlingHits.map((gh, gIdx) => (
                <g
                  key={`gatling-hit-${gIdx}`}
                  transform={`translate(${gh.hx.toFixed(1)}, ${gh.hy.toFixed(
                    1,
                  )}) scale(${gh.scale.toFixed(2)})`}
                  opacity={gh.op}
                >
                  {/* Air-Pressure Impact Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="86"
                    fill="none"
                    stroke={gIdx % 2 === 0 ? STEAM_WHITE : SUN_GOLD}
                    strokeWidth="12"
                    opacity="0.88"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="52"
                    fill="none"
                    stroke={RYUO_AMBER}
                    strokeWidth="6"
                    strokeDasharray="34 22"
                  />
                  {/* 6 Kinetic Manga Punch Burst Rays */}
                  {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <line
                      key={`ray-${deg}`}
                      x1="0"
                      y1="-62"
                      x2="0"
                      y2="-128"
                      stroke={gIdx % 2 === 0 ? SUN_GOLD : STEAM_WHITE}
                      strokeWidth="7"
                      strokeLinecap="round"
                      transform={`rotate(${deg + gIdx * 18})`}
                    />
                  ))}
                </g>
              ))}
            </g>
          )}

          {/* 4. MODE 2 — GOMU GOMU NO BAZOOKA / RED ROC: EXPLODING STEAM-CLOUD RING */}
          {isBazooka && bazookaBurstProg > 0.01 && (
            <g>
              {(() => {
                const p = bazookaBurstProg;
                const op = interpolate(
                  p,
                  [0, 0.14, 0.78, 1],
                  [0, 0.92, 0.75, 0],
                  CLAMP,
                );
                const ringR = interpolate(p, [0, 1], [140, 740], CLAMP);

                return (
                  <g opacity={op}>
                    {/* Fiery Red-Roc Golden Shock Ring */}
                    <circle
                      cx="540"
                      cy="960"
                      r={ringR * 0.88}
                      fill="none"
                      stroke={RYUO_AMBER}
                      strokeWidth={24 * (1 - p * 0.5)}
                      opacity="0.72"
                    />
                    <circle
                      cx="540"
                      cy="960"
                      r={ringR}
                      fill="none"
                      stroke={SUN_GOLD}
                      strokeWidth={10 * (1 - p * 0.4)}
                    />
                    {/* 10 Billowing White Steam Cloud Puffs Blasting Outward */}
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((cIdx) => {
                      const ang = (cIdx / 10) * Math.PI * 2 + index * 0.4;
                      const cx = 540 + Math.cos(ang) * ringR;
                      const cy = 960 + Math.sin(ang) * ringR * 1.15;
                      const puffR = 72 + (cIdx % 3) * 28 + p * 65;
                      return (
                        <circle
                          key={`bazooka-puff-${cIdx}`}
                          cx={cx.toFixed(1)}
                          cy={cy.toFixed(1)}
                          r={puffR}
                          fill={cIdx % 2 === 0 ? STEAM_WHITE : STEAM_BLUSH}
                          opacity={0.42 * (1 - p * 0.4)}
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </g>
          )}

          {/* 5. MODE 3 — GEAR 5 SUN GOD HAGOROMO STEAM SCARF & TOON CLOUDS */}
          {isGear5Bounce && (
            <g opacity={0.5 + pulse * 0.35}>
              {/* Upper Floating Gear 5 Celestial Cloud Ribbon */}
              <path
                d={`M -90 ${370 + Math.sin(g * 0.14) * 55} Q 250 ${
                  200 - Math.cos(g * 0.11) * 65
                } 540 ${340 + Math.sin(g * 0.13) * 48} T 1170 ${
                  280 - Math.sin(g * 0.12) * 50
                }`}
                fill="none"
                stroke={GEAR5_CLOUD}
                strokeWidth={34 + impact * 18}
                strokeLinecap="round"
                strokeDasharray="280 95 160 85"
                strokeDashoffset={-g * 16}
                opacity="0.65"
              />
              {/* Lower Floating Gear 5 Celestial Cloud Ribbon */}
              <path
                d={`M -90 ${1560 - Math.cos(g * 0.14) * 55} Q 310 ${
                  1720 + Math.sin(g * 0.11) * 60
                } 600 ${1580 - Math.cos(g * 0.13) * 48} T 1170 ${
                  1640 + Math.sin(g * 0.12) * 50
                }`}
                fill="none"
                stroke={SUN_GOLD}
                strokeWidth={24 + impact * 14}
                strokeLinecap="round"
                strokeDasharray="240 110"
                strokeDashoffset={g * 18}
                opacity="0.55"
              />
            </g>
          )}

          {/* 6. CONTINUOUS ANIME STEAM CLOUD PUFFS RISING FROM BOTTOM CORNERS */}
          <g opacity={0.38 + steamBurst * 0.42}>
            {[
              { bx: 120, by: 1780, r: 145, ph: 0 },
              { bx: 290, by: 1860, r: 125, ph: 1.4 },
              { bx: 960, by: 1790, r: 150, ph: 2.6 },
              { bx: 790, by: 1870, r: 120, ph: 3.8 },
            ].map((cl, cIdx) => {
              const rise = Math.sin(g * 0.12 + cl.ph) * 42;
              const grow = 1 + steamBurst * 0.25 + pulse * 0.1;
              return (
                <circle
                  key={`corner-steam-${cIdx}`}
                  cx={cl.bx + Math.cos(g * 0.08 + cl.ph) * 28}
                  cy={cl.by + rise}
                  r={cl.r * grow}
                  fill={cIdx % 2 === 0 ? STEAM_WHITE : STEAM_BLUSH}
                  opacity="0.44"
                />
              );
            })}
          </g>
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: 18 STEAM PUFF PARTICLES + 12 GOLDEN HAKI SPARKS (30 TOTAL)
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {/* 18 Expanding Pressurized Steam Cloudlet Particles */}
        {steamParticles.map((sp, i) => (
          <div
            key={`luffy-st-pt-${i}`}
            style={{
              position: "absolute",
              left: sp.x,
              top: sp.y,
              width: sp.size,
              height: sp.size * 0.88,
              borderRadius: "50%",
              background: `radial-gradient(circle at 45% 45%, ${sp.col} 0%, ${sp.col}88 45%, transparent 74%)`,
              transform: "translate(-50%, -50%)",
              opacity: sp.op,
            }}
          />
        ))}

        {/* 12 Radiant Golden Conqueror's Haki Sparks (Zero Black!) */}
        {goldenSparks.map((gs, i) => (
          <div
            key={`luffy-gold-sp-${i}`}
            style={{
              position: "absolute",
              left: gs.x,
              top: gs.y,
              width: gs.len,
              height: gs.thick,
              backgroundColor: gs.col,
              clipPath: "polygon(0% 50%, 30% 0%, 100% 50%, 30% 100%)",
              transform: `rotate(${gs.rot}deg)`,
              opacity: 0.72 + pulse * 0.28,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: SUN-GOD GOLDEN BLOOM, WARM VIGNETTE & CLEAN BORDER
      ============================================ */}
      {/* Warm Sun-Lit Golden / Gear-2 Crimson Atmosphere */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(155deg, ${SUN_GOLD}38 0%, transparent 40%, transparent 62%, ${STRAW_CRIMSON}34 100%)`,
          mixBlendMode: "screen",
          opacity: 0.44 + pulse * 0.36,
          pointerEvents: "none",
        }}
      />

      {/* Soft Warm Cinematic Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 42%, rgba(10,5,3,0.48) 78%, rgba(10,5,3,0.9) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Sun-God Golden & Steam Flash on Beat Drops & Transitions */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 48%, ${STEAM_WHITE} 0%, ${SUN_GOLD}99 36%, transparent 74%)`,
          mixBlendMode: "overlay",
          opacity: cutMomentum * 0.56 + flashPeak * 0.38,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          border: `4px solid ${SUN_GOLD}`,
          opacity: 0.45 + impact * 0.52,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: SAFE ZONE STRAW HAT WATERMARK & TELEMETRY (ZERO EMOJIS)
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
        {/* TOP-LEFT STRAW HAT WATERMARK BADGE */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "9px 26px",
            backgroundColor: "rgba(10, 5, 3, 0.88)",
            borderLeft: `7px solid ${SUN_GOLD}`,
            borderRight: `3px solid ${STRAW_CRIMSON}`,
            clipPath:
              "polygon(0 0, 94% 0, 100% 34%, 100% 100%, 6% 100%, 0 66%)",
            transform: `translateX(${enterCurve * -45}px) scale(${
              1 + impact * 0.06
            })`,
          }}
        >
          {/* Straw Hat Vector Emblem */}
          <svg width="32" height="24" viewBox="0 0 32 24">
            <path
              d="M 7 15 C 7 5 25 5 25 15 Z"
              fill={SUN_GOLD}
              stroke={STEAM_WHITE}
              strokeWidth="1.2"
            />
            <rect x="7" y="12" width="18" height="3.5" fill={STRAW_CRIMSON} />
            <ellipse
              cx="16"
              cy="16.5"
              rx="14.5"
              ry="3.6"
              fill={SUN_GOLD}
              stroke={WARM_OBSIDIAN}
              strokeWidth="1.2"
            />
          </svg>
          <span
            style={{
              fontFamily,
              color: STEAM_WHITE,
              fontSize: 34,
              letterSpacing: 4,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {brandName}
          </span>
        </div>

        {/* BOTTOM-LEFT GRAND LINE TELEMETRY HUD */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "8px 20px",
            backgroundColor: "rgba(10, 5, 3, 0.84)",
            borderLeft: `6px solid ${SUN_GOLD}`,
            borderTop: `2px solid ${STEAM_WHITE}`,
            transform: `translateX(${enterCurve * -40}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 28,
              color: SUN_GOLD,
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
              fontSize: 18,
              color: STEAM_WHITE,
              letterSpacing: 3,
              lineHeight: 1.05,
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

export const LuffyGearFiveHaki: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#0A0503" overlap={0} Scene={Scene} />
);
