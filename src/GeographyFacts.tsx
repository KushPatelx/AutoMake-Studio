import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import {
  Backdrop,
  Brand,
  BrandConfig,
  CLAMP,
  FactsVideo,
  FloatingEmojis,
  Flash,
  ProgressBar,
  SAFE,
  SceneData,
  SceneProps,
  ShineSweep,
  SubscribeCTA,
  TOTAL_FRAMES,
  WordReveal,
  useSceneFade,
} from "./shared";

const { fontFamily: fredoka } = loadFredoka("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});
const { fontFamily: nunito } = loadNunito("normal", {
  weights: ["700", "800", "900"],
  subsets: ["latin"],
});
const titleFont = `${fredoka}, 'Arial Rounded MT Bold', sans-serif`;
const bodyFont = `${nunito}, 'Segoe UI', Arial, sans-serif`;

const EMOJIS = [
  "\u{1F30D}",
  "\u2708\uFE0F",
  "\u{1F9ED}",
  "\u{1F5FA}\uFE0F",
  "\u26F0\uFE0F",
  "\u{1F334}",
  "\u{1F30B}",
  "\u26F5",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "GEO FACT 01",
    title: ["THE REAL", "TALLEST"],
    subtitle:
      "Mount Everest isn't the tallest! Mauna Kea in Hawaii is taller when measured from its underwater base.",
    accent: "#00E676",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "EARTH MYSTERY 02",
    title: ["FROZEN", "DESERT"],
    subtitle:
      "The largest desert on Earth isn't the Sahara. It's actually Antarctica, covered entirely in ice!",
    accent: "#FFAB00",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "GLOBAL SCALE 03",
    title: ["TIMEZONE", "GIANT"],
    subtitle:
      "Russia is so massive it spans 11 time zones. When it's morning in the west, it's night in the east!",
    accent: "#00B0FF",
    duration: 300,
  },
];

const Scene: React.FC<SceneProps> = ({
  data,
  index,
  globalStartFrame,
  isLast,
  brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useSceneFade(data.duration, isLast, 12);
  const enter = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 100, mass: 0.8 },
  });
  const scale = interpolate(frame, [0, data.duration], [1.1, 1.25], CLAMP);
  const panX = interpolate(
    frame,
    [0, data.duration],
    [0, index % 2 === 0 ? -40 : 40],
  );
  const g = globalStartFrame + frame;
  const progress = (g / useVideoConfig().durationInFrames) * 100;
  const float = Math.sin(frame / 14) * 6;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#030805", opacity: fade, overflow: "hidden" }}
    >
      <Backdrop
        image={data.image}
        scale={scale}
        translateX={panX}
        filter="saturate(1.15)"
        overlays={[
          "linear-gradient(180deg, rgba(0,25,15,0.4) 0%, rgba(0,0,0,0) 25%, rgba(0,15,10,0.4) 50%, rgba(0,8,5,0.92) 80%, rgba(0,0,0,0.98) 100%)",
          "linear-gradient(90deg, rgba(0,20,10,0.7) 0%, rgba(0,0,0,0.2) 75%, transparent 100%)",
        ]}
      />
      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="sway"
        count={14}
        opacity={0.6}
        speed={1.8}
      />
      <ShineSweep accent={brand.color} />
      <Flash show={index !== 0} color="#FFD700" frames={10} peak={0.7} />
      <ProgressBar
        progress={progress}
        accent={brand.color}
        height={8}
        style={{ borderRadius: "0 5px 5px 0" }}
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
            opacity: enter,
            transform: `translateX(${interpolate(enter, [0, 1], [-50, 0])}px) translateY(${float}px)`,
            display: "inline-block",
            padding: "12px 24px",
            marginBottom: 20,
            backgroundColor: brand.color,
            color: "#000",
            fontFamily: bodyFont,
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 2,
            borderRadius: 24,
            boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
            border: "3px solid #FFFFFF",
          }}
        >
          {data.eyebrow}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: titleFont,
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#FFFFFF",
            WebkitTextStroke: "4px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
            textShadow: `5px 8px 0 rgba(0,10,0,0.9), 0 0 35px ${brand.color}60`,
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - i * 5,
              fps,
              config: { damping: 10, stiffness: 120, mass: 0.6 },
            });
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px) scale(${interpolate(s, [0, 0.5, 1], [0.8, 1.05, 1])}) rotate(${(1 - s) * -4}deg)`,
                  transformOrigin: "left center",
                  opacity: interpolate(s, [0, 0.8, 1], [0, 1, 1], CLAMP),
                  color: i === data.title.length - 1 ? brand.color : "#FFFFFF",
                  marginBottom: 6,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        <div
          style={{
            opacity: enter,
            transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
            marginTop: 35,
            width: "100%",
            boxSizing: "border-box",
            padding: "28px 32px",
            backgroundColor: "rgba(10,25,15,0.45)",
            backdropFilter: "blur(12px)",
            border: `3px solid ${brand.color}`,
            borderRadius: 28,
            boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 30px ${brand.color}40, inset 0 0 20px rgba(255,255,255,0.1)`,
          }}
        >
          <WordReveal
            text={data.subtitle}
            delay={14}
            style={{
              fontFamily: bodyFont,
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.4,
              color: "#F0F5F0",
              textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
            }}
          />
        </div>

        {isLast && (
          <SubscribeCTA
            brandName={brand.name}
            lead="EXPLORE MORE WITH"
            accent={brand.color}
            font={bodyFont}
            emoji={"\u{1F447}"}
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: "10px 20px",
              borderRadius: 15,
            }}
          />
        )}
      </AbsoluteFill>

      <Brand
        name={brand.name}
        accent={brand.color}
        font={titleFont}
        mark="?"
        markStyle={{
          transform: `rotate(${Math.sin(g / 4) * 20}deg) scale(${1 + Math.sin(g / 6) * 0.1})`,
        }}
        textStyle={{ fontStyle: "italic", fontWeight: 700 }}
      />
    </AbsoluteFill>
  );
};

export const GeographyFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/Geography.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#030805"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
