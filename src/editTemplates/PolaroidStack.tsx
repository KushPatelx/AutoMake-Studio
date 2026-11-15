import React from "react";
import { AbsoluteFill, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { CLAMP, ProgressBar } from "../shared";
import { EditProps, EditSceneProps, EditVideo, beatPulseAt } from "../editShared";

const { fontFamily: caveat } = loadCaveat("normal", { weights: ["700"], subsets: ["latin"] });
const HAND_FONT = `${caveat}, 'Comic Sans MS', cursive`;

// Har polaroid itne extra frames screen pe rehta hai, taaki naye cards uske upar girke "pile" bane
export const POLAROID_OVERLAP = 72;

const Scene: React.FC<EditSceneProps> = ({ src, seg, index, total, totalFrames, beatFrames, brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = seg.start + frame;
  const isLast = index === total - 1;
  const span = seg.duration + (isLast ? 0 : POLAROID_OVERLAP);
  const pulse = beatPulseAt(g, beatFrames, 3);

  // card ka random (par har render me same) tilt aur position
  const tilt = (random(`tilt-${index}`) - 0.5) * 14;
  const dx = (random(`dx-${index}`) - 0.5) * 90;
  const dy = (random(`dy-${index}`) - 0.5) * 110;
  const side = random(`side-${index}`) > 0.5 ? 1 : -1;

  // upar se girta hai aur "thak" se baith jata hai
  const s = spring({ frame, fps, config: { damping: 11, stiffness: 170, mass: 0.7 } });
  const drop = 1 - s;
  const rot = tilt + drop * 20 * side;
  const lift = drop * -560;
  const scale = 1 + drop * 0.38 + pulse * 0.018;

  // jab naya card aa jata hai to ye thoda dhundhla hota jata hai, aur aakhir me gayab
  const aged = isLast ? 0 : interpolate(frame, [seg.duration, span], [0, 1], CLAMP);
  const fadeOut = isLast ? 1 : interpolate(frame, [span - 8, span], [1, 0], CLAMP);
  const landFlash = interpolate(frame, [4, 9], [0.0, 0], CLAMP);

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <div
        style={{
          position: "absolute",
          left: 540 - 410 + dx,
          top: 860 - 500 + dy,
          width: 820,
          height: 1000,
          transform: `translateY(${lift}px) rotate(${rot}deg) scale(${scale})`,
          filter: `brightness(${1 - aged * 0.35})`,
          backgroundColor: "#FBF7EF",
          borderRadius: 6,
          boxShadow: `0 ${24 + drop * 70}px ${46 + drop * 40}px rgba(0,0,0,${0.55 - drop * 0.25})`,
        }}
      >
        {/* tape */}
        <div
          style={{
            position: "absolute",
            top: -26,
            left: 315,
            width: 190,
            height: 54,
            backgroundColor: "rgba(255,238,170,0.8)",
            transform: `rotate(${-3 + tilt * 0.3}deg)`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        />
        {/* photo */}
        <div style={{ position: "absolute", left: 36, top: 36, width: 748, height: 800, overflow: "hidden", backgroundColor: "#222" }}>
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <AbsoluteFill
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 30%, rgba(0,0,0,0.15) 100%)",
            }}
          />
          <AbsoluteFill style={{ backgroundColor: "#fff", opacity: landFlash }} />
        </div>
        {/* caption */}
        <div
          style={{
            position: "absolute",
            left: 48,
            right: 48,
            bottom: 26,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: HAND_FONT,
            color: "#3A2F25",
          }}
        >
          <span style={{ fontSize: 58 }}>{brand.name}</span>
          <span style={{ fontSize: 48, color: brand.color }}>{`#${String(index + 1).padStart(2, "0")}`}</span>
        </div>
      </div>

      <ProgressBar progress={(g / totalFrames) * 100} accent={brand.color} height={5} style={{ zIndex: 50 }} />
    </AbsoluteFill>
  );
};

const BG =
  "radial-gradient(ellipse at 50% 32%, #4a392b 0%, #241a13 55%, #120d09 100%)";

export const PolaroidStack: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg={BG} overlap={POLAROID_OVERLAP} Scene={Scene} />
);
