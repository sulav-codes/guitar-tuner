/**
 * Audio engine: captures microphone input and runs pitch detection
 * Platform-aware:
 *   Native (iOS/Android): @siteed/audio-studio → real PCM → YIN/autocorrelation
 *   Web: Web Audio API → YIN/autocorrelation
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAudioRecorder } from "@siteed/audio-studio";
import type {
  AudioDataEvent,
  RecordingConfig,
  // FIX #4: Import StartRecordingResult so the bridge return type is correct
  StartRecordingResult,
} from "@siteed/audio-studio";
import { toByteArray } from "base64-js";
import {
  detectPitchYIN,
  detectPitchAutocorrelation,
  FrequencySmoothing,
} from "./pitch-detection";
import type { PitchAlgorithm } from "./pitch-detection";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AudioEngineConfig {
  algorithm: PitchAlgorithm;
  sensitivity: "low" | "medium" | "high";
  needleSpeed: "fast" | "medium" | "slow";
  proAccuracy: boolean;
}

export interface PitchResult {
  frequency: number | null;
  clarity: number;
  isActive: boolean;
}

type PitchCallback = (result: PitchResult) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

const BUFFER_SIZE = 2048;
const DEFAULT_SAMPLE_RATE = 44100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSensitivityThreshold(
  sensitivity: AudioEngineConfig["sensitivity"],
  proAccuracy: boolean,
): number {
  if (proAccuracy) return 0.05;
  return sensitivity === "low" ? 0.05 : sensitivity === "high" ? 0.005 : 0.01;
}

function getSensitivityGain(
  sensitivity: AudioEngineConfig["sensitivity"],
): number {
  return sensitivity === "low" ? 0.5 : sensitivity === "high" ? 2.0 : 1.0;
}

/**
 * Decode base64 PCM from AudioDataEvent into Float32Array.
 *
 * atob() is undefined in React Native / Hermes — use base64-js instead.
 * pcm_32bit = 4 bytes per sample = IEEE 754 float32, range [-1.0, 1.0].
 */
function decodeBase64PCM(base64: string): Float32Array {
  const bytes = toByteArray(base64);
  return new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );
}

// ─── Ring buffer ──────────────────────────────────────────────────────────────

class RingBuffer {
  private buffer: Float32Array;
  private writePos = 0;
  private filled = 0;

  constructor(private capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  reset(): void {
    this.buffer = new Float32Array(this.capacity);
    this.writePos = 0;
    this.filled = 0;
  }

  write(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writePos % this.capacity] = samples[i];
      this.writePos++;
    }
    this.filled = Math.min(this.filled + samples.length, this.capacity);
  }

  /**
   * Read the most recent `size` samples in chronological order.
   * Returns null if not enough data has accumulated yet.
   */
  read(size: number): Float32Array | null {
    if (this.filled < size) return null;
    const out = new Float32Array(size);
    const start = this.writePos - size;
    for (let i = 0; i < size; i++) {
      out[i] = this.buffer[(start + i + this.capacity) % this.capacity];
    }
    return out;
  }
}

// ─── Recorder bridge ──────────────────────────────────────────────────────────

interface RecorderBridge {
  // FIX #4: startRecording must return Promise<StartRecordingResult> to match
  // the real useAudioRecorder hook signature from @siteed/audio-studio.
  // The bridge wraps it, so callers inside the engine can ignore the result.
  startRecording:
    | ((config: RecordingConfig) => Promise<StartRecordingResult>)
    | null;
  stopRecording: (() => Promise<unknown>) | null;
}

const recorderBridge: RecorderBridge = {
  startRecording: null,
  stopRecording: null,
};

// ─── Core engine (singleton) ──────────────────────────────────────────────────

class AudioEngineCore {
  private smoothing = new FrequencySmoothing("medium");
  private callback: PitchCallback | null = null;
  private isRunning = false;
  private ring = new RingBuffer(BUFFER_SIZE * 8);

  // FIX #1: Keep sampleRate typed as the allowed literal union so it is
  // assignable to RecordingConfig.sampleRate (typed as SampleRate, not number).
  // 16000 | 44100 | 48000 are the values documented as valid SampleRate values.
  private sampleRate: 16000 | 44100 | 48000 = DEFAULT_SAMPLE_RATE;

  private config: AudioEngineConfig = {
    algorithm: "yin",
    sensitivity: "medium",
    needleSpeed: "medium",
    proAccuracy: false,
  };

  // Web-only members
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationId: number | null = null;
  private webBuffer: Float32Array = new Float32Array(BUFFER_SIZE);

  // ── Public API ──────────────────────────────────────────────────────────────

  isSupported(): boolean {
    if (Platform.OS === "web") {
      return (
        typeof AudioContext !== "undefined" ||
        typeof (globalThis as Record<string, unknown>).webkitAudioContext !==
          "undefined"
      );
    }
    return Platform.OS === "ios" || Platform.OS === "android";
  }

  updateConfig(config: Partial<AudioEngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.smoothing = new FrequencySmoothing(this.config.needleSpeed);
  }

  async start(
    onPitch: PitchCallback,
  ): Promise<{ success: boolean; error?: string }> {
    this.callback = onPitch;
    return Platform.OS === "web" ? this.startWeb() : this.startNative();
  }

  stop(): void {
    this.isRunning = false;
    this.smoothing.reset();
    this.ring.reset();

    if (Platform.OS !== "web") {
      recorderBridge.stopRecording?.().catch(() => {});
    } else {
      this.stopWeb();
    }

    this.callback?.({ frequency: null, clarity: 0, isActive: false });
  }

  playReferenceTone(frequency: number, durationMs = 800): void {
    if (Platform.OS !== "web") {
      console.warn("[AudioEngine] playReferenceTone is web-only for now.");
      return;
    }

    const AudioContextClass =
      ((globalThis as Record<string, unknown>)
        .AudioContext as typeof AudioContext) ||
      ((globalThis as Record<string, unknown>)
        .webkitAudioContext as typeof AudioContext);

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + durationMs / 1000,
    );

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);

    setTimeout(() => ctx.close(), durationMs + 100);
  }

  // ── Native path ─────────────────────────────────────────────────────────────

  private async startNative(): Promise<{ success: boolean; error?: string }> {
    if (!recorderBridge.startRecording) {
      return {
        success: false,
        error:
          "useAudioEngineSetup() is not mounted. " +
          "Call it inside your root layout component.",
      };
    }

    try {
      // FIX #1: Assign a typed literal, not a plain number, so TypeScript
      // accepts it as SampleRate when passed into RecordingConfig.
      this.sampleRate = this.config.proAccuracy ? 48000 : 44100;
      this.ring.reset();
      this.smoothing.reset();
      this.isRunning = true;

      // FIX #2 & #4: onAudioStream must be async (returning Promise<void>)
      // per the official @siteed/audio-studio RecordingConfig type.
      // FIX #4: startRecording returns Promise<StartRecordingResult>; we
      // await it and discard the result — no void mismatch anymore.
      await recorderBridge.startRecording({
        sampleRate: this.sampleRate,
        channels: 1,
        encoding: "pcm_32bit",
        interval: 50,
        keepAwake: true,
        // FIX #2: arrow function is now async → returns Promise<void> ✓
        onAudioStream: async (event: AudioDataEvent) => {
          this.handleAudioDataEvent(event);
        },
      });

      return { success: true };
    } catch (err) {
      this.isRunning = false;
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to start recording",
      };
    }
  }

  private handleAudioDataEvent(event: AudioDataEvent): void {
    if (!this.isRunning) return;

    // FIX #3: AudioDataEvent.data is typed as string | Float32Array | Int16Array.
    // decodeBase64PCM only accepts string, so narrow the type first.
    // On native with pcm_32bit encoding the data is always a base64 string,
    // but TypeScript doesn't know that without the guard.
    if (typeof event.data !== "string") {
      // Data already arrived as a typed array — use it directly.
      const float32 =
        event.data instanceof Float32Array
          ? event.data
          : Float32Array.from(event.data);
      this._processFloat32(float32);
      return;
    }

    const float32 = decodeBase64PCM(event.data);
    this._processFloat32(float32);
  }

  /** Shared post-decode processing extracted to avoid duplication. */
  private _processFloat32(float32: Float32Array): void {
    const gain = getSensitivityGain(this.config.sensitivity);
    if (gain !== 1.0) {
      for (let i = 0; i < float32.length; i++) {
        float32[i] = Math.max(-1, Math.min(1, float32[i] * gain));
      }
    }

    this.ring.write(float32);

    const analysisSize = this.config.proAccuracy
      ? BUFFER_SIZE * 2
      : BUFFER_SIZE;

    const window = this.ring.read(analysisSize);
    if (window === null) return;

    this.runPitchDetection(window, this.sampleRate);
  }

  // ── Shared pitch detection ──────────────────────────────────────────────────

  private runPitchDetection(buffer: Float32Array, sampleRate: number): void {
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);

    const threshold = getSensitivityThreshold(
      this.config.sensitivity,
      this.config.proAccuracy,
    );

    let rawFreq: number | null = null;

    if (rms > threshold) {
      rawFreq =
        this.config.algorithm === "yin"
          ? detectPitchYIN(buffer, sampleRate, 0.1)
          : detectPitchAutocorrelation(buffer, sampleRate);
    }

    const smoothed = this.smoothing.smooth(rawFreq);
    const clarity = Math.min(rms * 10, 1.0);

    this.callback?.({
      frequency: smoothed,
      clarity,
      isActive: rms > threshold,
    });
  }

  // ── Web path ────────────────────────────────────────────────────────────────

  private async startWeb(): Promise<{ success: boolean; error?: string }> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: this.config.sensitivity !== "high",
          autoGainControl: false,
          sampleRate: this.config.proAccuracy ? 48000 : DEFAULT_SAMPLE_RATE,
        },
      });

      const AudioContextClass =
        ((globalThis as Record<string, unknown>)
          .AudioContext as typeof AudioContext) ||
        ((globalThis as Record<string, unknown>)
          .webkitAudioContext as typeof AudioContext);

      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.proAccuracy ? 4096 : BUFFER_SIZE * 2;
      this.analyser.smoothingTimeConstant = 0;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = getSensitivityGain(this.config.sensitivity);

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(gainNode);
      gainNode.connect(this.analyser);

      this.webBuffer = new Float32Array(this.analyser.fftSize);
      this.isRunning = true;
      this.webTick();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Microphone access denied",
      };
    }
  }

  private webTick = (): void => {
    if (!this.isRunning || !this.analyser) return;

    this.analyser.getFloatTimeDomainData(
      this.webBuffer as Float32Array<ArrayBuffer>,
    );

    this.runPitchDetection(
      this.webBuffer,
      this.audioContext?.sampleRate ?? DEFAULT_SAMPLE_RATE,
    );

    this.animationId = requestAnimationFrame(this.webTick);
  };

  private stopWeb(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.microphone?.disconnect();
    this.microphone = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

// ─── Exported singleton ───────────────────────────────────────────────────────

export const audioEngine = new AudioEngineCore();

// ─── Root hook ────────────────────────────────────────────────────────────────

/**
 * Wires useAudioRecorder into the audioEngine singleton.
 * Call ONCE in your root layout — never conditionally.
 *
 * @example
 * // app/_layout.tsx
 * export default function RootLayout() {
 *   useAudioEngineSetup();
 *   return <Stack />;
 * }
 */
export function useAudioEngineSetup(): void {
  const { startRecording, stopRecording } = useAudioRecorder();

  const startRef = useRef(startRecording);
  const stopRef = useRef(stopRecording);

  useEffect(() => {
    startRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    stopRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    // FIX #4: The bridge now correctly types startRecording as returning
    // Promise<StartRecordingResult>, matching the real hook's signature.
    recorderBridge.startRecording = (config) => startRef.current(config);
    recorderBridge.stopRecording = () => stopRef.current();

    return () => {
      recorderBridge.startRecording = null;
      recorderBridge.stopRecording = null;
    };
  }, []);
}
