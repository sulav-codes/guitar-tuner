import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useSettings } from "@/ctx/settings";

const TIME_SIGNATURES = [
  { beats: 2, label: "2/4" },
  { beats: 3, label: "3/4" },
  { beats: 4, label: "4/4" },
  { beats: 5, label: "5/4" },
  { beats: 6, label: "6/8" },
];

const MIN_BPM = 40;
const MAX_BPM = 240;

function clampBpm(v: number) {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
}

const BPM_PRESETS = [60, 80, 100, 120, 140, 160];

export default function MetronomeScreen() {
  const { settings } = useSettings();
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [timeSigIndex, setTimeSigIndex] = useState(2);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const playingRef = useRef(false);

  const tapTimestamps = useRef<number[]>([]);
  const lastTapRef = useRef(0);

  const beatFlash = useSharedValue(0);
  const accentFlash = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + beatFlash.value * 0.7,
    transform: [{ scale: 1 + beatFlash.value * 0.06 }],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + accentFlash.value * 0.8,
    transform: [{ scale: 1 + accentFlash.value * 0.12 }],
  }));

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playClick = useCallback(
    (isAccent: boolean) => {
      if (Platform.OS !== "web") {
        if (settings.hapticFeedback) {
          Haptics.impactAsync(
            isAccent
              ? Haptics.ImpactFeedbackStyle.Heavy
              : Haptics.ImpactFeedbackStyle.Light,
          );
        }
        return;
      }
      try {
        const AudioContextClass =
          ((globalThis as Record<string, unknown>)
            .AudioContext as typeof AudioContext) ||
          ((globalThis as Record<string, unknown>)
            .webkitAudioContext as typeof AudioContext);
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = isAccent ? 1400 : 900;
        gain.gain.setValueAtTime(isAccent ? 0.6 : 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        // web audio not available
      }
    },
    [settings.hapticFeedback],
  );

  const tick = useCallback(() => {
    const timeSig = TIME_SIGNATURES[timeSigIndex];
    const nextBeat = (beatRef.current + 1) % timeSig.beats;
    beatRef.current = nextBeat;
    setCurrentBeat(nextBeat);
    const isAccent = nextBeat === 0;
    playClick(isAccent);
    if (isAccent) {
      accentFlash.value = withSequence(
        withTiming(1, { duration: 40 }),
        withTiming(0, { duration: 200 }),
      );
    } else {
      beatFlash.value = withSequence(
        withTiming(1, { duration: 30 }),
        withTiming(0, { duration: 150 }),
      );
    }
  }, [timeSigIndex, playClick, beatFlash, accentFlash]);

  const startMetronome = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    beatRef.current = -1;
    setIsPlaying(true);
    const interval = (60 / bpmRef.current) * 1000;
    intervalRef.current = setInterval(tick, interval);
  }, [tick]);

  const stopMetronome = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentBeat(0);
    beatRef.current = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    bpmRef.current = bpm;
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = (60 / bpm) * 1000;
      intervalRef.current = setInterval(tick, interval);
    }
  }, [bpm, timeSigIndex, isPlaying, tick]);

  useEffect(() => () => stopMetronome(), [stopMetronome]);

  const handleTap = () => {
    const now = Date.now();
    const elapsed = now - lastTapRef.current;
    if (elapsed > 3000) tapTimestamps.current = [];
    lastTapRef.current = now;
    tapTimestamps.current.push(now);
    if (tapTimestamps.current.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimestamps.current.length; i++) {
        intervals.push(tapTimestamps.current[i] - tapTimestamps.current[i - 1]);
      }
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(clampBpm(60000 / avgInterval));
    }
    if (settings.hapticFeedback && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const timeSig = TIME_SIGNATURES[timeSigIndex];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      <View
        style={{
          alignItems: "center",
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#1A1A1A",
        }}
      >
        <Text
          style={{
            color: "#00E676",
            fontSize: 16,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          METRONOME
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          paddingVertical: 24,
          gap: 28,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Beat visualizer */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            height: 52,
            alignItems: "center",
          }}
        >
          {Array.from({ length: timeSig.beats }).map((_, i) => {
            const isActive = isPlaying && i === currentBeat;
            const isAccent = i === 0;
            return (
              <Animated.View
                key={i}
                style={[
                  {
                    width: isAccent ? 42 : 36,
                    height: isAccent ? 42 : 36,
                    borderRadius: isAccent ? 21 : 18,
                    backgroundColor: isAccent ? "#1A2A1A" : "#161616",
                    borderWidth: 2,
                    borderColor: isActive
                      ? isAccent
                        ? "#00E676"
                        : "#FFFFFF"
                      : "#2A2A2A",
                  },
                  isActive ? (isAccent ? accentStyle : flashStyle) : {},
                ]}
              />
            );
          })}
        </View>

        {/* BPM Display */}
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text
            style={{
              fontSize: 96,
              fontWeight: "800",
              letterSpacing: -4,
              lineHeight: 96,
              color: "#FFFFFF",
              fontVariant: ["tabular-nums"],
            }}
          >
            {bpm}
          </Text>
          <Text
            style={{
              color: "#555555",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            BPM
          </Text>
        </View>

        {/* BPM Controls */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {([-10, -1] as const).map((delta) => (
            <Pressable
              key={delta}
              onPress={() => setBpm((b) => clampBpm(b + delta))}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#161616",
                borderWidth: 1.5,
                borderColor: "#2A2A2A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}
              >
                {delta}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={isPlaying ? stopMetronome : startMetronome}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isPlaying ? "#1A0808" : "#0A1A0A",
              borderWidth: 2.5,
              borderColor: isPlaying ? "#FF1744" : "#00E676",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ fontSize: 28, color: isPlaying ? "#FF1744" : "#00E676" }}
            >
              {isPlaying ? "◼" : "▶"}
            </Text>
          </Pressable>

          {([1, 10] as const).map((delta) => (
            <Pressable
              key={delta}
              onPress={() => setBpm((b) => clampBpm(b + delta))}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#161616",
                borderWidth: 1.5,
                borderColor: "#2A2A2A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}
              >
                +{delta}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tap tempo */}
        <Pressable
          onPress={handleTap}
          style={{
            backgroundColor: "#161616",
            borderRadius: 12,
            paddingHorizontal: 40,
            paddingVertical: 16,
            borderWidth: 1.5,
            borderColor: "#333333",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            TAP TEMPO
          </Text>
          <Text style={{ color: "#555555", fontSize: 11, marginTop: 2 }}>
            Tap 3+ times to set BPM
          </Text>
        </Pressable>

        {/* BPM Presets */}
        <View style={{ gap: 8, width: "100%", paddingHorizontal: 24 }}>
          <Text
            style={{
              color: "#555555",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Presets
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {BPM_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setBpm(preset)}
                style={{
                  backgroundColor: bpm === preset ? "#0A1A0A" : "#161616",
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: bpm === preset ? "#00E676" : "#2A2A2A",
                }}
              >
                <Text
                  style={{
                    color: bpm === preset ? "#00E676" : "#888888",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time signature */}
        <View style={{ gap: 8, width: "100%", paddingHorizontal: 24 }}>
          <Text
            style={{
              color: "#555555",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Time Signature
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {TIME_SIGNATURES.map((ts, i) => (
              <Pressable
                key={ts.label}
                onPress={() => {
                  setTimeSigIndex(i);
                  if (isPlaying) stopMetronome();
                }}
                style={{
                  backgroundColor: i === timeSigIndex ? "#0A1A0A" : "#161616",
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: i === timeSigIndex ? "#00E676" : "#2A2A2A",
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: i === timeSigIndex ? "#00E676" : "#888888",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {ts.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
