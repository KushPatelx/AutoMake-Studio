import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
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

const { fontFamily: cinzel } = loadCinzel("normal", {
  weights: ["700"],
  subsets: ["latin"],
});
const { fontFamily: lora } = loadLora("italic", {
  weights: ["400"],
  subsets: ["latin"],
});
const titleFont = `${cinzel}, Georgia, serif`;
const bodyFont = `${lora}, Georgia, serif`;

const EMOJIS = [
  "\u{1F3DB}\uFE0F",
  "\u{1F3FA}",
  "\u{1F4DC}",
  "\u2694\uFE0F",
  "\u{1F451}",
  "\u{1F3F0}",
];

const defaultScenes: SceneData[] = [
  {
    image: "assets/images/1.jpg",
    eyebrow: "ANCIENT ERA 01",
    title: ["TIME", "DISTORTION"],
    subtitle:
      "Cleopatra actually lived closer in time to the invention of the iPhone than to the building of the Great Pyramid!",
    accent: "#FFD700",
    duration: 210,
  },
  {
    image: "assets/images/2.jpg",
    eyebrow: "EMPIRE FACT 02",
    title: ["NAVAL", "GLADIATORS"],
    subtitle:
      "The ancient Romans used to completely flood the Colosseum with water to stage massive, real-life naval battles.",
    accent: "#E5823B",
    duration: 210,
  },
  {
    image: "assets/images/3.jpg",
    eyebrow: "LOST SECRETS 03",
    title: ["THE STICKY", "WALL"],
    subtitle:
      "The mortar used to bind the stones of the Great Wall of China was made from a mixture of slaked lime and sticky rice!",
    accent: "#CBA135",
    duration: 300,
  },
];

const Embers: React.FC<{ duration: number; accent: string }> = ({
  duration,
  accent,
}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [duration - 15, duration], [1, 0], CLAMP);
  return (
    <AbsoluteFill style={{ overflow: "hidden", zIndex: 2 }}>
      {Array.from({ length: 36 }).map((_, i) => {
        const speed = 1.5 + (i % 4) * 0.5;
        const y = 1920 - ((frame * speed + random(`o${i}`) * 2100) % 2100);
        const x = random(`x${i}`) * 1080 + Math.sin((frame + i * 25) / 15) * 20;
        const flicker = Math.sin((frame + i * 10) / 3) * 0.3 + 0.5;
        const big = i % 3 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: big ? 7 : 3,
              height: big ? 7 : 3,
              borderRadius: "50%",
              backgroundColor: accent,
              boxShadow: `0 0 10px ${accent}, 0 0 20px #FF4500`,
              opacity: flicker * fade * 0.7,
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
  const fade = useSceneFade(data.duration, isLast, 15);
  const enter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 60, mass: 2 },
  });
  const scale = interpolate(frame, [0, data.duration], [1.02, 1.15], CLAMP);
  const progress =
    ((globalStartFrame + frame) / useVideoConfig().durationInFrames) * 100;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "#0D0A08", opacity: fade, overflow: "hidden" }}
    >
      <Backdrop
        image={data.image}
        scale={scale}
        origin={index % 2 === 0 ? "top right" : "bottom left"}
        filter="sepia(0.3) contrast(1.1) brightness(0.9)"
        overlays={[
          "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.7) 100%)",
          "linear-gradient(180deg, rgba(20,10,0,0.7) 0%, rgba(0,0,0,0.1) 30%, rgba(10,5,0,0.5) 50%, rgba(0,0,0,0.95) 85%, rgba(0,0,0,1) 100%)",
        ]}
      />
      <Embers duration={data.duration} accent={brand.color} />
      <FloatingEmojis
        emojis={EMOJIS}
        duration={data.duration}
        mode="rise"
        count={8}
        opacity={0.28}
        speed={1.2}
        blur={1}
      />
      <ShineSweep accent={brand.color} />
      <Flash
        show={index !== 0}
        color="#FFAA00"
        frames={15}
        peak={0.6}
        blend="soft-light"
      />
      <ProgressBar progress={progress} accent={brand.color} height={5} />

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
            transform: `translateY(${interpolate(enter, [0, 1], [15, 0])}px)`,
            display: "inline-block",
            padding: "8px 0px",
            marginBottom: 20,
            color: brand.color,
            fontFamily: titleFont,
            fontSize: 22,
            letterSpacing: 5,
            borderTop: `1px solid ${brand.color}`,
            borderBottom: `1px solid ${brand.color}`,
            textTransform: "uppercase",
            textShadow: "0 2px 10px rgba(0,0,0,1)",
          }}
        >
          {data.eyebrow}
        </div>

        <div
          style={{
            width: "100%",
            fontFamily: titleFont,
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#FDF5E6",
            textShadow: "0 8px 20px rgba(0,0,0,0.9), 0 2px 5px rgba(0,0,0,1)",
          }}
        >
          {data.title.map((line, i) => {
            const s = spring({
              frame: frame - i * 12,
              fps,
              config: { damping: 20, stiffness: 40, mass: 2 },
            });
            const last = i === data.title.length - 1;
            return (
              <div
                key={`${index}-${i}`}
                style={{
                  transform: `scale(${interpolate(s, [0, 1], [1.1, 1])})`,
                  transformOrigin: "left center",
                  opacity: interpolate(s, [0, 1], [0, 1], CLAMP),
                  color: last ? brand.color : "#FDF5E6",
                  textShadow: last
                    ? `0 0 28px ${brand.color}88, 0 4px 10px rgba(0,0,0,1)`
                    : undefined,
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
            marginTop: 40,
            width: "100%",
            boxSizing: "border-box",
            padding: "24px 0px 24px 25px",
            borderLeft: `3px solid ${brand.color}`,
          }}
        >
          <WordReveal
            text={"\u201C" + data.subtitle + "\u201D"}
            delay={18}
            stagger={3}
            style={{
              fontFamily: bodyFont,
              fontSize: 42,
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 1.45,
              color: "#E8DCC4",
              textShadow: "1px 2px 5px rgba(0,0,0,1)",
            }}
          />
        </div>

        {isLast && (
          <SubscribeCTA
            brandName={brand.name}
            lead="UNCOVER HISTORY WITH"
            accent={brand.color}
            font={titleFont}
            emoji={"\u{1F3DB}\uFE0F"}
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4 }}
          />
        )}
      </AbsoluteFill>

      <Brand
        name={brand.name}
        accent={brand.color}
        font={titleFont}
        mark="?"
        markStyle={{
          fontWeight: 700,
          transform: `rotate(${Math.sin(frame / 20) * 10}deg)`,
        }}
        textStyle={{ fontWeight: 700, letterSpacing: 4, color: "#FDF5E6" }}
      />
    </AbsoluteFill>
  );
};

export const HistoryFacts: React.FC<{
  scenes?: SceneData[];
  audio?: string;
  brand?: BrandConfig;
}> = ({
  scenes = defaultScenes,
  audio = "assets/audio/History.mp3",
  brand = { name: "MrCurious", color: "#39FF14" },
}) => (
  <FactsVideo
    audio={audio}
    bg="#0D0A08"
    scenes={scenes}
    brand={brand}
    Scene={Scene}
  />
);
