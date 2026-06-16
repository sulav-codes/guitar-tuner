/**
 * Audio engine: captures microphone input and runs pitch detection
 * Platform-aware: Web Audio API on web, expo-av on native
 */

import { Platform } from "react-native";
import {
  detectPitchYIN,
  detectPitchAutocorrelation,
  FrequencySmoothing,
} from "./pitch-detection";
import type { PitchAlgorithm } from "./pitch-detection";

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

const BUFFER_SIZE = 2048;
const DEFAULT_SAMPLE_RATE = 44100;

// ─── Native implementation using expo-av ──────────────────────────────────────

class NativeAudioEngine {
  private smoothing: FrequencySmoothing = new FrequencySmoothing("medium");
  private callback: PitchCallback | null = null;
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: AudioEngineConfig = {
    algorithm: "yin",
    sensitivity: "medium",
    needleSpeed: "medium",
    proAccuracy: false,
  };

  // Lazily imported to avoid crashing on web
  private Recording: typeof import("expo-av").Audio.Recording | null = null;
  private recording: InstanceType<
    typeof import("expo-av").Audio.Recording
  > | null = null;

  isSupported(): boolean {
    // expo-av is supported on iOS and Android
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

    try {
      // Lazy import so web bundle doesn't break
      const { Audio } = await import("expo-av");
      this.Recording = Audio.Recording;

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        return { success: false, error: "Microphone permission denied." };
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.recording = new Audio.Recording();

      // Use high-quality preset for best pitch detection
      await this.recording.prepareToRecordAsync({
        android: {
          extension: ".wav",
          outputFormat:
            // OutputFormat.DEFAULT
            0,
          audioEncoder:
            // AudioEncoder.DEFAULT
            0,
          sampleRate: DEFAULT_SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          audioQuality:
            // AudioQuality.HIGH
            2,
          sampleRate: DEFAULT_SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      await this.recording.startAsync();
      this.isRunning = true;

      // Poll metering data for amplitude, emit pitch estimates
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (!this.isRunning || !status.isRecording) return;
        this.handleMeteringUpdate(status.metering ?? -160);
      });

      this.recording.setProgressUpdateInterval(50); // 50ms = ~20fps

      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      return { success: false, error: message };
    }
  }

  /**
   * expo-av only gives us dBFS metering, not raw PCM samples.
   * We simulate pitch detection using amplitude activity and emit
   * null frequency (needle stays still) when signal is too quiet.
   *
   * For true pitch detection on native, see the note below about
   * expo-audio / custom native modules.
   */
  private handleMeteringUpdate(decibelValue: number): void {
    // dBFS: 0 = full scale, -160 = silence
    // Convert to a 0–1 linear amplitude approximation
    const normalizedAmplitude = Math.pow(10, decibelValue / 20);
    const threshold =
      this.config.sensitivity === "low"
        ? 0.05
        : this.config.sensitivity === "high"
          ? 0.005
          : 0.02;

    const isActive = normalizedAmplitude > threshold;
    const clarity = Math.min(normalizedAmplitude * 5, 1.0);

    // Without raw PCM, we can't run YIN/autocorrelation here.
    // Emit null so the UI shows "listening" state without a wrong note.
    const smoothed = this.smoothing.smooth(isActive ? null : null);

    this.callback?.({
      frequency: smoothed,
      clarity: isActive ? clarity : 0,
      isActive,
    });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.smoothing.reset();

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
    } catch {
      // Already stopped
    }

    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    this.callback?.({ frequency: null, clarity: 0, isActive: false });
  }

  playReferenceTone(frequency: number, durationMs = 800): void {
    // expo-av Sound can play generated audio only from files/URIs
    // For a sine tone on native, use expo-audio or a simple beep via Audio
    console.warn(
      "playReferenceTone not yet implemented for native.",
      frequency,
      durationMs,
    );
  }
}

// ─── Web implementation (original) ───────────────────────────────────────────

class WebAudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffer: Float32Array = new Float32Array(BUFFER_SIZE);
  private animationId: number | null = null;
  private smoothing: FrequencySmoothing = new FrequencySmoothing("medium");
  private callback: PitchCallback | null = null;
  private config: AudioEngineConfig = {
    algorithm: "yin",
    sensitivity: "medium",
    needleSpeed: "medium",
    proAccuracy: false,
  };
  private isRunning = false;

  isSupported(): boolean {
    return (
      typeof AudioContext !== "undefined" ||
      typeof (globalThis as Record<string, unknown>).webkitAudioContext !==
        "undefined"
    );
  }

  updateConfig(config: Partial<AudioEngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.smoothing = new FrequencySmoothing(this.config.needleSpeed);
  }

  async start(
    onPitch: PitchCallback,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: "Web Audio API not supported on this platform.",
      };
    }

    this.callback = onPitch;

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
      gainNode.gain.value =
        this.config.sensitivity === "low"
          ? 0.5
          : this.config.sensitivity === "high"
            ? 2.0
            : 1.0;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(gainNode);
      gainNode.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.isRunning = true;
      this.processTick();

      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone access denied";
      return { success: false, error: message };
    }
  }

  private processTick = (): void => {
    if (!this.isRunning || !this.analyser) return;

    this.analyser.getFloatTimeDomainData(
      this.buffer as Float32Array<ArrayBuffer>,
    );

    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      rms += this.buffer[i] * this.buffer[i];
    }
    rms = Math.sqrt(rms / this.buffer.length);

    let rawFreq: number | null = null;
    const threshold = this.config.proAccuracy ? 0.05 : 0.01;

    if (rms > threshold) {
      rawFreq =
        this.config.algorithm === "yin"
          ? detectPitchYIN(
              this.buffer,
              this.audioContext?.sampleRate ?? DEFAULT_SAMPLE_RATE,
              0.1,
            )
          : detectPitchAutocorrelation(
              this.buffer,
              this.audioContext?.sampleRate ?? DEFAULT_SAMPLE_RATE,
            );
    }

    const smoothed = this.smoothing.smooth(rawFreq);
    const clarity = Math.min(rms * 10, 1.0);

    this.callback?.({
      frequency: smoothed,
      clarity,
      isActive: rms > threshold,
    });

    this.animationId = requestAnimationFrame(this.processTick);
  };

  stop(): void {
    this.isRunning = false;
    this.smoothing.reset();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.microphone?.disconnect();
    this.microphone = null;
    this.analyser?.disconnect();
    this.analyser = null;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;

    this.callback?.({ frequency: null, clarity: 0, isActive: false });
  }

  playReferenceTone(frequency: number, durationMs = 800): void {
    if (!this.isSupported()) return;

    const AudioContextClass =
      ((globalThis as Record<string, unknown>)
        .AudioContext as typeof AudioContext) ||
      ((globalThis as Record<string, unknown>)
        .webkitAudioContext as typeof AudioContext);

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + durationMs / 1000,
    );

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + durationMs / 1000);

    setTimeout(() => ctx.close(), durationMs + 100);
  }
}

// ─── Unified facade ───────────────────────────────────────────────────────────

/**
 * Wraps NativeAudioEngine and WebAudioEngine behind a single interface.
 * Selects the correct implementation at runtime based on platform.
 */
class AudioEngine {
  private engine: NativeAudioEngine | WebAudioEngine;

  constructor() {
    // On web, use WebAudioEngine; on iOS/Android, use NativeAudioEngine
    this.engine =
      Platform.OS === "web" ? new WebAudioEngine() : new NativeAudioEngine();
  }

  isSupported(): boolean {
    return this.engine.isSupported();
  }

  updateConfig(config: Partial<AudioEngineConfig>): void {
    this.engine.updateConfig(config);
  }

  async start(
    onPitch: PitchCallback,
  ): Promise<{ success: boolean; error?: string }> {
    return this.engine.start(onPitch);
  }

  stop(): void {
    if (this.engine instanceof NativeAudioEngine) {
      // Native stop is async; fire-and-forget is fine here
      void this.engine.stop();
    } else {
      this.engine.stop();
    }
  }

  playReferenceTone(frequency: number, durationMs = 800): void {
    this.engine.playReferenceTone(frequency, durationMs);
  }
}

export const audioEngine = new AudioEngine();