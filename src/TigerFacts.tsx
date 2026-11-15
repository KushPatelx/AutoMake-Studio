import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
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

const { fontFamily: anton } = loadAnton("normal", {
  weights: ["400"],
  subsets: ["latin"],
});
const { fontFamily: poppins } = loadPoppins("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});
const titleFont = `${anton}, Impact, 'Arial Black', sans-serif`;
const bodyFont = `${poppins}, 'Segoe UI', Arial, sans-serif`;

const EMOJIS = [
  "\u{1F42F}",
  "\u{1F43E}",
  "\u{1F33F}",
  "\u{1F985}",
  "\u{1F98B}",
  "\u{1F343}",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "MIND-BLOWING FACT 01",
    title: ["SILENT", "ASSASSINS"],
    subtitle:
      "Despite being the largest wild cats, they can silently ambush prey from just 20 feet away.",
    accent: "#FF9100",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "WILDLIFE FACT 02",
    title: ["UNIQUE", "FINGERPRINTS"],
    subtitle:
      "No two tigers share the same stripes. Even if shaved, their skin holds the exact same pattern!",
    accent: "#FFD000",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "WILDLIFE FACT 03",
    title: ["MASTERS", "OF WATER"],
    subtitle:
      "Unlike lions, tigers love water. They regularly swim up to 18 miles just to hunt their prey!",
    accent: "#00E1FF",
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
  const fade = useSceneFade(data.duration, isLast, 10);
  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });
  const scale = interpolate(frame, [0, data.duration], [1.05, 1.2], CLAMP);
  const g = globalStartFrame + frame;
  const progress = (g / TOTAL_FRAMES) * 100;
  const dotPulse = 0.5 + Math.abs(Math.sin(frame / 8)) * 0.5;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#050505", opacity: fade, overflow: "hidden" }}
    >
      <Backdrop
        image={data.image}
        scale={scale}
        origin={index % 2 === 0 ? "center center" : "top right"}
        overlays={[
          "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.92) 85%, rgba(0,0,0,0.98) 100%)",
          "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 75%, transparent 100%)",
          "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.55) 100%)",
        ]}
      />
      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="rise"
        count={14}
        opacity={0.6}
        speed={2.2}
      />
      <ShineSweep accent={brand.color} />
      <Flash show={index !== 0} color="#FFFFFF" frames={8} peak={0.6} />
      <ProgressBar progress={progress} accent={brand.color} />

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
            transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 18px",
            marginBottom: 22,
            backgroundColor: brand.color,
            color: "#000",
            fontFamily: bodyFont,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2.5,
            borderRadius: 4,
            boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#000",
              opacity: dotPulse,
            }}
          />
          {data.eyebrow}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: titleFont,
            fontSize: 125,
            fontWeight: 400,
            lineHeight: 0.98,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#FFFFFF",
            WebkitTextStroke: "3px rgba(0,0,0,0.85)",
            paintOrder: "stroke fill",
            textShadow: "5px 8px 0 rgba(0,0,0,0.9), 0 0 35px rgba(0,0,0,0.6)",
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - i * 6,
              fps,
              config: { damping: 12, stiffness: 110, mass: 0.6 },
            });
            const last = i === data.title.length - 1;
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  transform: `translateX(${(1 - s) * -120}px) skewX(${(1 - s) * -12}deg)`,
                  opacity: Math.min(1, s),
                  color: last ? brand.color : "#FFFFFF",
                  filter: last
                    ? `drop-shadow(0 0 18px ${brand.color}99)`
                    : undefined,
                  marginBottom: 4,
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
            transform: `translateY(${interpolate(enter, [0, 1], [25, 0])}px)`,
            marginTop: 35,
            width: "100%",
            boxSizing: "border-box",
            padding: "24px 28px",
            backgroundColor: "rgba(10,10,10,0.5)",
            backdropFilter: "blur(12px)",
            borderLeft: `6px solid ${brand.color}`,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
          }}
        >
          <WordReveal
            text={data.subtitle}
            delay={14}
            style={{
              fontFamily: bodyFont,
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.3,
              color: "#F5F5F5",
              textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
            }}
          />
        </div>

        {index === 2 && (
          <SubscribeCTA
            brandName={brand.name}
            lead="SUBSCRIBE TO"
            accent={brand.color}
            font={bodyFont}
            emoji={"\u{1F447}"}
          />
        )}
      </AbsoluteFill>

      <Brand
        name={brand.name}
        accent={brand.color}
        font={`'Trebuchet MS', ${poppins}, sans-serif`}
        mark="?"
        markStyle={{
          transform: `rotate(${Math.sin(g / 4) * 20}deg) scale(${1 + Math.sin(g / 6) * 0.1})`,
        }}
        textStyle={{
          fontStyle: "italic",
          fontWeight: 900,
          background: `linear-gradient(90deg, #FFFFFF 0%, ${brand.color} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "none",
          filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.8))",
        }}
      />
    </AbsoluteFill>
  );
};

export const TigerFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/Nature.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#050505"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
