import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, Repeat } from "lucide-react";
import type { TempoSection } from "../editShared";
import { fmtClock, sectionAt } from "./songTime";

// Poora gaana sunne ke liye player: waveform ke upar chalta playhead, seek slider, time aur current section.
// Playhead, time aur slider direct DOM se update hote hain (60 fps), taaki poora Edit Studio re-render na ho.
export const SongPlayer: React.FC<{
  audioUrl: string;
  duration: number;
  windowStart: number; // video ka hissa (gaane ke seconds)
  windowSec: number;
  sections: TempoSection[]; // startSec se sorted
  followMode: boolean;
  stop: boolean; // lock ho ya studio chhupa ho to music rok do
  onAddSection: (sec: number) => void;
  children: React.ReactNode; // waveform
}> = (props) => {
  const { audioUrl, duration, stop, onAddSection, children } = props;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const sectionRef = useRef<HTMLSpanElement | null>(null);
  const seekRef = useRef<HTMLInputElement | null>(null);
  const dragging = useRef(false);
  const loopRef = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  const [playing, setPlaying] = useState(false);
  const [loopPart, setLoopPart] = useState(false);
  const [toast, setToast] = useState("");

  const paint = useCallback((t: number) => {
    const p = latest.current;
    const dur = p.duration || 1;
    if (headRef.current) headRef.current.style.left = `${Math.min(100, Math.max(0, (t / dur) * 100))}%`;
    if (timeRef.current) timeRef.current.textContent = `${fmtClock(t)} / ${fmtClock(dur)}`;
    if (sectionRef.current) sectionRef.current.textContent = sectionAt(t, p.sections, p.followMode).label;
    if (seekRef.current && !dragging.current) seekRef.current.value = String(t);
  }, []);

  // audio element (gaana badle to naya banta hai, purana ruk jata hai)
  useEffect(() => {
    const a = new Audio(audioUrl);
    a.preload = "auto";
    audioRef.current = a;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    paint(0);
    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
      a.src = "";
      audioRef.current = null;
      setPlaying(false);
    };
  }, [audioUrl, paint]);

  // chalte waqt har frame playhead update; "my video part" me window ke andar loop
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const a = audioRef.current;
      if (a) {
        let t = a.currentTime;
        const p = latest.current;
        if (loopRef.current && (t >= p.windowStart + p.windowSec - 0.02 || t < p.windowStart - 0.05)) {
          a.currentTime = p.windowStart;
          t = p.windowStart;
        }
        paint(t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, paint]);

  // lock ya doosra page: music band
  useEffect(() => {
    if (stop) audioRef.current?.pause();
  }, [stop]);

  // sections ya duration badle (gaana ruka ho tab bhi) to readout theek karo
  useEffect(() => {
    paint(audioRef.current?.currentTime ?? 0);
  }, [props.sections, props.duration, props.followMode, paint]);

  const playSong = () => {
    const a = audioRef.current;
    if (!a) return;
    loopRef.current = false;
    setLoopPart(false);
    a.play().catch(() => {});
  };
  const playPart = () => {
    const a = audioRef.current;
    if (!a) return;
    loopRef.current = true;
    setLoopPart(true);
    a.currentTime = latest.current.windowStart;
    paint(a.currentTime);
    a.play().catch(() => {});
  };
  const pause = () => audioRef.current?.pause();

  const addHere = () => {
    const t = audioRef.current?.currentTime ?? 0;
    onAddSection(t);
    setToast(`Section added near ${fmtClock(t)}`);
    window.setTimeout(() => setToast(""), 2200);
  };

  const btn =
    "text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40";

  return (
    <div>
      <div className="relative">
        {children}
        <div
          ref={headRef}
          className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-10"
          style={{ left: "0%", boxShadow: "0 0 6px #fff" }}
        />
      </div>

      <input
        ref={seekRef}
        type="range"
        min={0}
        max={duration || 1}
        step={0.01}
        defaultValue={0}
        onPointerDown={() => (dragging.current = true)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onChange={(e) => {
          const t = Number(e.currentTarget.value);
          if (audioRef.current) audioRef.current.currentTime = t;
          paint(t);
        }}
        className="w-full accent-white mt-2"
        aria-label="Song position"
      />
      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-0.5 gap-3">
        <span ref={timeRef} className="font-mono text-white">
          0:00.0 / 0:00.0
        </span>
        <span ref={sectionRef} className="text-amber-300 font-bold truncate" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        {playing ? (
          <button onClick={pause} className={btn}>
            <Pause className="w-3 h-3" /> Pause
          </button>
        ) : (
          <button onClick={playSong} className={btn}>
            <Play className="w-3 h-3" /> Play song
          </button>
        )}
        <button
          onClick={playPart}
          className={`${btn} ${playing && loopPart ? "!bg-[#8b5cf6]/30 border border-[#8b5cf6]" : ""}`}
          title="Plays only the part used in your video, in a loop"
        >
          <Repeat className="w-3 h-3" /> Play my video part
        </button>
        <button onClick={addHere} className={`${btn} !bg-amber-400/15 border border-amber-400/40 text-amber-200`} title="Adds a tempo section at the playhead">
          <Plus className="w-3 h-3" /> Add section here
        </button>
      </div>
      {toast && <div className="text-[11px] text-amber-300 mt-1">{toast}</div>}
    </div>
  );
};
