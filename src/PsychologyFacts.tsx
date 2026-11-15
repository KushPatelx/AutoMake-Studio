import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
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

const { fontFamily: montserrat } = loadMontserrat("normal", {
  weights: ["400", "600", "800", "900"],
  subsets: ["latin"],
});
const font = `${montserrat}, 'Helvetica Neue', Arial, sans-serif`;

const EMOJIS = [
  "\u{1F9E0}",
  "\u{1F441}\uFE0F",
  "\u{1F300}",
  "\u{1F9E9}",
  "\u{1F3AD}",
  "\u{1F4AD}",
  "\u{1F52E}",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "MIND TRICK // 01",
    title: ["THE TETRIS", "EFFECT"],
    subtitle:
      "If you play a game like Tetris for hours, your brain will literally rewire itself to see falling shapes in your sleep.",
    accent: "#B026FF",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "NEURO FACT // 02",
    title: ["FALSE", "MEMORIES"],
    subtitle:
      "Your brain can easily be tricked into creating highly detailed memories of events that never actually happened to you.",
    accent: "#FF007F",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "SUBCONSCIOUS // 03",
    title: ["MIRROR", "NEURONS"],
    subtitle:
      "Yawning is contagious because of 'mirror neurons' in your brain that force you to empathize with others unconsciously.",
    accent: "#7000FF",
    duration: 300,
  },
];

const Rings: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ zIndex: 1 }}>
      {[0, 1, 2, 3].map((i) => {
        const t = (frame / 90 + i / 4) % 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: 520,
              width: 900,
              height: 900,
              marginLeft: -450,
              borderRadius: "50%",
              border: `3px solid ${accent}`,
              opacity: (1 - t) * 0.4,
              transform: `scale(${0.2 + t * 1.2})`,
              boxShadow: `0 0 30px ${accent}66`,
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
  brand, // 🚀 BAKI SAB SAME RAHEGA, BAS YE ADD KARDO
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useSceneFade(data.duration, isLast, 15);
  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 80, mass: 1.5 },
  });
  const scale = 1.15 + Math.sin(frame / 60) * 0.05;
  const g = globalStartFrame + frame;
  const progress = (g / useVideoConfig().durationInFrames) * 100;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#0A0010", opacity: fade, overflow: "hidden" }}
    >
      <Backdrop
        image={data.image}
        scale={scale}
        filter="contrast(1.1) saturate(1.2)"
        overlays={[
          "linear-gradient(180deg, rgba(15,0,30,0.65) 0%, rgba(0,0,0,0.2) 30%, rgba(10,0,20,0.6) 60%, rgba(5,0,15,0.95) 85%, rgba(0,0,0,1) 100%)",
        ]}
      />
      <Rings accent={brand.color} />
      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="sway"
        count={12}
        opacity={0.35}
        speed={0.9}
        blur={1.5}
        glow="rgba(255,0,127,0.4)"
      />
      <ShineSweep accent={brand.color} />
      <Flash show={index !== 0} color={brand.color} frames={15} peak={0.85} />
      <ProgressBar
        progress={progress}
        accent={brand.color}
        height={3}
        style={{ boxShadow: `0 0 20px 2px ${brand.color}` }}
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
            transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
            display: "inline-block",
            padding: "8px 24px",
            marginBottom: 24,
            color: "#FFFFFF",
            fontFamily: font,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 4,
            borderRadius: 50,
            border: `2px solid ${brand.color}`,
            boxShadow: `0 0 25px ${brand.color}60`,
            textTransform: "uppercase",
          }}
        >
          {data.eyebrow}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: font,
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1,
            textTransform: "uppercase",
            color: "#FFFFFF",
            textShadow: "0 10px 30px rgba(0,0,0,0.9)",
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - i * 10,
              fps,
              config: { damping: 14, stiffness: 60, mass: 1 },
            });
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`,
                  transformOrigin: "left center",
                  filter: `blur(${interpolate(s, [0, 1], [30, 0])}px)`,
                  opacity: interpolate(s, [0, 0.5, 1], [0, 1, 1], CLAMP),
                  color: i === data.title.length - 1 ? brand.color : "#FFFFFF",
                  textShadow:
                    i === data.title.length - 1
                      ? `0 0 30px ${brand.color}`
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
            transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
            marginTop: 40,
            width: "100%",
            boxSizing: "border-box",
            padding: "26px 30px",
            backgroundColor: "rgba(20,5,30,0.35)",
            backdropFilter: "blur(25px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderLeft: `4px solid ${brand.color}`,
            borderRadius: 20,
            boxShadow: `0 15px 40px rgba(0,0,0,0.8), inset 0 0 30px ${brand.color}15`,
          }}
        >
          <WordReveal
            text={data.subtitle}
            delay={16}
            stagger={3}
            style={{
              fontFamily: font,
              fontSize: 38,
              fontWeight: 400,
              lineHeight: 1.5,
              color: "#F4F0FF",
              letterSpacing: 0.3,
              textShadow: "0px 2px 4px rgba(0,0,0,1)",
            }}
          />
        </div>

        {isLast && (
          <SubscribeCTA
            brandName={brand.name}
            lead="UNLOCK"
            accent={brand.color}
            font="sans-serif" /* 🚀 YE LINE CHANGE KI HAI */
            emoji="🧠"
            style={{ fontSize: 32, fontWeight: 800 }}
          />
        )}
      </AbsoluteFill>

      <Brand
        name={brand.name}
        accent={brand.color}
        font={font}
        mark="?"
        markStyle={{ transform: `scale(${1 + Math.sin(g / 12) * 0.2})` }}
        textStyle={{ fontWeight: 800, letterSpacing: 4 }}
      />
    </AbsoluteFill>
  );
};

export const PsychologyFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/Psychology.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#0A0010"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
