import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame } from "remotion";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { CLAMP, ProgressBar, SAFE } from "../shared";
import { EditProps, EditSceneProps, EditVideo, beatPulseAt } from "../editShared";

const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const BRAND_FONT = `${bebas}, Impact, 'Arial Black', sans-serif`;

const W = 1080;
export const WHIP_FRAMES = 6; // whip transition kitne frames ka hai (overlap bhi yahi)

const Scene: React.FC<EditSceneProps> = ({ src, seg, index, total, totalFrames, beatFrames, brand }) => {
  const frame = useCurrentFrame();
  const g = seg.start + frame;
  const color = brand.color;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const pulse = beatPulseAt(g, beatFrames, 3);

  // x position: pichla cut left jata hai jab ye right se aata hai (dono ek hi 6 frames me)
  const E = Math.max(2, Math.min(WHIP_FRAMES, Math.floor(seg.duration / 2)));
  const xAt = (f: number) => {
    const inX = isFirst ? 0 : interpolate(f, [0, E], [W, 0], { easing: Easing.out(Easing.cubic), ...CLAMP });
    const outX = isLast ? 0 : interpolate(f, [seg.duration, seg.duration + WHIP_FRAMES], [0, -W], { easing: Easing.in(Easing.cubic), ...CLAMP });
    return inX + outX;
  };
  const x = xAt(frame);
  const v = xAt(frame + 1) - x; // pixels per frame (aage ki taraf ka farak, pehle frame pe bhi trail dikhe)
  const speed = Math.min(1, Math.abs(v) / 260);

  const zoom = interpolate(frame, [0, seg.duration], [1.08, 1.2], CLAMP) + pulse * 0.025;
  const dir = index % 2 === 0 ? 1 : -1;
  const imgStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${zoom}) rotate(${dir * (1 - speed) * 0.8}deg)`,
    filter: "contrast(1.1) saturate(1.25)",
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${x}px)` }}>
        {/* motion trail: 2 halki copies peeche, sirf tez motion me */}
        {speed > 0.12 && (
          <>
            <AbsoluteFill style={{ transform: `translateX(${-v * 1.6}px)`, opacity: 0.32 * speed }}>
              <Img src={src} style={imgStyle} />
            </AbsoluteFill>
            <AbsoluteFill style={{ transform: `translateX(${-v * 3.2}px)`, opacity: 0.2 * speed }}>
              <Img src={src} style={imgStyle} />
            </AbsoluteFill>
          </>
        )}
        <AbsoluteFill>
          <Img src={src} style={imgStyle} />
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 24%, transparent 62%, rgba(0,0,0,0.55) 100%), radial-gradient(circle, transparent 55%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        <AbsoluteFill style={{ backgroundColor: color, opacity: 0.1 * pulse, mixBlendMode: "screen" }} />

        {/* speed lines */}
        {speed > 0.25 &&
          Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: random(`ly-${index}-${i}`) * 1900,
                height: 3 + random(`lh-${i}`) * 5,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,${0.7 * speed}), transparent)`,
              }}
            />
          ))}
      </AbsoluteFill>

      {/* peak whip pe halki white flash */}
      <AbsoluteFill style={{ backgroundColor: "#fff", opacity: 0.22 * speed, mixBlendMode: "overlay" }} />

      {/* HUD (image ke saath nahi hilta) */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 75,
          fontFamily: BRAND_FONT,
          fontSize: 54,
          letterSpacing: 4,
          color: "#fff",
          textShadow: `0 0 18px ${color}, 3px 3px 0 rgba(0,0,0,0.75)`,
        }}
      >
        {brand.name}
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 140,
          fontFamily: BRAND_FONT,
          fontSize: 34,
          letterSpacing: 3,
          color,
          textShadow: "2px 2px 0 rgba(0,0,0,0.75)",
        }}
      >
        {`${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
      </div>

      <ProgressBar progress={(g / totalFrames) * 100} accent={color} height={5} style={{ zIndex: 50 }} />
    </AbsoluteFill>
  );
};

export const WhipPan: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#000" overlap={WHIP_FRAMES} Scene={Scene} />
);
