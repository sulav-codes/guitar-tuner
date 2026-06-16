/**
 * Audio engine: captures microphone input and runs pitch detection
 * Platform-aware:
 *   Native (iOS/Android) + Web: @siteed/audio-studio → real PCM → YIN/autocorrelation
 *   Web fallback: Web Audio API directly
 *
 * IMPORTANT: Because @siteed/audio-studio's primary API is a React hook
 * (useAudioRecorder), the native engine cannot be a self-contained class.
 * Instead it exposes:
 *   - audioEngine  → singleton used by your screens (same interface as before)
 *   - useAudioEngineSetup → hook that MUST be mounted once at app root to
 *     wire the recorder into the engine singleton
 */

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  requestPermissionsAsync,
} from "@siteed/audio-studio";
import type { AudioStreamEvent } from "@siteed/audio-studio";
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
 * Decode a base64 PCM chunk from AudioStreamEvent into Float32Array.
 * @siteed/audio-studio always delivers base64 encoded raw PCM bytes.
 * With pcm_32bit encoding each 4 bytes = one Float32 sample.
 */
function decodeBase64PCM(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

// ─── Ring buffer ──────────────────────────────────────────────────────────────

/**
 * Accumulates small PCM chunks into a window large enough for YIN.
 * expo-audio-studio delivers ~50-100ms chunks; we need ~46ms at 44100Hz
 * for BUFFER_SIZE=2048, but we collect 4x for safety.
 */
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

  /** Returns the most recent `size` samples in chronological order, or null if not enough data. */
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

// ─── Internal bridge ──────────────────────────────────────────────────────────

/**
 * Shared mutable state between the AudioEngine singleton and the
 * useAudioEngineSetup hook. The hook writes startRecording/stopRecording
 * into this bridge; the singleton reads them when .start()/.stop() is called.
 */
interface RecorderBridge {
  startRecording: ((opts: object) => Promise<void>) | null;
  stopRecording: (() => Promise<unknown>) | null;
}

const recorderBridge: RecorderBridge = {
  startRecording: null,
  stopRecording: null,
};

// ─── Audio engine singleton ───────────────────────────────────────────────────

class AudioEngineCore {
  private smoothing = new FrequencySmoothing("medium");
  private callback: PitchCallback | null = null;
  private isRunning = false;
  private ring = new RingBuffer(BUFFER_SIZE * 8);
  private config: AudioEngineConfig = {
    algorithm: "yin",
    sensitivity: "medium",
    needleSpeed: "medium",
    proAccuracy: false,
  };

  // Web Audio API members (web platform only)
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationId: number | null = null;
  private webBuffer: Float32Array = new Float32Array(BUFFER_SIZE);

  isSupported(): boolean {
    if (Platform.OS === "web") {
      return (
        typeof AudioContext !== "undefined" ||
        typeof (globalThis as Record<string, unknown>).webkitAudioContext !==
          "undefined"
      );
    }
    return true; // audio-studio supports iOS + Android
  }

  updateConfig(config: Partial<AudioEngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.smoothing = new FrequencySmoothing(this.config.needleSpeed);
  }

  async start(
    onPitch: PitchCallback,
  ): Promise<{ success: boolean; error?: string }> {
    this.callback = onPitch;

    if (Platform.OS === "web") {
      return this.startWeb();
    }
    return this.startNative();
  }

  // ── Native path via recorderBridge ─────────────────────────────────────────

  private async startNative(): Promise<{ success: boolean; error?: string }> {
    if (!recorderBridge.startRecording) {
      return {
        success: false,
        error:
          "useAudioEngineSetup() hook is not mounted. " +
          "Add <AudioEngineProvider /> to your root layout.",
      };
    }

    try {
      // Request permissions before starting
      const { granted } = await requestPermissionsAsync();
      if (!granted) {
        return { success: false, error: "Microphone permission denied." };
      }

      this.ring.reset();
      this.smoothing.reset();
      this.isRunning = true;

      await recorderBridge.startRecording({
        sampleRate: this.config.proAccuracy ? 48000 : DEFAULT_SAMPLE_RATE,
        channels: 1,
        encoding: "pcm_32bit", // Float32 — no conversion needed after decode
        interval: 50, // 50ms chunks → ~20 callbacks/sec
        onAudioStream: (audio: AudioStreamEvent) => {
          this.handleAudioStreamEvent(audio);
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

  // ── PCM chunk handler ───────────────────────────────────────────────────────

  /**
   * Called by useAudioRecorder's onAudioStream on every ~50ms chunk.
   * audio.data is always base64-encoded raw PCM bytes.
   */
  handleAudioStreamEvent(audio: AudioStreamEvent): void {
    if (!this.isRunning) return;

    const float32 = decodeBase64PCM(audio.data);

    // Apply sensitivity gain in-place
    const gain = getSensitivityGain(this.config.sensitivity);
    if (gain !== 1.0) {
      for (let i = 0; i < float32.length; i++) {
        float32[i] = Math.max(-1, Math.min(1, float32[i] * gain));
      }
    }

    this.ring.write(float32);

    // Only analyse when we have a full window
    const analysisSize = this.config.proAccuracy
      ? BUFFER_SIZE * 2
      : BUFFER_SIZE;

    const window = this.ring.read(analysisSize);
    if (!window) return;

    this.runPitchDetection(
      window,
      this.config.proAccuracy ? 48000 : DEFAULT_SAMPLE_RATE,
    );
  }

  // ── Pitch detection ─────────────────────────────────────────────────────────

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

  // ── Stop ────────────────────────────────────────────────────────────────────

  async stop(): Promise<void> {
    this.isRunning = false;
    this.smoothing.reset();
    this.ring.reset();

    if (Platform.OS !== "web") {
      try {
        await recorderBridge.stopRecording?.();
      } catch {
        // Already stopped
      }
    } else {
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.microphone?.disconnect();
      this.microphone = null;
      this.analyser?.disconnect();
      this.analyser = null;
      await this.audioContext?.close();
      this.audioContext = null;
      this.stream?.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    this.callback?.({ frequency: null, clarity: 0, isActive: false });
  }

  // ── Reference tone (web only) ───────────────────────────────────────────────

  playReferenceTone(frequency: number, durationMs = 800): void {
    if (Platform.OS !== "web") {
      console.warn(
        "[AudioEngine] playReferenceTone is web-only. " +
          "Native reference tone not yet implemented.",
      );
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
}

// ─── Exported singleton ───────────────────────────────────────────────────────

export const audioEngine = new AudioEngineCore();

// ─── Hook: must be mounted once at app root ───────────────────────────────────

/**
 * Wires useAudioRecorder (a React hook) into the audioEngine singleton.
 *
 * Mount this ONCE in your root layout:
 *
 *   // app/_layout.tsx
 *   export default function RootLayout() {
 *     useAudioEngineSetup();
 *     return <Stack />;
 *   }
 */
export function useAudioEngineSetup(): void {
  // useAudioRecorder must be called unconditionally at the top level
  const { startRecording, stopRecording } = useAudioRecorder();

  // Keep bridge refs stable — avoid stale closures
  const startRef = useRef(startRecording);
  const stopRef = useRef(stopRecording);

  useEffect(() => {
    startRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    stopRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    // Inject into bridge so AudioEngineCore can call them
    recorderBridge.startRecording = (opts) => startRef.current(opts as never);
    recorderBridge.stopRecording = () => stopRef.current();

    return () => {
      recorderBridge.startRecording = null;
      recorderBridge.stopRecording = null;
    };
  }, []);
}
