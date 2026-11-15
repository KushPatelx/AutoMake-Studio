/// <reference types="vite/client" />
import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  Film,
  Image as ImageIcon,
  Music,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import masterPrompt from "../prompts/ShortsStudioMasterPrompt.txt?raw";

// ------------------------------------------------------------ phone mockups
const FactPhone: React.FC = () => (
  <div className="anim-floaty w-[150px] h-[266px] rounded-[22px] border border-white/20 bg-gradient-to-b from-[#1a2a1f] via-[#0b0f0c] to-black overflow-hidden relative shadow-[0_0_40px_rgba(57,255,20,0.18)]">
    <div className="absolute top-0 left-0 h-[3px] bg-[#39FF14] anim-progress" style={{ boxShadow: "0 0 8px #39FF14" }} />
    <div className="absolute bottom-6 left-3 right-3">
      <div className="anim-slide-l inline-block bg-[#39FF14] text-black text-[7px] font-black px-1.5 py-0.5 rounded-sm mb-1.5 tracking-wider">
        MIND-BLOWING FACT
      </div>
      <div className="anim-slide-l font-black text-[22px] leading-[0.95] text-white">SILENT</div>
      <div className="anim-slide-r font-black text-[22px] leading-[0.95] text-[#39FF14]">ASSASSINS</div>
      <div className="anim-fade-up mt-2 rounded border-l-2 border-[#39FF14] bg-white/10 p-1.5 space-y-1">
        <div className="h-1 w-full bg-white/50 rounded" />
        <div className="h-1 w-4/5 bg-white/40 rounded" />
        <div className="h-1 w-3/5 bg-white/30 rounded" />
      </div>
    </div>
  </div>
);

const EditPhone: React.FC = () => (
  <div className="anim-floaty w-[150px] h-[266px] rounded-[22px] border border-white/20 overflow-hidden relative shadow-[0_0_40px_rgba(139,92,246,0.25)]">
    <div className="absolute inset-0 anim-img" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
    <div className="absolute inset-0 bg-white anim-beat" />
    <div className="absolute top-3 left-3 text-[8px] font-black tracking-widest text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
      BEAT SYNC
    </div>
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between h-10">
      {[0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2].map((d, i) => (
        <div key={i} className="w-2 h-full rounded-sm bg-white/90 anim-eq" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  </div>
);

// ------------------------------------------------------------ small pieces
const Bullet: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <li className="flex items-start gap-2 text-sm text-gray-300">
    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
    <span>{children}</span>
  </li>
);

const FAQ: { q: string; a: string }[] = [
  {
    q: "What do I need before I start?",
    a: "Node project running (npm run server and npm run ui), 3 images for Fact mode (or up to 30 for Edit mode), and an MP3 if you want music. The green 'Server online' badge at the top means rendering is ready.",
  },
  {
    q: "Is my work saved?",
    a: "Yes. Each studio saves your project automatically a moment after every change (settings, images and music) into the projects folder of this app. Use the Projects menu at the top of a studio to open, rename or delete older projects, even after refreshing the page.",
  },
  {
    q: "Where do I get the facts or text?",
    a: "From any AI chat or your own research. Use the Master Prompt button above: paste it in an AI chat, finish the research, and paste the Auto-Fill block it gives you into Fact Studio.",
  },
  {
    q: "What image and music files work?",
    a: "Images: JPG or PNG, vertical 9:16 looks best (1080x1920). Music: MP3. Subject in the upper half of the image keeps the text readable.",
  },
  {
    q: "Can I use my own template?",
    a: "Yes, in both studios. Ask an AI to write one using the custom template prompt inside the studio, then paste the code with the Add Custom Template button. Edit Studio has its own prompt that explains images, cuts and beats to the AI.",
  },
  {
    q: "Why is rendering slow?",
    a: "Every frame is drawn one by one, so heavy effects take longer. Lighter templates render faster. Speed options are on our roadmap.",
  },
  {
    q: "Is it safe to use any image or song?",
    a: "Copyright is your responsibility. Use images and music you have the right to use, and check YouTube's policies before uploading.",
  },
];

// ------------------------------------------------------------ page
export default function Home({
  siteName,
  serverOnline,
}: {
  siteName: string;
  serverOnline: boolean | null;
}) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(masterPrompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = masterPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8">
      {/* ---------------- hero ---------------- */}
      <section className="pt-16 md:pt-24 pb-14 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full glass text-gray-300 mb-6">
          <Zap className="w-3.5 h-3.5 text-[#39FF14]" /> Research with AI. Render with {siteName}.
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5">
          Make viral Shorts <br className="hidden md:block" />
          in <span className="grad-text-hero">minutes, not hours</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
          You bring the idea, the images and the music. We handle the animation, the transitions and the
          heavy rendering.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#/fact"
            className="px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-[#39FF14] to-[#22d3ee] text-black inline-flex items-center gap-2 hover:opacity-90 transition"
          >
            Fact Channel Mode <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#/edit"
            className="px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white inline-flex items-center gap-2 hover:opacity-90 transition"
          >
            Cool Edits Mode <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ---------------- mode cards ---------------- */}
      <section className="grid md:grid-cols-2 gap-6 pb-16">
        {/* FACT */}
        <div className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#39FF14]/10 blur-3xl" />
          <div className="relative flex gap-6 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Film className="w-5 h-5 text-[#39FF14]" />
                <span className="text-xs font-bold tracking-widest text-[#39FF14]">MODE 1</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
                <span className="grad-text-fact">Fact Channel</span> Mode
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                3 facts in, a finished 24-second Short out. Or build longer videos with Custom Facts.
              </p>
              <ul className="space-y-2 mb-6">
                <Bullet color="#39FF14">Paste one AI block and everything auto-fills</Bullet>
                <Bullet color="#39FF14">7 built-in categories plus custom templates</Bullet>
                <Bullet color="#39FF14">Live preview, then one-click MP4 render</Bullet>
              </ul>
              <div className="flex flex-wrap gap-2">
                <a
                  href="#/fact"
                  className="px-4 py-2.5 rounded-lg font-bold text-sm bg-[#39FF14] text-black inline-flex items-center gap-2 hover:opacity-90 transition"
                >
                  Open Fact Studio <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  onClick={copyPrompt}
                  className="px-4 py-2.5 rounded-lg font-bold text-sm glass hover:bg-white/10 transition inline-flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-[#39FF14]" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Master Prompt"}
                </button>
              </div>
            </div>
            <div className="hidden sm:block shrink-0">
              <FactPhone />
            </div>
          </div>
        </div>

        {/* EDIT */}
        <div className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#8b5cf6]/20 blur-3xl" />
          <div className="relative flex gap-6 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="w-5 h-5 text-[#c4b5fd]" />
                <span className="text-xs font-bold tracking-widest text-[#c4b5fd]">MODE 2</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ec4899]/20 text-[#f9a8d4] border border-[#ec4899]/30">
                  BETA
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
                <span className="grad-text-edit">Cool Edits</span> Mode
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Drop in images and a song, pick an edit template, get a beat-synced edit.
              </p>
              <ul className="space-y-2 mb-6">
                <Bullet color="#c4b5fd">Up to 30 images, any order</Bullet>
                <Bullet color="#c4b5fd">Upload any music you like</Bullet>
                <Bullet color="#c4b5fd">Built-in or custom edit templates</Bullet>
              </ul>
              <a
                href="#/edit"
                className="px-4 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white inline-flex items-center gap-2 hover:opacity-90 transition"
              >
                Open Edit Studio <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="hidden sm:block shrink-0">
              <EditPhone />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="pb-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Sparkles,
              title: "1. Research with your AI",
              text: "Use any AI chat or Google AI mode. The Master Prompt guides you from topic to a ready block of text, image ideas and YouTube metadata.",
            },
            {
              icon: Wand2,
              title: "2. Paste, style, preview",
              text: "Paste the block, pick a template, add your images and music, and watch the live preview.",
            },
            {
              icon: Film,
              title: "3. Render and upload",
              text: "One click renders the MP4. Then a console script fills your YouTube title, description and tags.",
            },
          ].map((s) => (
            <div key={s.title} className="glass rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-[#22d3ee]" />
              </div>
              <div className="font-bold mb-2">{s.title}</div>
              <div className="text-sm text-gray-400">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- checklist ---------------- */}
      <section className="pb-16">
        <div className="glass rounded-3xl p-6 md:p-8 grid md:grid-cols-3 gap-6">
          <div>
            <ImageIcon className="w-5 h-5 text-[#39FF14] mb-3" />
            <div className="font-bold mb-1">Images</div>
            <div className="text-sm text-gray-400">JPG or PNG, vertical 9:16 (1080x1920). Keep the subject in the upper half.</div>
          </div>
          <div>
            <Music className="w-5 h-5 text-[#22d3ee] mb-3" />
            <div className="font-bold mb-1">Music</div>
            <div className="text-sm text-gray-400">Any MP3. Pick something you have rights to use.</div>
          </div>
          <div>
            <Zap className="w-5 h-5 text-[#c4b5fd] mb-3" />
            <div className="font-bold mb-1">Render server</div>
            <div className="text-sm text-gray-400">
              {serverOnline
                ? "Connected. You are ready to render."
                : "Offline. Run npm run server in your project terminal."}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="pb-20 max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">Good to know</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="glass rounded-xl p-4 group">
              <summary className="cursor-pointer font-semibold list-none flex items-center justify-between">
                {f.q}
                <span className="text-gray-500 group-open:rotate-45 transition text-xl leading-none">+</span>
              </summary>
              <p className="text-sm text-gray-400 mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-500">
        {siteName}. You are responsible for the rights to the images, music and text you use.
      </footer>
    </div>
  );
}
