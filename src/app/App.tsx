/// <reference types="vite/client" />
import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  Upload,
  Video,
  Download,
  PlayCircle,
  Loader2,
  Lock,
  CheckCircle,
  Unlock,
  Sparkles,
  Settings2,
  Palette,
  Code2,
  Music,
  Copy,
  Trash2,
  X,
} from "lucide-react";

import { TigerFacts } from "../TigerFacts";
import { GeographyFacts } from "../GeographyFacts";
import { PsychologyFacts } from "../PsychologyFacts";
import { ScienceFacts } from "../ScienceFacts";
import { HistoryFacts } from "../HistoryFacts";
import { SpaceFacts } from "../SpaceFacts";
import { TechnologyFacts } from "../TechnologyFacts";
import { SceneData } from "../shared";
import { API, downloadHref } from "./config";
import { useServerInfo } from "./serverInfo";
import { InfoTip } from "./InfoTip";
import {
  estimateRender,
  fmtDuration,
  recordRender,
  useRenderClock,
} from "./renderTime";
import { useProject } from "./useProject";
import { ProjectBar } from "./ProjectBar";
import { mediaIdOf } from "./projectMedia";

type FactItem = {
  eyebrow: string;
  title1: string;
  title2: string;
  subtitle: string;
};

type TemplateItem = {
  id: string;
  name: string;
  comp?: React.ComponentType<any>;
  load?: () => Promise<any>;
};

// Custom template me error aaye to poora app crash na ho, sirf preview me message dikhe
class PreviewBoundary extends React.Component<
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
        <div className="w-[320px] h-[569px] border-2 border-red-700 rounded-2xl p-5 text-xs text-red-300 bg-red-950/30 overflow-auto">
          <b className="block mb-2 text-red-400">Template me error aaya:</b>
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_TEMPLATES: TemplateItem[] = [
  { id: "MrCurious-Nature", name: "Nature", comp: TigerFacts },
  { id: "MrCurious-Geography", name: "Geography", comp: GeographyFacts },
  { id: "MrCurious-Psychology", name: "Psychology", comp: PsychologyFacts },
  { id: "MrCurious-Science", name: "Science", comp: ScienceFacts },
  { id: "MrCurious-History", name: "History", comp: HistoryFacts },
  { id: "MrCurious-Space", name: "Space", comp: SpaceFacts },
  { id: "MrCurious-Technology", name: "Technology", comp: TechnologyFacts },
];

// Lazy glob: ek kharab custom file poore app ko nahi girayegi
// NOTE: Vite sirf seedha `import.meta.glob(...)` pehchanta hai ((import.meta as any).glob?.() nahi)
const customLoaders = import.meta.glob("../CustomTemplates/*.tsx") as Record<
  string,
  () => Promise<any>
>;

const CUSTOM_TEMPLATES: TemplateItem[] = Object.keys(customLoaders).map(
  (path) => {
    const name = path.split("/").pop()?.replace(".tsx", "") || "Custom";
    return {
      id: `Custom-${name}`,
      name: `⭐ Custom: ${name}`,
      load: customLoaders[path],
    };
  },
);

const ALL_TEMPLATES: TemplateItem[] = [
  ...DEFAULT_TEMPLATES,
  ...CUSTOM_TEMPLATES,
];

const AUDIO_OPTIONS = [
  { name: "Nature.mp3", val: "assets/audio/Nature.mp3" },
  { name: "Geography.mp3", val: "assets/audio/Geography.mp3" },
  { name: "Psychology.mp3", val: "assets/audio/Psychology.mp3" },
  { name: "Science.mp3", val: "assets/audio/Science.mp3" },
  { name: "History.mp3", val: "assets/audio/History.mp3" },
  { name: "Space.mp3", val: "assets/audio/Space.mp3" },
  { name: "Technology.mp3", val: "assets/audio/Technology.mp3" },
  { name: "🔇 No Audio (None)", val: "none" },
  { name: "🎵 Upload Custom MP3...", val: "custom" },
];

const BASE_PROMPT = `Act as a React/Remotion expert. Create a visual template for a 1080x1920 short video. The number of scenes and the total length can change (usually 3 scenes and 720 frames), so never hard-code them.

STRICT RULES:
1. Imports: \`import React from "react"; import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";\`
2. Import shared components EXACTLY like this (use only what you need): \`import { FactsVideo, BrandConfig, SceneData, SceneProps, Brand, Backdrop, FloatingEmojis, ProgressBar, ShineSweep, Flash, WordReveal, SubscribeCTA, SAFE, CLAMP, useSceneFade } from "../shared";\`
3. Create a \`Scene\` component typed React.FC<SceneProps>. It receives { data, index, globalStartFrame, isLast, brand }. Use isLast (never a fixed scene number) to decide where the final call-to-action goes, and useVideoConfig().durationInFrames for any progress bar.
4. Inside Scene, render the background with \`<Backdrop image={data.image} scale={1.05} overlays={["linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3))"]} />\`. All text MUST have \`zIndex: 10\` and stay inside SAFE padding (SAFE.left/right/top/bottom).
5. Use data.eyebrow, data.title (array of 2 lines), data.subtitle. Style with \`brand.color\`, and show the channel name with \`<Brand name={brand.name} accent={brand.color} font={...} />\`.
6. Fonts: load with \`@remotion/google-fonts\`, e.g. \`import { loadFont } from "@remotion/google-fonts/Anton"\`. Emojis only as \`\\u{1F680}\` escapes (no raw emoji characters).
7. Never use Math.random() (use \`random("seed")\` from remotion) and never CSS animations. Animate only with useCurrentFrame()/interpolate/spring.
8. The file name and the exported component name MUST be identical (the name I type in the UI). Export exactly: \`export const YOUR_TEMPLATE_NAME: React.FC<{ scenes?: SceneData[]; audio?: string; brand?: BrandConfig }> = ({ scenes, audio, brand }) => <FactsVideo audio={audio} bg="#111" scenes={scenes} brand={brand} Scene={Scene} />;\`
9. Output ONLY the complete .tsx code, nothing else.

[USER REQUIREMENTS GO HERE]: `;

// Project me jo save hota hai (files alag se, id ke saath)
type FactSaved = {
  brandName: string;
  brandColor: string;
  activeTemplateId: string;
  audioOption: string;
  customAudioId: string | null;
  facts: {
    eyebrow: string;
    title1: string;
    title2: string;
    subtitle: string;
  }[];
  imageIds: (string | null)[];
};

const DEFAULT_FACTS = [
  {
    eyebrow: "FACT 01",
    title1: "FIRST",
    title2: "LINE",
    subtitle: "Enter your first amazing fact here.",
  },
  {
    eyebrow: "FACT 02",
    title1: "SECOND",
    title2: "LINE",
    subtitle: "Enter your second amazing fact here.",
  },
  {
    eyebrow: "FACT 03",
    title1: "THIRD",
    title2: "LINE",
    subtitle: "Enter your final mind-blowing fact.",
  },
];

export default function App({ active = true }: { active?: boolean }) {
  const serverInfo = useServerInfo();
  const clock = useRenderClock();
  const [brandName, setBrandName] = useState("MrCurious");
  const [brandColor, setBrandColor] = useState("#39FF14");

  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    ALL_TEMPLATES[ALL_TEMPLATES.length - 1].id,
  );

  const [audioOption, setAudioOption] = useState<string>(AUDIO_OPTIONS[6].val);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);

  let finalAudioSrc = audioOption;
  if (audioOption === "custom") finalAudioSrc = customAudioUrl || "none";

  const activeTemplate =
    ALL_TEMPLATES.find((t) => t.id === activeTemplateId) || ALL_TEMPLATES[0];

  const [loadedComps, setLoadedComps] = useState<
    Record<string, React.ComponentType<any>>
  >({});
  const [templateError, setTemplateError] = useState<string | null>(null);

  const ActiveComp: React.ComponentType<any> | undefined =
    activeTemplate.comp || loadedComps[activeTemplate.id];

  useEffect(() => {
    setTemplateError(null);
    const t = activeTemplate;
    if (!t.load || loadedComps[t.id]) return;
    let alive = true;
    const name = t.id.replace("Custom-", "");
    t.load()
      .then((mod: any) => {
        const comp =
          mod[name] ||
          mod.default ||
          Object.values(mod).find((v) => typeof v === "function");
        if (!comp) {
          throw new Error(
            `"${name}.tsx" me "export const ${name}" nahi mila. Component ka naam file ke naam jaisa hona chahiye.`,
          );
        }
        if (alive) setLoadedComps((p) => ({ ...p, [t.id]: comp as any }));
      })
      .catch((e: any) => {
        if (alive) setTemplateError(String(e?.message || e));
      });
    return () => {
      alive = false;
    };
  }, [activeTemplate.id]);

  const [aiText, setAiText] = useState("");

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTempName, setCustomTempName] = useState("");
  const [customTempCode, setCustomTempCode] = useState("");
  const [isSavingTemp, setIsSavingTemp] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const [facts, setFacts] = useState<FactItem[]>([
    {
      eyebrow: "FACT 01",
      title1: "FIRST",
      title2: "LINE",
      subtitle: "Enter your first amazing fact here.",
    },
    {
      eyebrow: "FACT 02",
      title1: "SECOND",
      title2: "LINE",
      subtitle: "Enter your second amazing fact here.",
    },
    {
      eyebrow: "FACT 03",
      title1: "THIRD",
      title2: "LINE",
      subtitle: "Enter your final mind-blowing fact.",
    },
  ]);

  const [images, setImages] = useState<(File | null)[]>([null, null, null]);
  const [previewUrls, setPreviewUrls] = useState<string[]>(["", "", ""]);

  const [isLocked, setIsLocked] = useState(false);
  const [lockedScenes, setLockedScenes] = useState<SceneData[] | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [draft, setDraft] = useState(false);
  const [renderInfo, setRenderInfo] = useState("");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const allImagesUploaded = images.every((img) => img !== null);

  const handleCopyPrompt = () => {
    const nav = (globalThis as any).navigator;
    if (nav && nav.clipboard) {
      nav.clipboard.writeText(BASE_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  const handleAudioUpload = (e: any) => {
    const target = e.target as any;
    const file = target.files?.[0];
    if (file) {
      setCustomAudioFile(file);
      setCustomAudioUrl(URL.createObjectURL(file));
      setIsLocked(false);
    }
  };

  const handleAutoFill = () => {
    if (!aiText.trim()) return;
    const newFacts = facts.map((f) => ({ ...f }));
    const blocks = aiText
      .split(/SCENE\s*0?[1-3]/i)
      .filter((b) => b.trim().length > 10);

    blocks.forEach((block, index) => {
      if (index > 2) return;
      const eyebrowMatch = block.match(/Eyebrow:\s*(.+)/i);
      const title1Match = block.match(/Title 1:\s*(.+)/i);
      const title2Match = block.match(/Title 2:\s*(.+)/i);
      const subMatch = block.match(/Subtitle:\s*(.+)/i);

      if (eyebrowMatch) newFacts[index].eyebrow = eyebrowMatch[1].trim();
      if (title1Match) newFacts[index].title1 = title1Match[1].trim();
      if (title2Match) newFacts[index].title2 = title2Match[1].trim();
      if (subMatch) newFacts[index].subtitle = subMatch[1].trim();
    });
    setFacts(newFacts);
    setAiText("");
    setIsLocked(false);
  };

  const handleImageUpload = (index: number, e: any) => {
    const target = e.target as any;
    const file = target.files?.[0];
    if (file) {
      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);
      const newUrls = [...previewUrls];
      newUrls[index] = URL.createObjectURL(file);
      setPreviewUrls(newUrls);
      setIsLocked(false);
    }
  };

  const handleFactChange = (
    index: number,
    field: keyof FactItem,
    value: string,
  ) => {
    const newFacts = facts.map((f, i) =>
      i === index ? { ...f, [field]: value } : f,
    );
    setFacts(newFacts);
    setIsLocked(false);
  };

  const handleLock = () => {
    if (!allImagesUploaded) return;
    const scenes: SceneData[] = facts.map((fact, i) => ({
      eyebrow: fact.eyebrow,
      title: [fact.title1, fact.title2],
      subtitle: fact.subtitle,
      image: previewUrls[i],
      accent: brandColor,
      duration: i === 2 ? 300 : 210,
    }));
    setLockedScenes(scenes);
    setIsLocked(true);
    setDownloadUrl(null);
  };

  const saveCustomTemplate = async () => {
    const globalWindow = (globalThis as any).window;
    if (!customTempName || !customTempCode) {
      if (globalWindow) globalWindow.alert("Fill both name and code!");
      return;
    }
    const cleanName = customTempName.replace(/\s+/g, "");
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(cleanName)) {
      if (globalWindow)
        globalWindow.alert(
          "Name sirf letters/numbers/underscore ho aur letter se shuru (e.g. GlitchTheme).",
        );
      return;
    }
    setIsSavingTemp(true);
    try {
      const res = await fetch(`${API}/api/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, code: customTempCode }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        if (globalWindow)
          globalWindow.alert("Template saved! Page reload ho raha hai.");
        setShowCustomModal(false);
        setCustomTempName("");
        setCustomTempCode("");
        // naya template dropdown me dikhane ke liye reload (Vite glob refresh)
        if (globalWindow)
          globalWindow.setTimeout(() => globalWindow.location.reload(), 700);
      } else {
        if (globalWindow) globalWindow.alert("Error saving: " + data.error);
      }
    } catch {
      if (globalWindow) globalWindow.alert("Backend offline! Port 4000");
    }
    setIsSavingTemp(false);
  };

  const deleteCustomTemplate = async () => {
    const globalWindow = (globalThis as any).window;
    const templateName = activeTemplateId.replace("Custom-", "");
    if (
      globalWindow &&
      !globalWindow.confirm(
        `Are you sure you want to permanently delete the "${templateName}" template?`,
      )
    )
      return;

    try {
      const res = await fetch(`${API}/api/template/${templateName}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (data.success) {
        setActiveTemplateId(DEFAULT_TEMPLATES[0].id);
        if (globalWindow) {
          globalWindow.alert("Template deleted! App will now refresh.");
          globalWindow.location.reload();
        }
      } else {
        if (globalWindow) globalWindow.alert("Error deleting: " + data.error);
      }
    } catch {
      if (globalWindow) globalWindow.alert("Backend is offline!");
    }
  };

  const handleRender = async () => {
    const globalWindow = (globalThis as any).window;
    if (audioOption === "custom" && !customAudioFile) {
      if (globalWindow)
        globalWindow.alert(
          "Custom audio select kiya hai par MP3 upload nahi ki.",
        );
      return;
    }
    setIsRendering(true);
    setProgress(0);
    setRenderInfo("");
    clock.begin();
    const formData = new FormData();
    images.forEach((img, i) => {
      if (img) formData.append(`image${i + 1}`, img);
    });

    if (audioOption === "custom" && customAudioFile) {
      formData.append("customAudio", customAudioFile);
    }

    const requestData = {
      compositionId: activeTemplate.id,
      audio: audioOption,
      draft,
      brand: { name: brandName, color: brandColor },
      scenesText: facts.map((fact) => ({
        eyebrow: fact.eyebrow,
        title: [fact.title1, fact.title2],
        subtitle: fact.subtitle,
        accent: brandColor,
      })),
    };
    formData.append("data", JSON.stringify(requestData));

    try {
      const res = await fetch(`${API}/api/render`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !json.jobId) {
        if (globalWindow)
          globalWindow.alert(
            "Error: " + (json.error || "Render start nahi hua"),
          );
        clock.fail();
        setIsRendering(false);
        return;
      }
      const jobId = json.jobId;
      const sse = new EventSource(`${API}/api/progress?jobId=${jobId}`);
      sse.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgress(data.progress);
        clock.onProgress(data.status, data.progress);
        if (data.status === "done") {
          const total = clock.finish();
          recordRender({
            mode: "fact",
            template: activeTemplate.id,
            frames: 720,
            draft,
            renderSec: data.renderSec || 0,
            bundleSec: data.bundleSec || 0,
            bundleCached: !!data.bundleCached,
            totalSec: total,
            ts: Date.now(),
          });
          const parts: string[] = [];
          if (data.renderSec)
            parts.push(`rendering ${fmtDuration(data.renderSec)}`);
          if (data.bundleSec && !data.bundleCached)
            parts.push(`setup ${fmtDuration(data.bundleSec)}`);
          setRenderInfo(
            `Total time: ${fmtDuration(total)}` +
              (parts.length ? ` (${parts.join(", ")})` : "") +
              (data.draft ? " - draft, half size" : ""),
          );
          setDownloadUrl(downloadHref(data.output, `${brandName}_Short.mp4`));
          setIsRendering(false);
          sse.close();
        } else if (data.status === "error") {
          if (globalWindow) globalWindow.alert("Error: " + data.error);
          clock.fail();
          setIsRendering(false);
          sse.close();
        }
      };
      sse.onerror = () => {
        sse.close();
        clock.fail();
        setIsRendering(false);
        if (globalWindow) globalWindow.alert("Server se connection toot gaya.");
      };
    } catch {
      if (globalWindow)
        globalWindow.alert("Backend Engine is offline! Start it on Port 4000.");
      clock.fail();
      setIsRendering(false);
    }
  };

  // ---- projects (autosave)
  const proj = useProject<FactSaved>({
    mode: "fact",
    getState: () => ({
      data: {
        brandName,
        brandColor,
        activeTemplateId,
        audioOption,
        customAudioId: customAudioFile ? mediaIdOf(customAudioFile) : null,
        facts: facts.map((f) => ({
          eyebrow: f.eyebrow,
          title1: f.title1,
          title2: f.title2,
          subtitle: f.subtitle,
        })),
        imageIds: images.map((f) => (f ? mediaIdOf(f) : null)),
      },
      media: [
        ...(images.filter(Boolean) as File[]),
        ...(customAudioFile ? [customAudioFile] : []),
      ],
    }),
    applyState: (d, files) => {
      previewUrls.forEach((u) => u && URL.revokeObjectURL(u));
      if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
      const imgs: (File | null)[] = [0, 1, 2].map((i) => {
        const id = d.imageIds?.[i];
        return id ? (files.get(id) ?? null) : null;
      });
      setImages(imgs);
      setPreviewUrls(imgs.map((f) => (f ? URL.createObjectURL(f) : "")));
      const af = d.customAudioId ? (files.get(d.customAudioId) ?? null) : null;
      setCustomAudioFile(af);
      setCustomAudioUrl(af ? URL.createObjectURL(af) : null);
      setAudioOption(d.audioOption || AUDIO_OPTIONS[6].val);
      setBrandName(d.brandName || "MrCurious");
      setBrandColor(d.brandColor || "#39FF14");
      if (ALL_TEMPLATES.some((t) => t.id === d.activeTemplateId))
        setActiveTemplateId(d.activeTemplateId);
      setFacts(
        d.facts && d.facts.length === 3
          ? d.facts.map((f) => ({ ...f }))
          : DEFAULT_FACTS.map((f) => ({ ...f })),
      );
      setIsLocked(false);
      setLockedScenes(null);
      setDownloadUrl(null);
    },
    reset: () => {
      previewUrls.forEach((u) => u && URL.revokeObjectURL(u));
      if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
      setImages([null, null, null]);
      setPreviewUrls(["", "", ""]);
      setCustomAudioFile(null);
      setCustomAudioUrl(null);
      setAudioOption(AUDIO_OPTIONS[6].val);
      setBrandName("MrCurious");
      setBrandColor("#39FF14");
      setActiveTemplateId(ALL_TEMPLATES[ALL_TEMPLATES.length - 1].id);
      setFacts(DEFAULT_FACTS.map((f) => ({ ...f })));
      setAiText("");
      setIsLocked(false);
      setLockedScenes(null);
      setDownloadUrl(null);
    },
  });

  // Render se pehle ka estimate (sirf tumhare pichle renders se; record nahi to null)
  const estimate = useMemo(
    () =>
      estimateRender({
        mode: "fact",
        template: activeTemplate.id,
        frames: 720,
        draft,
        bundleWarm: serverInfo.bundleWarm,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTemplate.id, draft, serverInfo.bundleWarm, isLocked, downloadUrl],
  );
  const eta = clock.etaSec(progress);

  return (
    <div className="min-h-[calc(100vh-96px)] flex flex-col md:flex-row bg-[#0a0a0a] relative">
      {/* MODAL */}
      {showCustomModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl w-full max-w-4xl shadow-2xl mt-20 md:mt-0">
            <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
              <Code2 className="text-[#39FF14]" /> LLM Template Injection
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Provide this Master Prompt to ChatGPT/Claude, append your creative
              needs, and paste the resulting code below.
            </p>

            <div className="bg-black border border-gray-800 rounded-lg p-4 mb-6 relative group">
              <pre className="text-[10px] md:text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-y-auto max-h-40">
                {BASE_PROMPT}
              </pre>
              <button
                onClick={handleCopyPrompt}
                className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-md flex items-center gap-1 text-xs font-bold transition-all"
              >
                {promptCopied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {promptCopied ? "Copied!" : "Copy Prompt"}
              </button>
            </div>

            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="TemplateName (No spaces, e.g., GlitchTheme)"
                value={customTempName}
                onChange={(e: any) => setCustomTempName(e.target.value)}
                className="w-1/3 bg-black border border-gray-700 rounded-lg p-3 text-white font-bold focus:border-[#39FF14]"
              />
              <div className="w-2/3 text-xs text-gray-500 flex items-center bg-black/50 p-3 rounded-lg border border-gray-800">
                Rule: Component name and filename must match the name you type
                here exactly.
              </div>
            </div>

            <textarea
              placeholder="Paste full React/Remotion TSX code here..."
              value={customTempCode}
              onChange={(e: any) => setCustomTempCode(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-gray-300 font-mono text-xs h-64 mb-6 focus:border-[#39FF14]"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-3 text-gray-400 hover:text-white font-bold bg-transparent border border-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomTemplate}
                disabled={isSavingTemp}
                className="flex-1 py-3 text-black font-black bg-[#39FF14] hover:bg-[#32e011] rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.4)]"
              >
                {isSavingTemp ? "Injecting..." : "Inject Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT EDITOR */}
      <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto md:h-[calc(100vh-96px)] border-r border-gray-800">
        <div className="flex items-center gap-3 mb-8">
          <PlayCircle className="text-[#39FF14] w-8 h-8" />
          <h1 className="text-3xl font-black uppercase text-white">
            Fact Channel <span className="text-[#39FF14]">Studio</span>
          </h1>
        </div>

        <ProjectBar pc={proj} busy={isRendering} />

        {/* 1. BRAND */}
        <div className="mb-6 p-5 bg-gray-900 rounded-xl border border-gray-800">
          <label className="flex items-center justify-between text-gray-400 text-xs font-bold tracking-widest mb-4 uppercase">
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4" /> 1. Brand Identity
            </span>
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <input
                type="text"
                value={brandName}
                onChange={(e: any) => {
                  setBrandName(e.target.value);
                  setIsLocked(false);
                }}
                disabled={isLocked}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-[#39FF14]"
              />
            </div>
            <div>
              <input
                type="color"
                value={brandColor}
                onChange={(e: any) => {
                  setBrandColor(e.target.value);
                  setIsLocked(false);
                }}
                disabled={isLocked}
                className="w-full h-[50px] bg-black border border-gray-700 rounded-lg p-1 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. DESIGN & AUDIO */}
        <div className="mb-6 p-5 bg-gray-900 rounded-xl border border-gray-800 relative">
          <div className="flex justify-between items-center mb-4">
            <label className="flex items-center gap-2 text-gray-400 text-xs font-bold tracking-widest uppercase">
              <Settings2 className="w-4 h-4" /> 2. Design & Audio
            </label>
            <button
              onClick={() => setShowCustomModal(true)}
              disabled={isLocked}
              className="text-[#39FF14] text-xs font-bold flex items-center gap-1 hover:underline"
            >
              <Code2 className="w-3 h-3" /> + Add Custom Template
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2">
              <select
                value={activeTemplateId}
                onChange={(e: any) => {
                  setActiveTemplateId(e.target.value);
                  setIsLocked(false);
                }}
                disabled={isLocked}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white font-bold text-sm focus:outline-none focus:border-[#39FF14]"
              >
                {ALL_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {activeTemplateId.startsWith("Custom-") && (
                <button
                  onClick={deleteCustomTemplate}
                  disabled={isLocked}
                  className="bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900 hover:text-white p-3 rounded-lg transition-colors flex-shrink-0"
                  title="Delete Template"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <select
                value={audioOption}
                onChange={(e: any) => {
                  setAudioOption(e.target.value);
                  setIsLocked(false);
                }}
                disabled={isLocked}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white font-bold text-sm focus:outline-none focus:border-[#39FF14]"
              >
                {AUDIO_OPTIONS.map((a) => (
                  <option key={a.val} value={a.val}>
                    {a.name}
                  </option>
                ))}
              </select>

              {audioOption === "custom" && (
                <div className="flex items-center justify-between bg-black border border-gray-700 rounded-lg p-2 px-3">
                  <span className="text-xs text-gray-400 font-bold flex items-center gap-2 overflow-hidden whitespace-nowrap">
                    <Music className="w-3 h-3 flex-shrink-0" />{" "}
                    {customAudioFile ? customAudioFile.name : "Select .mp3"}
                  </span>
                  <div className="flex items-center gap-2">
                    {customAudioFile && (
                      <button
                        onClick={() => {
                          setCustomAudioFile(null);
                          setCustomAudioUrl(null);
                          setIsLocked(false);
                        }}
                        className="text-red-500 hover:text-red-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors">
                      Upload
                      <input
                        type="file"
                        accept="audio/mpeg, audio/mp3"
                        className="hidden"
                        onChange={handleAudioUpload}
                        disabled={isLocked}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. AI AUTO FILL */}
        <div className="mb-6 p-5 bg-gray-900 rounded-xl border border-blue-900/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full"></div>
          <label className="flex items-center gap-2 text-blue-400 text-xs font-bold tracking-widest mb-3 uppercase">
            <Sparkles className="w-4 h-4" /> 3. AI Magic Auto-Fill
          </label>
          <textarea
            value={aiText}
            onChange={(e: any) => setAiText(e.target.value)}
            disabled={isLocked}
            placeholder={`SCENE 1\nEyebrow: FACT 01\nTitle 1: HELLO\n...`}
            className="w-full bg-black border border-gray-700 rounded-lg p-3 text-gray-300 h-28 mb-3 focus:border-blue-500 font-mono text-sm"
          />
          <button
            onClick={handleAutoFill}
            disabled={isLocked || !aiText.trim()}
            className="w-full bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white font-bold py-2 rounded-lg"
          >
            Auto-Fill Form
          </button>
        </div>

        {/* 4. SCENES */}
        <div className="space-y-6">
          <label className="block text-gray-400 text-xs font-bold tracking-widest uppercase">
            4. Verify Text & Upload Images
          </label>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`p-5 bg-gray-900 rounded-xl border ${
                isLocked ? "border-gray-800 opacity-50" : "border-gray-700"
              } transition-all`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#39FF14]">SCENE 0{i + 1}</h3>
                <label
                  htmlFor={`upload-${i}`}
                  className={`cursor-pointer border px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-colors ${
                    images[i]
                      ? "bg-green-900/30 border-green-500 text-green-400"
                      : "bg-black border-gray-700 text-white"
                  }`}
                >
                  {images[i] ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Image {i + 1} Ready
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Upload Image
                    </>
                  )}
                </label>
                <input
                  id={`upload-${i}`}
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={(e: any) => handleImageUpload(i, e)}
                  disabled={isLocked}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={facts[i].title1}
                  onChange={(e: any) =>
                    handleFactChange(i, "title1", e.target.value)
                  }
                  className="bg-black border border-gray-700 rounded-md p-2 text-white font-bold"
                  disabled={isLocked}
                />
                <input
                  type="text"
                  value={facts[i].title2}
                  onChange={(e: any) =>
                    handleFactChange(i, "title2", e.target.value)
                  }
                  className="bg-black border border-gray-700 rounded-md p-2 text-white font-bold"
                  disabled={isLocked}
                />
              </div>
              <textarea
                value={facts[i].subtitle}
                onChange={(e: any) =>
                  handleFactChange(i, "subtitle", e.target.value)
                }
                className="w-full bg-black border border-gray-700 rounded-md p-2 text-white h-20"
                disabled={isLocked}
              />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PREVIEW */}
      <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col items-center justify-center bg-black relative">
        {isLocked && lockedScenes && active ? (
          <div
            className="rounded-2xl overflow-hidden border transition-all duration-500"
            style={{
              borderColor: brandColor,
              boxShadow: `0 0 40px ${brandColor}33`,
            }}
          >
            <PreviewBoundary
              key={`${activeTemplate.id}-${lockedScenes.length}`}
            >
              {ActiveComp ? (
                <Player
                  component={ActiveComp}
                  inputProps={{
                    scenes: lockedScenes,
                    audio: finalAudioSrc,
                    brand: { name: brandName, color: brandColor },
                  }}
                  durationInFrames={720}
                  fps={30}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  style={{ width: "320px", height: "569px" }}
                  controls
                  autoPlay
                  loop
                  acknowledgeRemotionLicense={true}
                />
              ) : (
                <div className="w-[320px] h-[569px] flex items-center justify-center text-center p-6 text-sm text-gray-400 bg-gray-900">
                  {templateError ? (
                    <span className="text-red-400">{templateError}</span>
                  ) : (
                    "Template load ho raha hai..."
                  )}
                </div>
              )}
            </PreviewBoundary>
          </div>
        ) : (
          <div className="w-[320px] h-[569px] border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-gray-900/50">
            <Video className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="font-bold text-gray-400 mb-2">Preview Offline</h3>
          </div>
        )}

        <div className="mt-8 w-[320px] space-y-4">
          {!isLocked ? (
            <button
              onClick={handleLock}
              disabled={!allImagesUploaded}
              className={`w-full font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 ${
                allImagesUploaded
                  ? "bg-yellow-500 text-black hover:bg-yellow-400"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Lock className="w-5 h-5" />{" "}
              {allImagesUploaded ? "LOCK & PREVIEW" : "WAITING FOR IMAGES..."}
            </button>
          ) : !isRendering && !downloadUrl ? (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.checked)}
                  className="accent-[#39FF14]"
                />
                Draft mode (much faster, half size, for testing)
                <InfoTip title="Draft mode">
                  Renders at half size (540x960) with quick compression, so it
                  finishes much faster. Use it to test your video. For the video
                  you upload, turn it off and render the full quality version.
                </InfoTip>
              </label>
              <div className="text-[11px] text-gray-500">
                {estimate
                  ? `Estimated time: about ${fmtDuration(estimate.totalSec)} (${estimate.label})`
                  : "Estimated time: appears after your first render"}
              </div>
              <button
                onClick={handleRender}
                className="w-full text-black font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: brandColor }}
              >
                <Video className="w-6 h-6" />{" "}
                {draft ? "RENDER DRAFT (FAST)" : "RENDER FINAL VIDEO"}
              </button>
              <button
                onClick={() => setIsLocked(false)}
                className="w-full bg-transparent border border-gray-600 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-900"
              >
                <Unlock className="w-4 h-4" /> UNLOCK TO EDIT
              </button>
            </>
          ) : null}

          {isRendering && (
            <div className="w-full p-5 bg-gray-900 rounded-xl border border-gray-700">
              <div
                className="flex justify-between mb-2 font-bold text-sm"
                style={{ color: brandColor }}
              >
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {progress < 20 ? "Preparing..." : "Rendering..."}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 bg-black rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: brandColor,
                  }}
                ></div>
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
          )}

          {downloadUrl && (
            <>
              <a
                href={downloadUrl}
                className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2"
              >
                <Download className="w-6 h-6" /> DOWNLOAD MP4
              </a>
              {renderInfo && (
                <div className="text-center text-xs text-gray-400">
                  {renderInfo}
                </div>
              )}
              <button
                onClick={() => {
                  setDownloadUrl(null);
                  setIsLocked(false);
                }}
                className="w-full bg-transparent border border-gray-600 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-900"
              >
                <Unlock className="w-4 h-4" /> EDIT / RENDER AGAIN
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
