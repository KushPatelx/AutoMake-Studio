import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import {
  Backdrop,
  Brand,
  BrandConfig,
  CLAMP,
  FactsVideo,
  FloatingEmojis,
  ProgressBar,
  SAFE,
  SceneData,
  SceneProps,
  ShineSweep,
  TOTAL_FRAMES,
  useSceneFade,
} from "./shared";

const { fontFamily: grotesk } = loadGrotesk("normal", {
  weights: ["700"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});
const titleFont = `${grotesk}, 'Segoe UI', Arial, sans-serif`;
const bodyFont = `${mono}, 'Courier New', monospace`;

const EMOJIS = [
  "\u2699\uFE0F",
  "\u{1F4A1}",
  "\u{1F9EC}",
  "\u{1F52C}",
  "\u{1F9F2}",
  "\u{1F4D0}",
  "\u{1F9EA}",
  "\u269B\uFE0F",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "SYS_LOG // 01",
    title: ["HUMAN", "DNA CODE"],
    subtitle:
      "If uncoiled, the DNA in all the cells in your body would stretch to Pluto and back. Twice.",
    accent: "#39FF14",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "THERMAL // 02",
    title: ["SHAPE", "SHIFTER"],
    subtitle:
      "The Eiffel Tower grows! In the summer heat, thermal expansion causes the iron to expand by up to 15 centimeters.",
    accent: "#00E5FF",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "PHYSICS // 03",
    title: ["TRIPLE", "POINT"],
    subtitle:
      "Water can boil and freeze at the exact same time. This is called the 'triple point' of a substance in thermodynamics.",
    accent: "#FF00FF",
    duration: 300,
  },
];

const Scene: React.FC<SceneProps> = ({
  data,
  index,
  globalStartFrame,
  isLast,
  brand, // 🚀 NEW: Receive brand from UI
}) => {
  const frame = useCurrentFrame();
  const fade = useSceneFade(data.duration, isLast, 10);
  const scale = interpolate(frame, [0, data.duration], [1.05, 1.15], CLAMP);
  const g = globalStartFrame + frame;
  const progress = (g / useVideoConfig().durationInFrames) * 100;
  const isGlitching = frame < 8 && index !== 0;
  const glitchX = isGlitching ? (random(`g-${frame}-${index}`) - 0.5) * 24 : 0;
  const cursor = Math.floor(g / 15) % 2 === 0;
  const cardIn = interpolate(frame, [25, 33], [0, 1], CLAMP);

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#050A0F", opacity: fade, overflow: "hidden" }}
    >
      <AbsoluteFill style={{ transform: `translateX(${glitchX}px)` }}>
        <Backdrop
          image={data.image}
          scale={scale}
          filter={isGlitching ? "contrast(1.5) saturate(2)" : undefined}
          overlays={[
            "linear-gradient(180deg, rgba(0,10,20,0.6) 0%, rgba(0,0,0,0.2) 30%, rgba(0,15,25,0.7) 60%, rgba(0,5,15,0.95) 85%, rgba(0,0,0,1) 100%)",
          ]}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${brand.color}20 1px, transparent 1px), linear-gradient(90deg, ${brand.color}20 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: 0.25,
        }}
      />
      {/* scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 4px)",
          opacity: 0.5,
          zIndex: 3,
        }}
      />
      {/* moving scan bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 120,
          zIndex: 3,
          top: ((frame * 9) % 2300) - 200,
          background: `linear-gradient(180deg, transparent, ${brand.color}22, transparent)`,
        }}
      />

      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="jitter"
        count={14}
        opacity={0.55}
        speed={2}
        glow="rgba(255,255,255,0.4)"
      />
      <ShineSweep accent={brand.color} />

      {isGlitching && (
        <>
          <AbsoluteFill
            style={{
              backgroundColor: "rgba(255,0,0,0.4)",
              mixBlendMode: "screen",
              transform: "translateX(-10px)",
              zIndex: 4,
            }}
          />
          <AbsoluteFill
            style={{
              backgroundColor: "rgba(0,255,255,0.4)",
              mixBlendMode: "screen",
              transform: "translateX(10px)",
              zIndex: 4,
            }}
          />
        </>
      )}

      <ProgressBar
        progress={progress}
        accent={brand.color}
        style={{ borderRight: "5px solid #FFF" }}
      />

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
        <div
          style={{
            opacity: frame > 5 ? 1 : 0,
            display: "inline-block",
            padding: "6px 16px",
            marginBottom: 20,
            color: brand.color,
            fontFamily: bodyFont,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            border: `2px solid ${brand.color}`,
            boxShadow: `0 0 15px ${brand.color}40, inset 0 0 10px ${brand.color}40`,
            textTransform: "uppercase",
          }}
        >
          {"> " + data.eyebrow} {cursor ? "_" : ""}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: titleFont,
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1,
            textTransform: "uppercase",
            color: "#FFFFFF",
            textShadow: `0 0 15px ${brand.color}, 3px 3px 0px rgba(0,0,0,1)`,
          }}
        >
          {data.title.map((line, i) => {
            const chars = Math.floor(
              interpolate(frame - i * 15, [0, 20], [0, line.length], CLAMP),
            );
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  color: i === data.title.length - 1 ? brand.color : "#FFFFFF",
                  marginBottom: 8,
                  minHeight: 96,
                }}
              >
                {line.substring(0, chars)}
                {chars > 0 && chars < line.length && (
                  <span style={{ backgroundColor: "#FFF", color: "#FFF" }}>
                    _
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            opacity: cardIn,
            transform: `translateY(${(1 - cardIn) * 14}px)`,
            marginTop: 35,
            width: "100%",
            boxSizing: "border-box",
            padding: "20px 24px",
            backgroundColor: "rgba(0,15,10,0.78)",
            border: `2px solid ${brand.color}`,
            boxShadow: `5px 5px 0px ${brand.color}60, inset 0 0 15px ${brand.color}30`,
          }}
        >
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: 36,
              fontWeight: 500,
              lineHeight: 1.5,
              color: "#E8E8E8",
              textShadow: "1px 1px 2px rgba(0,0,0,1)",
            }}
          >
            {data.subtitle.substring(
              0,
              Math.floor(
                interpolate(
                  frame,
                  [28, 28 + data.subtitle.length * 0.45],
                  [0, data.subtitle.length],
                  CLAMP,
                ),
              ),
            )}
            {cursor ? "\u2588" : ""}
          </div>
        </div>

        {isLast && (
          <div
            style={{
              opacity: frame > 120 ? 1 : 0,
              marginTop: 35,
              fontFamily: bodyFont,
              fontSize: 24,
              fontWeight: 700,
              color: brand.color,
              letterSpacing: 1,
              backgroundColor: "rgba(0,0,0,0.8)",
              border: `1px solid ${brand.color}`,
              padding: "10px 14px",
            }}
          >
            EXECUTE SUB: {/* 🚀 NEW: Dynamic brand name injected here! */}
            <span style={{ color: "#FFF", fontWeight: 700 }}>
              {brand.name}.exe
            </span>{" "}
            {cursor ? "\u2588" : ""}
          </div>
        )}
      </AbsoluteFill>

      <Brand
        name={brand.name} // 🚀 NEW
        accent={brand.color}
        font={titleFont}
        mark={cursor ? "_" : " "}
        markStyle={{ fontSize: 36 }}
        textStyle={{ fontWeight: 700 }}
      />
    </AbsoluteFill>
  );
};

// 🚀 NEW: Accept brand as prop
export const TechnologyFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/Technology.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#050A0F"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
