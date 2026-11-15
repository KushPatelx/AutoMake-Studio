// Beat / BPM detection + waveform peaks. Browser me chalta hai (Web Audio), koi extra package nahi.
// Algorithm: bass (kick) aur treble ka onset strength -> autocorrelation se rough tempo ->
// comb-filter grid search se exact BPM + pehla beat. Phonk/EDM jaise steady beats pe best chalta hai.

export type AudioAnalysis = {
  bpm: number;
  firstBeatSec: number;
  confidence: number; // 0 se 1
  duration: number;
  peaks: number[]; // 0..1, waveform ke liye
  // Asli beat positions (gaane ke seconds me): tempo badle ya drift ho to bhi sahi. Purane projects me nahi hota.
  beats?: number[];
  beatQuality?: number; // 0 se 1: tracker kitna bharose ka hai
  // Gaane ke khaas moments: drop (energy achanak badhti hai) aur calm (achanak girti hai). Sirf suggestion.
  moments?: Moment[];
};

export type Moment = { t: number; strength: number; kind: "drop" | "calm" };

const HOP = 512;
const MAX_ANALYZE_SEC = 150;

export function computePeaks(samples: Float32Array, buckets: number): number[] {
  const out: number[] = new Array(buckets).fill(0);
  const size = Math.max(1, Math.floor(samples.length / buckets));
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    let m = 0;
    const start = b * size;
    const end = Math.min(samples.length, start + size);
    for (let i = start; i < end; i += 4) {
      const v = Math.abs(samples[i]);
      if (v > m) m = v;
    }
    out[b] = m;
    if (m > max) max = m;
  }
  return max > 0 ? out.map((v) => v / max) : out;
}

const interp = (arr: Float32Array, pos: number) => {
  const i = Math.floor(pos);
  if (i < 0 || i + 1 >= arr.length) return 0;
  const f = pos - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
};

// Onset strength (kick + treble ka flux) poore gaane ke liye. analyzeSamples aur trackBeats dono use karte hain.
function onsetEnvelope(samples: Float32Array, sampleRate: number, n: number): { clean: Float32Array; fps: number } {
  const frames = Math.floor(n / HOP);
  const aLow = 1 - Math.exp((-2 * Math.PI * 150) / sampleRate);
  let lp = 0;
  const low = new Float32Array(frames);
  const high = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let eLow = 0;
    let eHigh = 0;
    for (let i = f * HOP; i < (f + 1) * HOP; i++) {
      const x = samples[i];
      lp += aLow * (x - lp);
      const h = x - lp;
      eLow += lp * lp;
      eHigh += h * h;
    }
    low[f] = Math.log(1 + 1000 * Math.sqrt(eLow / HOP));
    high[f] = Math.log(1 + 1000 * Math.sqrt(eHigh / HOP));
  }
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    onset[f] = Math.max(0, low[f] - low[f - 1]) + 0.5 * Math.max(0, high[f] - high[f - 1]);
  }
  const fps = sampleRate / HOP;
  const win = Math.max(3, Math.round(fps * 0.5));
  const clean = new Float32Array(frames);
  let run = 0;
  for (let f = 0; f < frames; f++) {
    run += onset[f];
    if (f >= 2 * win) run -= onset[f - 2 * win];
    const avg = run / Math.min(f + 1, 2 * win);
    clean[f] = Math.max(0, onset[f] - avg);
  }
  return { clean, fps };
}

export function analyzeSamples(
  samples: Float32Array,
  sampleRate: number,
): { bpm: number; firstBeatSec: number; confidence: number } {
  const n = Math.min(samples.length, Math.floor(MAX_ANALYZE_SEC * sampleRate));
  const frames = Math.floor(n / HOP);
  if (frames < 200) return { bpm: 120, firstBeatSec: 0, confidence: 0 };

  // 1+2) onset strength
  const { clean, fps } = onsetEnvelope(samples, sampleRate, n);

  // 3) autocorrelation se rough tempo (60..200 BPM), tempo prior ~120 BPM
  const minLag = Math.floor((fps * 60) / 200);
  const maxLag = Math.ceil((fps * 60) / 60);
  let bestLag = minLag;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < frames; i++) s += clean[i] * clean[i + lag];
    s /= frames - lag;
    const bpmAtLag = (fps * 60) / lag;
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpmAtLag / 120) / 0.9, 2));
    const score = s * w;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  let roughBpm = (fps * 60) / bestLag;
  while (roughBpm < 75) roughBpm *= 2;
  while (roughBpm > 170) roughBpm /= 2;

  // 4) comb search: exact BPM + phase
  let best = { bpm: roughBpm, phase: 0, score: -1, mean: 0 };
  const lo = roughBpm * 0.96;
  const hi = roughBpm * 1.04;
  for (let bpm = lo; bpm <= hi; bpm += 0.05) {
    const P = (fps * 60) / bpm;
    let sumAll = 0;
    let cnt = 0;
    let localBest = -1;
    let localPhase = 0;
    for (let ph = 0; ph < P; ph += 0.5) {
      const K = Math.floor((frames - 1 - ph) / P);
      if (K < 8) continue;
      let s = 0;
      for (let k = 0; k < K; k++) s += interp(clean, ph + k * P);
      s /= K;
      sumAll += s;
      cnt++;
      if (s > localBest) {
        localBest = s;
        localPhase = ph;
      }
    }
    if (localBest > best.score) {
      best = { bpm, phase: localPhase, score: localBest, mean: cnt ? sumAll / cnt : 0 };
    }
  }

  const ratio = best.mean > 0 ? best.score / best.mean : 1;
  const confidence = Math.max(0, Math.min(1, (ratio - 1) / 2.5));
  return {
    bpm: Math.round(best.bpm * 10) / 10,
    firstBeatSec: (best.phase * HOP) / sampleRate,
    confidence,
  };
}

// ---------------------------------------------------------------- drops / calm moments
// Energy (bass + poori awaaz) ko 0.25 s ke tukdon me nikalo. Drop = pehle ke ~4 s se baad ke ~3 s me energy
// kaafi zyada. Calm = ulta (breakdown). Sirf suggest karte hain, apne aap kuch lagta nahi.
export function detectMoments(samples: Float32Array, sampleRate: number): Moment[] {
  const win = Math.floor(sampleRate * 0.25);
  const frames = Math.floor(samples.length / win);
  const BEFORE = 16; // 4 s
  const AFTER = 12; // 3 s
  if (frames < BEFORE + AFTER + 8) return [];

  const aLow = 1 - Math.exp((-2 * Math.PI * 150) / sampleRate);
  let lp = 0;
  const E = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let full = 0;
    let bass = 0;
    for (let i = f * win; i < (f + 1) * win; i++) {
      const x = samples[i];
      lp += aLow * (x - lp);
      full += x * x;
      bass += lp * lp;
    }
    E[f] = 0.6 * Math.sqrt(full / win) + 0.4 * Math.sqrt(bass / win);
  }
  // 95th percentile se normalize, taaki loud/quiet gaane barabar rahein
  const sorted = Array.from(E).sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  for (let f = 0; f < frames; f++) E[f] = Math.min(1.5, E[f] / ref);

  const mean = (a: number, b: number) => {
    let s = 0;
    for (let i = a; i < b; i++) s += E[i];
    return s / Math.max(1, b - a);
  };
  const jump = new Float32Array(frames);
  const before = new Float32Array(frames);
  const after = new Float32Array(frames);
  for (let i = BEFORE; i + AFTER <= frames; i++) {
    before[i] = mean(i - BEFORE, i);
    after[i] = mean(i, i + AFTER);
    jump[i] = after[i] - before[i];
  }

  const found: Moment[] = [];
  for (let i = BEFORE; i + AFTER <= frames; i++) {
    let isMax = true;
    for (let d = -6; d <= 6 && isMax; d++) {
      const k = i + d;
      if (k < BEFORE || k + AFTER > frames || k === i) continue;
      if (Math.abs(jump[k]) > Math.abs(jump[i]) || (Math.abs(jump[k]) === Math.abs(jump[i]) && k < i)) isMax = false;
    }
    if (!isMax) continue;
    if (jump[i] > 0.25 && after[i] > 0.5 && before[i] < 0.7 * after[i]) {
      found.push({ t: i * 0.25, strength: Math.min(1, jump[i] / (0.15 + before[i]) / 3), kind: "drop" });
    } else if (-jump[i] > 0.25 && before[i] > 0.5 && after[i] < 0.7 * before[i]) {
      found.push({ t: i * 0.25, strength: Math.min(1, -jump[i] / (0.15 + after[i]) / 3), kind: "calm" });
    }
  }

  // har kind me sabse mazboot, kam se kam 12 s ke gap pe, max 5
  const out: Moment[] = [];
  for (const kind of ["drop", "calm"] as const) {
    const kept: Moment[] = [];
    for (const m of found.filter((x) => x.kind === kind).sort((a, b) => b.strength - a.strength)) {
      if (kept.length < 5 && kept.every((k) => Math.abs(k.t - m.t) >= 12)) kept.push(m);
    }
    out.push(...kept);
  }
  return out.sort((a, b) => a.t - b.t).map((m) => ({ ...m, t: Math.round(m.t * 100) / 100 }));
}

// ---------------------------------------------------------------- beat tracking
// Dynamic programming (Ellis): har onset ko score milta hai, aur beats ke beech ka gap rough tempo ke
// aas-paas rahe to inaam, door jaye to saza. Isse tempo drift ya change hone pe bhi beats gaane ko follow karte hain.
export function trackBeats(
  samples: Float32Array,
  sampleRate: number,
  roughBpm: number,
): { beats: number[]; quality: number } {
  const n = Math.min(samples.length, Math.floor(12 * 60 * sampleRate));
  const { clean, fps } = onsetEnvelope(samples, sampleRate, n);
  const frames = clean.length;
  if (frames < 200 || !(roughBpm > 0)) return { beats: [], quality: 0 };

  let mean = 0;
  for (let i = 0; i < frames; i++) mean += clean[i];
  mean /= frames;
  let varSum = 0;
  for (let i = 0; i < frames; i++) varSum += (clean[i] - mean) * (clean[i] - mean);
  const std = Math.sqrt(varSum / frames) || 1;
  const O = new Float32Array(frames);
  for (let i = 0; i < frames; i++) O[i] = clean[i] / std;

  const P = (fps * 60) / roughBpm;
  const minTau = Math.max(2, Math.round(P * 0.55));
  const maxTau = Math.round(P * 2.0);
  const TIGHT = 20; // jitna bada, utna constant tempo (kam = tempo change follow karta hai)
  const pen = new Float32Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau++) pen[tau] = TIGHT * Math.pow(Math.log(tau / P), 2);

  const C = new Float32Array(frames);
  const back = new Int32Array(frames).fill(-1);
  for (let t = 0; t < frames; t++) {
    let best = 0;
    let bi = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      const p = t - tau;
      if (p < 0) break;
      const v = C[p] - pen[tau];
      if (v > best) {
        best = v;
        bi = p;
      }
    }
    C[t] = O[t] + best;
    back[t] = bi;
  }

  // sabse achhe end se peeche chalo
  let end = frames - 1;
  let bestC = -Infinity;
  for (let t = Math.max(0, frames - Math.round(P * 2)); t < frames; t++) {
    if (C[t] > bestC) {
      bestC = C[t];
      end = t;
    }
  }
  const idx: number[] = [];
  for (let t = end; t >= 0; t = back[t]) {
    idx.push(t);
    if (back[t] < 0) break;
  }
  idx.reverse();

  // kamzor shuruat ke beats hata do (jahan onset lagbhag zero hai)
  while (idx.length > 2 && O[idx[0]] < 0.3) idx.shift();

  const peakAt = (f: number) => {
    let m = 0;
    for (let d = -1; d <= 1; d++) {
      const v = O[Math.min(frames - 1, Math.max(0, f + d))];
      if (v > m) m = v;
    }
    return m;
  };

  // safai: jo beat pichle beat ke bahut paas ho (local interval ke 60% se kam) usme se kamzor wala hata do
  let cleaned = idx;
  for (let pass = 0; pass < 2; pass++) {
    const out: number[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      const f = cleaned[i];
      if (out.length > 0) {
        const lo = Math.max(1, i - 4);
        const hi = Math.min(cleaned.length - 1, i + 4);
        const gaps: number[] = [];
        for (let k = lo; k <= hi; k++) gaps.push(cleaned[k] - cleaned[k - 1]);
        gaps.sort((a, b) => a - b);
        const med = gaps[Math.floor(gaps.length / 2)] || P;
        if (f - out[out.length - 1] < 0.6 * med) {
          if (peakAt(f) > peakAt(out[out.length - 1])) out[out.length - 1] = f;
          continue;
        }
      }
      out.push(f);
    }
    cleaned = out;
  }

  // bharosa: beat pe onset kitna zyada hai, beech (off-beat) ke muqable. Shor me ratio ~1 hota hai.
  let on = 0;
  let off = 0;
  let cnt = 0;
  for (let i = 0; i + 1 < cleaned.length; i++) {
    on += peakAt(cleaned[i]);
    off += peakAt(Math.round((cleaned[i] + cleaned[i + 1]) / 2));
    cnt++;
  }
  const ratio = cnt > 0 ? on / (off + 1e-6) : 1;
  const quality = Math.max(0, Math.min(1, (ratio - 1.15) / 1.5));
  return { beats: cleaned.map((f) => (f * HOP) / sampleRate), quality };
}

// Sabse paas ka tracked beat
export const nearestBeat = (sec: number, beats: number[]): number => {
  const n = beats.length;
  if (n === 0) return sec;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid] < sec) lo = mid + 1;
    else hi = mid;
  }
  const a = beats[lo];
  const b = lo > 0 ? beats[lo - 1] : a;
  return Math.abs(sec - b) <= Math.abs(a - sec) ? b : a;
};

// Tracked beats se tempo ka range (10th se 90th percentile) BPM me
export const tempoRange = (beats: number[]): { min: number; max: number } | null => {
  if (beats.length < 8) return null;
  const bpms: number[] = [];
  for (let i = 4; i < beats.length; i++) {
    const d = (beats[i] - beats[i - 4]) / 4;
    if (d > 0) bpms.push(60 / d);
  }
  if (bpms.length === 0) return null;
  bpms.sort((x, y) => x - y);
  return { min: bpms[Math.floor(bpms.length * 0.1)], max: bpms[Math.min(bpms.length - 1, Math.floor(bpms.length * 0.9))] };
};

export async function analyzeAudioFile(file: File): Promise<AudioAnalysis> {
  const buf = await file.arrayBuffer();
  const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(buf);
    const ch = audio.getChannelData(0);
    // mono: agar stereo hai to dono channel ka average
    let mono = ch;
    if (audio.numberOfChannels > 1) {
      const ch2 = audio.getChannelData(1);
      mono = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i++) mono[i] = (ch[i] + ch2[i]) * 0.5;
    }
    const res = analyzeSamples(mono, audio.sampleRate);
    const tracked = trackBeats(mono, audio.sampleRate, res.bpm);
    return {
      ...res,
      duration: audio.duration,
      peaks: computePeaks(mono, 600),
      beats: tracked.beats.map((b) => Math.round(b * 1000) / 1000),
      // tracker ka apna score thoda biased hota hai, isliye detection ke bharose se minimum lete hain
      beatQuality: Math.min(tracked.quality, res.confidence),
      moments: detectMoments(mono, audio.sampleRate),
    };
  } finally {
    ctx.close().catch(() => {});
  }
}

// Start time ko sabse paas ke beat pe snap karo
export const snapToBeat = (sec: number, bpm: number, firstBeatSec: number) => {
  const beat = 60 / bpm;
  const k = Math.round((sec - firstBeatSec) / beat);
  return Math.max(0, firstBeatSec + k * beat);
};
