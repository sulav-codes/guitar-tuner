import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { audioEngine, type PitchResult } from "@/lib/audio-engine";
import {
  centsDeviation,
  freqToMidi,
  midiToFreq,
  NOTE_NAMES,
} from "@/lib/pitch-detection";
import {
  TUNINGS_BY_INSTRUMENT,
  getDefaultTuning,
  type Tuning,
  type StringDef,
} from "@/lib/tunings";
import { getInstrument } from "@/lib/instruments";
import { addTuningHistory } from "@/lib/settings-storage";
import { useSettings } from "@/ctx/settings";

import TuningMeter from "@/components/tuner/TuningMeter";
import StringSelector from "@/components/tuner/StringSelector";
import NoteDisplay from "@/components/tuner/NoteDisplay";

type StringState = "in-tune" | "sharp" | "flat" | "idle";

const IN_TUNE_THRESHOLD = 5; // cents

function findClosestString(
  frequency: number,
  strings: StringDef[],
  a4: number,
): number {
  let minDist = Infinity;
  let best = 0;
  for (const s of strings) {
    const targetFreq = midiToFreq(s.midi, a4);
    const cents = Math.abs(centsDeviation(frequency, targetFreq));
    if (cents < minDist) {
      minDist = cents;
      best = s.stringIndex;
    }
  }
  return best;
}

export default function TunerScreen() {
  const { settings } = useSettings();
  const router = useRouter();

  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current tuning
  const [currentTuning, setCurrentTuning] = useState<Tuning | null>(null);
  const [activeStringIndex, setActiveStringIndex] = useState<number | null>(
    null,
  );
  const [manualStringIndex, setManualStringIndex] = useState<number | null>(
    null,
  );

  // Pitch data
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [noteName, setNoteName] = useState<string | null>(null);
  const [octave, setOctave] = useState<number | null>(null);
  const [isInTune, setIsInTune] = useState(false);
  const [clarity, setClarity] = useState(0);
  const [stringStates, setStringStates] = useState<StringState[]>([]);

  // Press state for buttons
  const [tuningPressed, setTuningPressed] = useState(false);
  const [instrPressed, setInstrPressed] = useState(false);
  const [mainBtnPressed, setMainBtnPressed] = useState(false);

  const inTuneRef = useRef(false);
  const historyRecorded = useRef(false);

  // Load initial tuning from settings
  useEffect(() => {
    const tunings = TUNINGS_BY_INSTRUMENT[settings.instrument];
    const saved = tunings.find((t) => t.id === settings.tuningId);
    const tuning = saved ?? getDefaultTuning(settings.instrument);
    setCurrentTuning(tuning);
    if (tuning) {
      setStringStates(tuning.strings.map(() => "idle"));
    }
  }, [settings.instrument, settings.tuningId]);

  // Update audio engine config when settings change
  useEffect(() => {
    audioEngine.updateConfig({
      algorithm: settings.algorithm,
      sensitivity: settings.micSensitivity,
      needleSpeed: settings.needleSpeed,
      proAccuracy: settings.proAccuracy,
    });
  }, [
    settings.algorithm,
    settings.micSensitivity,
    settings.needleSpeed,
    settings.proAccuracy,
  ]);

  const handlePitchResult = useCallback(
    (result: PitchResult) => {
      if (!result.isActive || result.frequency === null) {
        setDetectedFreq(null);
        setCents(null);
        setIsInTune(false);
        setClarity(0);
        return;
      }

      setDetectedFreq(result.frequency);
      setClarity(result.clarity);

      const midi = freqToMidi(result.frequency, settings.a4Frequency);
      const roundedMidi = Math.round(midi);
      const noteOnly = NOTE_NAMES[roundedMidi % 12];
      const oct = Math.floor(roundedMidi / 12) - 1;
      setNoteName(noteOnly);
      setOctave(oct);

      if (!currentTuning || settings.instrument === "chromatic") {
        // Chromatic mode: compare to nearest semitone
        const targetFreq = midiToFreq(roundedMidi, settings.a4Frequency);
        const c = centsDeviation(result.frequency, targetFreq);
        setCents(Number(c.toFixed(2)));
        const inTune = Math.abs(c) <= IN_TUNE_THRESHOLD;
        setIsInTune(inTune);
        return;
      }

      // Determine which string we're targeting
      const targetIdx =
        manualStringIndex !== null
          ? manualStringIndex
          : findClosestString(
              result.frequency,
              currentTuning.strings,
              settings.a4Frequency,
            );

      setActiveStringIndex(targetIdx);

      const targetString = currentTuning.strings[targetIdx];
      const targetFreq = midiToFreq(targetString.midi, settings.a4Frequency);
      const c = centsDeviation(result.frequency, targetFreq);
      setCents(Number(c.toFixed(settings.proAccuracy ? 1 : 0)));

      const inTune = Math.abs(c) <= IN_TUNE_THRESHOLD;
      setIsInTune(inTune);

      // Update string states
      setStringStates((prev) => {
        const next = [...prev];
        next[targetIdx] = inTune ? "in-tune" : c > 0 ? "sharp" : "flat";
        return next;
      });

      // Haptic on entering in-tune
      if (
        inTune &&
        !inTuneRef.current &&
        settings.hapticFeedback &&
        Platform.OS !== "web"
      ) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      inTuneRef.current = inTune;

      // Record tuning session to history
      if (!historyRecorded.current && currentTuning) {
        historyRecorded.current = true;
        addTuningHistory({
          instrument: settings.instrument,
          tuningName: currentTuning.name,
          tuningId: currentTuning.id,
        });
      }
    },
    [currentTuning, manualStringIndex, settings],
  );

  const startListening = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    historyRecorded.current = false;

    if (!audioEngine.isSupported()) {
      setError(
        "Microphone not supported on this device/browser. Please use Chrome or Safari on mobile.",
      );
      setIsStarting(false);
      return;
    }

    const result = await audioEngine.start(handlePitchResult);
    if (result.success) {
      setIsListening(true);
    } else {
      setError(result.error ?? "Failed to access microphone.");
    }
    setIsStarting(false);
  }, [handlePitchResult]);

  const stopListening = useCallback(() => {
    audioEngine.stop();
    setIsListening(false);
    setDetectedFreq(null);
    setCents(null);
    setIsInTune(false);
    setClarity(0);
    setActiveStringIndex(null);
    inTuneRef.current = false;
  }, []);

  // Stop audio on tab blur
  useFocusEffect(
    useCallback(() => {
      return () => stopListening();
    }, [stopListening]),
  );

  const handlePlayReference = useCallback(() => {
    if (!currentTuning || activeStringIndex === null) return;
    const string = currentTuning.strings[activeStringIndex];
    const freq = midiToFreq(string.midi, settings.a4Frequency);
    audioEngine.playReferenceTone(freq);
  }, [currentTuning, activeStringIndex, settings.a4Frequency]);

  const targetFreq =
    currentTuning && activeStringIndex !== null
      ? midiToFreq(
          currentTuning.strings[activeStringIndex].midi,
          settings.a4Frequency,
        )
      : null;

  const instrument = getInstrument(settings.instrument);
  const tuningLabel = currentTuning?.name ?? "Chromatic";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#1A1A1A",
        }}
      >
        {/* Tuning selector */}
        <Pressable
          onPress={() => router.push("/(app)/tuning-select")}
          onPressIn={() => setTuningPressed(true)}
          onPressOut={() => setTuningPressed(false)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: tuningPressed ? "#1E1E1E" : "#161616",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: "#2A2A2A",
            flex: 1,
          }}
        >
          <Text
            style={{
              color: "#888888",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Tuning
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: "600",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {tuningLabel}
          </Text>
          <Text style={{ color: "#555555", fontSize: 12 }}>›</Text>
        </Pressable>

        {/* App title */}
        <Text
          style={{
            color: "#00E676",
            fontSize: 16,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginHorizontal: 12,
          }}
        >
          TUNER
        </Text>

        {/* Instrument selector */}
        <Pressable
          onPress={() => router.push("/(app)/instrument-select")}
          onPressIn={() => setInstrPressed(true)}
          onPressOut={() => setInstrPressed(false)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: instrPressed ? "#1E1E1E" : "#161616",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: "#2A2A2A",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            {instrument.emoji}
          </Text>
          <Text
            style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}
            numberOfLines={1}
          >
            {instrument.name}
          </Text>
          <Text style={{ color: "#555555", fontSize: 12 }}>›</Text>
        </Pressable>
      </View>

      {/* String selector */}
      {currentTuning && settings.instrument !== "chromatic" && (
        <StringSelector
          strings={currentTuning.strings}
          activeStringIndex={manualStringIndex ?? activeStringIndex}
          stringStates={stringStates}
          leftyMode={settings.leftyMode}
          onSelectString={(idx) => {
            setManualStringIndex(manualStringIndex === idx ? null : idx);
            if (settings.hapticFeedback && Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        />
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            paddingTop: 24,
            paddingBottom: 16,
            gap: 20,
          }}
        >
          {/* Pro accuracy badge */}
          {settings.proAccuracy && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#1A2A1A",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: "#00E67633",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#00E676",
                }}
              />
              <Text
                style={{
                  color: "#00E676",
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 1,
                }}
              >
                PRO ACCURACY
              </Text>
            </View>
          )}

          {/* Tuning Meter */}
          <TuningMeter
            cents={isListening ? cents : null}
            isActive={isListening && detectedFreq !== null}
            isInTune={isListening && isInTune}
            clarity={clarity}
          />

          {/* Note display */}
          <NoteDisplay
            noteName={isListening ? noteName : null}
            octave={isListening ? octave : null}
            frequency={isListening ? detectedFreq : null}
            cents={isListening ? cents : null}
            isInTune={isListening && isInTune}
            isActive={isListening && detectedFreq !== null}
            targetFrequency={targetFreq}
            onPlayReference={handlePlayReference}
          />

          {/* Error message */}
          {error && (
            <View
              style={{
                backgroundColor: "#2A0808",
                borderRadius: 10,
                paddingHorizontal: 20,
                paddingVertical: 12,
                marginHorizontal: 24,
                borderWidth: 1,
                borderColor: "#FF174433",
              }}
            >
              <Text
                style={{
                  color: "#FF6B6B",
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Start / Stop button */}
          <Pressable
            onPress={isListening ? stopListening : startListening}
            onPressIn={() => setMainBtnPressed(true)}
            onPressOut={() => setMainBtnPressed(false)}
            disabled={isStarting}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isListening ? "#1A0808" : "#0A1A0A",
              borderWidth: 2.5,
              borderColor: isListening ? "#FF1744" : "#00E676",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 8,
              opacity: mainBtnPressed ? 0.7 : 1,
            }}
          >
            {isStarting ? (
              <ActivityIndicator color="#00E676" size="small" />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 28,
                    lineHeight: 32,
                    color: isListening ? "#FF1744" : "#00E676",
                  }}
                >
                  {isListening ? "◼" : "◉"}
                </Text>
                <Text
                  style={{
                    color: isListening ? "#FF1744" : "#00E676",
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  {isListening ? "Stop" : "Start"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Listening indicator */}
          {isListening && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: "#FF1744",
                }}
              />
              <Text
                style={{ color: "#666666", fontSize: 12, letterSpacing: 0.5 }}
              >
                Listening...
              </Text>
            </View>
          )}

          {!isListening && !error && (
            <Text
              style={{
                color: "#444444",
                fontSize: 13,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              Tap start and play a string to begin tuning
            </Text>
          )}

          {/* Lefty mode indicator */}
          {settings.leftyMode && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#1A1A2A",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{ color: "#7C7CFF", fontSize: 11, letterSpacing: 1 }}
              >
                ✋ LEFTY MODE
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
