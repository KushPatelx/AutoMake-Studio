import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
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
  SubscribeCTA,
  TOTAL_FRAMES,
  useSceneFade,
} from "../shared";

// ------------------------------------------------------------------ fonts
const { fontFamily: playfair } = loadPlayfair("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});
const { fontFamily: lora } = loadLora("italic", {
  weights: ["400"],
  subsets: ["latin"],
});
const { fontFamily: montserrat } = loadMontserrat("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});
const TITLE_FONT = `${playfair}, Georgia, serif`;
const BODY_FONT = `${lora}, Georgia, serif`;
const LABEL_FONT = `${montserrat}, 'Helvetica Neue', Arial, sans-serif`;

// ------------------------------------------------------------------ helpers
const WARM_WHITE = "#FFF6E6";
const SOFT_GOLD = "#FFE2A8";

const hex2 = (n: number) =>
  Math.round(Math.max(0, Math.min(1, n)) * 255)
    .toString(16)
    .padStart(2, "0");
const withAlpha = (c: string, a: number) =>
  /^#[0-9a-fA-F]{6}$/.test(c) ? `${c}${hex2(a)}` : c;

// ------------------------------------------------------------------ pieces
// Halke golden dust / bokeh (gradient circles, koi blur ya shadow nahi, render fast rehta hai)
const Dust: React.FC<{ frame: number; fade: number }> = ({ frame, fade }) => (
  <AbsoluteFill
    style={{ zIndex: 4, overflow: "hidden", pointerEvents: "none" }}
  >
    {Array.from({ length: 16 }).map((_, i) => {
      const sp = 0.5 + random(`dsp${i}`) * 0.9;
      const y = 1990 - ((frame * sp + random(`do${i}`) * 2200) % 2200);
      const x = random(`dx${i}`) * 1080 + Math.sin((frame + i * 23) / 50) * 30;
      const s = 6 + random(`ds${i}`) * 16;
      const tw = 0.5 + 0.5 * Math.sin((frame + i * 11) / 22);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: s,
            height: s,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,230,170,0.95) 0%, rgba(255,230,170,0) 70%)`,
            opacity: (0.25 + 0.4 * tw) * fade,
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
  style: React.CSSProperties;
}> = ({ text, frame, fps, delay, style }) => (
  <div style={style}>
    {text.split(" ").map((w, i) => {
      const s = spring({
        frame: frame - delay - i * 2,
        fps,
        config: { damping: 20, stiffness: 90, mass: 0.8 },
      });
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            marginRight: "0.27em",
            opacity: Math.min(1, Math.max(0, s)),
            transform: `translateY(${(1 - s) * 14}px)`,
          }}
        >
          {w}
        </span>
      );
    })}
  </div>
);

// ------------------------------------------------------------------ scene
const Scene: React.FC<SceneProps> = ({
  data,
  index,
  globalStartFrame,
  isLast,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = brand.color;
  const dur = data.duration;
  const g = globalStartFrame + frame;
  const progress = (g / useVideoConfig().durationInFrames) * 100;

  // soft dip-to-warm-dark transition: fade out end pe, fade in start pe
  const fadeOut = useSceneFade(dur, isLast, 12);
  const fadeIn = interpolate(frame, [0, 12], [0, 1], CLAMP);
  const sceneOpacity = Math.min(fadeOut, fadeIn);

  // slow Ken Burns, har scene thoda alag
  const variant = index % 3;
  const origins = ["center center", "35% 40%", "65% 40%"];
  const zoom = interpolate(frame, [0, dur], [1.06, 1.17], CLAMP);
  const shift = interpolate(
    frame,
    [0, dur],
    [variant === 1 ? 20 : -20, variant === 1 ? -20 : 20],
    CLAMP,
  );

  // entry bloom + light leak
  const bloom = interpolate(frame, [0, 28], [0.55, 0], CLAMP);
  const leakX = Math.sin(g / 90) * 120;
  const leakY = Math.cos(g / 110) * 60;

  // text timings (slow & gentle)
  const lineGrow = spring({
    frame: frame - 6,
    fps,
    config: { damping: 22, stiffness: 60, mass: 1 },
  });
  const eyebrowIn = interpolate(frame, [8, 26], [0, 1], CLAMP);
  const dividerIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 22, stiffness: 55, mass: 1 },
  });
  const subLine = spring({
    frame: frame - 34,
    fps,
    config: { damping: 24, stiffness: 50, mass: 1 },
  });

  // auto-fit
  const maxLen = Math.max(4, ...data.title.map((t) => t.length));
  const titleSize = Math.max(
    64,
    Math.min(118, Math.floor(790 / (maxLen * 0.66))),
  );
  const sub = data.subtitle;
  const subSize =
    sub.length < 90 ? 46 : sub.length < 130 ? 42 : sub.length < 170 ? 38 : 34;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0B0805",
        opacity: sceneOpacity,
        overflow: "hidden",
      }}
    >
      <Backdrop
        image={data.image}
        scale={zoom}
        origin={origins[variant]}
        translateX={shift}
        filter="brightness(0.92) saturate(1.05) contrast(1.05)"
        overlays={[
          "linear-gradient(180deg, rgba(14,8,2,0.45) 0%, rgba(0,0,0,0) 26%, rgba(10,6,2,0.35) 52%, rgba(8,5,2,0.88) 82%, rgba(6,4,1,0.97) 100%)",
          "radial-gradient(circle at 50% 40%, transparent 45%, rgba(0,0,0,0.5) 100%)",
          `linear-gradient(160deg, ${withAlpha(color, 0.16)} 0%, transparent 45%, rgba(255,140,60,0.08) 100%)`,
        ]}
      />

      {/* soft light leak */}
      <div
        style={{
          position: "absolute",
          left: 380 + leakX,
          top: -320 + leakY,
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(color, 0.55)} 0%, ${withAlpha(color, 0)} 65%)`,
          mixBlendMode: "screen",
          opacity: 0.35,
          zIndex: 2,
        }}
      />

      <Dust frame={frame} fade={fadeOut} />

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
        {/* eyebrow with ornament */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 80 * lineGrow,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${color})`,
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: color,
              transform: "rotate(45deg)",
              opacity: eyebrowIn,
            }}
          />
          <div
            style={{
              fontFamily: LABEL_FONT,
              fontWeight: 600,
              fontSize: 24,
              letterSpacing: 9,
              textTransform: "uppercase",
              color: SOFT_GOLD,
              opacity: eyebrowIn,
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}
          >
            {data.eyebrow}
          </div>
        </div>

        {/* title */}
        <div
          style={{
            width: "100%",
            fontFamily: TITLE_FONT,
            fontSize: titleSize,
            lineHeight: 1.06,
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - 8 - i * 9,
              fps,
              config: { damping: 22, stiffness: 60, mass: 1 },
            });
            const last = i === data.title.length - 1;
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  fontWeight: 700,
                  letterSpacing: 1,
                  opacity: Math.min(1, Math.max(0, s)),
                  transform: `translateY(${(1 - s) * 34}px)`,
                  filter: `blur(${Math.max(0, 1 - s) * 14}px)`,
                  color: last ? color : WARM_WHITE,
                  textShadow: last
                    ? `0 0 34px ${withAlpha(color, 0.55)}, 0 4px 14px rgba(0,0,0,0.6)`
                    : "0 4px 18px rgba(0,0,0,0.7)",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* divider */}
        <div
          style={{
            marginTop: 28,
            width: 240 * dividerIn,
            height: 2,
            background: `linear-gradient(90deg, ${color}, transparent)`,
          }}
        />

        {/* subtitle with quote mark + gold side line */}
        <div
          style={{
            position: "relative",
            marginTop: 30,
            width: "100%",
            paddingLeft: 38,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: `linear-gradient(180deg, ${color}, ${withAlpha(color, 0)})`,
              transform: `scaleY(${Math.min(1, Math.max(0, subLine))})`,
              transformOrigin: "top",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 28,
              top: -64,
              fontFamily: TITLE_FONT,
              fontSize: 150,
              lineHeight: 1,
              color: withAlpha(color, 0.3),
              opacity: eyebrowIn,
            }}
          >
            {"\u201C"}
          </div>
          <Words
            text={sub}
            frame={frame}
            fps={fps}
            delay={34}
            style={{
              fontFamily: BODY_FONT,
              fontSize: subSize,
              fontWeight: 400,
              lineHeight: 1.38,
              letterSpacing: 0.3,
              color: WARM_WHITE,
              textShadow: "0 2px 10px rgba(0,0,0,0.85)",
            }}
          />
        </div>

        {/* scene dots */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 36,
            alignItems: "center",
          }}
        >
          {[0, 1, 2].map((d) => (
            <div
              key={d}
              style={{
                width: d === index ? 44 : 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: d === index ? color : "rgba(255,246,230,0.35)",
              }}
            />
          ))}
        </div>

        {isLast && (
          <SubscribeCTA
            lead="FOLLOW FOR DAILY INSPIRATION //"
            accent={color}
            font={LABEL_FONT}
            brandName={brand.name}
            emoji={"\u2728"}
            style={{ fontSize: 22, letterSpacing: 3, fontWeight: 600 }}
          />
        )}
      </AbsoluteFill>

      {/* entry bloom (soft warm glow, hard flash nahi) */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(255,236,200,0.95) 0%, rgba(255,236,200,0) 60%)",
          opacity: bloom,
          mixBlendMode: "screen",
          zIndex: 30,
        }}
      />

      <ProgressBar
        progress={progress}
        accent={color}
        height={3}
        style={{ boxShadow: `0 0 8px ${withAlpha(color, 0.6)}` }}
      />

      <Brand
        name={brand.name}
        accent={color}
        font={TITLE_FONT}
        mark={"\u2726"}
        markStyle={{
          fontSize: 32,
          transform: `rotate(${Math.sin(g / 40) * 10}deg)`,
        }}
        textStyle={{ fontWeight: 600, letterSpacing: 4, fontSize: 36 }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ defaults (sirf Remotion Studio preview ke liye)
const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "MINDSET",
    title: ["BELIEVE", "IN YOURSELF"],
    subtitle:
      "Every great journey begins with a single step. Trust the process, and let your small daily efforts grow into something extraordinary.",
    accent: "#F5C26B",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "DISCIPLINE",
    title: ["SHOW UP", "EVERY DAY"],
    subtitle:
      "Motivation gets you started. Discipline keeps you going. Consistency is what turns your dreams into reality.",
    accent: "#F5C26B",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "GROWTH",
    title: ["YOUR TIME", "IS NOW"],
    subtitle:
      "You are exactly where you need to be. Take a deep breath, start again, and make today count.",
    accent: "#F5C26B",
    duration: 300,
  },
];

export const MotivationCalm: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "none",
  brand = { name: "DAILY RISE", color: "#F5C26B" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#0B0805"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
