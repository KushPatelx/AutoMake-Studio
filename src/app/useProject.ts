import { useCallback, useEffect, useRef, useState } from "react";
import { projectApi, ProjectMeta, ProjectMode } from "./projectApi";
import { assignMediaId, mediaIdOf } from "./projectMedia";

export type SaveState = "idle" | "saving" | "saved" | "error";

export type UseProjectOptions<T> = {
  mode: ProjectMode;
  // Abhi ka serializable data + usme use hui files
  getState: () => { data: T; media: File[] };
  // Project open hone pe studio apni state isse set karta hai
  applyState: (data: T, files: Map<string, File>) => void;
  // "New project" pe studio ko khali karo
  reset: () => void;
};

const AUTOSAVE_MS = 1500;
const lastKey = (mode: string) => `automake.lastProject.${mode}`;

export function useProject<T>(opts: UseProjectOptions<T>) {
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [list, setList] = useState<ProjectMeta[]>([]);
  const [resume, setResume] = useState<ProjectMeta | null>(null);
  const [opening, setOpening] = useState(false);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const projectRef = useRef<ProjectMeta | null>(null);
  const uploaded = useRef<Map<string, Set<string>>>(new Map());
  const baseline = useRef<string | null>(null);
  const suspendUntil = useRef(0);
  const saving = useRef(false);
  const pending = useRef(false);

  // is render ka "signature": data + media ids. Badla to autosave.
  const st = opts.getState();
  const sig = JSON.stringify(st.data) + "|" + st.media.map(mediaIdOf).join(",");
  const sigRef = useRef(sig);
  sigRef.current = sig;

  // Project open/new ke baad state ke badlav ko "tumhara change" na maano:
  // thodi der autosave roko, phir jo state hai use naya baseline bana do.
  const markApplied = useCallback(() => {
    suspendUntil.current = Date.now() + 400;
    window.setTimeout(() => {
      baseline.current = sigRef.current;
    }, 450);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const l = (await projectApi.list()).filter((p) => p.mode === optsRef.current.mode);
      setList(l);
      return l;
    } catch {
      return [] as ProjectMeta[];
    }
  }, []);

  // ---- save
  const saveNow = useCallback(async () => {
    if (saving.current) {
      pending.current = true;
      return;
    }
    saving.current = true;
    setSaveState("saving");
    try {
      const state = optsRef.current.getState();
      let p = projectRef.current;
      if (!p) {
        const stamp = new Date().toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        p = await projectApi.create(optsRef.current.mode, `Untitled ${stamp}`);
        projectRef.current = p;
        setProject(p);
        try {
          localStorage.setItem(lastKey(optsRef.current.mode), p.id);
        } catch {}
      }
      const done = uploaded.current.get(p.id) ?? new Set<string>();
      uploaded.current.set(p.id, done);
      const mediaIds: string[] = [];
      for (const f of state.media) {
        const mid = mediaIdOf(f);
        mediaIds.push(mid);
        if (!done.has(mid)) {
          await projectApi.uploadMedia(p.id, mid, f);
          done.add(mid);
        }
      }
      const meta = await projectApi.save(p.id, { data: state.data, mediaIds });
      projectRef.current = meta;
      setProject(meta);
      setSavedAt(Date.now());
      setSaveState("saved");
      setError("");
    } catch (e: any) {
      setSaveState("error");
      setError(String(e?.message || e));
    } finally {
      saving.current = false;
      if (pending.current) {
        pending.current = false;
        void saveNow();
      }
    }
  }, []);

  // ---- autosave (sirf tab jab tumne kuch badla ho)
  useEffect(() => {
    if (baseline.current === null) {
      baseline.current = sig;
      return;
    }
    if (Date.now() < suspendUntil.current) return;
    if (sig === baseline.current) return;
    const t = window.setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // ---- start pe: list + "resume last project"
  useEffect(() => {
    (async () => {
      const l = await refreshList();
      try {
        const id = localStorage.getItem(lastKey(optsRef.current.mode));
        const found = id ? l.find((p) => p.id === id) : undefined;
        if (found && !projectRef.current) setResume(found);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- open
  const open = useCallback(async (id: string) => {
    setOpening(true);
    try {
      const full = await projectApi.load(id);
      const files = new Map<string, File>();
      for (const mid of full.mediaIds) {
        try {
          files.set(mid, assignMediaId(await projectApi.fetchMedia(id, mid), mid));
        } catch {
          /* ek file gayab ho to baaki project phir bhi khulta hai */
        }
      }
      pending.current = false;
      projectRef.current = full;
      uploaded.current.set(id, new Set(files.keys()));
      markApplied();
      if (full.data) optsRef.current.applyState(full.data as T, files);
      else optsRef.current.reset();
      setProject({ id: full.id, name: full.name, mode: full.mode, updatedAt: full.updatedAt });
      setSaveState("saved");
      setSavedAt(full.updatedAt);
      setError("");
      setResume(null);
      try {
        localStorage.setItem(lastKey(optsRef.current.mode), id);
      } catch {}
    } catch (e: any) {
      setSaveState("error");
      setError(String(e?.message || e));
    } finally {
      setOpening(false);
    }
  }, [markApplied]);

  const newProject = useCallback(() => {
    markApplied();
    projectRef.current = null;
    setProject(null);
    setSaveState("idle");
    setSavedAt(null);
    setError("");
    setResume(null);
    try {
      localStorage.removeItem(lastKey(optsRef.current.mode));
    } catch {}
    optsRef.current.reset();
  }, [markApplied]);

  const rename = useCallback(async (name: string) => {
    const p = projectRef.current;
    if (!p || !name.trim()) return;
    try {
      const meta = await projectApi.save(p.id, { name });
      projectRef.current = meta;
      setProject(meta);
      void refreshList();
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, [refreshList]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await projectApi.remove(id);
        if (projectRef.current?.id === id) newProject();
        void refreshList();
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    },
    [newProject, refreshList],
  );

  return {
    project,
    saveState,
    savedAt,
    error,
    list,
    resume,
    opening,
    dismissResume: () => setResume(null),
    refreshList,
    open,
    newProject,
    rename,
    remove,
    saveNow,
  };
}

export type ProjectController = ReturnType<typeof useProject>;
