import React from "react";
import { AbsoluteFill, Img, interpolate, random, useCurrentFrame } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { CLAMP, ProgressBar, SAFE } from "../shared";
import { EditProps, EditSceneProps, EditVideo, beatPulseAt } from "../editShared";

const { fontFamily: playfair } = loadPlayfair("normal", { weights: ["600"], subsets: ["latin"] });
const BRAND_FONT = `${playfair}, Georgia, serif`;

export const CINEMATIC_OVERLAP = 8;

const Scene: React.FC<EditSceneProps> = ({ src, seg, index, totalFrames, beatFrames, brand }) => {
  const frame = useCurrentFrame();
  const g = seg.start + frame;
  const color = brand.color;
  const pulse = beatPulseAt(g, beatFrames, 4);

  // crossfade in (pichla cut neeche chalta rehta hai)
  const fadeIn = index === 0 ? 1 : interpolate(frame, [0, CINEMATIC_OVERLAP], [0, 1], CLAMP);

  // slow Ken Burns, har cut ki alag direction
  const span = seg.duration + CINEMATIC_OVERLAP;
  const variant = index % 4;
  const zoomFrom = variant % 2 === 0 ? 1.05 : 1.2;
  const zoomTo = variant % 2 === 0 ? 1.2 : 1.05;
  const scale = interpolate(frame, [0, span], [zoomFrom, zoomTo], CLAMP) + pulse * 0.012;
  const origins = ["50% 45%", "30% 40%", "70% 40%", "50% 60%"];
  const panX = interpolate(frame, [0, span], [variant < 2 ? -25 : 25, variant < 2 ? 25 : -25], CLAMP);

  const softFlash = interpolate(frame, [0, 10], [index === 0 ? 0 : 0.3, 0], CLAMP);
  const leakX = Math.sin(g / 70) * 160;

  return (
    <AbsoluteFill style={{ opacity: fadeIn, overflow: "hidden", backgroundColor: "#050403" }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: origins[variant],
          transform: `translateX(${panX}px) scale(${scale})`,
          filter: "contrast(1.08) saturate(1.1) brightness(0.95)",
        }}
      />

      {/* teal-orange grade + vignette */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,40,70,0.28) 0%, transparent 40%, rgba(255,120,40,0.16) 100%), radial-gradient(circle, transparent 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* light leak */}
      <div
        style={{
          position: "absolute",
          left: 300 + leakX,
          top: -300,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}88 0%, ${color}00 65%)`,
          mixBlendMode: "screen",
          opacity: 0.22 + pulse * 0.18,
        }}
      />

      {/* dust */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const sp = 0.5 + random(`ds${i}`) * 0.9;
          const y = 1990 - ((g * sp + random(`do${i}`) * 2200) % 2200);
          const x = random(`dx${i}`) * 1080 + Math.sin((g + i * 23) / 50) * 30;
          const s = 6 + random(`dz${i}`) * 14;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: s,
                height: s,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,230,170,0.9) 0%, rgba(255,230,170,0) 70%)",
                opacity: 0.45,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* letterbox */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 110, backgroundColor: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110, backgroundColor: "#000" }} />

      <AbsoluteFill style={{ backgroundColor: "#FFF4DC", opacity: softFlash, mixBlendMode: "screen" }} />

      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 150,
          fontFamily: BRAND_FONT,
          fontSize: 34,
          letterSpacing: 6,
          color: "#FFF6E6",
          textShadow: "0 2px 10px rgba(0,0,0,0.8)",
        }}
      >
        {brand.name}
      </div>

      <ProgressBar progress={(g / totalFrames) * 100} accent={color} height={3} style={{ zIndex: 50, top: 110 }} />
    </AbsoluteFill>
  );
};

export const CinematicZoom: React.FC<EditProps> = (props) => (
  <EditVideo {...props} bg="#050403" overlap={CINEMATIC_OVERLAP} Scene={Scene} />
);
