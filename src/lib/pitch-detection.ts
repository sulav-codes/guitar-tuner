/**
 * Pitch detection algorithms
 * YIN algorithm for accurate fundamental frequency detection
 * Autocorrelation as a fallback
 */

export type PitchAlgorithm = "yin" | "autocorrelation";

/**
 * YIN pitch detection algorithm
 * Based on "YIN, a fundamental frequency estimator for speech and music"
 * by Alain de Cheveigne and Hideki Kawahara
 */
export function detectPitchYIN(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.1,
): number | null {
  const bufferSize = buffer.length;
  const yinBuffer = new Float32Array(bufferSize / 2);

  // Step 1: Difference function
  for (let tau = 0; tau < yinBuffer.length; tau++) {
    let sum = 0;
    for (let i = 0; i < yinBuffer.length; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBuffer.length; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Step 3: Absolute threshold
  let tau = 2;
  while (tau < yinBuffer.length) {
    if (yinBuffer[tau] < threshold) {
      while (
        tau + 1 < yinBuffer.length &&
        yinBuffer[tau + 1] < yinBuffer[tau]
      ) {
        tau++;
      }
      break;
    }
    tau++;
  }

  if (tau === yinBuffer.length || yinBuffer[tau] >= threshold) {
    return null;
  }

  // Step 4: Parabolic interpolation for better accuracy
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < yinBuffer.length ? tau + 1 : tau;
  let betterTau: number;

  if (x0 === tau) {
    betterTau = yinBuffer[tau] <= yinBuffer[x2] ? tau : x2;
  } else if (x2 === tau) {
    betterTau = yinBuffer[tau] <= yinBuffer[x0] ? tau : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[x2];
    betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  return sampleRate / betterTau;
}

/**
 * Autocorrelation pitch detection (faster, less accurate)
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number,
): number | null {
  const bufferSize = buffer.length;
  const correlation = new Float32Array(bufferSize);

  // Check if signal has enough energy
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferSize);
  if (rms < 0.01) return null;

  // Compute autocorrelation
  for (let lag = 0; lag < bufferSize; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferSize - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlation[lag] = sum;
  }

  // Find first minimum then first maximum after it
  let d = 0;
  while (d < bufferSize - 1 && correlation[d] > correlation[d + 1]) d++;

  // Find maximum in range corresponding to 50Hz–2000Hz
  const minPeriod = Math.floor(sampleRate / 2000);
  const maxPeriod = Math.floor(sampleRate / 50);

  let maxCorr = -1;
  let maxD = -1;
  for (
    let i = Math.max(d, minPeriod);
    i < Math.min(bufferSize - 1, maxPeriod);
    i++
  ) {
    if (correlation[i] > maxCorr) {
      maxCorr = correlation[i];
      maxD = i;
    }
  }

  if (maxD === -1 || maxCorr < 0.01) return null;

  // Parabolic interpolation
  const y1 = correlation[maxD - 1] ?? correlation[maxD];
  const y2 = correlation[maxD];
  const y3 = correlation[maxD + 1] ?? correlation[maxD];
  const refinedD = maxD + (y3 - y1) / (2 * (2 * y2 - y1 - y3));

  return sampleRate / refinedD;
}

/**
 * Smoothing filter for stable needle display
 */
export class FrequencySmoothing {
  private history: number[] = [];
  private readonly maxHistory: number;

  constructor(smoothingLevel: "fast" | "medium" | "slow" = "medium") {
    this.maxHistory =
      smoothingLevel === "fast" ? 2 : smoothingLevel === "medium" ? 4 : 8;
  }

  smooth(freq: number | null): number | null {
    if (freq === null) {
      this.history = [];
      return null;
    }

    this.history.push(freq);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Weighted average: more recent values have higher weight
    let total = 0;
    let weightSum = 0;
    for (let i = 0; i < this.history.length; i++) {
      const weight = i + 1;
      total += this.history[i] * weight;
      weightSum += weight;
    }
    return total / weightSum;
  }

  reset(): void {
    this.history = [];
  }
}

/**
 * Check signal clarity (RMS energy + zero-crossing rate)
 */
export function getSignalClarity(buffer: Float32Array): number {
  let rms = 0;
  let zeroCrossings = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
    if (i > 0 && buffer[i] * buffer[i - 1] < 0) zeroCrossings++;
  }
  rms = Math.sqrt(rms / buffer.length);
  return Math.min(rms * 10, 1.0);
}

// ─── Music theory helpers ──────────────────────────────────────────────────

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** Convert frequency to MIDI note number (float) */
export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

/** Convert MIDI note number to frequency */
export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Cents deviation between detected and target frequency */
export function centsDeviation(detected: number, target: number): number {
  return 1200 * Math.log2(detected / target);
}

/** Full note name with octave, e.g. "A4", "C#3" */
export function noteNameFromMidi(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}
