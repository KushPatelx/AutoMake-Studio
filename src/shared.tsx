import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const SAFE = { left: 70, right: 220, top: 140, bottom: 450 };
export const TOTAL_FRAMES = 720;
export const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const EMOJI_TOP_LIMIT = 960;
const EMOJI_TRAVEL = 1100;
const EMOJI_DENSITY = 0.45;

// 🚀 NEW: Brand Config Type
export type BrandConfig = {
  name: string;
  color: string;
};

export type SceneData = {
  image: string;
  eyebrow: string;
  title: string[];
  subtitle: string;
  accent: string;
  duration: number;
  // Custom Facts mode: ek scene me kai images (images[0] hi image ke barabar hoti hai)
  images?: string[];
  imageMode?: "fade" | "cut";
};

// Scene ke andar Backdrop ko pata chalta hai ki is scene me kai images hain
export type SceneMedia = { images: string[]; mode: "fade" | "cut"; duration: number } | null;
export const SceneMediaContext = React.createContext<SceneMedia>(null);

const resolveMedia = (s: string) =>
  s.startsWith("blob:") || s.startsWith("http") || s.startsWith("data:") ? s : staticFile(s);

export const DEFAULT_BRAND: BrandConfig = { name: "MrCurious", color: "#39FF14" };

export const DEFAULT_SCENES: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "FACT 01",
    title: ["FIRST", "LINE"],
    subtitle: "Enter your first amazing fact here.",
    accent: "#39FF14",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "FACT 02",
    title: ["SECOND", "LINE"],
    subtitle: "Enter your second amazing fact here.",
    accent: "#39FF14",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "FACT 03",
    title: ["THIRD", "LINE"],
    subtitle: "Enter your final mind-blowing fact.",
    accent: "#39FF14",
    duration: 300,
  },
];

export type SceneProps = {
  data: SceneData;
  index: number;
  globalStartFrame: number;
  isLast: boolean;
  brand: BrandConfig; // 🚀 NEW: Passed to every scene
};

export const useSceneFade = (
  duration: number,
  isLast: boolean,
  frames = 12,
) => {
  const frame = useCurrentFrame();
  return isLast
    ? 1
    : interpolate(frame, [duration - frames, duration], [1, 0], CLAMP);
};

export const FactsVideo: React.FC<{
  audio?: string;
  bg: string;
  scenes?: SceneData[];
  brand?: BrandConfig;
  Scene: React.FC<SceneProps>;
}> = ({
  audio = "none",
  bg,
  scenes = DEFAULT_SCENES,
  brand = DEFAULT_BRAND,
  Scene,
}) => {
  let offset = 0;
  const safeScenes = scenes && scenes.length > 0 ? scenes : DEFAULT_SCENES;
  const safeBrand = { ...DEFAULT_BRAND, ...(brand || {}) };
  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {audio && audio !== "none" && audio !== "custom" && (
        <Audio
          src={
            audio.startsWith("blob:") || audio.startsWith("http")
              ? audio
              : staticFile(audio)
          }
        />
      )}

      {safeScenes.map((scene, index) => {
        const start = offset;
        offset += scene.duration;
        return (
          <Sequence key={index} from={start} durationInFrames={scene.duration}>
            <SceneMediaContext.Provider
              value={
                scene.images && scene.images.length > 1
                  ? { images: scene.images, mode: scene.imageMode ?? "fade", duration: scene.duration }
                  : null
              }
            >
              <Scene
                data={scene}
                index={index}
                globalStartFrame={start}
                isLast={index === safeScenes.length - 1}
                brand={safeBrand}
              />
            </SceneMediaContext.Provider>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const Backdrop: React.FC<{
  image: string;
  scale: number;
  origin?: string;
  rotate?: number;
  translateX?: number;
  filter?: string;
  overlays?: string[];
}> = ({
  image,
  scale,
  origin = "center center",
  rotate = 0,
  translateX = 0,
  filter,
  overlays = [],
}) => {
  const media = React.useContext(SceneMediaContext);
  const frame = useCurrentFrame();

  // Ek image (purana behavior) ya Custom Facts ke kai images: har image apne hisse me aati hai,
  // naya image purane ke upar fade-in hota hai (ya "cut" me seedha aata hai).
  const list = media && media.images.length > 1 ? media.images : [image];
  const slice = media ? media.duration / list.length : 1;
  const fadeFrames = media && media.mode === "cut" ? 0 : 8;

  return (
    <>
      <AbsoluteFill>
        {list.map((src, i) => {
          const startAt = i * slice;
          const opacity =
            i === 0
              ? 1
              : fadeFrames === 0
                ? frame >= startAt
                  ? 1
                  : 0
                : interpolate(frame, [startAt, startAt + fadeFrames], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
          return (
            <Img
              key={i}
              src={resolveMedia(src)}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity,
                transform: `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`,
                transformOrigin: origin,
                filter,
              }}
            />
          );
        })}
      </AbsoluteFill>
      {overlays.map((bg, i) => (
        <AbsoluteFill key={i} style={{ background: bg }} />
      ))}
    </>
  );
};

type Mode = "rise" | "sway" | "jitter" | "bubble";

export const FloatingEmojis: React.FC<{
  emojis: string[];
  duration: number;
  mode?: Mode;
  count?: number;
  opacity?: number;
  speed?: number;
  glow?: string;
  blur?: number;
  seed?: string;
}> = ({
  emojis,
  duration,
  mode = "rise",
  count = 14,
  opacity = 0.55,
  speed = 2,
  glow = "rgba(0,0,0,0.5)",
  blur = 0,
  seed = "e",
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(
    frame,
    [0, 15, duration - 15, duration],
    [0, 1, 1, 0],
    CLAMP,
  );
  const finalCount = Math.max(3, Math.round(count * EMOJI_DENSITY));

  return (
    <AbsoluteFill
      style={{ overflow: "hidden", zIndex: 2, pointerEvents: "none" }}
    >
      {Array.from({ length: finalCount }).map((_, i) => {
        const r = (k: string) => random(`${seed}-${k}-${i}`);
        const size = 40 + r("s") * 42;
        const v = speed * (0.6 + r("v") * 0.9);
        const phase = r("p") * 1000;
        let x = 20 + r("x") * (1080 - 120);

        let y =
          EMOJI_TOP_LIMIT +
          EMOJI_TRAVEL -
          ((frame * v + r("o") * EMOJI_TRAVEL) % EMOJI_TRAVEL);
        let rot = 0;
        let sc = 1;

        if (mode === "rise") {
          x += Math.sin((frame + phase) / 40) * 40;
          rot = Math.sin((frame + phase) / 30) * 25;
        } else if (mode === "sway") {
          x += Math.sin((frame + phase) / 45) * 90;
          rot = Math.sin((frame + phase) / 50) * 10;
          sc = 1 + Math.sin((frame + phase) / 20) * 0.25;
        } else if (mode === "jitter") {
          const step = Math.floor(frame / 4);
          x += (random(`${seed}-j-${i}-${step}`) - 0.5) * 14;
          y = Math.round(y / 15) * 15;
          rot = (frame * 2 + phase) % 360;
        } else {
          x += Math.sin((frame + phase) / 10) * 18;
          sc = 1 + Math.sin(frame / 5 + phase) * 0.12;
          rot = (frame * 2 + phase) % 360;
        }

        const posFade = interpolate(
          y,
          [EMOJI_TOP_LIMIT, EMOJI_TOP_LIMIT + 170, 1850, 1980],
          [0, 1, 1, 0],
          CLAMP,
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              fontFamily: EMOJI_FONT,
              fontSize: size,
              lineHeight: 1,
              transform: `rotate(${rot}deg) scale(${sc})`,
              opacity: opacity * fade * posFade,
              filter: `drop-shadow(0px 4px 10px ${glow})${blur ? ` blur(${blur}px)` : ""}`,
            }}
          >
            {emojis[i % emojis.length]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  accent: string;
  height?: number;
  style?: React.CSSProperties;
}> = ({ progress, accent, height = 6, style }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      height,
      width: `${progress}%`,
      backgroundColor: accent,
      boxShadow: `0 0 18px ${accent}`,
      zIndex: 10,
      ...style,
    }}
  />
);

export const ShineSweep: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  if (frame > 28) return null;
  const x = interpolate(frame, [0, 28], [-500, 1500], CLAMP);
  return (
    <div
      style={{
        position: "absolute",
        top: -200,
        left: x,
        width: 240,
        height: 2400,
        transform: "rotate(18deg)",
        background: `linear-gradient(90deg, transparent, ${accent}99, transparent)`,
        mixBlendMode: "screen",
        zIndex: 6,
      }}
    />
  );
};

export const Flash: React.FC<{
  show: boolean;
  color: string;
  frames?: number;
  peak?: number;
  blend?: React.CSSProperties["mixBlendMode"];
}> = ({ show, color, frames = 10, peak = 0.7, blend = "overlay" }) => {
  const frame = useCurrentFrame();
  if (!show || frame >= frames) return null;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: interpolate(frame, [0, frames], [peak, 0], CLAMP),
        mixBlendMode: blend,
        zIndex: 5,
      }}
    />
  );
};

export const WordReveal: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 10, stagger = 2.5, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={style}>
      {text.split(" ").map((w, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 14, stiffness: 140, mass: 0.6 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.28em",
              opacity: Math.min(1, Math.max(0, s)),
              transform: `translateY(${(1 - s) * 22}px) scale(${0.85 + 0.15 * s})`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// 🚀 NEW: Dynamic Brand Name injection
export const SubscribeCTA: React.FC<{
  lead: string;
  accent: string;
  font: string;
  brandName: string;
  emoji?: string;
  style?: React.CSSProperties;
}> = ({ lead, accent, font, brandName, emoji, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - 120,
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.7 },
  });
  const pulse = 1 + Math.sin(frame / 6) * 0.04;
  const hop = Math.abs(Math.sin(frame / 7)) * 10;
  return (
    <div
      style={{
        marginTop: 32,
        opacity: Math.min(1, Math.max(0, s)),
        transform: `scale(${(0.7 + 0.3 * s) * pulse})`,
        transformOrigin: "left center",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: font,
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 2,
        color: "#FFFFFF",
        textShadow: "2px 2px 8px rgba(0,0,0,0.9)",
        ...style,
      }}
    >
      <span>{lead}</span>
      <span style={{ color: accent, fontWeight: 900 }}>{brandName}</span>
      {emoji ? (
        <span
          style={{
            fontFamily: EMOJI_FONT,
            display: "inline-block",
            transform: `translateY(${-hop}px)`,
          }}
        >
          {emoji}
        </span>
      ) : null}
    </div>
  );
};

// 🚀 NEW: Brand component now takes dynamic 'name'
export const Brand: React.FC<{
  name: string;
  accent: string;
  font: string;
  mark?: string;
  markStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}> = ({ name, accent, font, mark = "?", markStyle, textStyle }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      top: 75,
      display: "flex",
      alignItems: "center",
      gap: 14,
      zIndex: 20,
    }}
  >
    <div
      style={{
        fontFamily: font,
        fontSize: 38,
        fontWeight: 900,
        color: accent,
        textShadow: `0 0 20px ${accent}`,
        ...markStyle,
      }}
    >
      {mark}
    </div>
    <div
      style={{
        fontFamily: font,
        fontSize: 42,
        fontWeight: 800,
        letterSpacing: 2,
        color: "#FFFFFF",
        textShadow: `0 0 14px ${accent}99, 0 4px 10px rgba(0,0,0,0.8)`,
        ...textStyle,
      }}
    >
      {name}
    </div>
  </div>
);
