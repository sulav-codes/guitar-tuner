import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InstrumentType } from "./tunings";
import type { PitchAlgorithm } from "./pitch-detection";

const SETTINGS_KEY = "guitar_tuner_settings";
const CUSTOM_TUNINGS_KEY = "guitar_tuner_custom_tunings";
const HISTORY_KEY = "guitar_tuner_history";

export interface AppSettings {
  instrument: InstrumentType;
  tuningId: string;
  leftyMode: boolean;
  proAccuracy: boolean;
  a4Frequency: number;
  theme: "dark" | "light";
  micSensitivity: "low" | "medium" | "high";
  algorithm: PitchAlgorithm;
  needleSpeed: "fast" | "medium" | "slow";
  showWaveform: boolean;
  hapticFeedback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  instrument: "guitar",
  tuningId: "standard",
  leftyMode: false,
  proAccuracy: false,
  a4Frequency: 440,
  theme: "dark",
  micSensitivity: "medium",
  algorithm: "yin",
  needleSpeed: "medium",
  showWaveform: true,
  hapticFeedback: true,
};

export interface CustomTuningEntry {
  id: string;
  name: string;
  instrument: InstrumentType;
  strings: Array<{
    note: string;
    midi: number;
    label: string;
    stringIndex: number;
  }>;
  createdAt: string;
}

export interface TuningHistoryEntry {
  id: string;
  instrument: InstrumentType;
  tuningName: string;
  tuningId: string;
  startedAt: string;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  settings: Partial<AppSettings>,
): Promise<void> {
  try {
    const current = await loadSettings();
    const merged = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // silently fail
  }
}

export async function loadCustomTunings(): Promise<CustomTuningEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_TUNINGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomTuningEntry[];
  } catch {
    return [];
  }
}

export async function saveCustomTuning(
  tuning: CustomTuningEntry,
): Promise<void> {
  const existing = await loadCustomTunings();
  const updated = [...existing.filter((t) => t.id !== tuning.id), tuning];
  await AsyncStorage.setItem(CUSTOM_TUNINGS_KEY, JSON.stringify(updated));
}

export async function deleteCustomTuning(id: string): Promise<void> {
  const existing = await loadCustomTunings();
  await AsyncStorage.setItem(
    CUSTOM_TUNINGS_KEY,
    JSON.stringify(existing.filter((t) => t.id !== id)),
  );
}

export async function loadTuningHistory(): Promise<TuningHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TuningHistoryEntry[];
  } catch {
    return [];
  }
}

export async function addTuningHistory(
  entry: Omit<TuningHistoryEntry, "id" | "startedAt">,
): Promise<void> {
  const existing = await loadTuningHistory();
  const newEntry: TuningHistoryEntry = {
    ...entry,
    id: Date.now().toString(),
    startedAt: new Date().toISOString(),
  };
  // Keep last 50 entries
  const updated = [newEntry, ...existing].slice(0, 50);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
