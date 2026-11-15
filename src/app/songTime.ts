import type { TempoSection } from "../editShared";

// 83.27 -> "1:23.2" (tenths neeche ki taraf round, taaki 59.96 kabhi "1:60.0" na bane)
export const fmtClock = (sec: number): string => {
  const tenths = Math.floor(Math.max(0, sec) * 10 + 1e-6);
  const m = Math.floor(tenths / 600);
  const rem = tenths - m * 600;
  return `${m}:${String(Math.floor(rem / 10)).padStart(2, "0")}.${rem % 10}`;
};

// Gaane ke is time pe kaunsa tempo section chal raha hai. `sections` startSec se sorted hone chahiye.
export const sectionAt = (
  sec: number,
  sections: TempoSection[],
  followMode: boolean,
): { index: number; label: string } => {
  if (sections.length === 0) return { index: -1, label: "" };
  let idx = -1;
  for (let i = 0; i < sections.length; i++) if (sections[i].startSec <= sec + 1e-6) idx = i;
  if (idx < 0) return { index: -1, label: "Base tempo" };
  const s = sections[idx];
  const beats = `cut every ${s.beatsPerCut} beat${s.beatsPerCut > 1 ? "s" : ""}`;
  return {
    index: idx,
    label: followMode ? `Section ${idx + 1}: ${beats}` : `Section ${idx + 1}: ${Math.round(s.bpm)} BPM, ${beats}`,
  };
};
