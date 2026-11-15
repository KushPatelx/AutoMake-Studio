import React from "react";
import { Composition } from "remotion";
import { TigerFacts } from "./TigerFacts";
import { GeographyFacts } from "./GeographyFacts";
import { SpaceFacts } from "./SpaceFacts";
import { TechnologyFacts } from "./TechnologyFacts";
import { PsychologyFacts } from "./PsychologyFacts";
import { HistoryFacts } from "./HistoryFacts";
import { ScienceFacts } from "./ScienceFacts";
import { customTemplates } from "./CustomTemplates/registry";
import { editTemplates } from "./editTemplates";
import { customTemplates as customEditTemplates } from "./CustomEditTemplates/registry";

const VIDEO = {
  durationInFrames: 720,
  fps: 30,
  width: 1080,
  height: 1920,
} as const;

const BUILT_IN: { id: string; component: React.ComponentType<any> }[] = [
  { id: "MrCurious-Nature", component: TigerFacts },
  { id: "MrCurious-Geography", component: GeographyFacts },
  { id: "MrCurious-Space", component: SpaceFacts },
  { id: "MrCurious-Technology", component: TechnologyFacts },
  { id: "MrCurious-Psychology", component: PsychologyFacts },
  { id: "MrCurious-History", component: HistoryFacts },
  { id: "MrCurious-Science", component: ScienceFacts },
];

// Custom Facts mode ki length dynamic hoti hai (scenes ka jod), isliye alag "Flex-" compositions.
// Shorts Fact mode (MrCurious-...) bilkul pehle jaisa fixed 720 frames pe rehta hai.
const flexMetadata = ({ props }: any) => ({
  durationInFrames: Math.max(
    90,
    Math.min(2700, Math.round(Number(props?.durationInFrames) || 720)),
  ),
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {BUILT_IN.map((t) => (
        <Composition
          key={t.id}
          id={t.id}
          component={t.component as any}
          {...VIDEO}
        />
      ))}

      {/* Custom templates: server/server.mjs registry.ts khud update karta hai.
          id hamesha "Custom-<Name>" hoti hai, jo UI ke dropdown se match karti hai. */}
      {customTemplates.map((t) => (
        <Composition
          key={`Custom-${t.name}`}
          id={`Custom-${t.name}`}
          component={t.component as any}
          {...VIDEO}
        />
      ))}

      {/* Custom Facts mode: wahi fact templates, par length props se */}
      {BUILT_IN.map((t) => (
        <Composition
          key={`Flex-${t.id}`}
          id={`Flex-${t.id}`}
          component={t.component as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={720}
          calculateMetadata={flexMetadata}
        />
      ))}
      {customTemplates.map((t) => (
        <Composition
          key={`Flex-Custom-${t.name}`}
          id={`Flex-Custom-${t.name}`}
          component={t.component as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={720}
          calculateMetadata={flexMetadata}
        />
      ))}

      {/* Edit mode templates: length dynamic hai (calculateMetadata inputProps.durationInFrames se leta hai) */}
      {editTemplates.map((t) => (
        <Composition
          key={`Edit-${t.id}`}
          id={`Edit-${t.id}`}
          component={t.component as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={300}
          defaultProps={{ images: [], segments: [], audio: "none", bpm: 128 } as any}
          calculateMetadata={({ props }: any) => ({
            durationInFrames: Math.max(
              30,
              Math.min(1800, Math.round(Number(props?.durationInFrames) || 300)),
            ),
          })}
        />
      ))}

      {/* Custom edit templates (Edit Studio ke "Add custom template" se aate hain) */}
      {customEditTemplates.map((t) => (
        <Composition
          key={`EditCustom-${t.name}`}
          id={`EditCustom-${t.name}`}
          component={t.component as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={300}
          defaultProps={{ images: [], segments: [], audio: "none", bpm: 128 } as any}
          calculateMetadata={({ props }: any) => ({
            durationInFrames: Math.max(
              30,
              Math.min(1800, Math.round(Number(props?.durationInFrames) || 300)),
            ),
          })}
        />
      ))}
    </>
  );
};
