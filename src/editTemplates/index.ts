import type { ComponentType } from "react";
import { PhonkGlitch } from "./PhonkGlitch";
import { CinematicZoom } from "./CinematicZoom";
import { PolaroidStack } from "./PolaroidStack";
import { WhipPan } from "./WhipPan";

export type EditTemplateInfo = {
  id: string; // composition id = "Edit-<id>"
  name: string;
  description: string;
  tags: string[];
  component: ComponentType<any>;
};

export const editTemplates: EditTemplateInfo[] = [
  {
    id: "PhonkGlitch",
    name: "Phonk Glitch",
    description: "Hard cuts, punch zoom, RGB split, white flash on every cut and beat tint. Pure phonk energy.",
    tags: ["Fast cuts", "Glitch", "Flash"],
    component: PhonkGlitch,
  },
  {
    id: "CinematicZoom",
    name: "Cinematic Zoom",
    description: "Smooth crossfades, slow Ken Burns zoom, teal-orange grade, light leaks and letterbox bars.",
    tags: ["Smooth", "Cinematic", "Calm"],
    component: CinematicZoom,
  },
  {
    id: "PolaroidStack",
    name: "Polaroid Stack",
    description: "Photos drop onto a table as polaroids and pile up, tilted and bouncing on the beat. Warm and playful.",
    tags: ["Playful", "Photo pile", "Warm"],
    component: PolaroidStack,
  },
  {
    id: "WhipPan",
    name: "Whip Pan",
    description: "Fast sideways whip transitions with motion trails and speed lines, snapping to every beat.",
    tags: ["Fast", "Whip", "Energetic"],
    component: WhipPan,
  },
];
