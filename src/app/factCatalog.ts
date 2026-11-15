/// <reference types="vite/client" />
import type { ComponentType } from "react";
import { TigerFacts } from "../TigerFacts";
import { GeographyFacts } from "../GeographyFacts";
import { PsychologyFacts } from "../PsychologyFacts";
import { ScienceFacts } from "../ScienceFacts";
import { HistoryFacts } from "../HistoryFacts";
import { SpaceFacts } from "../SpaceFacts";
import { TechnologyFacts } from "../TechnologyFacts";

// Fact templates ki list (Custom Facts studio ke liye). Fact Studio (3 scene) apni list alag rakhta hai.
export type FactTemplate = {
  id: string; // "MrCurious-Nature" ya "Custom-Name"
  name: string;
  comp?: ComponentType<any>;
  load?: () => Promise<any>;
};

const BUILT_IN: FactTemplate[] = [
  { id: "MrCurious-Nature", name: "Nature", comp: TigerFacts },
  { id: "MrCurious-Geography", name: "Geography", comp: GeographyFacts },
  { id: "MrCurious-Psychology", name: "Psychology", comp: PsychologyFacts },
  { id: "MrCurious-Science", name: "Science", comp: ScienceFacts },
  { id: "MrCurious-History", name: "History", comp: HistoryFacts },
  { id: "MrCurious-Space", name: "Space", comp: SpaceFacts },
  { id: "MrCurious-Technology", name: "Technology", comp: TechnologyFacts },
];

const customLoaders = import.meta.glob("../CustomTemplates/*.tsx") as Record<string, () => Promise<any>>;

const CUSTOM: FactTemplate[] = Object.keys(customLoaders).map((path) => {
  const name = path.split("/").pop()?.replace(".tsx", "") || "Custom";
  return { id: `Custom-${name}`, name: `\u2B50 Custom: ${name}`, load: customLoaders[path] };
});

export const FACT_TEMPLATES: FactTemplate[] = [...BUILT_IN, ...CUSTOM];

export const AUDIO_OPTIONS = [
  { name: "Nature.mp3", val: "assets/audio/Nature.mp3" },
  { name: "Geography.mp3", val: "assets/audio/Geography.mp3" },
  { name: "Psychology.mp3", val: "assets/audio/Psychology.mp3" },
  { name: "Science.mp3", val: "assets/audio/Science.mp3" },
  { name: "History.mp3", val: "assets/audio/History.mp3" },
  { name: "Space.mp3", val: "assets/audio/Space.mp3" },
  { name: "Technology.mp3", val: "assets/audio/Technology.mp3" },
  { name: "No audio", val: "none" },
  { name: "Upload custom audio...", val: "custom" },
];
