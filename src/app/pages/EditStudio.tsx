/// <reference types="vite/client" />
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Image as ImageIcon,
  Loader2,
  Lock,
  Music,
  Unlock,
  Upload,
  X,
  Zap,
  Check,
  AlertTriangle,
  Plus,
  Copy,
  Trash2,
} from "lucide-react";
import { editTemplates } from "../../editTemplates";
import {
  EDIT_FPS,
  MAX_EDIT_IMAGES,
  MAX_SECTIONS,
  EditSegment,
  TempoSection,
  buildTimelineSections,
} from "../../editShared";
import { analyzeAudioFile, snapToBeat, nearestBeat, tempoRange, AudioAnalysis } from "../audioAnalysis";
import editPrompt from "../prompts/EditTemplateMasterPrompt.txt?raw";
import { API, downloadHref } from "../config";
import { useServerInfo } from "../serverInfo";
import { InfoTip } from "../InfoTip";
import { SongPlayer } from "../SongPlayer";
import { fmtClock } from "../songTime";
import { estimateRender, fmtDuration, recordRender, useRenderClock } from "../renderTime";
import { useProject } from "../useProject";
import { ProjectBar } from "../ProjectBar";
import { mediaIdOf } from "../projectMedia";

type Pic = { id: string; file: File; url: string };

// Project me jo save hota hai (files alag se, id ke saath)
type EditSaved = {
  brandName: string;
  brandColor: string;
  templateId: string;
  bpm: number;
  beatsPerCut: number;
  lengthMode: number | null;
  audioStart: number;
  snapOn: boolean;
  audioDur: number;
  analysis: AudioAnalysis | null;
  beatMode?: "constant" | "follow";
  sections: TempoSection[];
  imageIds: string[];
  audioId: string | null;
};

// Lock ke time ka frozen snapshot: preview aur render dono isi se chalte hain,
// isliye beech me koi bhi live badlav Player tak nahi pahunchta.
type Snap = {
  key: number;
  templateId: string;
  compId: string;
  component: React.ComponentType<any>;
  files: File[];
  audioFile: File | null;
  bpm: number;
  audioStart: number;
  brand: { name: string; color: string };
  segments: EditSegment[];
  beatFrames: number[];
  durationInFrames: number;
  previewProps: Record<string, unknown>;
};

// Preview ke andar kuch bhi fate to sirf ye box dikhe, poora app nahi girna chahiye
class EditPreviewBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: any) {
    return { error: String(e?.message || e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-[320px] h-[569px] p-5 text-xs text-red-300 bg-red-950/30 overflow-auto flex flex-col gap-2">
          <b className="text-red-400">Preview me error aaya:</b>
          <span>{this.state.error}</span>
          <span className="text-gray-400">Unlock karke settings badlo (images ya BPM), phir dobara lock karo.</span>
        </div>
      );
    }
    return this.props.children;
  }
}


// ---- templates: built-in + custom (custom files lazy load hote hain, kharab file app nahi girayegi)
type TemplateEntry = {
  id: string;
  compId: string;
  name: string;
  description: string;
  tags: string[];
  component?: React.ComponentType<any>;
  load?: () => Promise<any>;
  custom?: boolean;
};

const customLoaders = import.meta.glob("../../CustomEditTemplates/*.tsx") as Record<
  string,
  () => Promise<any>
>;

const ALL_TEMPLATES: TemplateEntry[] = [
  ...editTemplates.map((t) => ({ ...t, compId: `Edit-${t.id}` })),
  ...Object.keys(customLoaders).map((path) => {
    const name = path.split("/").pop()?.replace(".tsx", "") || "Custom";
    return {
      id: `custom:${name}`,
      compId: `EditCustom-${name}`,
      name,
      description: "Your custom template",
      tags: ["Custom"],
      load: customLoaders[path],
      custom: true,
    } as TemplateEntry;
  }),
];

// Badi images (4K) render slow karti hain, isliye upload se pehle 1080x1920 tak chhota kar dete hain
async function shrinkImage(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const ratio = Math.min(1, 1080 / bmp.width, 1920 / bmp.height);
  const w = Math.max(1, Math.round(bmp.width * ratio));
  const h = Math.max(1, Math.round(bmp.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9),
  );
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

const LENGTHS: { label: string; value: number | null }[] = [
  { label: "Auto", value: null },
  { label: "15s", value: 15 },
  { label: "20s", value: 20 },
  { label: "30s", value: 30 },
  { label: "45s", value: 45 },
  { label: "60s", value: 60 },
];

type GridRegion = { start: number; end: number; bpm: number; anchor: number };

// Waveform: click ya drag karke music ka start chuno. Violet window = video me jo hissa use hoga.
// Pink lines = beats (har tempo section ka apna grid), peele markers = tempo sections.
const Waveform: React.FC<{
  peaks: number[];
  duration: number;
  start: number;
  windowSec: number;
  regions: GridRegion[];
  trackedBeats?: number[]; // diya to regions ki jagah gaane ke asli beats dikhte hain
  markers: { sec: number; label: string }[];
  moments?: { t: number; kind: "drop" | "calm" }[];
  pickMode: boolean;
  disabled: boolean;
  onChange: (sec: number) => void;
  onPick: (sec: number) => void;
}> = ({ peaks, duration, start, windowSec, regions, trackedBeats, markers, moments, pickMode, disabled, onChange, onPick }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c || peaks.length === 0 || duration <= 0) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    const x0 = (start / duration) * W;
    const x1 = ((start + windowSec) / duration) * W;
    ctx.fillStyle = "rgba(139,92,246,0.18)";
    ctx.fillRect(x0, 0, Math.max(2, Math.min(W, x1) - x0), H);

    const barW = W / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const h = Math.max(2, peaks[i] * (H - 10));
      const inside = x + barW > x0 && x < x1;
      ctx.fillStyle = inside ? "#c4b5fd" : "rgba(255,255,255,0.28)";
      ctx.fillRect(x, (H - h) / 2, Math.max(1, barW - 1), h);
    }

    // beat grid
    ctx.fillStyle = "rgba(236,72,153,0.5)";
    if (trackedBeats && trackedBeats.length > 1) {
      const avg = (trackedBeats[trackedBeats.length - 1] - trackedBeats[0]) / (trackedBeats.length - 1);
      const pxPerBeat = (avg / duration) * W;
      const every = pxPerBeat >= 6 ? 1 : pxPerBeat * 4 >= 6 ? 4 : 0;
      if (every) trackedBeats.forEach((t, i) => i % every === 0 && ctx.fillRect((t / duration) * W, 0, 1, H));
    }
    for (const r of trackedBeats && trackedBeats.length > 1 ? [] : regions) {
      if (r.bpm <= 0 || r.end <= r.start) continue;
      const beat = 60 / r.bpm;
      const pxPerBeat = (beat / duration) * W;
      const every = pxPerBeat >= 6 ? 1 : pxPerBeat * 4 >= 6 ? 4 : 0;
      if (!every) continue;
      const k0 = Math.max(0, Math.ceil((r.start - r.anchor) / beat - 1e-9));
      for (let k = k0; ; k++) {
        const t = r.anchor + k * beat;
        if (t >= r.end) break;
        if (k % every === 0) ctx.fillRect((t / duration) * W, 0, 1, H);
      }
    }

    ctx.fillStyle = "#ec4899";
    ctx.fillRect(x0, 0, 3, H);

    // tempo section markers
    ctx.font = "bold 22px sans-serif";
    markers.forEach((m) => {
      const x = (m.sec / duration) * W;
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(x - 1, 0, 3, H);
      ctx.fillText(m.label, Math.min(W - 18, x + 5), 22);
    });

    // suggested drop / calm moments: chhote cyan (drop) aur slate (calm) nishaan upar
    (moments ?? []).forEach((m) => {
      const x = (m.t / duration) * W;
      ctx.fillStyle = m.kind === "drop" ? "#22d3ee" : "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(x - 9, 0);
      ctx.lineTo(x + 9, 0);
      ctx.lineTo(x, 16);
      ctx.closePath();
      ctx.fill();
    });
  }, [peaks, duration, start, windowSec, regions, trackedBeats, markers, moments]);

  const secAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * duration;
  };

  return (
    <canvas
      ref={ref}
      width={1040}
      height={120}
      className={`w-full h-[64px] rounded-lg bg-black/50 border ${
        pickMode ? "border-amber-400 cursor-crosshair" : "border-white/10"
      } ${disabled || pickMode ? "" : "cursor-pointer"}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (disabled || duration <= 0) return;
        if (pickMode) {
          onPick(secAt(e));
          return;
        }
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(secAt(e));
      }}
      onPointerMove={(e) => dragging.current && !disabled && !pickMode && onChange(secAt(e))}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    />
  );
};

// Number box jo type karte waqt galat value se na tute: valid + range me ho to turant, warna blur pe theek karo
const NumField: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  onCommit: (v: number) => void;
  className?: string;
  disabled?: boolean;
}> = ({ value, min, max, step = 1, decimals = 2, onCommit, className, disabled }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      step={step}
      disabled={disabled}
      className={`${className ?? ""} ${disabled ? "opacity-40" : ""}`}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(v) && v >= min && v <= max) onCommit(v);
      }}
      onBlur={() => {
        const v = Number(text);
        const fixed = Number.isFinite(v) && text.trim() !== "" ? Math.min(max, Math.max(min, v)) : value;
        const rounded = Number(fixed.toFixed(decimals));
        onCommit(rounded);
        setText(String(rounded));
      }}
    />
  );
};

const Section: React.FC<{
  n: number;
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  tip?: React.ReactNode;
}> = ({ n, title, children, right, tip }) => (
  <div className="glass rounded-2xl p-5 mb-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] flex items-center justify-center text-xs font-black">
          {n}
        </span>
        <span className="text-xs font-bold tracking-widest uppercase text-gray-300">
          {title}
          {tip && <InfoTip title={title}>{tip}</InfoTip>}
        </span>
      </div>
      {right}
    </div>
    {children}
  </div>
);

export default function EditStudio({ active = true }: { active?: boolean }) {
  const serverInfo = useServerInfo();
  const clock = useRenderClock();
  // ---------------- state
  const [brandName, setBrandName] = useState("AUTOMAKE");
  const [brandColor, setBrandColor] = useState("#8b5cf6");
  const [templateId, setTemplateId] = useState(editTemplates[0].id);

  const [images, setImages] = useState<Pic[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDur, setAudioDur] = useState(0);
  const [audioStart, setAudioStart] = useState(0);
  const [bpm, setBpm] = useState(128);
  const [bpmText, setBpmText] = useState("128");
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeNote, setAnalyzeNote] = useState("");
  const [snapOn, setSnapOn] = useState(true);
  const [beatMode, setBeatMode] = useState<"constant" | "follow">("constant");
  const [sections, setSections] = useState<TempoSection[]>([]);
  const [pickId, setPickId] = useState<string | null>(null);
  const analysisToken = useRef(0);

  const [loadedComps, setLoadedComps] = useState<Record<string, React.ComponentType<any>>>({});
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [beatsPerCut, setBeatsPerCut] = useState(2);
  const [lengthMode, setLengthMode] = useState<number | null>(null);

  const [locked, setLocked] = useState(false);
  const [snap, setSnap] = useState<Snap | null>(null);

  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState(false);
  const [renderInfo, setRenderInfo] = useState("");

  const taps = useRef<number[]>([]);


  const template = ALL_TEMPLATES.find((t) => t.id === templateId) || ALL_TEMPLATES[0];
  const templateComp: React.ComponentType<any> | undefined = template.component || loadedComps[template.id];

  // custom template ko lazy load karo
  useEffect(() => {
    setTemplateError(null);
    const t = template;
    if (!t.load || loadedComps[t.id]) return;
    let alive = true;
    t.load()
      .then((mod: any) => {
        const name = t.id.replace("custom:", "");
        const comp = mod[name] || mod.default || Object.values(mod).find((v) => typeof v === "function");
        if (!comp) throw new Error(`"${name}.tsx" me "export const ${name}" nahi mila.`);
        if (alive) setLoadedComps((p) => ({ ...p, [t.id]: comp as any }));
      })
      .catch((e: any) => alive && setTemplateError(String(e?.message || e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  // ---------------- timeline
  const followBeats: number[] | undefined =
    beatMode === "follow" && analysis?.beats && analysis.beats.length > 1 ? analysis.beats : undefined;

  const timeline = useMemo(
    () =>
      buildTimelineSections({
        imageCount: images.length,
        baseBpm: bpm,
        baseBeatsPerCut: beatsPerCut,
        sections,
        audioStartSec: audioStart,
        totalSeconds: lengthMode,
        trackedBeats: followBeats,
      }),
    [images.length, bpm, beatsPerCut, sections, audioStart, lengthMode, followBeats],
  );

  const windowSec = timeline.durationInFrames / EDIT_FPS;
  const maxStart = Math.max(0, audioDur - Math.min(windowSec, audioDur));
  const beatsKnown = !!analysis && analysis.confidence >= 0.3;

  // Start point / section markers beat pe snap: asli tracked beats follow ho rahe ho to unpe, warna constant grid pe
  const snapTime = (t: number) => {
    if (!snapOn || !analysis) return t;
    if (followBeats) return nearestBeat(t, followBeats);
    if (beatsKnown) return snapToBeat(t, bpm, analysis.firstBeatSec);
    return t;
  };

  const setStart = (v: number) => {
    let t = Math.min(Math.max(0, v), maxStart);
    t = Math.min(maxStart, snapTime(t));
    setAudioStart(Number(t.toFixed(3)));
  };

  const commitBpm = (v: number) => {
    const b = Math.round(Math.min(300, Math.max(40, v)) * 10) / 10;
    setBpm(b);
    setBpmText(String(b));
  };

  // Purane projects me tracked beats nahi hote: dobara detect karo (BPM, start, sections ko chhue bina)
  const [redetecting, setRedetecting] = useState(false);
  const redetect = async () => {
    if (!audioFile || redetecting) return;
    setRedetecting(true);
    try {
      const res = await analyzeAudioFile(audioFile);
      setAnalysis((prev) => ({ ...(prev ?? res), ...res, bpm: prev?.bpm ?? res.bpm }));
    } catch {
      window.alert("Beats detect nahi ho paye. Constant BPM use karo.");
    }
    setRedetecting(false);
  };

  // ---------------- tempo sections
  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.startSec - b.startSec), [sections]);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const addSectionAt = (sec: number, pick = false, bpc?: number) => {
    if (sections.length >= MAX_SECTIONS) {
      window.alert(`Max ${MAX_SECTIONS} sections.`);
      return;
    }
    let t = Math.min(Math.max(0, sec), Math.max(0, audioDur - 0.5));
    t = snapTime(t);
    const id = `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setSections((prev) => [
      ...prev,
      { id, startSec: round2(t), bpm, beatsPerCut: bpc ?? Math.max(1, Math.floor(beatsPerCut / 2)) },
    ]);
    if (pick && analysis) setPickId(id); // seedha waveform pe sahi jagah click kar sako
  };

  const addSection = () => {
    const mid = audioStart + Math.min(windowSec / 2, Math.max(0, audioDur - audioStart - 1));
    addSectionAt(mid, true);
  };

  // Drop / calm suggestions: tum "Add" dabate ho tab hi section banta hai
  const suggestedBpc = (kind: "drop" | "calm") => (kind === "drop" ? 1 : Math.max(4, beatsPerCut));
  const isAdded = (t: number) => sections.some((s) => Math.abs(s.startSec - t) < 0.6 || Math.abs(s.startSec - snapTime(t)) < 0.6);
  const addAllSuggestions = () => {
    const ms = analysis?.moments ?? [];
    setSections((prev) => {
      const out = [...prev];
      for (const m of ms) {
        if (out.length >= MAX_SECTIONS) break;
        const t = round2(Math.max(0, Math.min(Math.max(0, audioDur - 0.5), snapTime(m.t))));
        if (out.some((s) => Math.abs(s.startSec - t) < 0.6)) continue;
        out.push({
          id: `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          startSec: t,
          bpm,
          beatsPerCut: suggestedBpc(m.kind),
        });
      }
      return out;
    });
  };

  const updateSection = (id: string, patch: Partial<TempoSection>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setPickId((p) => (p === id ? null : p));
  };

  const nudgeSection = (s: TempoSection, dir: -1 | 1) =>
    updateSection(s.id, { startSec: round2(Math.min(Math.max(0, audioDur || 9999), Math.max(0, s.startSec + dir * (60 / s.bpm)))) });

  const placePicked = (sec: number) => {
    if (!pickId) return;
    let t = Math.max(0, Math.min(audioDur, sec));
    t = snapTime(t);
    updateSection(pickId, { startSec: round2(t) });
    setPickId(null);
  };

  const gridRegions = useMemo(() => {
    if (!analysis) return [] as GridRegion[];
    const regs: GridRegion[] = [];
    const firstStart = sortedSections.length ? sortedSections[0].startSec : audioDur;
    if (beatsKnown) {
      regs.push({ start: 0, end: Math.min(firstStart, audioDur), bpm, anchor: analysis.firstBeatSec });
    }
    sortedSections.forEach((sec, i) => {
      regs.push({
        start: sec.startSec,
        end: i + 1 < sortedSections.length ? sortedSections[i + 1].startSec : audioDur,
        bpm: sec.bpm,
        anchor: sec.startSec,
      });
    });
    return regs;
  }, [analysis, beatsKnown, bpm, sortedSections, audioDur]);

  const sectionMarkers = useMemo(
    () => sortedSections.map((sec, i) => ({ sec: sec.startSec, label: String(i + 1) })),
    [sortedSections],
  );

  const previewProps = useMemo(
    () => ({
      images: images.map((i) => i.url),
      segments: timeline.segments,
      audio: audioUrl ?? "none",
      audioStartSec: audioStart,
      bpm,
      beatFrames: timeline.beatFrames,
      brand: { name: brandName || "AUTOMAKE", color: brandColor },
      durationInFrames: timeline.durationInFrames,
    }),
    [images, timeline, audioUrl, audioStart, bpm, brandName, brandColor],
  );

  // lock se pehle ye sab theek hona chahiye
  const problems = useMemo(() => {
    const p: string[] = [];
    if (processing) p.push("Images are still being optimized");
    if (templateError) p.push("This template has an error");
    else if (!templateComp) p.push("Template is loading");
    if (images.length === 0) p.push("Add at least 1 image");
    if (images.length > MAX_EDIT_IMAGES) p.push(`Max ${MAX_EDIT_IMAGES} images`);
    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 300) p.push("BPM must be between 40 and 300");
    if (timeline.segments.length === 0) p.push("Timeline is empty");
    if (audioFile && audioDur > 0 && audioStart > audioDur - 1) p.push("Music start is past the end of the track");
    if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) p.push("Pick a valid color");
    return p;
  }, [processing, templateError, templateComp, images.length, bpm, timeline.segments.length, audioFile, audioDur, audioStart, brandColor]);

  const handleLock = () => {
    if (problems.length > 0 || rendering || !templateComp) return;
    const brand = { name: brandName.trim() || "AUTOMAKE", color: brandColor };
    setSnap({
      key: Date.now(),
      templateId: template.id,
      compId: template.compId,
      component: templateComp,
      files: images.map((i) => i.file),
      audioFile,
      bpm,
      audioStart,
      brand,
      segments: timeline.segments,
      beatFrames: timeline.beatFrames,
      durationInFrames: timeline.durationInFrames,
      previewProps: { ...previewProps, brand },
    });
    setVideoUrl(null);
    setLocked(true);
  };

  const handleUnlock = () => {
    if (rendering) return;
    setLocked(false);
    setSnap(null);
    setVideoUrl(null);
  };

  // object URLs saaf karo
  useEffect(() => {
    return () => {
      images.forEach((i) => URL.revokeObjectURL(i.url));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- images
  const addImages = async (list: FileList | null) => {
    if (locked || !list || list.length === 0) return;
    const room = MAX_EDIT_IMAGES - images.length;
    if (room <= 0) {
      window.alert(`Max ${MAX_EDIT_IMAGES} images allowed.`);
      return;
    }
    const picked = Array.from(list).slice(0, room);
    if (list.length > room) window.alert(`Sirf ${room} aur images add ho sakti hain (max ${MAX_EDIT_IMAGES}).`);

    setProcessing(true);
    const out: Pic[] = [];
    const failed: string[] = [];
    for (const f of picked) {
      try {
        const small = await shrinkImage(f);
        out.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: small, url: URL.createObjectURL(small) });
      } catch {
        failed.push(f.name);
      }
    }
    setImages((prev) => [...prev, ...out].slice(0, MAX_EDIT_IMAGES));
    setProcessing(false);
    if (failed.length) window.alert(`Ye files nahi khuli (JPG/PNG/WebP use karo): ${failed.join(", ")}`);
  };

  const removeImage = (idx: number) => {
    if (locked) return;
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const moveImage = (from: number, to: number) => {
    if (locked || to < 0 || to >= images.length || from === to) return;
    setImages((prev) => {
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  const clearImages = () => {
    if (locked) return;
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
  };

  // ---------------- audio
  const onAudio = (file: File | null) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    analysisToken.current += 1;
    const token = analysisToken.current;
    setSections([]);
    setPickId(null);
    setBeatMode("constant");
    setAnalysis(null);
    setAnalyzeNote("");
    if (!file) {
      setAudioFile(null);
      setAudioUrl(null);
      setAudioDur(0);
      setAudioStart(0);
      setAnalyzing(false);
      return;
    }
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
    setAudioStart(0);
    const probe = new Audio(url);
    probe.onloadedmetadata = () => setAudioDur(Number.isFinite(probe.duration) ? probe.duration : 0);

    // beat auto-detect (browser me, upload nahi hota)
    setAnalyzing(true);
    analyzeAudioFile(file)
      .then((res) => {
        if (token !== analysisToken.current) return;
        setAnalysis(res);
        setAudioDur(res.duration);
        if (res.confidence >= 0.5) {
          commitBpm(res.bpm);
          setAudioStart(Number(res.firstBeatSec.toFixed(3)));
          setAnalyzeNote("");
        } else {
          setAnalyzeNote("Beat not clear in this track. Use Tap or type the BPM yourself.");
        }
      })
      .catch(() => {
        if (token === analysisToken.current) setAnalyzeNote("Could not analyze this file. Use Tap or type the BPM.");
      })
      .finally(() => {
        if (token === analysisToken.current) setAnalyzing(false);
      });
  };

  const tapTempo = () => {
    const now = performance.now();
    const t = taps.current;
    if (t.length && now - t[t.length - 1] > 2000) t.length = 0;
    t.push(now);
    if (t.length > 8) t.shift();
    if (t.length >= 3) {
      const gaps = t.slice(1).map((x, i) => x - t[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      commitBpm(Math.round(60000 / avg));
    }
  };

  // ---------------- custom templates
  const copyEditPrompt = async () => {
    try {
      await navigator.clipboard.writeText(editPrompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = editPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 2500);
  };

  const saveCustom = async () => {
    const name = customName.replace(/\s+/g, "");
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      window.alert("Name sirf letters/numbers/underscore ho aur letter se shuru (e.g. NeonPulse).");
      return;
    }
    if (!customCode.trim()) {
      window.alert("Code khali hai.");
      return;
    }
    setSavingCustom(true);
    try {
      const res = await fetch(`${API}/api/edit-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code: customCode }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        window.alert("Template saved! Page reload ho raha hai.");
        setShowCustom(false);
        window.setTimeout(() => window.location.reload(), 600);
      } else {
        window.alert("Error: " + (data.error || "save nahi hua"));
      }
    } catch {
      window.alert("Backend offline. Terminal me chalao: npm run server");
    }
    setSavingCustom(false);
  };

  const deleteCustom = async (name: string) => {
    if (!window.confirm(`Delete custom template "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/api/edit-template/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) window.location.reload();
      else window.alert("Error: " + (data.error || "delete nahi hua"));
    } catch {
      window.alert("Backend offline. Terminal me chalao: npm run server");
    }
  };

  // ---------------- render
  const handleRender = async () => {
    if (!locked || !snap || rendering) return;
    setRendering(true);
    setProgress(0);
    setStatus("uploading");
    setVideoUrl(null);
    setRenderInfo("");
    clock.begin();

    const fd = new FormData();
    snap.files.forEach((f) => fd.append("images", f));
    if (snap.audioFile) fd.append("audio", snap.audioFile);
    fd.append(
      "data",
      JSON.stringify({
        compositionId: snap.compId,
        bpm: snap.bpm,
        beatFrames: snap.beatFrames,
        segments: snap.segments,
        durationInFrames: snap.durationInFrames,
        audioStartSec: snap.audioStart,
        brand: snap.brand,
        draft,
      }),
    );

    try {
      const res = await fetch(`${API}/api/render-edit`, { method: "POST", body: fd });
      const json = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !json.jobId) {
        window.alert("Error: " + (json.error || "Render start nahi hua"));
        clock.fail();
        setRendering(false);
        return;
      }
      const sse = new EventSource(`${API}/api/progress?jobId=${json.jobId}`);
      sse.onmessage = (ev) => {
        const d = JSON.parse(ev.data) as {
          progress: number;
          status: string;
          output?: string;
          error?: string;
          elapsedSec?: number;
          bundleSec?: number;
          renderSec?: number;
          bundleCached?: boolean;
          draft?: boolean;
        };
        setProgress(d.progress);
        setStatus(d.status);
        clock.onProgress(d.status, d.progress);
        if (d.status === "done") {
          const total = clock.finish();
          recordRender({
            mode: "edit",
            template: snap.compId,
            frames: snap.durationInFrames,
            draft,
            renderSec: d.renderSec || 0,
            bundleSec: d.bundleSec || 0,
            bundleCached: !!d.bundleCached,
            totalSec: total,
            ts: Date.now(),
          });
          const parts: string[] = [];
          if (d.renderSec) parts.push(`rendering ${fmtDuration(d.renderSec)}`);
          if (d.bundleSec && !d.bundleCached) parts.push(`setup ${fmtDuration(d.bundleSec)}`);
          setRenderInfo(
            `Total time: ${fmtDuration(total)}` +
              (parts.length ? ` (${parts.join(", ")})` : "") +
              (d.draft ? " - draft, half size" : ""),
          );
          setVideoUrl(downloadHref(d.output || "", `${snap.brand.name}_Edit.mp4`));
          setRendering(false);
          sse.close();
        } else if (d.status === "error") {
          window.alert("Render error: " + d.error);
          clock.fail();
          setRendering(false);
          sse.close();
        }
      };
      sse.onerror = () => {
        sse.close();
        clock.fail();
        setRendering(false);
        window.alert("Server se connection toot gaya.");
      };
    } catch {
      window.alert("Backend offline. Terminal me chalao: npm run server");
      clock.fail();
      setRendering(false);
    }
  };

  const secs = ((locked && snap ? snap.durationInFrames : timeline.durationInFrames) / EDIT_FPS).toFixed(1);

  // ---------------- projects (autosave)
  const proj = useProject<EditSaved>({
    mode: "edit",
    getState: () => ({
      data: {
        brandName,
        brandColor,
        templateId,
        bpm,
        beatsPerCut,
        lengthMode,
        audioStart,
        snapOn,
        audioDur,
        analysis,
        beatMode,
        sections,
        imageIds: images.map((i) => mediaIdOf(i.file)),
        audioId: audioFile ? mediaIdOf(audioFile) : null,
      },
      media: [...images.map((i) => i.file), ...(audioFile ? [audioFile] : [])],
    }),
    applyState: (d, files) => {
      images.forEach((i) => URL.revokeObjectURL(i.url));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      analysisToken.current += 1;
      const pics: Pic[] = (d.imageIds || [])
        .map((id) => files.get(id))
        .filter((f): f is File => !!f)
        .map((f) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f) }));
      setImages(pics);
      const af = d.audioId ? files.get(d.audioId) ?? null : null;
      setAudioFile(af);
      setAudioUrl(af ? URL.createObjectURL(af) : null);
      setAudioDur(d.audioDur || 0);
      setAnalysis(d.analysis ?? null);
      setSections(Array.isArray(d.sections) ? d.sections.slice(0, MAX_SECTIONS) : []);
      setBeatMode(d.beatMode === "follow" && (d.analysis?.beats?.length ?? 0) > 1 ? "follow" : "constant");
      setPickId(null);
      setAnalyzeNote("");
      setAnalyzing(false);
      setBrandName(d.brandName || "AUTOMAKE");
      setBrandColor(d.brandColor || "#8b5cf6");
      if (ALL_TEMPLATES.some((t) => t.id === d.templateId)) setTemplateId(d.templateId);
      setBpm(d.bpm || 128);
      setBpmText(String(d.bpm || 128));
      setBeatsPerCut(d.beatsPerCut || 2);
      setLengthMode(d.lengthMode ?? null);
      setAudioStart(d.audioStart || 0);
      setSnapOn(d.snapOn !== false);
      setLocked(false);
      setSnap(null);
      setVideoUrl(null);
    },
    reset: () => {
      images.forEach((i) => URL.revokeObjectURL(i.url));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      analysisToken.current += 1;
      setImages([]);
      setAudioFile(null);
      setAudioUrl(null);
      setAudioDur(0);
      setAnalysis(null);
      setSections([]);
      setBeatMode("constant");
      setPickId(null);
      setAnalyzeNote("");
      setAnalyzing(false);
      setBrandName("AUTOMAKE");
      setBrandColor("#8b5cf6");
      setTemplateId(editTemplates[0].id);
      setBpm(128);
      setBpmText("128");
      setBeatsPerCut(2);
      setLengthMode(null);
      setAudioStart(0);
      setSnapOn(true);
      setLocked(false);
      setSnap(null);
      setVideoUrl(null);
    },
  });

  // Render se pehle ka estimate (sirf tumhare pichle renders se; record nahi to null)
  const estimate = useMemo(
    () =>
      locked && snap
        ? estimateRender({
            mode: "edit",
            template: snap.compId,
            frames: snap.durationInFrames,
            draft,
            bundleWarm: serverInfo.bundleWarm,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked, snap?.compId, snap?.durationInFrames, draft, serverInfo.bundleWarm, videoUrl],
  );
  const eta = clock.etaSec(progress);

  // ---------------- UI
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col md:flex-row">
      {/* LEFT: editor */}
      <div className="w-full md:w-1/2 p-5 md:p-8 overflow-y-auto md:h-[calc(100vh-56px)] border-r border-white/10">
        <div className="flex items-center gap-3 mb-7">
          <Clapperboard className="text-[#c4b5fd] w-8 h-8" />
          <h1 className="font-display text-3xl font-bold">
            <span className="grad-text-edit">Cool Edits</span> Studio
          </h1>
        </div>

        <ProjectBar pc={proj} busy={rendering} />

        {locked && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Locked: preview is frozen. Press UNLOCK TO EDIT on the right to change anything.</span>
          </div>
        )}

        <fieldset disabled={locked} className={`min-w-0 border-0 p-0 m-0 transition ${locked ? "opacity-50" : ""}`}>
        {/* 1 brand + template */}
        <Section
          n={1}
          title="Look and template"
          tip={
            <>
              The template decides how every cut looks: zooms, flashes, glitches. The watermark is your channel name
              shown on the video. You can add your own templates with the button under the list.
            </>
          }
        >
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Watermark name</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                maxLength={30}
                className="w-full mt-1 bg-black/50 border border-white/15 rounded-lg p-3 font-bold focus:outline-none focus:border-[#8b5cf6]"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Color</label>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-full mt-1 h-[50px] bg-black/50 border border-white/15 rounded-lg p-1 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {ALL_TEMPLATES.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => !locked && setTemplateId(t.id)}
                className={`relative text-left rounded-xl p-4 border transition cursor-pointer ${
                  templateId === t.id
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                    : "border-white/10 bg-black/30 hover:border-white/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{t.name}</span>
                  <span className="flex items-center gap-2">
                    {templateId === t.id && <Check className="w-4 h-4 text-[#c4b5fd]" />}
                    {t.custom && (
                      <button
                        title="Delete custom template"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustom(t.name);
                        }}
                        className="text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">{t.description}</div>
                <div className="flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {templateError && (
            <div className="text-[11px] text-red-300 bg-red-950/30 rounded-lg p-2 mt-3 break-words">{templateError}</div>
          )}
          <button
            onClick={() => setShowCustom(true)}
            className="mt-3 w-full border border-dashed border-white/20 hover:border-[#8b5cf6] rounded-xl py-3 text-sm font-bold text-gray-300 inline-flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Add custom edit template
          </button>
        </Section>

        {/* 2 images */}
        <Section
          n={2}
          title={`Images (${images.length}/${MAX_EDIT_IMAGES})`}
          tip={
            <>
              The video cuts from one image to the next in the order shown here. Drag to reorder. Images are
              resized to 1080x1920 in your browser so the render stays fast.
            </>
          }
          right={
            images.length > 0 ? (
              <button onClick={clearImages} className="text-xs text-gray-400 hover:text-red-400">
                Clear all
              </button>
            ) : undefined
          }
        >
          <label
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition ${
              images.length >= MAX_EDIT_IMAGES ? "opacity-40 pointer-events-none" : "border-white/20 hover:border-[#8b5cf6]"
            }`}
          >
            {processing ? <Loader2 className="w-6 h-6 animate-spin text-[#c4b5fd]" /> : <Upload className="w-6 h-6 text-[#c4b5fd]" />}
            <span className="text-sm font-bold">{processing ? "Optimizing images..." : "Click to add images"}</span>
            <span className="text-[11px] text-gray-500">JPG, PNG or WebP. Resized to 1080x1920 for faster render.</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {images.length > 0 && (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-4">
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    draggable={!locked}
                    onDragStart={() => !locked && setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) moveImage(dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={`relative aspect-[9/16] rounded-lg overflow-hidden border cursor-grab ${
                      dragIndex === i ? "border-[#8b5cf6] opacity-50" : "border-white/15"
                    }`}
                  >
                    <img src={img.url} className="w-full h-full object-cover" draggable={false} />
                    <span className="absolute top-1 left-1 text-[10px] font-black bg-black/70 px-1.5 rounded">{i + 1}</span>
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-black/70 rounded p-0.5 hover:bg-red-600"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 flex justify-between bg-black/60">
                      <button onClick={() => moveImage(i, i - 1)} className="p-0.5 hover:text-[#c4b5fd]" title="Move left">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveImage(i, i + 1)} className="p-0.5 hover:text-[#c4b5fd]" title="Move right">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-gray-500 mt-2">Drag to reorder, or use the arrows.</div>
            </>
          )}
        </Section>

        {/* 3 music + timing */}
        <Section
          n={3}
          title="Music and timing"
          tip={
            <>
              Upload a song and the app finds its beat (BPM) by itself. Cuts, flashes and zooms then land on the beat.
              Pick which part of the song to use, and how fast the cuts should be.
            </>
          }
        >
          {audioFile ? (
            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Music className="w-4 h-4 text-[#c4b5fd] shrink-0" />
                <span className="text-sm font-bold truncate">{audioFile.name}</span>
                {audioDur > 0 && <span className="text-xs text-gray-500 shrink-0">{audioDur.toFixed(0)}s</span>}
              </div>
              <button onClick={() => onAudio(null)} className="text-gray-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-white/20 hover:border-[#8b5cf6] rounded-xl p-4 cursor-pointer mb-4 transition">
              <Music className="w-5 h-5 text-[#c4b5fd]" />
              <span className="text-sm font-bold">Upload music (MP3, WAV, M4A)</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  onAudio(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {audioFile && analyzing && (
            <div className="flex items-center gap-2 text-xs text-[#c4b5fd] mb-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing beats...
            </div>
          )}

          {audioFile && analysis && beatsKnown && !analyzeNote && (
            <div className="text-xs text-[#39FF14] mb-3 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Auto-detected {analysis.bpm} BPM ({Math.round(analysis.confidence * 100)}% sure)
            </div>
          )}
          {audioFile && analyzeNote && (
            <div className="text-xs text-amber-400 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {analyzeNote}
            </div>
          )}

          {audioFile && audioDur > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                <span>
                  Pick the part of the song
                  <InfoTip title="Part of the song">
                    Click or drag on the waveform. The purple window is the part that plays in your video, its length
                    matches your video length. Choose the drop or the chorus for the best edits.
                  </InfoTip>
                </span>
                <span className="text-white">
                  {audioStart.toFixed(1)}s to {Math.min(audioDur, audioStart + windowSec).toFixed(1)}s
                </span>
              </div>
              <SongPlayer
                audioUrl={audioUrl ?? ""}
                duration={audioDur}
                windowStart={audioStart}
                windowSec={windowSec}
                sections={sortedSections}
                followMode={!!followBeats}
                stop={locked || !active}
                onAddSection={(sec) => addSectionAt(sec, false)}
              >
                {analysis ? (
                  <Waveform
                    peaks={analysis.peaks}
                    duration={audioDur}
                    start={audioStart}
                    windowSec={windowSec}
                    regions={gridRegions}
                    trackedBeats={followBeats}
                    markers={sectionMarkers}
                    moments={analysis.moments}
                    pickMode={pickId !== null}
                    disabled={locked}
                    onChange={setStart}
                    onPick={placePicked}
                  />
                ) : (
                  <div className="h-[64px] rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-xs text-gray-500">
                    {analyzing ? "Reading waveform..." : "Waveform not available"}
                  </div>
                )}
              </SongPlayer>
              <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-4 mb-1">
                Video starts at
                <InfoTip title="Video start">
                  Moves the purple window (the part of the song your video uses). You can also click or drag on the
                  waveform. The white line above is only for listening and does not change your video.
                </InfoTip>
              </div>
              <input
                type="range"
                min={0}
                max={maxStart}
                step={0.01}
                value={Math.min(audioStart, maxStart)}
                onChange={(e) => setStart(Number(e.target.value))}
                className="w-full accent-[#8b5cf6] mt-2"
              />
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {beatsKnown && (
                  <label className="text-xs text-gray-300 inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapOn}
                      onChange={(e) => setSnapOn(e.target.checked)}
                      className="accent-[#8b5cf6]"
                    />
                    Snap start to beats
                    <InfoTip title="Snap to beats">
                      Moves your start point onto the nearest beat, so the very first cut lands exactly with the
                      music. Keep it on unless you want to place the start by hand.
                    </InfoTip>
                  </label>
                )}
              </div>
              <div className="text-[11px] text-gray-500 mt-2">
                Click or drag on the waveform to move the purple window (the part used in your video). Press Play song
                and use Add section here when you hear the drop or a tempo change.
              </div>
            </div>
          )}

          {audioFile && analysis && (
            <div className="mb-4 rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-[11px] text-gray-300 font-bold uppercase tracking-wider mb-2">
                Beat mode
                <InfoTip title="Beat mode">
                  Constant BPM assumes the song keeps one steady tempo, which is right for most songs. Follow the
                  song's beats listens to the real beats instead, so it also works when the tempo drifts or changes.
                  Your cuts, flashes and zooms then land on the beats you can see in the waveform.
                </InfoTip>
              </div>
              {analysis.beats && analysis.beats.length > 1 ? (
                <>
                  <div className="flex gap-2">
                    {(
                      [
                        ["constant", "Constant BPM"],
                        ["follow", "Follow the song's beats"],
                      ] as const
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        onClick={() => setBeatMode(m)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs font-bold transition ${
                          beatMode === m ? "border-[#8b5cf6] bg-[#8b5cf6]/20" : "border-white/15 hover:border-white/40"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {beatMode === "follow" && (() => {
                    const rg = tempoRange(analysis.beats!);
                    return (
                      <div className="text-[11px] text-gray-400 mt-2">
                        {rg ? `Tempo of this song runs from about ${Math.round(rg.min)} to ${Math.round(rg.max)} BPM. ` : ""}
                        The BPM boxes below are ignored in this mode.
                      </div>
                    );
                  })()}
                  {(analysis.beatQuality ?? 1) < 0.5 && (
                    <div className="text-[11px] text-amber-400 mt-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Beat tracking is not sure about this song. Check the pink lines on the waveform, or use Constant BPM.
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between gap-3 text-[11px] text-gray-400">
                  <span>This song was analyzed before real beat tracking existed.</span>
                  <button
                    onClick={redetect}
                    disabled={redetecting}
                    className="shrink-0 font-bold px-3 py-1.5 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/30 inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {redetecting && <Loader2 className="w-3 h-3 animate-spin" />} Detect beats
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                BPM
                <InfoTip title="BPM (beats per minute)">
                  How fast the beat of the song is. It is detected automatically when you upload music. If the
                  edit feels off-beat, fix it with Tap, type the number, or use the half and double buttons.
                </InfoTip>
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={bpmText}
                  onChange={(e) => {
                    setBpmText(e.target.value);
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 40 && v <= 300) setBpm(v);
                  }}
                  onBlur={() => commitBpm(Number(bpmText) || bpm)}
                  className="w-full bg-black/50 border border-white/15 rounded-lg p-3 font-bold focus:outline-none focus:border-[#8b5cf6]"
                />
                <button
                  onClick={tapTempo}
                  className="px-3 rounded-lg font-bold text-xs bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/30 inline-flex items-center gap-1"
                  title="Tap on the beat 4 to 8 times while the song plays"
                >
                  <Zap className="w-3.5 h-3.5" /> Tap
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => commitBpm(bpm / 2)}
                  className="text-[11px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                  title="Use if the detected BPM feels double"
                >
                  half
                </button>
                <button
                  onClick={() => commitBpm(bpm * 2)}
                  className="text-[11px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                  title="Use if the detected BPM feels half"
                >
                  double
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                Cut every
                <InfoTip title="Cut every">
                  How many beats each image stays on screen. 1 beat is very fast and aggressive, 4 beats is slow and
                  smooth.
                </InfoTip>
              </label>
              <select
                value={beatsPerCut}
                onChange={(e) => setBeatsPerCut(Number(e.target.value))}
                className="w-full mt-1 bg-black/50 border border-white/15 rounded-lg p-3 font-bold focus:outline-none focus:border-[#8b5cf6]"
              >
                <option value={1}>1 beat (very fast)</option>
                <option value={2}>2 beats (fast)</option>
                <option value={4}>4 beats (smooth)</option>
              </select>
            </div>
          </div>

          {/* ---------------- tempo sections ---------------- */}
          <div className="mt-2 mb-5 rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-gray-300 font-bold uppercase tracking-wider">
                Tempo sections
                <InfoTip title="Tempo sections">
                  Songs often change speed, for example a slow intro and a fast drop. The BPM and Cut every boxes above
                  apply from the start. Add a section where the tempo or the cut speed should change. A cut always
                  lands exactly where a section begins. Use Pick, then click the waveform, or type the start time.
                </InfoTip>
              </div>
              <button
                onClick={addSection}
                disabled={sections.length >= MAX_SECTIONS}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-200 hover:bg-amber-400/25 disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add section
              </button>
            </div>

            {audioFile && analysis && (
              <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">
                    Suggested from the song
                    <InfoTip title="Suggested sections">
                      The app listens for drops (the music suddenly gets louder and heavier) and calm parts (it suddenly
                      gets quieter). A drop gets fast cuts, a calm part gets slow cuts. Nothing is added until you press
                      Add, and you can change every section afterwards. Cyan marks on the waveform show the drops.
                    </InfoTip>
                  </span>
                  {analysis.moments === undefined ? (
                    <button
                      onClick={redetect}
                      disabled={redetecting}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyan-400/15 border border-cyan-400/40 text-cyan-100 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {redetecting && <Loader2 className="w-3 h-3 animate-spin" />} Detect
                    </button>
                  ) : (
                    (analysis.moments ?? []).some((m) => !isAdded(m.t)) && (
                      <button
                        onClick={addAllSuggestions}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyan-400/15 border border-cyan-400/40 text-cyan-100"
                      >
                        Add all
                      </button>
                    )
                  )}
                </div>
                {analysis.moments === undefined ? (
                  <div className="text-[11px] text-gray-500 mt-2">This song was analyzed before drop detection existed.</div>
                ) : analysis.moments.length === 0 ? (
                  <div className="text-[11px] text-gray-500 mt-2">No clear drops or calm parts found in this song.</div>
                ) : (
                  <div className="mt-2">
                    {analysis.moments.map((m, i) => {
                      const added = isAdded(m.t);
                      const inWindow = m.t >= audioStart && m.t <= audioStart + windowSec;
                      return (
                        <div key={i} className="flex items-center gap-2 py-1.5 border-t border-white/5 first:border-t-0">
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                              m.kind === "drop" ? "bg-cyan-400/20 text-cyan-200" : "bg-slate-400/20 text-slate-200"
                            }`}
                          >
                            {m.kind === "drop" ? "DROP" : "CALM"}
                          </span>
                          <span className="text-xs font-mono">{fmtClock(m.t)}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block h-1.5 rounded bg-white/10">
                              <span className="block h-full rounded bg-cyan-300" style={{ width: `${Math.round(m.strength * 100)}%` }} />
                            </span>
                          </span>
                          {inWindow && <span className="text-[10px] text-[#c4b5fd]">in video</span>}
                          {m.kind === "drop" && (
                            <button
                              onClick={() => setStart(m.t - 8)}
                              title="Move the video start to 8 seconds before this drop"
                              className="text-[10px] font-bold px-1.5 py-1 rounded bg-white/10 hover:bg-white/20"
                            >
                              Start before
                            </button>
                          )}
                          <button
                            disabled={added || sections.length >= MAX_SECTIONS}
                            onClick={() => addSectionAt(m.t, false, suggestedBpc(m.kind))}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-cyan-400/15 border border-cyan-400/40 text-cyan-100 disabled:opacity-40"
                          >
                            {added ? "Added" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {sortedSections.length === 0 ? (
              <div className="text-[11px] text-gray-500 mt-2">
                No sections yet: the BPM above is used for the whole video.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {sortedSections.map((sec, i) => {
                  const videoAt = sec.startSec - audioStart;
                  return (
                    <div
                      key={sec.id}
                      className={`rounded-lg border p-2.5 ${
                        pickId === sec.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-300">Section {i + 1}</span>
                        <span className="text-[10px] text-gray-500">
                          {videoAt < 0
                            ? "started before your video"
                            : videoAt > windowSec
                              ? "after your video ends"
                              : `at ${videoAt.toFixed(2)}s in the video`}
                        </span>
                        <button onClick={() => removeSection(sec.id)} className="text-gray-500 hover:text-red-400" title="Delete section">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[10px] text-gray-500 mb-0.5">Starts at (song sec)</div>
                          <NumField
                            value={sec.startSec}
                            min={0}
                            max={audioDur > 0 ? audioDur : 9999}
                            onCommit={(v) => updateSection(sec.id, { startSec: v })}
                            className="w-full bg-black/50 border border-white/15 rounded-md p-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-0.5">BPM</div>
                          <NumField
                            disabled={!!followBeats}
                            value={sec.bpm}
                            min={40}
                            max={300}
                            decimals={1}
                            onCommit={(v) => updateSection(sec.id, { bpm: v })}
                            className="w-full bg-black/50 border border-white/15 rounded-md p-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 mb-0.5">Cut every</div>
                          <select
                            value={sec.beatsPerCut}
                            onChange={(e) => updateSection(sec.id, { beatsPerCut: Number(e.target.value) })}
                            className="w-full bg-black/50 border border-white/15 rounded-md p-2 text-sm font-bold focus:outline-none focus:border-amber-400"
                          >
                            <option value={1}>1 beat</option>
                            <option value={2}>2 beats</option>
                            <option value={4}>4 beats</option>
                            <option value={8}>8 beats</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {analysis && (
                          <button
                            onClick={() => setPickId((p) => (p === sec.id ? null : sec.id))}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                              pickId === sec.id
                                ? "border-amber-400 bg-amber-400/20 text-amber-200"
                                : "border-white/15 hover:border-white/40"
                            }`}
                          >
                            {pickId === sec.id ? "Click the waveform..." : "Pick on waveform"}
                          </button>
                        )}
                        <button onClick={() => nudgeSection(sec, -1)} className="text-[11px] font-bold px-2 py-1 rounded-md bg-white/10 hover:bg-white/20" title="Move one beat earlier">
                          -1 beat
                        </button>
                        <button onClick={() => nudgeSection(sec, 1)} className="text-[11px] font-bold px-2 py-1 rounded-md bg-white/10 hover:bg-white/20" title="Move one beat later">
                          +1 beat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            Video length
            <InfoTip title="Video length">
              Auto shows each image once. A fixed length (15s to 60s) repeats your images in a loop until the video
              is that long. The maximum is 60 seconds.
            </InfoTip>
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {LENGTHS.map((l) => (
              <button
                key={l.label}
                onClick={() => setLengthMode(l.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${
                  lengthMode === l.value
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/20"
                    : "border-white/15 bg-black/30 hover:border-white/40"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            Auto = one cut per image. A fixed length repeats your images in a loop.
          </div>
          {lengthMode === null && images.length > timeline.segments.length && (
            <div className="text-[11px] text-amber-400 mt-2">
              Max video length is 60s, so the last {images.length - timeline.segments.length} image(s) are not used.
              Pick a faster cut (fewer beats per cut) to fit them all.
            </div>
          )}
        </Section>
        </fieldset>
      </div>

      {/* RIGHT: preview */}
      <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col items-center justify-center bg-black/40 relative">
        <div className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-3">Live preview</div>

        {locked && snap && active ? (
          <div className="rounded-2xl overflow-hidden border border-[#8b5cf6] shadow-[0_0_60px_rgba(139,92,246,0.35)] bg-black">
            <EditPreviewBoundary key={snap.key}>
              <Player
                component={snap.component}
                inputProps={snap.previewProps}
                durationInFrames={Math.max(1, snap.durationInFrames)}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={EDIT_FPS}
                controls
                loop
                style={{ width: 320, height: 569 }}
                acknowledgeRemotionLicense={true}
                errorFallback={({ error }: { error: Error }) => (
                  <div className="p-4 text-xs text-red-300 bg-red-950/40 h-full">Player error: {error.message}</div>
                )}
              />
            </EditPreviewBoundary>
          </div>
        ) : (
          <div className="w-[320px] h-[569px] rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-center p-6 gap-3 bg-black/30">
            <Lock className="w-8 h-8 text-gray-500" />
            <div className="font-bold text-gray-300">Preview is off while you edit</div>
            <div className="text-xs text-gray-500">Lock your edit to start the live preview. This keeps the app fast and crash-free.</div>
            {problems.length > 0 ? (
              <ul className="text-xs text-amber-400 space-y-1 mt-1">
                {problems.map((m) => (
                  <li key={m} className="flex items-center gap-1.5 justify-center">
                    <AlertTriangle className="w-3 h-3" /> {m}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-[#39FF14] flex items-center gap-1.5">
                <Check className="w-3 h-3" /> Ready to lock
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" /> {images.length} images
          </span>
          <span>{timeline.segments.length} cuts</span>
          <span>{secs}s total</span>
          <span>
            {sections.length > 0 ? `${sections.length} tempo section${sections.length > 1 ? "s" : ""}` : `cut every ${timeline.cutSeconds.toFixed(2)}s`}
          </span>
        </div>

        <div className="w-full max-w-[420px] mt-6 space-y-3">
          {!locked ? (
            <button
              onClick={handleLock}
              disabled={problems.length > 0}
              className={`w-full font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition ${
                problems.length === 0
                  ? "bg-yellow-500 text-black hover:bg-yellow-400"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Lock className="w-5 h-5" />
              {problems.length === 0 ? "LOCK & PREVIEW" : problems[0].toUpperCase()}
            </button>
          ) : rendering ? (
            <div className="w-full p-5 bg-white/5 rounded-xl border border-white/10">
              <div className="flex justify-between mb-2 font-bold text-sm text-[#c4b5fd]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {status.toUpperCase()}...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 bg-black rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-gray-400">
                <span>Elapsed {fmtDuration(clock.elapsedSec)}</span>
                <span>
                  {eta !== null
                    ? `about ${fmtDuration(eta)} left`
                    : estimate
                      ? `estimated ~${fmtDuration(estimate.totalSec)}`
                      : "estimating..."}
                </span>
              </div>
            </div>
          ) : videoUrl ? (
            <>
              <a
                href={videoUrl}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-gradient-to-r from-[#39FF14] to-[#22d3ee] text-black"
              >
                <Download className="w-5 h-5" /> DOWNLOAD MP4
              </a>
              {renderInfo && <div className="text-center text-xs text-gray-400">{renderInfo}</div>}
              <button
                onClick={handleUnlock}
                className="w-full border border-gray-600 text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5"
              >
                <Unlock className="w-4 h-4" /> EDIT AGAIN
              </button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft}
                  onChange={(e) => setDraft(e.target.checked)}
                  className="accent-[#8b5cf6]"
                />
                Draft mode (much faster, half size, for testing)
                <InfoTip title="Draft mode">
                  Renders at half size (540x960) with quick compression, so it finishes much faster. Use it to test
                  your edit. For the video you upload, turn it off and render the full quality version.
                </InfoTip>
              </label>
              <div className="text-[11px] text-gray-500">
                {estimate
                  ? `Estimated time: about ${fmtDuration(estimate.totalSec)} (${estimate.label})`
                  : "Estimated time: appears after your first render"}
              </div>
              <button
                onClick={handleRender}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] hover:opacity-90 transition"
              >
                <Clapperboard className="w-5 h-5" /> {draft ? "RENDER DRAFT (FAST)" : "RENDER FINAL VIDEO"}
              </button>
              <button
                onClick={handleUnlock}
                className="w-full border border-gray-600 text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5"
              >
                <Unlock className="w-4 h-4" /> UNLOCK TO EDIT
              </button>
            </>
          )}
        </div>
      </div>

      {showCustom && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass rounded-2xl p-6 bg-[#0d0d14]">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-xl font-bold">Add custom edit template</div>
              <button onClick={() => setShowCustom(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="text-xs text-gray-400 list-decimal pl-4 space-y-1 mb-4">
              <li>Copy the AI prompt, paste it in any AI chat, and describe the edit style you want.</li>
              <li>Paste the code the AI gives you below, and type the same template name you gave the AI.</li>
              <li>Inject. The page reloads and your template appears in the gallery.</li>
            </ol>
            <button
              onClick={copyEditPrompt}
              className="mb-4 px-4 py-2.5 rounded-lg font-bold text-sm glass hover:bg-white/10 inline-flex items-center gap-2"
            >
              {promptCopied ? <Check className="w-4 h-4 text-[#39FF14]" /> : <Copy className="w-4 h-4" />}
              {promptCopied ? "Copied!" : "Copy AI prompt"}
            </button>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Template name, e.g. NeonPulse (letters and numbers only)"
              className="w-full mb-3 bg-black/50 border border-white/15 rounded-lg p-3 font-bold text-sm focus:outline-none focus:border-[#8b5cf6]"
            />
            <textarea
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="Paste the .tsx code here"
              className="w-full h-56 bg-black/60 border border-white/15 rounded-lg p-3 font-mono text-xs focus:outline-none focus:border-[#8b5cf6]"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCustom(false)} className="px-4 py-2.5 rounded-lg font-bold text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={saveCustom}
                disabled={savingCustom}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingCustom && <Loader2 className="w-4 h-4 animate-spin" />} Inject template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
