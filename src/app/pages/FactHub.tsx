import React, { useState } from "react";
import App from "../App";
import CustomFacts from "./CustomFacts";
import { InfoTip } from "../InfoTip";

type Mode = "shorts" | "custom";

// Fact Studio ke do modes. Dono ek baar khulne ke baad mounted rehte hain (data safe rehta hai).
export default function FactHub({ active = true }: { active?: boolean }) {
  const [mode, setMode] = useState<Mode>("shorts");
  const [visited, setVisited] = useState({ shorts: true, custom: false });

  const pick = (m: Mode) => {
    setMode(m);
    setVisited((v) => (v[m] ? v : { ...v, [m]: true }));
  };

  const tab = (m: Mode, label: string, sub: string) => (
    <button
      onClick={() => pick(m)}
      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
        mode === m ? "bg-[#39FF14] text-black" : "text-gray-300 hover:bg-white/10"
      }`}
    >
      {label} <span className={`font-normal text-xs ${mode === m ? "text-black/70" : "text-gray-500"}`}>{sub}</span>
    </button>
  );

  return (
    <div>
      <div className="h-10 flex items-center justify-center gap-2 border-b border-white/10 bg-black/40">
        {tab("shorts", "Shorts Fact", "3 scenes, 24s")}
        {tab("custom", "Custom Facts", "your own scenes")}
        <InfoTip title="Two modes" align="right">
          Shorts Fact is the quick one: 3 facts become a finished 24 second Short. Custom Facts gives you full control:
          up to 12 scenes, your own scene lengths (up to 90 seconds in total) and several images per scene.
        </InfoTip>
      </div>

      <div style={{ display: mode === "shorts" ? "block" : "none" }}>
        <App active={active && mode === "shorts"} />
      </div>
      {visited.custom && (
        <div style={{ display: mode === "custom" ? "block" : "none" }}>
          <CustomFacts active={active && mode === "custom"} />
        </div>
      )}
    </div>
  );
}
