import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadChakra } from "@remotion/google-fonts/ChakraPetch";
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

const { fontFamily: chakra } = loadChakra("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});
const font = `${chakra}, 'Segoe UI', Arial, sans-serif`;

const EMOJIS = [
  "\u269B\uFE0F",
  "\u{1F9EC}",
  "\u{1F9A0}",
  "\u{1F9EA}",
  "\u{1F321}\uFE0F",
  "\u{1F52C}",
  "\u{1FA78}",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "BIOLOGY LAB 01",
    title: ["STOMACH", "ACID"],
    subtitle:
      "Your stomach acid is so strong that it can dissolve stainless steel razor blades within a few hours!",
    accent: "#39FF14",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "ATOMIC SCALE 02",
    title: ["EMPTY", "MATTER"],
    subtitle:
      "Everything is 99.999% empty space. If you removed the empty space from atoms, the entire human race would fit in a sugar cube!",
    accent: "#00F0FF",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "CHEMISTRY 03",
    title: ["RADIOACTIVE", "FRUIT"],
    subtitle:
      "Bananas are slightly radioactive because they contain potassium-40. But don't worry, you'd need to eat 10 million at once to die!",
    accent: "#FFEA00",
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
    config: { damping: 12, stiffness: 120, mass: 0.5 },
  });
  const scale = interpolate(frame, [0, data.duration], [1.2, 1.28], CLAMP);
  const progress = ((globalStartFrame + frame) / useVideoConfig().durationInFrames) * 100;
  const sweep = (frame * 5) % 360;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#010B10", opacity: fade, overflow: "hidden" }}
    >
      <Backdrop
        image={data.image}
        scale={scale}
        filter="contrast(1.2) brightness(0.85) hue-rotate(-10deg)"
        overlays={[
          "repeating-linear-gradient(60deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(-60deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 40px)",
          "linear-gradient(180deg, rgba(0,15,20,0.6) 0%, rgba(0,0,0,0.1) 30%, rgba(0,25,20,0.6) 60%, rgba(0,10,15,0.95) 85%, rgba(0,0,0,1) 100%)",
        ]}
      />
      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="bubble"
        count={14}
        opacity={0.5}
        speed={1.8}
        glow={brand.color}
      />
      <ShineSweep accent={brand.color} />
      <Flash
        show={index !== 0}
        color="#FFFFFF"
        frames={8}
        peak={0.8}
        blend="difference"
      />
      <ProgressBar
        progress={progress}
        accent={brand.color}
        style={{ borderBottom: "2px solid #FFF" }}
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
            transform: `scale(${interpolate(enter, [0, 1], [0.8, 1])})`,
            transformOrigin: "left center",
            display: "inline-block",
            padding: "6px 18px",
            marginBottom: 20,
            backgroundColor: "#FFFFFF",
            color: "#000",
            fontFamily: font,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            borderLeft: `8px solid ${brand.color}`,
            boxShadow: "0 5px 15px rgba(0,0,0,0.6)",
            textTransform: "uppercase",
          }}
        >
          {data.eyebrow}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: font,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 0.98,
            textTransform: "uppercase",
            color: "#FFFFFF",
            textShadow: "0 0 20px rgba(0,0,0,1)",
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - i * 6,
              fps,
              config: { damping: 12, stiffness: 120, mass: 0.5 },
            });
            const last = i === data.title.length - 1;
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`,
                  transformOrigin: "left center",
                  filter: `blur(${interpolate(s, [0, 1], [20, 0])}px)`,
                  opacity: interpolate(s, [0, 1], [0, 1], CLAMP),
                  color: last ? brand.color : "#FFFFFF",
                  textShadow: last ? `0 0 25px ${brand.color}` : undefined,
                  marginBottom: 2,
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
            transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
            marginTop: 35,
            width: "100%",
            boxSizing: "border-box",
            padding: "24px 28px",
            backgroundColor: "rgba(0,15,20,0.5)",
            backdropFilter: "blur(15px)",
            borderTop: `2px solid ${brand.color}`,
            borderBottom: `2px solid ${brand.color}`,
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.05)",
          }}
        >
          <WordReveal
            text={data.subtitle}
            delay={12}
            stagger={2}
            style={{
              fontFamily: font,
              fontSize: 42,
              fontWeight: 500,
              lineHeight: 1.4,
              color: "#F0F8FF",
              letterSpacing: 0.4,
              textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
            }}
          />
        </div>

        {isLast && (
          <SubscribeCTA
            brandName={brand.name}
            lead="RESEARCH MORE:"
            accent="#000000"
            font={font}
            emoji={"\u{1F52C}"}
            style={{
              backgroundColor: brand.color,
              color: "#000",
              textShadow: "none",
              padding: "8px 16px",
              fontSize: 26,
            }}
          />
        )}
      </AbsoluteFill>

      <Brand
        name={brand.name}
        accent="#FFFFFF"
        font={font}
        mark={"\u269B\uFE0F"}
        markStyle={{
          fontSize: 36,
          transform: `rotate(${sweep}deg)`,
          textShadow: `0 0 15px ${brand.color}`,
        }}
        textStyle={{ fontWeight: 700 }}
      />
    </AbsoluteFill>
  );
};

export const ScienceFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/Science.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#010B10"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
