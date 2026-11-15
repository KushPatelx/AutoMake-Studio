import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadRajdhani } from "@remotion/google-fonts/Rajdhani";
import { loadFont as loadMono } from "@remotion/google-fonts/ShareTechMono";
import {
  Backdrop,
  Brand,
  BrandConfig,
  CLAMP,
  FactsVideo,
  ProgressBar,
  SAFE,
  SceneData,
  SceneProps,
  ShineSweep,
  SubscribeCTA,
  TOTAL_FRAMES,
  useSceneFade,
} from "../shared";

// ------------------------------------------------------------------ fonts
const { fontFamily: orbitron } = loadOrbitron("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});
const { fontFamily: rajdhani } = loadRajdhani("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadMono("normal", {
  weights: ["400"],
  subsets: ["latin"],
});
const TITLE_FONT = `${orbitron}, 'Arial Black', sans-serif`;
const BODY_FONT = `${rajdhani}, 'Segoe UI', Arial, sans-serif`;
const MONO_FONT = `${mono}, 'Courier New', monospace`;

// ------------------------------------------------------------------ tuning
const BPM = 150; // apne phonk beat ke BPM se match karo (beat pulse + flash isse chalte hain)
const BEAT = (30 * 60) / BPM;
const RED = "#FF2A2A";
const GOLD = "#FFC400";

const hex2 = (n: number) =>
  Math.round(Math.max(0, Math.min(1, n)) * 255)
    .toString(16)
    .padStart(2, "0");
const withAlpha = (c: string, a: number) =>
  /^#[0-9a-fA-F]{6}$/.test(c) ? `${c}${hex2(a)}` : c;

// ------------------------------------------------------------------ HUD pieces
const TICKS = Array.from({ length: 90 }, (_, i) => i);
const HEX = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i;
  return `${Math.cos(a) * 220},${Math.sin(a) * 220}`;
}).join(" ");

const HudRings: React.FC<{
  color: string;
  frame: number;
  pulse: number;
  appear: number;
}> = ({ color, frame, pulse, appear }) => (
  <div
    style={{
      position: "absolute",
      left: 70,
      top: 140,
      width: 940,
      height: 940,
      opacity: 0.55 * appear,
      transform: `scale(${0.7 + 0.3 * appear})`,
      zIndex: 3,
    }}
  >
    <svg viewBox="-500 -500 1000 1000" width={940} height={940}>
      <g transform={`rotate(${frame * 0.4})`}>
        <circle r={470} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 14" />
      </g>
      <g transform={`rotate(${-frame * 0.25})`}>
        {TICKS.map((i) => {
          const a = (i / 90) * Math.PI * 2;
          const long = i % 5 === 0;
          const r2 = long ? 392 : 412;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 430}
              y1={Math.sin(a) * 430}
              x2={Math.cos(a) * r2}
              y2={Math.sin(a) * r2}
              stroke="#FFFFFF"
              strokeOpacity={long ? 0.9 : 0.45}
              strokeWidth={long ? 3 : 1.5}
            />
          );
        })}
      </g>
      <g transform={`rotate(${frame * 1.4})`}>
        <circle r={360} fill="none" stroke={color} strokeWidth={10} strokeDasharray="500 380 200 1182" />
      </g>
      <g transform={`rotate(${-frame * 2})`}>
        <circle r={290} fill="none" stroke={GOLD} strokeWidth={3} strokeDasharray="2 10" />
      </g>
      <g transform={`rotate(${frame * 0.8})`}>
        <polygon points={HEX} fill="none" stroke={color} strokeWidth={3} />
      </g>
      <circle r={120 + pulse * 14} fill={withAlpha(color, 0.18 + pulse * 0.12)} />
      <circle r={60} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeOpacity={0.8} />
    </svg>
  </div>
);

const Radar: React.FC<{ color: string; frame: number; appear: number }> = ({
  color,
  frame,
  appear,
}) => (
  <div
    style={{
      position: "absolute",
      left: 190,
      top: 260,
      width: 700,
      height: 700,
      borderRadius: "50%",
      zIndex: 3,
      opacity: 0.5 * appear,
      background: `conic-gradient(from ${frame * 7}deg, ${withAlpha(color, 0)} 0deg, ${withAlpha(color, 0.5)} 55deg, ${withAlpha(color, 0)} 56deg)`,
    }}
  />
);

const Reticle: React.FC<{ color: string; frame: number }> = ({ color, frame }) => {
  const t = interpolate(frame, [6, 26], [0, 1], CLAMP);
  const e = 1 - Math.pow(1 - t, 3);
  const size = interpolate(e, [0, 1], [820, 380]);
  const rot = (1 - e) * 45;
  const opacity = interpolate(frame, [6, 12, 60, 80], [0, 1, 1, 0.45], CLAMP);
  const locked = frame >= 26;
  const blink = Math.floor(frame / 4) % 2 === 0;
  const c = locked ? color : RED;
  const b = `5px solid ${c}`;
  const corner: React.CSSProperties = { position: "absolute", width: 70, height: 70 };
  return (
    <div
      style={{
        position: "absolute",
        left: 540,
        top: 610,
        width: 0,
        height: 0,
        zIndex: 5,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: size,
          height: size,
          left: -size / 2,
          top: -size / 2,
          transform: `rotate(${rot}deg)`,
          filter: `drop-shadow(0 0 10px ${c})`,
        }}
      >
        <div style={{ ...corner, left: 0, top: 0, borderTop: b, borderLeft: b }} />
        <div style={{ ...corner, right: 0, top: 0, borderTop: b, borderRight: b }} />
        <div style={{ ...corner, left: 0, bottom: 0, borderBottom: b, borderLeft: b }} />
        <div style={{ ...corner, right: 0, bottom: 0, borderBottom: b, borderRight: b }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: size / 2 + 24,
          left: -300,
          width: 600,
          textAlign: "center",
          fontFamily: MONO_FONT,
          fontSize: 26,
          letterSpacing: 6,
          color: c,
          opacity: locked ? 1 : blink ? 1 : 0.3,
          textShadow: `0 0 12px ${c}`,
        }}
      >
        {locked ? "TARGET LOCKED" : "ACQUIRING TARGET"}
      </div>
    </div>
  );
};

const FrameCorners: React.FC<{ color: string; appear: number }> = ({ color, appear }) => {
  const len = 90 * appear;
  const b = `5px solid ${color}`;
  const base: React.CSSProperties = { position: "absolute", width: len, height: len };
  return (
    <AbsoluteFill style={{ zIndex: 8, pointerEvents: "none", filter: `drop-shadow(0 0 8px ${color})` }}>
      <div style={{ ...base, left: 40, top: 60, borderTop: b, borderLeft: b }} />
      <div style={{ ...base, right: 40, top: 60, borderTop: b, borderRight: b }} />
      <div style={{ ...base, left: 40, bottom: 400, borderBottom: b, borderLeft: b }} />
      <div style={{ ...base, right: 40, bottom: 400, borderBottom: b, borderRight: b }} />
    </AbsoluteFill>
  );
};

const Sparks: React.FC<{ frame: number; color: string; fade: number }> = ({
  frame,
  color,
  fade,
}) => (
  <AbsoluteFill style={{ zIndex: 4, overflow: "hidden", pointerEvents: "none" }}>
    {Array.from({ length: 30 }).map((_, i) => {
      const sp = 3 + random(`sp${i}`) * 7;
      const y = 1980 - ((frame * sp + random(`o${i}`) * 2200) % 2200);
      const x = random(`x${i}`) * 1080 + Math.sin((frame + i * 17) / 12) * 25;
      const s = 2 + random(`s${i}`) * 5;
      const c = i % 3 === 0 ? GOLD : color;
      const fl = 0.5 + 0.5 * Math.sin((frame + i * 9) / 3);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: s,
            height: s * (1 + sp / 6),
            borderRadius: s,
            backgroundColor: c,
            boxShadow: `0 0 ${8 + s * 2}px ${c}`,
            opacity: 0.85 * fl * fade,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

const Words: React.FC<{
  text: string;
  frame: number;
  fps: number;
  delay: number;
  color: string;
  style: React.CSSProperties;
}> = ({ text, frame, fps, delay, color, style }) => (
  <div style={style}>
    {text.split(" ").map((w, i) => {
      const s = spring({
        frame: frame - delay - i * 2.2,
        fps,
        config: { damping: 13, stiffness: 150, mass: 0.6 },
      });
      const hot = /\d/.test(w) || (w.length > 3 && /[A-Z]/.test(w) && w === w.toUpperCase());
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            marginRight: "0.28em",
            opacity: Math.min(1, Math.max(0, s)),
            transform: `translateY(${(1 - s) * 26}px) scale(${0.8 + 0.2 * s})`,
            color: hot ? color : undefined,
            textShadow: hot ? `0 0 16px ${color}` : undefined,
            fontWeight: hot ? 700 : undefined,
          }}
        >
          {w}
        </span>
      );
    })}
  </div>
);

// ------------------------------------------------------------------ scene
const Scene: React.FC<SceneProps> = ({ data, index, globalStartFrame, isLast, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = brand.color;
  const dur = data.duration;
  const g = globalStartFrame + frame;
  const fade = useSceneFade(dur, isLast, 4);
  const variant = index % 3;

  // beat sync (phonk edit feel)
  const pulse = Math.pow(1 - (g % BEAT) / BEAT, 3);

  const appear = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 90, mass: 1 } });
  const panelIn = spring({ frame: frame - 24, fps, config: { damping: 18, stiffness: 110, mass: 0.8 } });
  const wipe = Math.min(1, Math.max(0, panelIn));
  const progress = (g / useVideoConfig().durationInFrames) * 100;

  // camera shake: slam pe zyada, beat pe halka
  const amp = 22 * Math.exp(-frame / 5) + 3 * pulse;
  const shakeX = (random(`sx-${g}`) - 0.5) * 2 * amp;
  const shakeY = (random(`sy-${g}`) - 0.5) * 2 * amp;

  // flashes
  const entryFlash =
    index === 0
      ? interpolate(frame, [0, 10], [0.5, 0], CLAMP)
      : interpolate(frame, [0, 12], [1, 0], CLAMP);
  const exitFlash = isLast ? 0 : interpolate(frame, [dur - 7, dur - 1], [0, 0.95], CLAMP);
  const sceneFade = interpolate(frame, [dur - 18, dur], [1, 0.4], CLAMP);

  // image motion (har scene alag)
  const punch = interpolate(frame, [0, 10], [0.28, 0], CLAMP);
  const baseZoom = interpolate(frame, [0, dur], [1.08, 1.22], CLAMP);
  const imgScale = baseZoom + punch + pulse * 0.025;
  const origins = ["center center", "70% 30%", "30% 70%"];
  const imgRotate = variant === 1 ? interpolate(frame, [0, dur], [-1.5, 1.5], CLAMP) : 0;
  const imgShift = variant === 2 ? interpolate(frame, [0, dur], [30, -30], CLAMP) : 0;

  // text fit
  const maxLen = Math.max(4, ...data.title.map((t) => t.length));
  const titleSize = Math.max(62, Math.min(118, Math.floor(790 / (maxLen * 0.86))));
  const sub = data.subtitle;
  const subSize = sub.length < 90 ? 48 : sub.length < 130 ? 44 : sub.length < 170 ? 40 : 36;

  // eyebrow typewriter
  const eyebrowFull = String(data.eyebrow).toUpperCase();
  const typed = eyebrowFull.slice(
    0,
    Math.floor(interpolate(frame, [4, 22], [0, eyebrowFull.length], CLAMP)),
  );
  const cursorOn = Math.floor(g / 8) % 2 === 0;

  const flicker = frame < 14 ? (random(`fl-${frame}-${index}`) > 0.35 ? 1 : 0.2) : 1;

  const telemetry = [
    "J.A.R.V.I.S // ONLINE",
    `PWR ${(98.5 + Math.sin(g / 9) * 1.4).toFixed(1)}%`,
    `SIG ${Math.round(40 + Math.abs(Math.sin(g / 7)) * 55)} dB`,
    `SEQ 0${index + 1}`,
  ];
  const telChars = Math.floor(interpolate(frame, [10, 40], [0, 30], CLAMP));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fade, overflow: "hidden" }}>
      {/* ---------- shaken world ---------- */}
      <AbsoluteFill style={{ transform: `translate(${shakeX}px, ${shakeY}px) scale(1.03)` }}>
        <Backdrop
          image={data.image}
          scale={imgScale}
          origin={origins[variant]}
          rotate={imgRotate}
          translateX={imgShift}
          filter="contrast(1.18) saturate(1.25) brightness(0.92)"
          overlays={[
            "linear-gradient(180deg, rgba(0,8,16,0.55) 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.94) 86%, #000 100%)",
            "radial-gradient(circle at 50% 38%, transparent 35%, rgba(0,0,0,0.65) 100%)",
            `linear-gradient(135deg, ${withAlpha(color, 0.14)} 0%, transparent 40%, rgba(255,40,40,0.1) 100%)`,
          ]}
        />

        {/* scanlines + moving scan bar */}
        <AbsoluteFill
          style={{
            zIndex: 2,
            opacity: 0.35,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 140,
            zIndex: 2,
            top: ((frame * 14) % 2200) - 200,
            background: `linear-gradient(180deg, transparent, ${withAlpha(color, 0.16)}, transparent)`,
          }}
        />

        <Radar color={color} frame={frame} appear={appear} />
        <HudRings color={color} frame={frame} pulse={pulse} appear={appear} />
        <Reticle color={color} frame={frame} />
        <Sparks frame={frame} color={color} fade={sceneFade} />

        {/* left tick strip */}
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 200,
            width: 30,
            height: 1200,
            overflow: "hidden",
            zIndex: 6,
            opacity: 0.55,
          }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                top: ((i * 40 + frame * 2) % 1280) - 40,
                width: i % 4 === 0 ? 28 : 14,
                height: 3,
                backgroundColor: i % 4 === 0 ? color : "#FFFFFF",
              }}
            />
          ))}
        </div>

        <FrameCorners color={color} appear={appear} />

        {/* telemetry (brand ke neeche) */}
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            top: 150,
            zIndex: 9,
            fontFamily: MONO_FONT,
            fontSize: 22,
            letterSpacing: 2,
            lineHeight: 1.45,
            color: withAlpha(color, 0.95),
            textShadow: `0 0 8px ${color}`,
            opacity: flicker,
          }}
        >
          {telemetry.map((t, i) => (
            <div key={i}>{t.slice(0, Math.max(0, telChars - i * 4))}</div>
          ))}
        </div>

        {/* ---------- text block ---------- */}
        <AbsoluteFill
          style={{
            paddingLeft: SAFE.left,
            paddingRight: SAFE.right,
            paddingTop: SAFE.top,
            paddingBottom: SAFE.bottom,
            justifyContent: "flex-end",
            alignItems: "flex-start",
            zIndex: 10,
          }}
        >
          {/* eyebrow */}
          <div
            style={{
              opacity: interpolate(frame, [2, 6], [0, 1], CLAMP) * flicker,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 20px",
              marginBottom: 22,
              fontFamily: MONO_FONT,
              fontSize: 26,
              letterSpacing: 4,
              color,
              background: "rgba(0,10,16,0.7)",
              border: `1px solid ${withAlpha(color, 0.7)}`,
              boxShadow: `0 0 20px ${withAlpha(color, 0.35)}`,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                backgroundColor: RED,
                boxShadow: `0 0 12px ${RED}`,
                opacity: 0.4 + 0.6 * pulse,
              }}
            />
            {"[ SYS.TARGET :: "}
            {typed}
            {cursorOn ? "_" : " "}
            {" ]"}
          </div>

          {/* title */}
          <div style={{ width: "100%", fontFamily: TITLE_FONT, fontSize: titleSize, lineHeight: 1.0 }}>
            {data.title.map((line, i) => {
              const lf = frame - 8 - i * 7;
              const s = spring({
                frame: lf,
                fps,
                config: { damping: 9, stiffness: 170, mass: 0.7 },
              });
              const dir = i % 2 === 0 ? -1 : 1;
              const last = i === data.title.length - 1;
              const glitching = lf >= 0 && lf < 9;
              const off = glitching ? (random(`gl-${i}-${frame}`) - 0.5) * 26 : 0;
              const blur = Math.max(0, 1 - s) * 18;
              const filter = `blur(${blur}px) drop-shadow(${off}px 0 0 ${RED}) drop-shadow(${-off}px 0 0 #00E5FF) drop-shadow(0 6px 0 rgba(0,0,0,0.85))`;
              const fillA = interpolate(lf, [14, 26], [0, 0.9], CLAMP);
              return (
                <div
                  key={`${index}-${i}`}
                  style={{
                    fontWeight: 900,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    opacity: Math.min(1, Math.max(0, s * 2)),
                    transform: `translateX(${(1 - s) * dir * 420}px) scale(${1 + (1 - s) * 0.5}) skewX(${(1 - s) * dir * -14}deg)`,
                    transformOrigin: "left center",
                    filter,
                    marginBottom: 6,
                    ...(last
                      ? {
                          color: "transparent",
                          WebkitTextStroke: `4px ${color}`,
                          WebkitTextFillColor: withAlpha(color, fillA),
                          textShadow: `0 0 ${24 + pulse * 18}px ${withAlpha(color, 0.8)}`,
                        }
                      : {
                          background: "linear-gradient(180deg, #FFFFFF 0%, #CFE9FF 45%, #8AA4B8 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }),
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* subtitle panel */}
          <div
            style={{
              marginTop: 34,
              width: "100%",
              clipPath: `inset(-60px calc(${(1 - wipe) * 100}% - 60px) -60px -60px)`,
            }}
          >
            <div
              style={{
                position: "relative",
                boxSizing: "border-box",
                padding: "26px 32px 28px 40px",
                background: "rgba(0,8,14,0.74)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${withAlpha(color, 0.45)}`,
                borderLeft: `10px solid ${color}`,
                boxShadow: `0 0 40px ${withAlpha(color, 0.25)}, inset 0 0 30px ${withAlpha(color, 0.08)}`,
              }}
            >
              <div style={{ position: "absolute", right: -1, top: -1, width: 26, height: 26, borderTop: `4px solid ${GOLD}`, borderRight: `4px solid ${GOLD}` }} />
              <div style={{ position: "absolute", right: -1, bottom: -1, width: 26, height: 26, borderBottom: `4px solid ${GOLD}`, borderRight: `4px solid ${GOLD}` }} />
              <Words
                text={sub}
                frame={frame}
                fps={fps}
                delay={28}
                color={color}
                style={{
                  fontFamily: BODY_FONT,
                  fontSize: subSize,
                  fontWeight: 600,
                  lineHeight: 1.28,
                  letterSpacing: 0.4,
                  color: "#EAF6FF",
                  textShadow: "1px 2px 6px rgba(0,0,0,0.95)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  height: 4,
                  width: `${Math.min(100, (frame / dur) * 100)}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
              />
            </div>
          </div>

          {isLast && (
            <SubscribeCTA
              lead="ACCESS GRANTED //"
              accent={color}
              font={TITLE_FONT}
              brandName={brand.name}
              emoji={"\u26A1"}
              style={{ fontSize: 24, letterSpacing: 3 }}
            />
          )}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ---------- transition + edit FX (shake se bahar) ---------- */}
      <ShineSweep accent={color} />

      {/* variant 0: glitch RGB split */}
      {variant === 0 && frame < 9 && index !== 0 && (
        <>
          <AbsoluteFill
            style={{
              backgroundColor: "rgba(255,0,0,0.35)",
              mixBlendMode: "screen",
              transform: `translateX(${-12 - random(`ga-${frame}`) * 14}px)`,
              zIndex: 30,
            }}
          />
          <AbsoluteFill
            style={{
              backgroundColor: "rgba(0,255,255,0.35)",
              mixBlendMode: "screen",
              transform: `translateX(${12 + random(`gb-${frame}`) * 14}px)`,
              zIndex: 30,
            }}
          />
        </>
      )}

      {/* variant 1: slat wipe */}
      {variant === 1 && frame < 18 && index !== 0 && (
        <AbsoluteFill style={{ zIndex: 40 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const t = interpolate(frame, [i * 1.2, i * 1.2 + 12], [1, 0], CLAMP);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: i * 192,
                  height: 193,
                  backgroundColor: i % 2 === 0 ? color : "#FFFFFF",
                  transform: `scaleX(${t})`,
                  transformOrigin: i % 2 === 0 ? "left center" : "right center",
                }}
              />
            );
          })}
        </AbsoluteFill>
      )}

      {/* variant 0 + 2: shockwave ring */}
      {variant !== 1 && frame < 24 && (
        <div
          style={{
            position: "absolute",
            left: 540 - 200,
            top: 960 - 200,
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: `10px solid ${index % 2 === 0 ? "#FFFFFF" : color}`,
            boxShadow: `0 0 40px ${color}`,
            transform: `scale(${interpolate(frame, [0, 24], [0.2, 4.5], CLAMP)})`,
            opacity: interpolate(frame, [0, 24], [0.9, 0], CLAMP),
            zIndex: 31,
          }}
        />
      )}

      {/* anamorphic lens streak */}
      {frame < 20 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 606,
            height: 8,
            zIndex: 32,
            background: `linear-gradient(90deg, transparent, ${color}, #FFFFFF, ${color}, transparent)`,
            boxShadow: `0 0 40px 10px ${withAlpha(color, 0.8)}`,
            transform: `scaleX(${interpolate(frame, [0, 8, 20], [0, 1.2, 0], CLAMP)})`,
            opacity: interpolate(frame, [0, 20], [1, 0], CLAMP),
          }}
        />
      )}

      {/* beat flash */}
      <AbsoluteFill
        style={{ backgroundColor: "#FFFFFF", opacity: 0.07 * pulse, mixBlendMode: "overlay", zIndex: 33 }}
      />

      {/* entry + exit white flash (scene cut) */}
      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: Math.max(entryFlash, exitFlash), zIndex: 45 }} />

      <ProgressBar progress={progress} accent={color} height={6} style={{ zIndex: 50 }} />

      <Brand
        name={brand.name}
        accent={color}
        font={TITLE_FONT}
        mark={"\u26A1"}
        markStyle={{ fontSize: 36, transform: `scale(${1 + pulse * 0.25})` }}
        textStyle={{ fontWeight: 900, letterSpacing: 4, fontSize: 38 }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ defaults (sirf Remotion Studio preview ke liye)
const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "GENESIS",
    title: ["MARK", "ONE"],
    subtitle:
      "Built in a cave with a box of scraps. The suit that started a cinematic universe and changed the world.",
    accent: "#00F0FF",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "CORE",
    title: ["ARC", "REACTOR"],
    subtitle:
      "Generating 3 gigajoules per second. Enough power to light up your heart, or destroy an entire city.",
    accent: "#00F0FF",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "LEGACY",
    title: ["I AM", "IRON MAN"],
    subtitle:
      "The snap that saved the universe. A genius, billionaire, playboy, philanthropist till the very end.",
    accent: "#00F0FF",
    duration: 300,
  },
];

export const IronManHUD: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "none",
  brand = { name: "STARK IND.", color: "#00F0FF" },
}) => (
  <FactsVideo audio={audio} bg="#000" scenes={scenes} brand={brand} Scene={Scene} />
);
