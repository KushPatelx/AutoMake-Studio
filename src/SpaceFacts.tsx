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
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
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

const { fontFamily: orbitron } = loadOrbitron("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});
const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});
const titleFont = `${orbitron}, 'Courier New', monospace`;
const bodyFont = `${inter}, 'Segoe UI', Arial, sans-serif`;

const EMOJIS = [
  "\u{1F680}",
  "\u{1F47D}",
  "\u{1F6F8}",
  "\u{1FA90}",
  "\u2604\uFE0F",
  "\u{1F52D}",
  "\u{1F30C}",
  "\u{1F6F0}\uFE0F",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "COSMIC FACT 01",
    title: ["DEADLY", "SILENCE"],
    subtitle:
      "Space is completely silent. Because there is no atmosphere, sound has no medium or way to travel to be heard.",
    accent: "#00FFFF",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "LUNAR MYSTERY 02",
    title: ["FOREVER", "FOOTPRINTS"],
    subtitle:
      "The Apollo astronauts' footprints on the moon will probably stay there for at least 100 million years!",
    accent: "#B026FF",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "STELLAR SCALE 03",
    title: ["NEUTRON", "STARS"],
    subtitle:
      "Neutron stars are so dense that just a single teaspoon of their material would weigh 6 billion tons on Earth!",
    accent: "#00FF9D",
    duration: 300,
  },
];

const Stars: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ zIndex: 1 }}>
      {Array.from({ length: 70 }).map((_, i) => {
        const tw =
          0.3 + 0.7 * Math.abs(Math.sin((frame + random(`d${i}`) * 60) * 0.08));
        const size = 1 + Math.floor(random(`z${i}`) * 3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${random(`x${i}`) * 100}%`,
              top: `${random(`y${i}`) * 100}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#FFFFFF",
              opacity: tw * 0.85,
              boxShadow: size > 2 ? "0 0 8px #93c5fd" : "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

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
    config: { damping: 15, stiffness: 70, mass: 1 },
  });
  const scale = interpolate(frame, [0, data.duration], [1.3, 1.1], CLAMP);
  const rotate = interpolate(
    frame,
    [0, data.duration],
    [index % 2 === 0 ? 5 : -5, 0],
  );
  const g = globalStartFrame + frame;
  const progress = (g / useVideoConfig().durationInFrames) * 100;
  const zeroG = Math.sin(frame / 15) * 10;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#020208", opacity: fade, overflow: "hidden" }}
    >
      <Backdrop
        image={data.image}
        scale={scale}
        rotate={rotate}
        overlays={[
          "linear-gradient(180deg, rgba(5,0,20,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(5,0,20,0.6) 60%, rgba(0,0,10,0.95) 85%, rgba(0,0,0,0.98) 100%)",
        ]}
      />
      <Stars />
      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="sway"
        count={12}
        opacity={0.55}
        speed={1}
        glow="rgba(0,255,255,0.5)"
      />
      <ShineSweep accent={brand.color} />
      <Flash
        show={index !== 0}
        color="#00FFFF"
        frames={12}
        peak={0.8}
        blend="screen"
      />
      <ProgressBar
        progress={progress}
        accent={brand.color}
        height={4}
        style={{ boxShadow: `0 0 25px 5px ${brand.color}` }}
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
            transform: `translateY(${interpolate(enter, [0, 1], [20, 0]) + zeroG}px)`,
            display: "inline-block",
            padding: "8px 20px",
            marginBottom: 20,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: brand.color,
            fontFamily: titleFont,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 4,
            border: `1px solid ${brand.color}`,
            boxShadow: `0 0 15px ${brand.color}40`,
            textTransform: "uppercase",
          }}
        >
          {data.eyebrow}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: titleFont,
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#FFFFFF",
            textShadow: `0 0 20px ${brand.color}80, 4px 4px 0px rgba(0,0,0,0.9)`,
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - i * 8,
              fps,
              config: { damping: 12, stiffness: 80, mass: 1 },
            });
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  transform: `translateY(${interpolate(s, [0, 1], [40, 0]) + zeroG * (1 + i * 0.2)}px)`,
                  opacity: interpolate(s, [0, 1], [0, 1], CLAMP),
                  color: i === data.title.length - 1 ? brand.color : "#FFFFFF",
                  marginBottom: 8,
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
            transform: `translateY(${interpolate(enter, [0, 1], [30, 0]) + zeroG * 0.5}px)`,
            marginTop: 35,
            width: "100%",
            boxSizing: "border-box",
            padding: "24px 30px",
            backgroundColor: "rgba(0,10,20,0.45)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${brand.color}80`,
            borderLeft: `6px solid ${brand.color}`,
            borderRadius: "0 14px 14px 0",
            boxShadow: `0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px ${brand.color}20`,
          }}
        >
          <WordReveal
            text={data.subtitle}
            delay={14}
            style={{
              fontFamily: bodyFont,
              fontSize: 42,
              fontWeight: 500,
              lineHeight: 1.45,
              color: "#E0F7FA",
              letterSpacing: 0.3,
              textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
            }}
          />
        </div>

        {isLast && (
          <SubscribeCTA
            brandName={brand.name}
            lead="JOIN THE MISSION:"
            accent={brand.color}
            font={titleFont}
            emoji={"\u{1F6F8}"}
            style={{
              fontSize: 24,
              borderBottom: `2px solid ${brand.color}`,
              paddingBottom: 8,
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
          textShadow: `0 0 25px ${brand.color}, 0 0 10px #FFF`,
          transform: `rotate(${Math.sin(g / 5) * 15}deg) scale(${1 + Math.sin(g / 10) * 0.15})`,
        }}
        textStyle={{ fontWeight: 900, letterSpacing: 3 }}
      />
    </AbsoluteFill>
  );
};

export const SpaceFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/Space.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#020208"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
