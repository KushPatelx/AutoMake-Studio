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
  weights: ["600", "700", "900"],
  subsets: ["latin"],
});

const NOCTURNAL_VOID = "#020306";
const PURE_LUNAR_WHITE = "#FFFFFF";
const COLD_SILVER = "#DDE9F8";
const GLACIAL_MIST = "#8EC5FF";
const STEEL_SHADOW = "#1B2433";
const PALE_GOLD = "#CBB582";

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

  const accent = brand.color || COLD_SILVER;
  const brandName = brand.name || "MOON KNIGHT";

  // ================================================
  // 01. HEAVY BEAT-LOCKED SYNC & ONE-WAY SHOCKWAVE CLOCK
  // ================================================
  const pulse = beatPulseAt(g, beatFrames, 1);
  const rawDrop = beatPulseAt(g, beatFrames, 2.2);
  const beatDrop = Math.pow(rawDrop, 1.45);
  const whiteFlashPeak = Math.pow(beatPulseAt(g, beatFrames, 3.6), 1.6);
  const lunarResonance = beatPulseAt(Math.max(0, g - 3), beatFrames, 1.8);

  // Exact frames elapsed since the most recent beat (for clean 1-way shockwave rings)
  let framesSinceBeat = 999;
  for (let i = 0; i < beatFrames.length; i++) {
    const diff = g - beatFrames[i];
    if (diff >= 0 && diff < framesSinceBeat) {
      framesSinceBeat = diff;
    }
  }

  // ================================================
  // 02. CONTROLLED CINEMATIC PACING (NO RUSHED FLICKER)
  // ================================================
  const u = Math.min(1, Math.max(0, frame / duration));
  const slowDrift =
    u < 0.25
      ? interpolate(u, [0, 0.25], [0, 0.35], CLAMP)
      : u < 0.75
        ? interpolate(u, [0.25, 0.75], [0.35, 0.68], CLAMP)
        : interpolate(u, [0.75, 1], [0.68, 1], CLAMP);

  const enterLen = Math.min(12, Math.max(2, Math.floor(duration * 0.42)));
  const exitLen = Math.min(8, Math.max(2, Math.floor(duration * 0.26)));
  const exitStart = Math.min(duration - 1, Math.max(1, duration - exitLen));

  const heavySpring = spring({
    frame,
    fps,
    config: { damping: 17, stiffness: 145, mass: 0.78 },
  });

  const enterProg =
    index === 0 ? 1 : interpolate(frame, [0, enterLen], [0, 1], CLAMP);
  const exitProg = interpolate(frame, [exitStart, duration], [0, 1], CLAMP);

  const enterEase = 1 - Math.pow(1 - enterProg, 2.8);
  const exitEase = Math.pow(exitProg, 2.4);
  const enterRem = index === 0 ? 0 : 1 - enterEase;
  const cutIntensity = Math.min(1, enterRem + exitEase);

  // 4 Cinematic Moon Knight Transitions:
  // 0: Crescent Shape Image Cut (Right -> Left) + Diamond Flush Burst
  // 1: Colossal Rising Crescent Blade (Bottom -> Top) + Upward Diamond Flush
  // 2: Crescent Shape Image Cut (Left -> Right) + Diamond Flush Burst
  // 3: Lunar Eclipse 3D Flip + Radial Diamond Flush & Shockwave Ring
  const transMode = index % 4;
  const isCrescentCutRight = transMode === 0;
  const isRisingCrescent = transMode === 1;
  const isCrescentCutLeft = transMode === 2;
  const isCrescentCut = isCrescentCutRight || isCrescentCutLeft;
  const isEclipseFlip = transMode === 3;

  const dir = transMode === 0 || transMode === 1 ? 1 : -1;

  // ================================================
  // 03. WEIGHTY CAMERA RIG (BEAT-MATCHED THUD, ZERO JITTER)
  // ================================================
  const baseScale = interpolate(slowDrift, [0, 1], [1.16, 1.25], CLAMP);
  const transitionZoom = isEclipseFlip
    ? enterRem * 0.22 + exitEase * 0.18
    : (1 - heavySpring) * 0.16 + exitEase * 0.18;

  const beatZoom = beatDrop * 0.11 + lunarResonance * 0.035;
  const totalScale = Math.max(1.15, baseScale + transitionZoom + beatZoom);

  const flipY = isEclipseFlip ? (enterRem * 78 - exitEase * 72) * dir : 0;
  const flipX = isEclipseFlip ? (enterRem * -10 + exitEase * 10) * dir : 0;

  const thudAmp = beatDrop * 24 + whiteFlashPeak * 10 + cutIntensity * 10;
  const shakeX =
    Math.sin(g * 1.45 + index) * thudAmp +
    (random(`mkx-${Math.floor(g / 2)}`) - 0.5) * beatDrop * 12;
  const shakeY =
    Math.cos(g * 1.15 + index) * thudAmp +
    beatDrop * 10 +
    (random(`mky-${Math.floor(g / 2)}`) - 0.5) * beatDrop * 10;

  const risingLiftY = isRisingCrescent ? enterRem * 95 : 0;

  const camX = shakeX;
  const camY = shakeY + risingLiftY;

  const camRot =
    (isEclipseFlip
      ? (enterRem * -6 + exitEase * 6) * dir
      : (enterRem * 3.5 - exitEase * 4) * dir) +
    Math.sin(g * 0.075) * 1.1 +
    Math.sin(g * 1.3) * beatDrop * 2.4;

  // ================================================
  // 04. ALTERNATING CRESCENT IMAGE CUT & RISING CRESCENT CLIP MATH
  // ================================================
  const buildCrescentCutData = () => {
    if (!isCrescentCut || index === 0 || enterProg >= 0.995) {
      return {
        clipPath: undefined as string | undefined,
        edgePath: "",
        edgeOpacity: 0,
      };
    }
    const e = enterEase;
    const sweepDir = isCrescentCutRight ? 1 : -1;
    const steps = 18;
    const bell = Math.sin(e * Math.PI);

    const leadPts: Array<{ x: number; y: number }> = [];
    const trailPts: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const v = i / steps;
      const arch = Math.sin(Math.PI * v) * bell;
      const rawLeadX = interpolate(e, [0, 1], [98, -22], CLAMP) - arch * 44;
      const rawTrailX =
        interpolate(Math.pow(e, 0.65), [0, 1], [104, 122], CLAMP) - arch * 16;

      const xL = sweepDir === 1 ? rawLeadX : 100 - rawLeadX;
      const xR = sweepDir === 1 ? rawTrailX : 100 - rawTrailX;
      const yPct = v * 100;

      leadPts.push({ x: xL, y: yPct });
      trailPts.push({ x: xR, y: yPct });
    }

    const polyPoints = [
      ...leadPts.map((p) => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`),
      ...trailPts
        .slice()
        .reverse()
        .map((p) => `${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`),
    ].join(", ");

    const svgEdge = leadPts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${(p.x * 10.8).toFixed(1)} ${(
            p.y * 19.2
          ).toFixed(1)}`,
      )
      .join(" ");

    const edgeOpacity = interpolate(
      e,
      [0, 0.08, 0.78, 1],
      [0, 1, 0.92, 0],
      CLAMP,
    );

    return {
      clipPath: `polygon(${polyPoints})`,
      edgePath: svgEdge,
      edgeOpacity,
    };
  };

  const crescentCut = buildCrescentCutData();

  const risingActive = isRisingCrescent && index > 0 && enterProg < 0.995;
  const risingBell = Math.sin(enterEase * Math.PI);
  const risingBladeYPct = interpolate(enterEase, [0, 1], [116, -24], CLAMP);

  const buildRisingRevealClip = () => {
    if (!risingActive) return undefined;
    const steps = 16;
    const topPts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const h = i / steps;
      const xPct = h * 100;
      const yPct =
        risingBladeYPct - Math.sin(Math.PI * h) * (18 + risingBell * 12);
      topPts.push(`${xPct.toFixed(2)}% ${yPct.toFixed(2)}%`);
    }
    return `polygon(${topPts.join(", ")}, 105% 110%, -5% 110%)`;
  };

  const risingRevealClip = buildRisingRevealClip();
  const activeRevealClip = crescentCut.clipPath || risingRevealClip;

  // ================================================
  // 05. GRITTY SILVER-NOIR CINEMATIC CC & SUBTLE CHROMATIC BLUR
  // ================================================
  const ccContrast = 1.44 + beatDrop * 0.24;
  const ccSat = 0.76 + pulse * 0.22;
  const ccBright = 0.94 + whiteFlashPeak * 0.26 + cutIntensity * 0.14;
  const lunarNoirGrade = `contrast(${ccContrast}) saturate(${ccSat}) brightness(${ccBright})`;

  const echoPower = Math.min(1, beatDrop * 0.85 + cutIntensity * 0.65);
  const echoShift = beatDrop * 26 + cutIntensity * 28;

  // ================================================
  // 06. BORDER-DENSE DIAMOND PARTICLES (44 AMBIENT DIAMONDS)
  //     Zero moon/crescent particles — pure sharp faceted diamonds
  // ================================================
  const gustPushX = isCrescentCutRight
    ? -Math.sin(enterEase * Math.PI) * 110
    : isCrescentCutLeft
      ? Math.sin(enterEase * Math.PI) * 110
      : 0;
  const gustPushY = isRisingCrescent ? -risingBell * 120 : 0;

  const ambientDiamonds = Array.from({ length: 44 }, (_, i) => {
    const seed = i * 97 + index * 53;
    const slot = i % 10;
    const speed = 4.4 + (i % 5) * 2.0 + beatDrop * 5.0 + cutIntensity * 8;
    const sway = Math.sin(g * (0.024 + (i % 3) * 0.008) + i * 1.65);

    let x = 0;
    let y = 0;
    let isCenter = false;

    if (slot <= 2) {
      // Dense Left Border Band
      x = -6 + random(`dm-lx-${seed}`) * 185 + sway * 22 + gustPushX * 0.45;
      const travel = (g * speed + random(`dm-ly-${seed}`) * 2050) % 2140;
      y = 2010 - travel + gustPushY * 0.45;
    } else if (slot <= 5) {
      // Dense Right Border Band
      x = 895 + random(`dm-rx-${seed}`) * 190 + sway * 22 + gustPushX * 0.45;
      const travel = (g * speed + random(`dm-ry-${seed}`) * 2050) % 2140;
      y = 2010 - travel + gustPushY * 0.45;
    } else if (slot === 6) {
      // Top Border Band
      const dirH = i % 2 === 0 ? 1 : -1;
      const travelX =
        (g * (speed * 0.72) + random(`dm-tx-${seed}`) * 1200) % 1200;
      x = (dirH > 0 ? travelX - 60 : 1140 - travelX) + gustPushX * 0.55;
      y = 16 + random(`dm-ty-${seed}`) * 255 + sway * 16 + gustPushY * 0.35;
    } else if (slot <= 8) {
      // Bottom Border Band
      const dirH = i % 2 === 0 ? 1 : -1;
      const travelX =
        (g * (speed * 0.72) + random(`dm-bx-${seed}`) * 1200) % 1200;
      x = (dirH > 0 ? travelX - 60 : 1140 - travelX) + gustPushX * 0.55;
      y = 1630 + random(`dm-by-${seed}`) * 280 + sway * 16 + gustPushY * 0.5;
    } else {
      // Only 10% ultra-sparse center subject zone
      isCenter = true;
      x = 290 + random(`dm-cx-${seed}`) * 500 + sway * 30 + gustPushX * 0.7;
      const travel =
        (g * (speed * 0.8) + random(`dm-cy-${seed}`) * 2040) % 2120;
      y = 1990 - travel + gustPushY * 0.65;
    }

    const baseSize = isCenter
      ? 3.2 + (i % 2) * 1.8
      : 4.5 + (i % 4) * 2.6 + beatDrop * 2.4;
    const aspect = i % 3 === 0 ? 1.85 : 1.35;
    const rot = g * (1.1 + (i % 4) * 0.65) * (i % 2 === 0 ? 1 : -1) + i * 29;
    const twinkle = 0.72 + 0.28 * Math.sin(g * 0.16 + i * 2.3);
    const col =
      i % 4 === 0
        ? PURE_LUNAR_WHITE
        : i % 3 === 0
          ? GLACIAL_MIST
          : i % 9 === 0
            ? PALE_GOLD
            : COLD_SILVER;
    const op =
      (isCenter ? 0.2 + beatDrop * 0.14 : 0.58 + beatDrop * 0.42) * twinkle;

    return { x, y, w: baseSize, h: baseSize * aspect, rot, col, op };
  });

  // ================================================
  // 07. TRANSITION FLUSH-OUT DIAMOND BURST (24 PARTICLES)
  //     Particles flush out directly from the sweeping image transition edge!
  // ================================================
  const flushWindow = enterLen + 7;
  const isFlushing = index > 0 && frame <= flushWindow;
  const flushDiamonds = isFlushing
    ? Array.from({ length: 24 }, (_, i) => {
        const seed = i * 137 + index * 79;
        // Staggered spawn along the transition sweep
        const launchT = (i / 24) * 0.55;
        const globalP = interpolate(frame, [0, flushWindow], [0, 1], CLAMP);
        if (globalP <= launchT) return null;

        const lp = Math.min(1, (globalP - launchT) / (1 - launchT));
        const easeOut = 1 - Math.pow(1 - lp, 2.3);

        let px = 540;
        let py = 960;
        let rot = 0;

        if (isCrescentCutRight || isCrescentCutLeft) {
          // Side crescent cut: spawn right along the sweeping edge & flush out ahead of it!
          const sweepDir = isCrescentCutRight ? -1 : 1; // Right->Left flushes left (-1); Left->Right flushes right (+1)
          const v = 0.06 + (i / 24) * 0.88;
          const archShift = Math.sin(Math.PI * v) * 260;
          const originX = isCrescentCutRight
            ? interpolate(launchT, [0, 0.55], [1040, 260], CLAMP) -
              archShift * 0.5
            : interpolate(launchT, [0, 0.55], [40, 820], CLAMP) +
              archShift * 0.5;
          const originY = v * 1920 + (random(`fl-oy-${seed}`) - 0.5) * 90;

          const flushDist = 340 + random(`fl-fd-${seed}`) * 520;
          const driftY = (random(`fl-dy-${seed}`) - 0.5) * 280;

          px = originX + sweepDir * flushDist * easeOut;
          py = originY + driftY * easeOut;
          rot =
            sweepDir * (75 + easeOut * 45) +
            (random(`fl-r-${seed}`) - 0.5) * 25;
        } else if (isRisingCrescent) {
          // Rising crescent blade: flush upward & fan outward from the rising arch
          const h = 0.06 + (i / 24) * 0.88;
          const originX = h * 1080;
          const archY = Math.sin(Math.PI * h) * 260;
          const originY =
            interpolate(launchT, [0, 0.55], [1980, 620], CLAMP) - archY;

          const fanX = (h - 0.5) * 460 + (random(`fl-fx-${seed}`) - 0.5) * 140;
          const liftDist = 420 + random(`fl-ld-${seed}`) * 460;

          px = originX + fanX * easeOut;
          py = originY - liftDist * easeOut;
          rot = (h - 0.5) * 50;
        } else {
          // Mode 3 Eclipse 3D Flip: radial diamond burst flushing outward from center ring
          const ang = (i / 24) * Math.PI * 2 + random(`fl-a-${seed}`) * 0.25;
          const startR = 260 + (i % 3) * 45;
          const travelR = 360 + random(`fl-tr-${seed}`) * 440;
          const r = startR + travelR * easeOut;
          px = 540 + Math.cos(ang) * r;
          py = 960 + Math.sin(ang) * r * 1.18;
          rot = (ang * 180) / Math.PI + 90;
        }

        const w = (7 + (i % 4) * 3.5) * (1 - lp * 0.35);
        // Stretch slightly along velocity vector right at launch for crisp motion feel
        const h = w * (2.6 - lp * 0.9);
        const op = interpolate(
          lp,
          [0, 0.14, 0.68, 1],
          [0, 0.96, 0.72, 0],
          CLAMP,
        );
        const col =
          i % 3 === 0
            ? PURE_LUNAR_WHITE
            : i % 3 === 1
              ? GLACIAL_MIST
              : COLD_SILVER;

        return { px, py, w, h, rot, op, col };
      })
    : [];

  // ================================================
  // 08. SLEEK ONE-WAY BEAT SHOCKWAVE RING + SUBTLE ORBITAL HALO
  //     (Replaces the weird inward-outward yoyo animation!)
  // ================================================
  // A) One-Way Outward Shockwave triggered cleanly on every beat (expands 210 -> 790px & fades out)
  const shockSpan = 16;
  const shockRaw =
    framesSinceBeat <= shockSpan ? framesSinceBeat / shockSpan : 1;
  const shockEase = 1 - Math.pow(1 - shockRaw, 2.6);
  const shockRadius = interpolate(shockEase, [0, 1], [210, 790], CLAMP);
  const shockOpacity =
    framesSinceBeat <= shockSpan
      ? interpolate(shockRaw, [0, 0.12, 0.65, 1], [0, 0.82, 0.34, 0], CLAMP)
      : 0;

  // B) Secondary Cut-Triggered Shockwave on Eclipse Flip / Rising Crescent
  const cutShockProg =
    (isEclipseFlip || isRisingCrescent) && index > 0
      ? interpolate(frame, [0, enterLen + 5], [0, 1], CLAMP)
      : 1;
  const cutShockEase = 1 - Math.pow(1 - cutShockProg, 2.4);
  const cutShockRadius = interpolate(cutShockEase, [0, 1], [180, 820], CLAMP);
  const cutShockOpacity =
    (isEclipseFlip || isRisingCrescent) && index > 0
      ? interpolate(cutShockProg, [0, 0.14, 0.75, 1], [0, 0.9, 0.4, 0], CLAMP)
      : 0;

  // C) Understated Stable Orbital Lunar Halo (Gentle beat breath, zero erratic motion)
  const haloRadius = 455 + beatDrop * 18;
  const haloOpacity =
    0.18 + beatDrop * 0.24 + (isEclipseFlip ? cutIntensity * 0.25 : 0);

  // Bright White Lunar Transition Glow Envelope
  const whiteCutGlow = Math.min(
    1,
    (isCrescentCut ? crescentCut.edgeOpacity * 0.9 : 0) +
      (risingActive ? risingBell * 0.95 : 0) +
      (isEclipseFlip ? cutIntensity * 0.72 : 0) +
      whiteFlashPeak * 0.52,
  );

  // Anamorphic Moonlight Lens Streak on Beat Drops & Transitions
  const lensFlareOpacity = Math.min(
    0.85,
    whiteFlashPeak * 0.75 + cutIntensity * 0.55,
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NOCTURNAL_VOID,
        overflow: "hidden",
        perspective: 1200,
      }}
    >
      {/* ============================================
          LAYER 01: DEEP MOONLIT OBSIDIAN BACKDROP (BEHIND CRESCENT CUTS)
      ============================================ */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 44%, ${STEEL_SHADOW}aa 0%, ${NOCTURNAL_VOID} 72%)`,
        }}
      />

      {isEclipseFlip && (
        <AbsoluteFill
          style={{
            transform: `scale(${totalScale * 1.18}) rotate(${-camRot * 0.35}deg)`,
            opacity: 0.28,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(1) contrast(1.8) brightness(0.32)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT WITH CRESCENT CUT / RISING CARVE / ECLIPSE FLIP
      ============================================ */}
      <AbsoluteFill
        style={{
          clipPath: activeRevealClip,
        }}
      >
        <AbsoluteFill
          style={{
            transformOrigin: "center center",
            transform: `translate3d(${camX}px, ${camY}px, 0) rotateX(${flipX}deg) rotateY(${flipY}deg) rotateZ(${camRot}deg) scale(${totalScale})`,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: lunarNoirGrade,
            }}
          />

          <AbsoluteFill
            style={{
              mixBlendMode: "overlay",
              opacity: 0.42 + beatDrop * 0.2,
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

          {echoPower > 0.08 && (
            <>
              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: echoPower * 0.36,
                  transform: `translate3d(${-echoShift * dir}px, ${
                    echoShift * 0.14
                  }px, 0) scale(${1 + echoPower * 0.04})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter:
                      "grayscale(0.6) sepia(0.45) hue-rotate(175deg) saturate(3.2) contrast(1.45)",
                  }}
                />
              </AbsoluteFill>

              <AbsoluteFill
                style={{
                  mixBlendMode: "screen",
                  opacity: echoPower * 0.28,
                  transform: `translate3d(${echoShift * dir}px, ${
                    -echoShift * 0.14
                  }px, 0) scale(${1 + echoPower * 0.075})`,
                }}
              >
                <Img
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(1) contrast(1.75) brightness(1.08)",
                  }}
                />
              </AbsoluteFill>
            </>
          )}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ============================================
          LAYER 03: COLD NOCTURNAL ATMOSPHERE & VIGNETTE
      ============================================ */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 8%, rgba(221, 233, 248, 0.24) 0%, rgba(142, 197, 255, 0.08) 38%, transparent 68%)",
          mixBlendMode: "screen",
          opacity: 0.55 + beatDrop * 0.4,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 40%, rgba(2,3,6,0.56) 76%, rgba(0,0,0,0.95) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 04: ORBITAL LUNAR HALO, ONE-WAY SHOCKWAVE RING & CRESCENT BLADES (SVG)
      ============================================ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      >
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          {/* 1. SUBTLE ROTATING ORBITAL LUNAR HALO (ANCHORED, CLEAN, NO YOYO) */}
          <g
            transform={`translate(540, 960) rotate(${g * 0.35 * dir})`}
            opacity={haloOpacity}
          >
            <circle
              cx="0"
              cy="0"
              r={haloRadius}
              fill="none"
              stroke={COLD_SILVER}
              strokeWidth="2"
              strokeDasharray="240 160 90 190"
              opacity="0.72"
            />
            <circle
              cx="0"
              cy="0"
              r={haloRadius - 18}
              fill="none"
              stroke={GLACIAL_MIST}
              strokeWidth="1.5"
              strokeDasharray="65 215"
              strokeDashoffset={-g * 3 * dir}
              opacity="0.55"
            />
            {/* 4 Minimalist Cardinal Diamond Ticks on the Halo */}
            {[0, 90, 180, 270].map((deg) => (
              <polygon
                key={`halo-tick-${deg}`}
                points="0,-10 5,0 0,10 -5,0"
                fill={PURE_LUNAR_WHITE}
                transform={`rotate(${deg}) translate(0, ${-haloRadius})`}
                opacity="0.85"
              />
            ))}
          </g>

          {/* 2. ONE-WAY BEAT-LOCKED LUNAR SHOCKWAVE RING (EXPANDS OUTWARD & FADES CLEANLY) */}
          {shockOpacity > 0.01 && (
            <g transform="translate(540, 960)" opacity={shockOpacity}>
              <circle
                cx="0"
                cy="0"
                r={shockRadius}
                fill="none"
                stroke={GLACIAL_MIST}
                strokeWidth={22 * (1 - shockEase * 0.65)}
                opacity="0.32"
              />
              <circle
                cx="0"
                cy="0"
                r={shockRadius}
                fill="none"
                stroke={PURE_LUNAR_WHITE}
                strokeWidth={4.5 * (1 - shockEase * 0.5)}
              />
            </g>
          )}

          {/* 3. SECONDARY TRANSITION SHOCKWAVE RING (ON ECLIPSE FLIP & RISING CRESCENT) */}
          {cutShockOpacity > 0.01 && (
            <g transform="translate(540, 960)" opacity={cutShockOpacity}>
              <circle
                cx="0"
                cy="0"
                r={cutShockRadius}
                fill="none"
                stroke={COLD_SILVER}
                strokeWidth={14 * (1 - cutShockEase * 0.55)}
                opacity="0.4"
              />
              <circle
                cx="0"
                cy="0"
                r={cutShockRadius}
                fill="none"
                stroke={PURE_LUNAR_WHITE}
                strokeWidth={3.5 * (1 - cutShockEase * 0.45)}
                strokeDasharray="180 75"
                strokeDashoffset={-g * 8 * dir}
              />
            </g>
          )}

          {/* 4. ALTERNATING CRESCENT CUT BRIGHT-WHITE BLADE GLOW (MODES 0 & 2) */}
          {crescentCut.edgePath && crescentCut.edgeOpacity > 0.01 && (
            <g opacity={crescentCut.edgeOpacity}>
              <path
                d={crescentCut.edgePath}
                fill="none"
                stroke={GLACIAL_MIST}
                strokeWidth="62"
                strokeLinecap="round"
                opacity="0.34"
              />
              <path
                d={crescentCut.edgePath}
                fill="none"
                stroke={COLD_SILVER}
                strokeWidth="24"
                strokeLinecap="round"
                opacity="0.82"
              />
              <path
                d={crescentCut.edgePath}
                fill="none"
                stroke={PURE_LUNAR_WHITE}
                strokeWidth="7"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 5. COLOSSAL RISING CENTER CRESCENT BLADE (MODE 1: BOTTOM -> TOP) */}
          {risingActive && (
            <g
              transform={`translate(540, ${(risingBladeYPct * 19.2).toFixed(
                1,
              )}) scale(${1.0 + risingBell * 0.16})`}
              opacity={interpolate(
                enterEase,
                [0, 0.08, 0.85, 1],
                [0, 1, 0.98, 0],
                CLAMP,
              )}
            >
              <polygon
                points="-640,-85 0,-125 640,-85 0,-45"
                fill={PURE_LUNAR_WHITE}
                opacity={0.45 + risingBell * 0.45}
              />
              <path
                d="M -510,165 C -330,-235 330,-235 510,165 C 295,-45 -295,-45 -510,165 Z"
                fill="none"
                stroke={GLACIAL_MIST}
                strokeWidth="38"
                strokeLinejoin="round"
                opacity="0.45"
              />
              <path
                d="M -510,165 C -330,-235 330,-235 510,165 C 295,-45 -295,-45 -510,165 Z"
                fill={COLD_SILVER}
                fillOpacity="0.88"
                stroke={PURE_LUNAR_WHITE}
                strokeWidth="8"
                strokeLinejoin="round"
              />
              <path
                d="M -420,95 C -245,-145 245,-145 420,95 C 235,-75 -235,-75 -420,95 Z"
                fill={PURE_LUNAR_WHITE}
                opacity="0.95"
              />
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 05: 44 BORDER-DENSE DIAMONDS + 24 TRANSITION FLUSH-OUT DIAMONDS
      ============================================ */}
      <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
        {/* Ambient Border-Dense Diamond Shards */}
        {ambientDiamonds.map((dm, i) => (
          <div
            key={`amb-diamond-${i}`}
            style={{
              position: "absolute",
              left: dm.x,
              top: dm.y,
              width: dm.w,
              height: dm.h,
              backgroundColor: dm.col,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              transform: `translate(-50%, -50%) rotate(${dm.rot}deg)`,
              opacity: dm.op,
            }}
          />
        ))}

        {/* Transition Flush-Out Diamond Burst (Sprays Directly Out of the Cut Edge!) */}
        {flushDiamonds.map((fd, i) => {
          if (!fd || fd.op <= 0.01) return null;
          return (
            <div
              key={`flush-diamond-${i}`}
              style={{
                position: "absolute",
                left: fd.px,
                top: fd.py,
                width: fd.w,
                height: fd.h,
                backgroundColor: fd.col,
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                transform: `translate(-50%, -50%) rotate(${fd.rot}deg)`,
                opacity: fd.op,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: ANAMORPHIC MOONLIGHT STREAK, WHITE GLOW & HAIRLINE BORDER
      ============================================ */}
      {/* Sleek Horizontal Anamorphic Moonlight Lens Streak on Beat Drops */}
      {lensFlareOpacity > 0.04 && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
            mixBlendMode: "screen",
            opacity: lensFlareOpacity,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 4 + beatDrop * 12,
              background: `linear-gradient(90deg, transparent 0%, ${GLACIAL_MIST}66 22%, ${PURE_LUNAR_WHITE} 50%, ${GLACIAL_MIST}66 78%, transparent 100%)`,
              transform: `translateY(${isRisingCrescent ? (risingBladeYPct - 50) * 14 : -240}px) scaleX(${
                0.75 + beatDrop * 0.35
              })`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Bright White Lunar Cut Glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${
            isCrescentCutRight
              ? `${interpolate(enterEase, [0, 1], [85, 15], CLAMP)}% 50%`
              : isCrescentCutLeft
                ? `${interpolate(enterEase, [0, 1], [15, 85], CLAMP)}% 50%`
                : isRisingCrescent
                  ? `50% ${Math.max(10, Math.min(90, risingBladeYPct))}%`
                  : "50% 48%"
          }, ${PURE_LUNAR_WHITE} 0%, ${COLD_SILVER}aa 28%, transparent 68%)`,
          mixBlendMode: "screen",
          opacity: whiteCutGlow * 0.68,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          backgroundColor: PURE_LUNAR_WHITE,
          mixBlendMode: "overlay",
          opacity: whiteCutGlow * 0.42,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          border: `2.5px solid ${PURE_LUNAR_WHITE}`,
          opacity: 0.28 + beatDrop * 0.55,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 07: SAFE ZONE MINIMALIST WATERMARK & TELEMETRY
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
            padding: "10px 24px",
            backgroundColor: "rgba(5, 7, 11, 0.88)",
            borderLeft: `5px solid ${PURE_LUNAR_WHITE}`,
            borderRight: `2px solid ${GLACIAL_MIST}`,
            transform: `translateX(${enterRem * -28}px) scale(${
              1 + beatDrop * 0.04
            })`,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path
              d="M 17 3 A 9.5 9.5 0 1 0 17 21 A 7 7 0 1 1 17 3 Z"
              fill={PURE_LUNAR_WHITE}
            />
          </svg>
          <span
            style={{
              fontFamily,
              color: PURE_LUNAR_WHITE,
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 5,
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
            padding: "8px 18px",
            backgroundColor: "rgba(5, 7, 11, 0.84)",
            borderLeft: `4px solid ${PURE_LUNAR_WHITE}`,
            borderTop: `1px solid ${COLD_SILVER}`,
            transform: `translateX(${enterRem * -24}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 21,
              fontWeight: 900,
              color: PURE_LUNAR_WHITE,
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
              fontSize: 13,
              fontWeight: 600,
              color: COLD_SILVER,
              letterSpacing: 3,
              opacity: 0.88,
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
            height={5}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MoonKnightFistOfKhonshu: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#020306" overlap={0} Scene={Scene} />
);
