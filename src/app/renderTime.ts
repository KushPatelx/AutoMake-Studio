import { useCallback, useEffect, useRef, useState } from "react";

export const fmtDuration = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

// ---------------------------------------------------------------- history (browser me save, tumhare apne renders)
export type RenderRecord = {
  mode: "fact" | "edit" | "flex";
  template: string;
  frames: number;
  draft: boolean;
  renderSec: number; // sirf frames render hone ka time (server)
  bundleSec: number; // setup (bundle) ka time (server)
  bundleCached: boolean;
  totalSec: number; // button dabane se download ready tak (browser ki ghadi)
  ts: number;
};

const KEY = "automake.renderHistory.v1";

const loadHistory = (): RenderRecord[] => {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

export const recordRender = (r: RenderRecord) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadHistory(), r].slice(-40)));
  } catch {
    /* storage full ya blocked: koi baat nahi */
  }
};

export type Estimate = { totalSec: number; label: string };

// Estimate sirf tumhare pichle renders se banta hai. Record nahi hai to null (koi nakli number nahi).
export function estimateRender(q: {
  mode: "fact" | "edit" | "flex";
  template: string;
  frames: number;
  draft: boolean;
  bundleWarm: boolean | null;
}): Estimate | null {
  const all = loadHistory().filter(
    (r) => r.mode === q.mode && r.draft === q.draft && r.frames > 0 && r.renderSec > 0,
  );
  let pool = all.filter((r) => r.template === q.template).slice(-5);
  let rough = false;
  if (pool.length === 0) {
    pool = all.slice(-5);
    rough = true;
  }
  if (pool.length === 0) return null;

  const secPerFrame = pool.reduce((a, r) => a + r.renderSec / r.frames, 0) / pool.length;
  let total = secPerFrame * q.frames;
  let setup = "";
  if (q.bundleWarm === false) {
    const cold = loadHistory()
      .filter((r) => !r.bundleCached && r.bundleSec > 0)
      .slice(-3);
    if (cold.length > 0) {
      total += cold.reduce((a, r) => a + r.bundleSec, 0) / cold.length;
      setup = ", includes first-time setup";
    }
  }
  const label = `based on your last ${pool.length} render${pool.length > 1 ? "s" : ""}${
    rough ? " of other templates, rough" : ""
  }${setup}`;
  return { totalSec: total, label };
}

// ---------------------------------------------------------------- live clock
// begin() = button dabaya, finish() = download ready. Dono browser ke timestamps hain.
export function useRenderClock() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [phase, setPhase] = useState<{ at: number; progress: number } | null>(null);
  const [totalSec, setTotalSec] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef<number | null>(null);

  const running = startedAt !== null && totalSec === null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const begin = useCallback(() => {
    const t = Date.now();
    startRef.current = t;
    setStartedAt(t);
    setPhase(null);
    setTotalSec(null);
    setNow(t);
  }, []);

  // server ke status/progress pe call karo; "rendering" shuru hote hi ETA ki ginti shuru
  const onProgress = useCallback((status: string, progress: number) => {
    if (status === "rendering") setPhase((p) => p ?? { at: Date.now(), progress });
  }, []);

  const finish = useCallback((): number => {
    const sec = startRef.current ? (Date.now() - startRef.current) / 1000 : 0;
    setTotalSec(sec);
    return sec;
  }, []);

  const fail = useCallback(() => {
    startRef.current = null;
    setStartedAt(null);
    setPhase(null);
    setTotalSec(null);
  }, []);

  const elapsedSec =
    startedAt === null ? 0 : totalSec !== null ? totalSec : Math.max(0, (now - startedAt) / 1000);

  // bacha hua time: render ki speed dekhke (progress 99 pe khatam maana gaya hai)
  const etaSec = (progress: number): number | null => {
    if (!phase) return null;
    const done = progress - phase.progress;
    const secs = (now - phase.at) / 1000;
    if (done < 2 || secs < 3) return null;
    const rate = done / secs;
    return Math.max(0, (99 - progress) / rate);
  };

  return { begin, onProgress, finish, fail, elapsedSec, etaSec, totalSec, running };
}
