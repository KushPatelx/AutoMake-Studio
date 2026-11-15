import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import type { ProjectController } from "./useProject";
import { InfoTip } from "./InfoTip";

const timeText = (t: number | null) =>
  t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

// Studio ke upar ka project bar: naam, autosave status, Open / New, aur "resume last project"
export const ProjectBar: React.FC<{ pc: ProjectController; busy?: boolean }> = ({ pc, busy = false }) => {
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setName(pc.project?.name ?? ""), [pc.project?.id, pc.project?.name]);

  useEffect(() => {
    if (!menu) return;
    pc.refreshList();
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  const status =
    pc.saveState === "saving" ? (
      <span className="flex items-center gap-1 text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
      </span>
    ) : pc.saveState === "saved" ? (
      <span className="flex items-center gap-1 text-[#39FF14]">
        <Check className="w-3 h-3" /> Saved {timeText(pc.savedAt)}
      </span>
    ) : pc.saveState === "error" ? (
      <span className="flex items-center gap-1 text-amber-400" title={pc.error}>
        <AlertTriangle className="w-3 h-3" /> Not saved (is the server running?)
      </span>
    ) : (
      <span className="text-gray-500">Saves automatically after your first change</span>
    );

  return (
    <div className="mb-5" ref={ref}>
      {pc.resume && !pc.project && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#22d3ee]/30 bg-[#22d3ee]/10 p-3 text-xs text-cyan-100">
          <span className="truncate">
            Resume <b>{pc.resume.name}</b>?
          </span>
          <span className="flex gap-2 shrink-0">
            <button disabled={busy} onClick={() => pc.open(pc.resume!.id)} className="px-3 py-1 rounded-md bg-[#22d3ee] text-black font-bold disabled:opacity-40">
              Open
            </button>
            <button onClick={pc.dismissResume} className="px-3 py-1 rounded-md border border-white/20">
              Dismiss
            </button>
          </span>
        </div>
      )}

      <div className="relative flex items-center gap-2">
        <input
          value={name}
          disabled={!pc.project}
          placeholder="Untitled project"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== pc.project?.name && pc.rename(name)}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-white/40 disabled:text-gray-500"
        />
        <button
          onClick={() => setMenu((m) => !m)}
          disabled={busy}
          title={busy ? "Wait for the render to finish" : undefined}
          className="px-3 py-2 rounded-lg glass hover:bg-white/10 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          {pc.opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
          Projects <ChevronDown className="w-3 h-3" />
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (!pc.project || window.confirm("Start a new project? The current one stays saved in Projects.")) {
              pc.newProject();
              setMenu(false);
            }
          }}
          className="px-3 py-2 rounded-lg glass hover:bg-white/10 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>

        {menu && (
          <div className="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#12121a] p-2 z-[65] shadow-xl">
            {pc.list.length === 0 ? (
              <div className="text-xs text-gray-500 p-3">No saved projects yet. Your work is saved automatically.</div>
            ) : (
              pc.list.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-white/5 ${
                    pc.project?.id === p.id ? "bg-white/5" : ""
                  }`}
                >
                  <button
                    className="text-left min-w-0 flex-1"
                    onClick={() => {
                      pc.open(p.id);
                      setMenu(false);
                    }}
                  >
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-[10px] text-gray-500">{new Date(p.updatedAt).toLocaleString()}</div>
                  </button>
                  <button
                    title="Delete project"
                    onClick={() => window.confirm(`Delete "${p.name}"? This cannot be undone.`) && pc.remove(p.id)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-1.5 text-[11px] flex items-center">
        {status}
        <InfoTip title="Projects" align="right">
          Your work saves by itself a moment after every change (settings, images and music), into the projects folder
          of this app. Open any earlier project from the Projects menu, even after refreshing the page.
        </InfoTip>
      </div>
    </div>
  );
};
