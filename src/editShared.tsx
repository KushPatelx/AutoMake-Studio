import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import { BrandConfig, CLAMP, DEFAULT_BRAND } from "./shared";

// ------------------------------------------------------------------ EDIT MODE CONTRACT
// Fact mode ko 3 scenes milte hain. Edit mode ko milta hai: images ki list, cuts (segments),
// music, BPM aur brand. Template khud decide karta hai ki cut pe kya hoga.
export const EDIT_FPS = 30;
export const MAX_EDIT_SECONDS = 60;
export const MAX_EDIT_IMAGES = 30;

export type EditSegment = {
  imageIndex: number; // images[] me index
  start: number; // frame jahan ye cut shuru hota hai
  duration: number; // frames
};

export type EditProps = {
  images?: string[];
  segments?: EditSegment[];
  audio?: string; // "none" ya path / blob url
  audioStartSec?: number; // gaane me kahan se shuru karna hai
  bpm?: number; // base tempo (purane templates iska use karte hain)
  beatFrames?: number[]; // har beat ka frame number (tempo sections ke saath bhi sahi). Naye templates iska use karein.
  brand?: BrandConfig;
  durationInFrames?: number; // sirf Root ke calculateMetadata ke liye
};

export type EditSceneProps = {
  src: string; // resolved image url (staticFile ya blob)
  seg: EditSegment;
  index: number; // cut number (0 se)
  total: number; // total cuts
  totalFrames: number; // poore video ke frames
  bpm: number;
  beatFrames: number[]; // har beat ka frame number: beatPulseAt(g, beatFrames) use karo
  brand: BrandConfig;
};

export const resolveSrc = (s: string) =>
  /^(blob:|http|data:)/.test(s) ? s : staticFile(s);

// Beat pulse: har beat pe 1 se 0 tak girta hai. g = poore video ka frame (audio start = beat 0)
export const beatPulse = (g: number, bpm: number, power = 3, fps = EDIT_FPS) => {
  const beat = (fps * 60) / Math.max(1, bpm);
  return Math.pow(1 - (g % beat) / beat, power);
};

// Tempo sections ke saath bhi sahi: beatFrames = video ke har beat ka frame. 1 beat pe, phir 0 tak girta hai.
export const beatPulseAt = (g: number, beatFrames: number[], power = 3) => {
  const n = beatFrames.length;
  if (n === 0) return 0;
  let lo = 0;
  let hi = n - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beatFrames[mid] <= g) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  let last: number;
  let next: number;
  if (idx === -1) {
    next = beatFrames[0];
    last = next - (n > 1 ? beatFrames[1] - beatFrames[0] : 15);
  } else {
    last = beatFrames[idx];
    next = idx + 1 < n ? beatFrames[idx + 1] : last + (n > 1 ? beatFrames[idx] - beatFrames[idx - 1] : 15);
  }
  const span = Math.max(1, next - last);
  return Math.pow(Math.max(0, 1 - (g - last) / span), power);
};

// Sections na hon ya template ko beatFrames na mile to constant BPM se banao
export const constantBeatFrames = (bpm: number, durationInFrames: number, fps = EDIT_FPS): number[] => {
  const step = (fps * 60) / Math.min(300, Math.max(40, bpm || 120));
  const out: number[] = [];
  for (let t = 0; t < durationInFrames; t += step) out.push(Math.round(t));
  return out;
};

// ------------------------------------------------------------------ tempo sections
// Section gaane ke time (song seconds) me hota hai: "yaha se BPM aur cut speed badalti hai".
export type TempoSection = { id: string; startSec: number; bpm: number; beatsPerCut: number };
export const MAX_SECTIONS = 12;

export type TimelineResult = {
  segments: EditSegment[];
  durationInFrames: number;
  beatFrames: number[];
  cutSeconds: number;
};

const clampBpm = (b: number) => Math.min(300, Math.max(40, Number(b) || 120));

type Region = { start: number; end: number; bpm: number; n: number; anchor: number };

// Cuts beats pe girte hain. Har section ka apna beat grid hai (anchor = section ka start),
// aur section shuru hote hi ek cut zaroor lagta hai.
export const buildTimelineSections = (opts: {
  imageCount: number;
  baseBpm: number;
  baseBeatsPerCut: number;
  sections: TempoSection[];
  audioStartSec: number; // gaane ka wo point jahan se video shuru hota hai
  totalSeconds: number | null; // null = auto (ek image = ek cut)
  // Agar diya (gaane ke seconds me), to beats yahi hain (gaane ko follow karo): BPM ki jagah ye use hote hain.
  // Sections me tab sirf "cut every" kaam karta hai.
  trackedBeats?: number[];
  fps?: number;
}): TimelineResult => {
  const fps = opts.fps ?? EDIT_FPS;
  const maxSec = MAX_EDIT_SECONDS;
  const baseBeat = 60 / clampBpm(opts.baseBpm);
  const baseN = Math.max(1, Math.round(opts.baseBeatsPerCut) || 1);

  if (opts.imageCount <= 0) {
    return { segments: [], durationInFrames: 30, beatFrames: [], cutSeconds: baseBeat * baseN };
  }

  // song time -> video time, sorted, duplicates hatao
  const secs = opts.sections
    .map((s) => ({
      start: s.startSec - opts.audioStartSec,
      bpm: clampBpm(s.bpm),
      n: Math.max(1, Math.round(s.beatsPerCut) || 1),
    }))
    .sort((a, b) => a.start - b.start)
    .filter((s, i, arr) => i === 0 || Math.abs(s.start - arr[i - 1].start) > 1e-6);

  // jo section video shuru hone se pehle hi khatam ho gaya wo kaam ka nahi
  const relevant = secs.filter((s, i) => (i + 1 < secs.length ? secs[i + 1].start : Infinity) > 1e-6);

  const regions: Region[] = [];
  const firstStart = relevant.length ? relevant[0].start : Infinity;
  if (firstStart > 1e-6) {
    regions.push({ start: 0, end: Math.min(firstStart, maxSec), bpm: 60 / baseBeat, n: baseN, anchor: 0 });
  }
  relevant.forEach((s, i) => {
    const end = i + 1 < relevant.length ? relevant[i + 1].start : maxSec;
    regions.push({ start: Math.max(0, s.start), end: Math.min(end, maxSec), bpm: s.bpm, n: s.n, anchor: s.start });
  });

  const boundaries: number[] = [];
  const beats: number[] = [];
  const tracked =
    opts.trackedBeats && opts.trackedBeats.length > 1
      ? opts.trackedBeats.map((t) => t - opts.audioStartSec).filter((t) => t >= -1e-9 && t < maxSec)
      : null;
  for (const r of regions) {
    if (r.end <= r.start + 1e-9) continue;
    if (tracked) {
      // gaane ke asli beats: region me jo beats aate hain unme se har n-wa cut banega
      boundaries.push(r.start);
      let k = 0;
      for (const t of tracked) {
        if (t < r.start - 1e-9 || t >= r.end - 1e-9) continue;
        beats.push(t);
        if (k % r.n === 0 && t > r.start + 1e-9) boundaries.push(t);
        k++;
      }
      continue;
    }
    const beat = 60 / r.bpm;
    boundaries.push(r.start);
    for (let k = Math.max(0, Math.ceil((r.start - r.anchor) / beat - 1e-9)); ; k++) {
      const t = r.anchor + k * beat;
      if (t >= r.end - 1e-9) break;
      beats.push(t);
      if (k % r.n === 0 && t > r.start + 1e-9) boundaries.push(t);
    }
  }

  // sort, duplicates aur bahut paas ke cuts (4 frame se kam) hatao
  const minGap = 4 / fps;
  const b: number[] = [];
  for (const t of [...boundaries].sort((x, y) => x - y)) {
    if (t >= maxSec - 1e-9) continue;
    if (b.length === 0 || t - b[b.length - 1] >= minGap - 1e-9) b.push(t);
  }
  if (b.length === 0) b.push(0);

  let durationSec: number;
  if (opts.totalSeconds == null) {
    durationSec = b.length > opts.imageCount ? b[opts.imageCount] : maxSec;
  } else {
    durationSec = Math.min(maxSec, opts.totalSeconds);
  }
  const durationInFrames = Math.max(30, Math.min(maxSec * fps, Math.round(durationSec * fps)));

  const segments: EditSegment[] = [];
  for (let i = 0; i < b.length; i++) {
    const start = Math.round(b[i] * fps);
    if (start >= durationInFrames) break;
    const nextT = i + 1 < b.length ? Math.round(b[i + 1] * fps) : durationInFrames;
    const end = Math.min(durationInFrames, nextT);
    if (end <= start) continue;
    segments.push({ imageIndex: segments.length % opts.imageCount, start, duration: end - start });
    if (opts.totalSeconds == null && segments.length >= opts.imageCount) break;
  }

  const beatFrames: number[] = [];
  for (const t of beats) {
    const f = Math.round(t * fps);
    if (f >= 0 && f < durationInFrames && (beatFrames.length === 0 || f > beatFrames[beatFrames.length - 1])) {
      beatFrames.push(f);
    }
  }
  const cutSeconds = segments.length ? segments[0].duration / fps : baseBeat * baseN;
  return { segments, durationInFrames, beatFrames, cutSeconds };
};

// ------------------------------------------------------------------ timeline builder (purana, constant tempo)
export const buildTimeline = (opts: {
  imageCount: number;
  bpm: number;
  beatsPerCut: number;
  totalSeconds: number | null; // null = auto (images x cut length)
  fps?: number;
}): { segments: EditSegment[]; durationInFrames: number; cutSeconds: number } => {
  const fps = opts.fps ?? EDIT_FPS;
  const bpm = Math.min(300, Math.max(40, opts.bpm || 120));
  const cutF = Math.max(4, ((fps * 60) / bpm) * Math.max(1, opts.beatsPerCut));
  const maxFrames = MAX_EDIT_SECONDS * fps;

  if (opts.imageCount <= 0) {
    return { segments: [], durationInFrames: 30, cutSeconds: cutF / fps };
  }

  const wanted =
    opts.totalSeconds == null
      ? Math.round(opts.imageCount * cutF)
      : Math.round(opts.totalSeconds * fps);
  const durationInFrames = Math.max(30, Math.min(maxFrames, wanted));
  const count = Math.max(1, Math.ceil(durationInFrames / cutF - 0.001));

  const segments: EditSegment[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.round(i * cutF);
    const end = Math.min(durationInFrames, Math.round((i + 1) * cutF));
    if (end <= start) continue;
    segments.push({ imageIndex: i % opts.imageCount, start, duration: end - start });
  }
  return { segments, durationInFrames, cutSeconds: cutF / fps };
};

// ------------------------------------------------------------------ video wrapper
export const EditVideo: React.FC<
  EditProps & {
    Scene: React.FC<EditSceneProps>;
    bg?: string; // color ya gradient (CSS background)
    overlap?: number; // crossfade ke liye har cut thoda lamba chalta hai
  }
> = ({
  images = [] as string[],
  segments = [] as EditSegment[],
  audio = "none",
  audioStartSec = 0,
  bpm = 128,
  beatFrames,
  brand,
  Scene,
  bg = "#000",
  overlap = 0,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const b = { ...DEFAULT_BRAND, ...(brand || {}) };
  const ready = images.length > 0 && segments.length > 0;
  // template ko hamesha beatFrames milte hain (sections na hon to constant BPM se bante hain)
  const beats =
    beatFrames && beatFrames.length > 0 ? beatFrames : constantBeatFrames(bpm, durationInFrames, fps);

  return (
    <AbsoluteFill style={{ background: bg }}>
      {audio && audio !== "none" && (
        <Audio
          src={resolveSrc(audio)}
          startFrom={Math.round(Math.max(0, audioStartSec) * fps)}
          volume={(f) =>
            interpolate(f, [durationInFrames - 15, durationInFrames], [1, 0], CLAMP)
          }
        />
      )}

      {ready ? (
        segments.map((seg, i) => (
          <Sequence
            key={i}
            from={seg.start}
            durationInFrames={seg.duration + (i < segments.length - 1 ? overlap : 0)}
          >
            <Scene
              src={resolveSrc(images[seg.imageIndex] ?? images[0])}
              seg={seg}
              index={i}
              total={segments.length}
              totalFrames={durationInFrames}
              bpm={bpm}
              beatFrames={beats}
              brand={b}
            />
          </Sequence>
        ))
      ) : (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            color: "#8b8b99",
            fontFamily: "Arial, sans-serif",
            fontSize: 44,
            textAlign: "center",
            padding: 80,
          }}
        >
          Add images to see your edit
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
