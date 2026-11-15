import React from "react";
import { AbsoluteFill, Img, interpolate, random, useCurrentFrame } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadMono } from "@remotion/google-fonts/ShareTechMono";
import { CLAMP, ProgressBar, SAFE } from "../shared";
import { EditProps, EditSceneProps, EditVideo, beatPulseAt } from "../editShared";

const { fontFamily: anton } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["400"], subsets: ["latin"] });
const BRAND_FONT = `${anton}, Impact, 'Arial Black', sans-serif`;
const MONO_FONT = `${mono}, 'Courier New', monospace`;

const pad = (n: number) => String(n).padStart(2, "0");

const Scene: React.FC<EditSceneProps> = ({ src, seg, index, total, totalFrames, beatFrames, brand }) => {
  const frame = useCurrentFrame();
  const g = seg.start + frame;
  const color = brand.color;
  const pulse = beatPulseAt(g, beatFrames);

  // cut pe punch zoom + halka drift
  const dir = index % 2 === 0 ? 1 : -1;
  const punch = interpolate(frame, [0, 7], [0.24, 0], CLAMP);
  const drift = interpolate(frame, [0, seg.duration], [1.06, 1.15], CLAMP);
  const scale = drift + punch + pulse * 0.03;
  const rot = dir * interpolate(frame, [0, seg.duration], [-1.2, 1.2], CLAMP);

  // camera shake (cut pe zyada, beat pe halka)
  const amp = 22 * Math.exp(-frame / 4) + 2.5 * pulse;
  const sx = (random(`sx-${g}`) - 0.5) * 2 * amp;
  const sy = (random(`sy-${g}`) - 0.5) * 2 * amp;

  const glitch = frame < 6 && index !== 0;
  const invert = index % 4 === 3 && frame < 2;
  const cutFlash = interpolate(frame, [0, 5], [index === 0 ? 0.4 : 0.85, 0], CLAMP);
  const split = glitch ? 10 + random(`sp-${g}`) * 16 : 0;

  const sec = Math.floor(g / 30);
  const ff = g % 30;
  const rec = Math.floor(g / 15) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) rotate(${rot}deg)`,
            filter: `contrast(1.2) saturate(1.3)${invert ? " invert(1)" : ""}`,
          }}
        />
      </AbsoluteFill>

      {/* grade + vignette + scanlines */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.55) 100%), radial-gradient(circle, transparent 55%, rgba(0,0,0,0.6) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.25,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* RGB split on cut */}
      {glitch && (
        <>
          <AbsoluteFill
            style={{ backgroundColor: "rgba(255,0,60,0.35)", mixBlendMode: "screen", transform: `translateX(${-split}px)` }}
          />
          <AbsoluteFill
            style={{ backgroundColor: "rgba(0,255,255,0.35)", mixBlendMode: "screen", transform: `translateX(${split}px)` }}
          />
        </>
      )}

      {/* brand tint pulse on beat + white flash on cut */}
      <AbsoluteFill style={{ backgroundColor: color, opacity: 0.1 * pulse, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: cutFlash }} />

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 75,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#FF2A2A",
            opacity: rec ? 1 : 0.15,
            boxShadow: "0 0 12px #FF2A2A",
          }}
        />
        <div
          style={{
            fontFamily: BRAND_FONT,
            fontSize: 42,
            letterSpacing: 3,
            color: "#fff",
            textShadow: `0 0 18px ${color}, 3px 3px 0 rgba(0,0,0,0.8)`,
          }}
        >
          {brand.name}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 140,
          fontFamily: MONO_FONT,
          fontSize: 24,
          letterSpacing: 2,
          color: "#fff",
          textShadow: "0 0 8px rgba(0,0,0,0.9)",
          lineHeight: 1.5,
        }}
      >
        <div>{`00:${pad(sec)}:${pad(ff)}`}</div>
        <div style={{ color }}>{`CUT ${pad(index + 1)}/${pad(total)}`}</div>
      </div>

      <ProgressBar progress={(g / totalFrames) * 100} accent={color} height={5} style={{ zIndex: 50 }} />
    </AbsoluteFill>
  );
};

export const PhonkGlitch: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#000" Scene={Scene} />
);
