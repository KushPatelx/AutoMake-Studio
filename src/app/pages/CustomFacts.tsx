/// <reference types="vite/client" />
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Layers,
  Loader2,
  Lock,
  Music,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { SceneData } from "../../shared";
import { AUDIO_OPTIONS, FACT_TEMPLATES } from "../factCatalog";
import { shrinkImage } from "../imageUtils";
import { API, downloadHref } from "../config";
import { useServerInfo } from "../serverInfo";
import { InfoTip } from "../InfoTip";
import { estimateRender, fmtDuration, recordRender, useRenderClock } from "../renderTime";
import customPrompt from "../prompts/CustomFactsMasterPrompt.txt?raw";
import { useProject } from "../useProject";
import { ProjectBar } from "../ProjectBar";
import { mediaIdOf } from "../projectMedia";

const FPS = 30;
const MAX_SCENES = 12;
const MAX_IMAGES_PER_SCENE = 5;
const MAX_TOTAL_SEC = 90;
const MIN_SCENE_SEC = 3;
const MAX_SCENE_SEC = 30;

type Pic = { id: string; file: File; url: string };
type FlexScene = {
  uid: string;
  eyebrow: string;
  title1: string;
  title2: string;
  subtitle: string;
  seconds: number;
  imageMode: "fade" | "cut";
  images: Pic[];
};

// Project me jo save hota hai (files alag se, id ke saath)
type FlexSaved = {
  brandName: string;
  brandColor: string;
  templateId: string;
  audioOption: string;
  audioId: string | null;
  scenes: {
    eyebrow: string;
    title1: string;
    title2: string;
    subtitle: string;
    seconds: number;
    imageMode: "fade" | "cut";
    imageIds: string[];
  }[];
};

type Snap = {
  key: number;
  templateId: string;
  component: React.ComponentType<any>;
  files: File[];
  renderScenes: { eyebrow: string; title: string[]; subtitle: string; duration: number; imageCount: number; imageMode: string }[];
  audioFile: File | null;
  audioOption: string;
  brand: { name: string; color: string };
  totalFrames: number;
  previewProps: Record<string, unknown>;
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const newScene = (n: number, seconds = 7): FlexScene => ({
  uid: uid(),
  eyebrow: `FACT ${String(n).padStart(2, "0")}`,
  title1: "TITLE",
  title2: "LINE",
  subtitle: "Write this fact here.",
  seconds,
  imageMode: "fade",
  images: [],
});

const clampSec = (v: number) => Math.min(MAX_SCENE_SEC, Math.max(MIN_SCENE_SEC, v));

// Preview ke andar kuch bhi fate to sirf ye box dikhe, poora app nahi girna chahiye
class PreviewBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: any) {
    return { error: String(e?.message || e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-[320px] h-[569px] p-5 text-xs text-red-300 bg-red-950/30 overflow-auto flex flex-col gap-2">
          <b className="text-red-400">Preview error:</b>
          <span>{this.state.error}</span>
          <span className="text-gray-400">Unlock, change the template or scenes, then lock again.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const Section: React.FC<{
  n: number;
  title: string;
  children: React.ReactNode;
  tip?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ n, title, children, tip, right }) => (
  <div className="glass rounded-2xl p-5 mb-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#39FF14] to-[#22d3ee] text-black flex items-center justify-center text-xs font-black">
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

const inputCls =
  "w-full bg-black/50 border border-white/15 rounded-lg p-3 font-bold text-sm focus:outline-none focus:border-[#39FF14]";

export default function CustomFacts({ active = true }: { active?: boolean }) {
  const serverInfo = useServerInfo();
  const clock = useRenderClock();

  // ---------------- state
  const [brandName, setBrandName] = useState("MrCurious");
  const [brandColor, setBrandColor] = useState("#39FF14");
  const [templateId, setTemplateId] = useState(FACT_TEMPLATES[0].id);
  const [loadedComps, setLoadedComps] = useState<Record<string, React.ComponentType<any>>>({});
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [audioOption, setAudioOption] = useState<string>(AUDIO_OPTIONS[7].val);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [scenes, setScenes] = useState<FlexScene[]>([newScene(1, 7), newScene(2, 7), newScene(3, 10)]);
  const [processing, setProcessing] = useState(false);
  const [aiText, setAiText] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const [locked, setLocked] = useState(false);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [draft, setDraft] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [renderInfo, setRenderInfo] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;

  // ---------------- template loading (custom templates lazy load hote hain)
  const template = FACT_TEMPLATES.find((t) => t.id === templateId) || FACT_TEMPLATES[0];
  const templateComp: React.ComponentType<any> | undefined = template.comp || loadedComps[template.id];

  useEffect(() => {
    setTemplateError(null);
    const t = template;
    if (!t.load || loadedComps[t.id]) return;
    let alive = true;
    const name = t.id.replace("Custom-", "");
    t.load()
      .then((mod: any) => {
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

  // ---------------- derived
  const totalSec = useMemo(() => scenes.reduce((a, s) => a + s.seconds, 0), [scenes]);
  const totalFrames = Math.round(totalSec * FPS);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (processing) p.push("Images are still being optimized");
    if (templateError) p.push("This template has an error");
    else if (!templateComp) p.push("Template is loading");
    scenes.forEach((s, i) => {
      if (s.images.length === 0) p.push(`Scene ${i + 1} needs an image`);
      else if (!s.title1.trim()) p.push(`Scene ${i + 1} needs Title 1`);
    });
    if (totalSec > MAX_TOTAL_SEC) p.push(`Total length is ${totalSec.toFixed(0)}s, max is ${MAX_TOTAL_SEC}s`);
    if (audioOption === "custom" && !audioFile) p.push("Upload your custom audio or pick another option");
    return p.slice(0, 3);
  }, [processing, templateError, templateComp, scenes, totalSec, audioOption, audioFile]);

  // ---------------- scene editing
  const updateScene = (i: number, patch: Partial<FlexScene>) =>
    setScenes((prev) => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const addScene = () =>
    setScenes((prev) => (prev.length >= MAX_SCENES ? prev : [...prev, newScene(prev.length + 1, 7)]));

  const removeScene = (i: number) =>
    setScenes((prev) => {
      if (prev.length <= 1) return prev;
      prev[i].images.forEach((im) => URL.revokeObjectURL(im.url));
      return prev.filter((_, k) => k !== i);
    });

  const moveScene = (i: number, dir: -1 | 1) =>
    setScenes((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const duplicateScene = (i: number) =>
    setScenes((prev) => {
      if (prev.length >= MAX_SCENES) return prev;
      const src = prev[i];
      const copy: FlexScene = { ...src, uid: uid(), images: [] }; // images copy nahi hoti (naye upload karo)
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });

  const addImages = async (i: number, list: FileList | null) => {
    if (locked || !list || list.length === 0) return;
    const current = scenesRef.current[i];
    if (!current) return;
    const room = MAX_IMAGES_PER_SCENE - current.images.length;
    if (room <= 0) {
      window.alert(`Max ${MAX_IMAGES_PER_SCENE} images per scene.`);
      return;
    }
    const picked = Array.from(list).slice(0, room);
    setProcessing(true);
    const out: Pic[] = [];
    const failed: string[] = [];
    for (const f of picked) {
      try {
        const small = await shrinkImage(f);
        out.push({ id: uid(), file: small, url: URL.createObjectURL(small) });
      } catch {
        failed.push(f.name);
      }
    }
    const uidOfScene = current.uid;
    setScenes((prev) =>
      prev.map((s) => (s.uid === uidOfScene ? { ...s, images: [...s.images, ...out].slice(0, MAX_IMAGES_PER_SCENE) } : s)),
    );
    setProcessing(false);
    if (failed.length) window.alert(`These files could not be opened (use JPG, PNG or WebP): ${failed.join(", ")}`);
  };

  const removeImage = (i: number, k: number) =>
    setScenes((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        URL.revokeObjectURL(s.images[k].url);
        return { ...s, images: s.images.filter((_, n) => n !== k) };
      }),
    );

  const moveImage = (i: number, k: number, dir: -1 | 1) =>
    setScenes((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        const j = k + dir;
        if (j < 0 || j >= s.images.length) return s;
        const imgs = [...s.images];
        [imgs[k], imgs[j]] = [imgs[j], imgs[k]];
        return { ...s, images: imgs };
      }),
    );

  // ---------------- AI auto-fill (kitne bhi scenes)
  const handleAutoFill = () => {
    if (locked || !aiText.trim()) return;
    const blocks = aiText
      .split(/SCENE\s*\d+/i)
      .filter((b) => b.trim().length > 10)
      .slice(0, MAX_SCENES);
    if (blocks.length === 0) {
      window.alert("SCENE 1, SCENE 2... wala block nahi mila. AI se bola hua format paste karo.");
      return;
    }
    setScenes((prev) => {
      const filled = blocks.map((block, i) => {
        const base = prev[i] ?? newScene(i + 1, 7);
        const eyebrow = block.match(/Eyebrow:\s*(.+)/i);
        const t1 = block.match(/Title 1:\s*(.+)/i);
        const t2 = block.match(/Title 2:\s*(.+)/i);
        const sub = block.match(/Subtitle:\s*(.+)/i);
        const dur = block.match(/Duration:\s*([0-9]+(?:\.[0-9]+)?)/i);
        return {
          ...base,
          eyebrow: eyebrow ? eyebrow[1].trim() : base.eyebrow,
          title1: t1 ? t1[1].trim() : base.title1,
          title2: t2 ? t2[1].trim() : base.title2,
          subtitle: sub ? sub[1].trim() : base.subtitle,
          seconds: dur ? clampSec(Number(dur[1])) : base.seconds,
        };
      });
      return [...filled, ...prev.slice(blocks.length)];
    });
    setAiText("");
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(customPrompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = customPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 2500);
  };

  // ---------------- audio
  const onAudioFile = (file: File | null) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(file ? URL.createObjectURL(file) : null);
  };

  // ---------------- lock / unlock
  const handleLock = () => {
    if (problems.length > 0 || rendering || !templateComp) return;
    const brand = { name: brandName.trim() || "MrCurious", color: brandColor };
    const sceneData: SceneData[] = scenes.map((s) => ({
      image: s.images[0].url,
      images: s.images.map((im) => im.url),
      imageMode: s.imageMode,
      eyebrow: s.eyebrow,
      title: [s.title1, s.title2].filter((t) => t.trim()),
      subtitle: s.subtitle,
      accent: brand.color,
      duration: Math.round(s.seconds * FPS),
    }));
    const audioSrc = audioOption === "custom" ? audioUrl ?? "none" : audioOption;
    setSnap({
      key: Date.now(),
      templateId: template.id,
      component: templateComp,
      files: scenes.flatMap((s) => s.images.map((im) => im.file)),
      renderScenes: scenes.map((s) => ({
        eyebrow: s.eyebrow,
        title: [s.title1, s.title2].filter((t) => t.trim()),
        subtitle: s.subtitle,
        duration: Math.round(s.seconds * FPS),
        imageCount: s.images.length,
        imageMode: s.imageMode,
      })),
      audioFile: audioOption === "custom" ? audioFile : null,
      audioOption,
      brand,
      totalFrames,
      previewProps: { scenes: sceneData, audio: audioSrc, brand, durationInFrames: totalFrames },
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
        compositionId: `Flex-${snap.templateId}`,
        scenes: snap.renderScenes,
        audio: snap.audioOption,
        brand: snap.brand,
        draft,
      }),
    );

    try {
      const res = await fetch(`${API}/api/render-facts`, { method: "POST", body: fd });
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
            mode: "flex",
            template: snap.templateId,
            frames: snap.totalFrames,
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
          setVideoUrl(downloadHref(d.output || "", `${snap.brand.name}_Facts.mp4`));
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

  const estimate = useMemo(
    () =>
      locked && snap
        ? estimateRender({
            mode: "flex",
            template: snap.templateId,
            frames: snap.totalFrames,
            draft,
            bundleWarm: serverInfo.bundleWarm,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked, snap?.templateId, snap?.totalFrames, draft, serverInfo.bundleWarm, videoUrl],
  );
  const eta = clock.etaSec(progress);

  // ---------------- projects (autosave)
  const proj = useProject<FlexSaved>({
    mode: "flex",
    getState: () => ({
      data: {
        brandName,
        brandColor,
        templateId,
        audioOption,
        audioId: audioFile ? mediaIdOf(audioFile) : null,
        scenes: scenes.map((s) => ({
          eyebrow: s.eyebrow,
          title1: s.title1,
          title2: s.title2,
          subtitle: s.subtitle,
          seconds: s.seconds,
          imageMode: s.imageMode,
          imageIds: s.images.map((im) => mediaIdOf(im.file)),
        })),
      },
      media: [...scenes.flatMap((s) => s.images.map((im) => im.file)), ...(audioFile ? [audioFile] : [])],
    }),
    applyState: (d, files) => {
      scenes.forEach((s) => s.images.forEach((im) => URL.revokeObjectURL(im.url)));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const restored: FlexScene[] = (d.scenes || []).slice(0, MAX_SCENES).map((s) => ({
        uid: uid(),
        eyebrow: s.eyebrow,
        title1: s.title1,
        title2: s.title2,
        subtitle: s.subtitle,
        seconds: clampSec(Number(s.seconds) || 7),
        imageMode: s.imageMode === "cut" ? "cut" : "fade",
        images: (s.imageIds || [])
          .map((id) => files.get(id))
          .filter((f): f is File => !!f)
          .map((f) => ({ id: uid(), file: f, url: URL.createObjectURL(f) })),
      }));
      setScenes(restored.length ? restored : [newScene(1, 7), newScene(2, 7), newScene(3, 10)]);
      const af = d.audioId ? files.get(d.audioId) ?? null : null;
      setAudioFile(af);
      setAudioUrl(af ? URL.createObjectURL(af) : null);
      setAudioOption(d.audioOption || AUDIO_OPTIONS[7].val);
      setBrandName(d.brandName || "MrCurious");
      setBrandColor(d.brandColor || "#39FF14");
      if (FACT_TEMPLATES.some((t) => t.id === d.templateId)) setTemplateId(d.templateId);
      setLocked(false);
      setSnap(null);
      setVideoUrl(null);
    },
    reset: () => {
      scenes.forEach((s) => s.images.forEach((im) => URL.revokeObjectURL(im.url)));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setScenes([newScene(1, 7), newScene(2, 7), newScene(3, 10)]);
      setAudioFile(null);
      setAudioUrl(null);
      setAudioOption(AUDIO_OPTIONS[7].val);
      setBrandName("MrCurious");
      setBrandColor("#39FF14");
      setTemplateId(FACT_TEMPLATES[0].id);
      setAiText("");
      setLocked(false);
      setSnap(null);
      setVideoUrl(null);
    },
  });

  // ---------------- UI
  return (
    <div className="min-h-[calc(100vh-96px)] flex flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full md:w-1/2 p-5 md:p-8 overflow-y-auto md:h-[calc(100vh-96px)] border-r border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="text-[#39FF14] w-8 h-8" />
          <h1 className="font-display text-3xl font-bold">
            Custom <span className="grad-text-fact">Facts</span>
          </h1>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Any number of scenes, your own scene lengths and several images per scene.
        </p>

        <ProjectBar pc={proj} busy={rendering} />

        {locked && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Locked: preview is frozen. Press UNLOCK TO EDIT on the right to change anything.</span>
          </div>
        )}

        <fieldset disabled={locked} className={`min-w-0 border-0 p-0 m-0 transition ${locked ? "opacity-50" : ""}`}>
          {/* 1 look + audio */}
          <Section
            n={1}
            title="Look and music"
            tip={<>The template decides how the text and images animate. Music is optional: pick a track, or upload your own.</>}
          >
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Channel name</label>
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={30} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Color</label>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-full mt-1 h-[46px] bg-black/50 border border-white/15 rounded-lg p-1 cursor-pointer"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Template</label>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${inputCls} mt-1`}>
                  {FACT_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Music</label>
                <select value={audioOption} onChange={(e) => setAudioOption(e.target.value)} className={`${inputCls} mt-1`}>
                  {AUDIO_OPTIONS.map((a) => (
                    <option key={a.val} value={a.val}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {templateError && (
              <div className="text-[11px] text-red-300 bg-red-950/30 rounded-lg p-2 mt-3 break-words">{templateError}</div>
            )}
            {audioOption === "custom" && (
              <div className="mt-3">
                {audioFile ? (
                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg p-3">
                    <span className="flex items-center gap-2 text-sm font-bold truncate">
                      <Music className="w-4 h-4 text-[#39FF14] shrink-0" />
                      {audioFile.name}
                    </span>
                    <button onClick={() => onAudioFile(null)} className="text-gray-400 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-white/20 hover:border-[#39FF14] rounded-xl p-3 cursor-pointer text-sm font-bold">
                    <Upload className="w-4 h-4 text-[#39FF14]" /> Upload audio (MP3, WAV, M4A)
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        onAudioFile(e.target.files?.[0] || null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </Section>

          {/* 2 auto fill */}
          <Section
            n={2}
            title="AI auto-fill"
            tip={
              <>
                Research with any AI using the Custom Facts prompt, then paste the SCENE 1, SCENE 2... block here. The
                scenes are created or updated automatically, including their lengths if the block has a Duration line.
              </>
            }
          >
            <button
              onClick={copyPrompt}
              className="mb-3 px-4 py-2.5 rounded-lg font-bold text-sm glass hover:bg-white/10 inline-flex items-center gap-2"
            >
              {promptCopied ? <Check className="w-4 h-4 text-[#39FF14]" /> : <Copy className="w-4 h-4" />}
              {promptCopied ? "Copied!" : "Copy AI prompt (Custom Facts)"}
            </button>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder={"SCENE 1\nEyebrow: ...\nTitle 1: ...\nTitle 2: ...\nSubtitle: ...\nDuration: 7\n\nSCENE 2\n..."}
              className="w-full h-32 bg-black/60 border border-white/15 rounded-lg p-3 font-mono text-xs focus:outline-none focus:border-[#39FF14]"
            />
            <button
              onClick={handleAutoFill}
              disabled={!aiText.trim()}
              className="mt-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#39FF14] text-black disabled:opacity-40 inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Auto-fill scenes
            </button>
          </Section>

          {/* 3 scenes */}
          <Section
            n={3}
            title={`Scenes (${scenes.length}/${MAX_SCENES})`}
            right={<span className="text-xs font-bold text-gray-300">{totalSec.toFixed(1)}s total</span>}
            tip={
              <>
                Each scene has its own text, length (3 to 30 seconds) and 1 to 5 images. The video can be up to 90
                seconds in total. The last scene shows the follow call-to-action, so give it at least 6 seconds.
              </>
            }
          >
            <div className="space-y-4">
              {scenes.map((sc, i) => {
                const maxChars = Math.round(sc.seconds * 16);
                const tooLong = sc.subtitle.length > maxChars;
                return (
                  <div key={sc.uid} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-sm">
                        Scene {i + 1} <span className="text-gray-500 font-normal">({sc.seconds.toFixed(1)}s)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveScene(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30" title="Move up">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30" title="Move down">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => duplicateScene(i)} disabled={scenes.length >= MAX_SCENES} className="p-1 text-gray-400 hover:text-white disabled:opacity-30" title="Duplicate text (images are not copied)">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeScene(i)} disabled={scenes.length <= 1} className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-30" title="Delete scene">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input value={sc.eyebrow} onChange={(e) => updateScene(i, { eyebrow: e.target.value })} placeholder="Eyebrow" className={inputCls} />
                      <input value={sc.title1} onChange={(e) => updateScene(i, { title1: e.target.value })} placeholder="Title 1" className={inputCls} />
                      <input value={sc.title2} onChange={(e) => updateScene(i, { title2: e.target.value })} placeholder="Title 2 (optional)" className={inputCls} />
                    </div>
                    <textarea
                      value={sc.subtitle}
                      onChange={(e) => updateScene(i, { subtitle: e.target.value })}
                      rows={3}
                      placeholder="Subtitle"
                      className="w-full bg-black/50 border border-white/15 rounded-lg p-3 text-sm focus:outline-none focus:border-[#39FF14]"
                    />
                    <div className={`text-[11px] mt-1 ${tooLong ? "text-amber-400" : "text-gray-500"}`}>
                      {sc.subtitle.length} characters. About {maxChars} fit in {sc.seconds.toFixed(1)}s.
                    </div>

                    <div className="mt-3">
                      <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex justify-between">
                        <span>Scene length</span>
                        <span className="text-white">{sc.seconds.toFixed(1)}s</span>
                      </label>
                      <input
                        type="range"
                        min={MIN_SCENE_SEC}
                        max={MAX_SCENE_SEC}
                        step={0.5}
                        value={sc.seconds}
                        onChange={(e) => updateScene(i, { seconds: Number(e.target.value) })}
                        className="w-full accent-[#39FF14]"
                      />
                      {i === scenes.length - 1 && sc.seconds < 6 && (
                        <div className="text-[11px] text-amber-400">Give the last scene 6s or more so the follow call-to-action can appear.</div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                        Images ({sc.images.length}/{MAX_IMAGES_PER_SCENE})
                        <InfoTip title="Images in a scene">
                          Add 1 to 5 images. With more than one, the images change one after another inside the scene,
                          sharing the scene length equally.
                        </InfoTip>
                      </div>
                      <div className="flex flex-wrap gap-2 items-start">
                        {sc.images.map((im, k) => (
                          <div key={im.id} className="relative w-[58px] aspect-[9/16] rounded-md overflow-hidden border border-white/15">
                            <img src={im.url} className="w-full h-full object-cover" draggable={false} />
                            <span className="absolute top-0.5 left-0.5 text-[9px] font-black bg-black/70 px-1 rounded">{k + 1}</span>
                            <button onClick={() => removeImage(i, k)} className="absolute top-0.5 right-0.5 bg-black/70 rounded p-0.5 hover:bg-red-600">
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 flex justify-between bg-black/60">
                              <button onClick={() => moveImage(i, k, -1)} className="hover:text-[#39FF14]">
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => moveImage(i, k, 1)} className="hover:text-[#39FF14]">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {sc.images.length < MAX_IMAGES_PER_SCENE && (
                          <label className="w-[58px] aspect-[9/16] rounded-md border-2 border-dashed border-white/20 hover:border-[#39FF14] flex items-center justify-center cursor-pointer">
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-[#39FF14]" />}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                addImages(i, e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {sc.images.length > 1 && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-300">
                          Change style:
                          {(["fade", "cut"] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => updateScene(i, { imageMode: m })}
                              className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${
                                sc.imageMode === m ? "border-[#39FF14] bg-[#39FF14]/15" : "border-white/15"
                              }`}
                            >
                              {m === "fade" ? "Crossfade" : "Hard cut"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addScene}
              disabled={scenes.length >= MAX_SCENES}
              className="mt-4 w-full border border-dashed border-white/20 hover:border-[#39FF14] rounded-xl py-3 text-sm font-bold text-gray-300 inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Add scene
            </button>
          </Section>
        </fieldset>
      </div>

      {/* RIGHT */}
      <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col items-center justify-center bg-black/40 relative">
        <div className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-3">Live preview</div>

        {locked && snap && active ? (
          <div className="rounded-2xl overflow-hidden border border-[#39FF14] shadow-[0_0_60px_rgba(57,255,20,0.2)] bg-black">
            <PreviewBoundary key={snap.key}>
              <Player
                component={snap.component}
                inputProps={snap.previewProps}
                durationInFrames={Math.max(1, snap.totalFrames)}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={FPS}
                controls
                loop
                style={{ width: 320, height: 569 }}
                acknowledgeRemotionLicense={true}
                errorFallback={({ error }: { error: Error }) => (
                  <div className="p-4 text-xs text-red-300 bg-red-950/40 h-full">Player error: {error.message}</div>
                )}
              />
            </PreviewBoundary>
          </div>
        ) : (
          <div className="w-[320px] h-[569px] rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-center p-6 gap-3 bg-black/30">
            <Lock className="w-8 h-8 text-gray-500" />
            <div className="font-bold text-gray-300">Preview is off while you edit</div>
            <div className="text-xs text-gray-500">Lock your video to start the live preview. This keeps the app fast and crash-free.</div>
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
          <span>{scenes.length} scenes</span>
          <span>{scenes.reduce((a, s) => a + s.images.length, 0)} images</span>
          <span>{(locked && snap ? snap.totalFrames / FPS : totalSec).toFixed(1)}s total</span>
        </div>

        <div className="w-full max-w-[420px] mt-6 space-y-3">
          {!locked ? (
            <button
              onClick={handleLock}
              disabled={problems.length > 0}
              className={`w-full font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition ${
                problems.length === 0 ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Lock className="w-5 h-5" />
              {problems.length === 0 ? "LOCK & PREVIEW" : problems[0].toUpperCase()}
            </button>
          ) : rendering ? (
            <div className="w-full p-5 bg-white/5 rounded-xl border border-white/10">
              <div className="flex justify-between mb-2 font-bold text-sm text-[#39FF14]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {status.toUpperCase()}...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#39FF14] to-[#22d3ee] transition-all" style={{ width: `${progress}%` }} />
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
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-blue-600 text-white"
              >
                <Download className="w-5 h-5" /> DOWNLOAD MP4
              </a>
              {renderInfo && <div className="text-center text-xs text-gray-400">{renderInfo}</div>}
              <button
                onClick={handleUnlock}
                className="w-full border border-gray-600 text-gray-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5"
              >
                <Unlock className="w-4 h-4" /> EDIT / RENDER AGAIN
              </button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} className="accent-[#39FF14]" />
                Draft mode (much faster, half size, for testing)
                <InfoTip title="Draft mode">
                  Renders at half size (540x960) with quick compression, so it finishes much faster. Use it to test.
                  For the video you upload, turn it off and render the full quality version.
                </InfoTip>
              </label>
              <div className="text-[11px] text-gray-500">
                {estimate
                  ? `Estimated time: about ${fmtDuration(estimate.totalSec)} (${estimate.label})`
                  : "Estimated time: appears after your first render"}
              </div>
              <button
                onClick={handleRender}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-black"
                style={{ backgroundColor: brandColor }}
              >
                <Video className="w-5 h-5" /> {draft ? "RENDER DRAFT (FAST)" : "RENDER FINAL VIDEO"}
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
    </div>
  );
}
