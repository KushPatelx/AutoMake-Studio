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
import { loadFont } from "@remotion/google-fonts/Anton";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const RED = "#E21B35";
const BLUE = "#0051FF";
const WHITE = "#FFFFFF";
const DARK = "#03050A";

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

  const accent = brand.color || RED;
  const brandName = brand.name || "MRC";

  // ================================================
  // 01. ADVANCED BEAT & SUB-HARMONIC ENERGY MATH
  // ================================================
  const pulse = beatPulse(g, bpm, 1);
  const impact = beatPulse(g, bpm, 2.2);
  const halfBeat = beatPulse(g + Math.round((30 * 30) / bpm), bpm, 1.4);
  const quarterBeat = beatPulse(g + Math.round((15 * 30) / bpm), bpm, 1.1);

  // ================================================
  // 02. MULTI-MODE ENTER & EXIT TRANSITIONS
  // ================================================
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 230, mass: 0.45 },
  });

  const exitProgress = interpolate(
    frame,
    [Math.max(0, duration - 10), duration],
    [0, 1],
    CLAMP
  );

  const visible = 1 - exitProgress;

  // ================================================
  // 03. FULL-SCREEN 9:16 CAMERA KINEMATICS (NO BLACK BARS)
  // ================================================
  // Always >= 1.14 scale so shakes/rotations NEVER expose black edges
  const baseScale = interpolate(frame, [0, duration], [1.14, 1.28], CLAMP);
  const entryPunch = (1 - enterSpring) * 0.38;
  const exitPunch = Math.pow(exitProgress, 2) * 0.45;
  const beatZoom = impact * 0.095 + pulse * 0.045;
  const totalScale = baseScale + entryPunch + exitPunch + beatZoom;

  const whipDir = index % 2 === 0 ? 1 : -1;
  const whipX = (1 - enterSpring) * 320 * whipDir - Math.pow(exitProgress, 2) * 360 * whipDir;
  const whipY = (1 - enterSpring) * -180 + Math.pow(exitProgress, 2) * 180;

  const shakeFreq = g * 1.95;
  const shakeX = (Math.sin(shakeFreq) * impact * 22 + Math.cos(shakeFreq * 0.7) * pulse * 10) * visible;
  const shakeY = (Math.cos(shakeFreq * 1.3) * impact * 18 + Math.sin(shakeFreq * 0.5) * pulse * 8) * visible;

  const camX = whipX + shakeX;
  const camY = whipY + shakeY;

  const camRot =
    (1 - enterSpring) * 9 * whipDir +
    Math.pow(exitProgress, 2) * -11 * whipDir +
    Math.sin(g * 0.35) * pulse * 2.2 +
    (random(`rot-${g}`) - 0.5) * impact * 4.5;

  // ================================================
  // 04. DYNAMIC TRANSITION MASKS (4 VARIATIONS PER CUT)
  // ================================================
  const mode = index % 4;
  const slice1 = interpolate(frame, [0, 6], [100, 0], CLAMP);
  const slice2 = interpolate(frame, [1, 7], [-100, 0], CLAMP);
  const slice3 = interpolate(frame, [2, 8], [100, 0], CLAMP);
  const slice4 = interpolate(frame, [3, 9], [-100, 0], CLAMP);

  const irisOpen = interpolate(enterSpring, [0, 1], [15, 140], CLAMP);
  const shutterInset = interpolate(enterSpring, [0, 1], [48, 0], CLAMP);

  // ================================================
  // 05. RGB SPLIT & ECHO GHOSTING MATH
  // ================================================
  const rgbShift = impact * 28 + halfBeat * 9 + exitProgress * 35;
  const rgbOpacity = interpolate(impact + exitProgress, [0, 1], [0.15, 0.78], CLAMP);
  const ghostScale = totalScale + impact * 0.14 + halfBeat * 0.07;
  const ghostOpacity = (impact * 0.42 + halfBeat * 0.2) * visible;

  // ================================================
  // 06. DETERMINISTIC VORTEX SPARKS & SHARDS (MAX 24 FOR FPS)
  // ================================================
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 97 + index * 31;
    const baseAngle = random(`ang-${seed}`) * Math.PI * 2;
    const orbitSpeed = (0.03 + random(`spd-${seed}`) * 0.04) * (i % 2 === 0 ? 1 : -1);
    const currentAngle = baseAngle + g * orbitSpeed;

    const baseRad = 180 + random(`rad-${seed}`) * 580;
    const radius = baseRad + Math.sin(g * 0.12 + i) * 70 + impact * 110;

    const x = Math.cos(currentAngle) * radius;
    const y = Math.sin(currentAngle) * radius * 1.45;
    const size = 8 + random(`sz-${seed}`) * 18 + pulse * 10;
    const rot = (g * 6 + i * 45) * (i % 2 === 0 ? 1 : -1);
    const color = i % 3 === 0 ? accent : i % 3 === 1 ? WHITE : BLUE;

    return { x, y, size, rot, color };
  });

  const transitionShards = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + 0.3;
    const flyProgress = frame < 10 ? 1 - enterSpring : exitProgress;
    const distance = interpolate(flyProgress, [0, 1], [1150, 90], CLAMP);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 1.3;
    const rot = g * 5 * (i % 2 === 0 ? 1 : -1) + i * 45;
    const scale = interpolate(flyProgress, [0, 0.5, 1], [0, 1.3, 0.4], CLAMP);
    const color = i % 2 === 0 ? accent : i % 3 === 0 ? BLUE : WHITE;

    return { x, y, rot, scale, color, opacity: flyProgress * 0.9 };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, overflow: "hidden" }}>
      {/* ============================================
          LAYER 01: AMBIENT FULL-BLEED BACKDROP (100% 9:16 GUARANTEE)
      ============================================ */}
      <AbsoluteFill
        style={{
          transform: `scale(${totalScale * 1.15}) rotate(${-camRot * 0.4}deg)`,
          opacity: 0.45,
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.4) saturate(1.8) brightness(0.6)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 02: HERO 9:16 PORTRAIT IMAGE + MULTI-TRANSITION ENGINE
      ============================================ */}
      <AbsoluteFill
        style={{
          transformOrigin: "center center",
          transform: `translate3d(${camX}px, ${camY}px, 0) rotate(${camRot}deg) scale(${totalScale})`,
          clipPath:
            mode === 1
              ? `circle(${irisOpen}% at 50% 50%)`
              : mode === 2
              ? `inset(${shutterInset * 0.6}% ${shutterInset}% ${shutterInset * 0.6}% ${shutterInset}%)`
              : undefined,
        }}
      >
        {/* Mode 0 & 3: 4-Slice Kinetic Strip Reveal vs Direct Full-Screen */}
        {mode === 0 && frame < 10 ? (
          <AbsoluteFill>
            <AbsoluteFill style={{ clipPath: "inset(0% 0% 74.5% 0%)", transform: `translateX(${slice1}%)` }}>
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: `contrast(${1.14 + impact * 0.2}) saturate(${1.25 + pulse * 0.25}) brightness(${1.02 + impact * 0.12})`,
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ clipPath: "inset(25% 0% 49.5% 0%)", transform: `translateX(${slice2}%)` }}>
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: `contrast(${1.14 + impact * 0.2}) saturate(${1.25 + pulse * 0.25}) brightness(${1.02 + impact * 0.12})`,
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ clipPath: "inset(50% 0% 24.5% 0%)", transform: `translateX(${slice3}%)` }}>
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: `contrast(${1.14 + impact * 0.2}) saturate(${1.25 + pulse * 0.25}) brightness(${1.02 + impact * 0.12})`,
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ clipPath: "inset(75% 0% 0% 0%)", transform: `translateX(${slice4}%)` }}>
              <Img
                src={src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: `contrast(${1.14 + impact * 0.2}) saturate(${1.25 + pulse * 0.25}) brightness(${1.02 + impact * 0.12})`,
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
              filter: `contrast(${1.14 + impact * 0.2}) saturate(${1.25 + pulse * 0.25}) brightness(${1.02 + impact * 0.12})`,
            }}
          />
        )}

        {/* RED CHROMATIC SPLIT */}
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            opacity: rgbOpacity,
            transform: `translate3d(${-rgbShift}px, ${rgbShift * 0.25}px, 0)`,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "sepia(1) hue-rotate(-50deg) saturate(4)",
            }}
          />
        </AbsoluteFill>

        {/* BLUE CHROMATIC SPLIT */}
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            opacity: rgbOpacity,
            transform: `translate3d(${rgbShift}px, ${-rgbShift * 0.25}px, 0)`,
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "sepia(1) hue-rotate(185deg) saturate(4)",
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ============================================
          LAYER 03: BEAT-PULSE RADIAL GHOST ECHO
      ============================================ */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: ghostOpacity,
          transform: `translate3d(${camX * 0.5}px, ${camY * 0.5}px, 0) scale(${ghostScale}) rotate(${-camRot * 0.5}deg)`,
          pointerEvents: "none",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.5) brightness(1.2)",
          }}
        />
      </AbsoluteFill>

      {/* ============================================
          LAYER 04: GLITCH DISPLACEMENT SLICE BARS
      ============================================ */}
      {impact > 0.25 && (
        <AbsoluteFill
          style={{
            clipPath: `inset(${25 + ((g * 13) % 45)}% 0% ${20 + ((g * 17) % 45)}% 0%)`,
            transform: `translateX(${(random(`gl-${g}`) - 0.5) * 90}px) scale(${totalScale * 1.04})`,
            mixBlendMode: "hard-light",
            opacity: impact * 0.85,
            pointerEvents: "none",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "invert(0.15) contrast(1.8) saturate(2)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ============================================
          LAYER 05: EXPLODING SHARDS & KINETIC SLASH WIPES
      ============================================ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {transitionShards.map((s, i) => (
          <div
            key={`sh-${i}`}
            style={{
              position: "absolute",
              width: 180,
              height: 310,
              backgroundColor: s.color,
              clipPath:
                i % 2 === 0
                  ? "polygon(50% 0%, 100% 38%, 72% 100%, 0% 70%)"
                  : "polygon(15% 0%, 100% 25%, 80% 100%, 0% 55%)",
              transform: `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rot}deg) scale(${s.scale})`,
              opacity: s.opacity,
              mixBlendMode: "screen",
            }}
          />
        ))}
      </AbsoluteFill>

      {/* High-Velocity Diagonal Laser Slashes */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `rotate(${index % 2 === 0 ? -28 : 28}deg)`,
          pointerEvents: "none",
        }}
      >
        {[accent, WHITE, BLUE, accent].map((col, i) => {
          const slashX = interpolate(
            frame,
            [0, 5 + i, 11 + i],
            [1500 * (i % 2 === 0 ? 1 : -1), 0, -1600 * (i % 2 === 0 ? 1 : -1)],
            CLAMP
          );
          const slashOp = interpolate(frame, [0, 3, 11], [0, 0.95, 0], CLAMP);
          return (
            <div
              key={`sl-${i}`}
              style={{
                position: "absolute",
                width: "220%",
                height: i % 2 === 0 ? 28 : 10,
                backgroundColor: col,
                transform: `translate3d(${slashX}px, ${(i - 1.5) * 210}px, 0)`,
                opacity: slashOp,
                mixBlendMode: "screen",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ============================================
          LAYER 06: 3D ORBITING VORTEX SPARKS
      ============================================ */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {sparks.map((sp, i) => (
          <div
            key={`sp-${i}`}
            style={{
              position: "absolute",
              width: sp.size,
              height: sp.size * 2.2,
              backgroundColor: sp.color,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              transform: `translate3d(${sp.x}px, ${sp.y}px, 0) rotate(${sp.rot}deg)`,
              opacity: (0.45 + pulse * 0.5) * visible,
              mixBlendMode: "screen",
            }}
          />
        ))}
      </AbsoluteFill>

      {/* ============================================
          LAYER 07: TACTICAL STRIKER RETICLE & SHOCKWAVES (SVG)
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
            opacity: 0.78 * visible,
            mixBlendMode: "screen",
          }}
        >
          {/* Beat Expanding Shockwave Ring */}
          <circle
            cx="540"
            cy="960"
            r={interpolate(pulse, [0, 1], [650, 220], CLAMP)}
            fill="none"
            stroke={accent}
            strokeWidth={2 + impact * 16}
            opacity={impact * 0.85}
          />
          {/* Outer Rotating Segmented Championship Ring */}
          <circle
            cx="540"
            cy="960"
            r={430 + pulse * 28}
            fill="none"
            stroke={WHITE}
            strokeWidth="4"
            strokeDasharray="35 55 12 55"
            style={{
              transformOrigin: "540px 960px",
              transform: `rotate(${g * 2.5}deg)`,
              opacity: 0.45,
            }}
          />
          {/* Counter-Rotating Accent Target Arc */}
          <circle
            cx="540"
            cy="960"
            r={340 - impact * 22}
            fill="none"
            stroke={accent}
            strokeWidth="10"
            strokeDasharray="180 240"
            style={{
              transformOrigin: "540px 960px",
              transform: `rotate(${-g * 4.2}deg) scale(${0.95 + pulse * 0.12})`,
              opacity: 0.75,
            }}
          />
          {/* Blue Secondary Energy Ring */}
          <circle
            cx="540"
            cy="960"
            r={260 + halfBeat * 25}
            fill="none"
            stroke={BLUE}
            strokeWidth="6"
            strokeDasharray="80 160"
            style={{
              transformOrigin: "540px 960px",
              transform: `rotate(${g * 5.5}deg)`,
              opacity: 0.6,
            }}
          />
          {/* Dynamic Sniper Crosshairs */}
          <g
            stroke={WHITE}
            strokeWidth="5"
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${1 + impact * 0.14})`,
              opacity: 0.65,
            }}
          >
            <line x1="540" y1="430" x2="540" y2="495" />
            <line x1="540" y1="1425" x2="540" y2="1490" />
            <line x1="90" y1="960" x2="155" y2="960" />
            <line x1="925" y1="960" x2="990" y2="960" />
          </g>
          {/* Pulsing Target Lock Corner Brackets */}
          <g
            stroke={accent}
            strokeWidth="8"
            fill="none"
            style={{
              transformOrigin: "540px 960px",
              transform: `scale(${1 - pulse * 0.04 + exitProgress * 0.25})`,
              opacity: 0.85,
            }}
          >
            <path d="M 180 580 L 180 510 L 250 510" />
            <path d="M 900 580 L 900 510 L 830 510" />
            <path d="M 180 1340 L 180 1410 L 250 1410" />
            <path d="M 900 1340 L 900 1410 L 830 1410" />
          </g>
        </svg>
      </AbsoluteFill>

      {/* ============================================
          LAYER 08: STADIUM ANAMORPHIC FLARES & COLOR GRADE
      ============================================ */}
      {/* Edge Vignette (Translucent so 9:16 portrait stays 100% full-screen) */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 48%, transparent 45%, rgba(3,5,10,0.45) 80%, rgba(3,5,10,0.82) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Dual-Tone Stadium Spotlight Sweep */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(125deg, ${accent}44 0%, transparent 42%, transparent 58%, ${BLUE}44 100%)`,
          mixBlendMode: "screen",
          opacity: 0.4 + pulse * 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Horizontal Anamorphic Lens Flare Streak */}
      <AbsoluteFill
        style={{
          top: "48%",
          height: 18 + impact * 45,
          background: `linear-gradient(90deg, transparent 0%, ${BLUE}88 25%, ${WHITE} 50%, ${accent}88 75%, transparent 100%)`,
          transform: `translateX(${interpolate(frame, [0, 12], [-950, 950], CLAMP)}px) scaleY(${0.4 + impact * 1.4})`,
          opacity: interpolate(frame, [0, 4, 12], [0, 0.95, 0], CLAMP) + impact * 0.35,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Beat Impact Strobe Flashes */}
      <AbsoluteFill
        style={{
          backgroundColor: accent,
          mixBlendMode: "screen",
          opacity: impact * 0.28,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: WHITE,
          mixBlendMode: "overlay",
          opacity: interpolate(frame, [0, 5], [0.75, 0], CLAMP) + impact * 0.25,
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 09: PULSING FULL-BLEED NEON ENERGY FRAME
      ============================================ */}
      <AbsoluteFill
        style={{
          border: `${6 + impact * 10}px solid ${accent}`,
          opacity: 0.35 + pulse * 0.55,
          transform: `scale(${0.985 - pulse * 0.01})`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* ============================================
          LAYER 10: BRAND WATERMARK & SAFE HUD (strictly inside SAFE)
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
        {/* TOP-LEFT BRAND WATERMARK BADGE */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 24px",
            backgroundColor: "rgba(3, 5, 10, 0.78)",
            borderLeft: `8px solid ${accent}`,
            borderBottom: `2px solid ${BLUE}`,
            transform: `translateY(${interpolate(enterSpring, [0, 1], [-40, 0], CLAMP)}px) scale(${1 + pulse * 0.05})`,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: accent,
              transform: `scale(${0.8 + quarterBeat * 0.6})`,
            }}
          />
          <span
            style={{
              fontFamily,
              color: WHITE,
              fontSize: 34,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {brandName}
          </span>
          <span style={{ fontSize: 28 }}>{"\u{26BD}\u{1F525}"}</span>
        </div>

        {/* BOTTOM-LEFT TELEMETRY HUD (Only allowed cut/timecode copy) */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 18px",
            backgroundColor: "rgba(3, 5, 10, 0.68)",
            borderLeft: `5px solid ${WHITE}`,
            transform: `translateX(${interpolate(enterSpring, [0, 1], [-50, 0], CLAMP)}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 28,
              color: accent,
              letterSpacing: 3,
            }}
          >
            {`CUT ${(index + 1).toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`}
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 18,
              color: WHITE,
              letterSpacing: 2,
              opacity: 0.85,
            }}
          >
            {`TC ${(g / fps).toFixed(2)}S // ${bpm} BPM`}
          </div>
        </div>

        {/* PROGRESS BAR INSIDE SAFE ZONE */}
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

export const KaneEliteImpact: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#03050A" overlap={0} Scene={Scene} />
);