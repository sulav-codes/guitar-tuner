import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettings } from "@/ctx/settings";
import type { AppSettings } from "@/lib/settings-storage";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: "#00E676",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 2,
        textTransform: "uppercase",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

function SettingsRow({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#1A1A1A",
      }}
    >
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  badge,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <SettingsRow>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "500" }}>
            {label}
          </Text>
          {badge && (
            <View
              style={{
                backgroundColor: "#0A1A0A",
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: "#00E67633",
              }}
            >
              <Text
                style={{
                  color: "#00E676",
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                {badge}
              </Text>
            </View>
          )}
        </View>
        {description && (
          <Text style={{ color: "#555555", fontSize: 12 }}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#2A2A2A", true: "#00E67688" }}
        thumbColor={value ? "#00E676" : "#555555"}
      />
    </SettingsRow>
  );
}

function SegmentButton<T extends string>({
  opt,
  isSelected,
  onPress,
}: {
  opt: { value: T; label: string };
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: isSelected ? "#0A1A0A" : "#161616",
        borderWidth: 1,
        borderColor: isSelected ? "#00E676" : "#2A2A2A",
      }}
    >
      <Text
        style={{
          color: isSelected ? "#00E676" : "#888888",
          fontSize: 12,
          fontWeight: isSelected ? "700" : "400",
        }}
      >
        {opt.label}
      </Text>
    </Pressable>
  );
}

function SegmentRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <SettingsRow>
      <Text
        style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "500", flex: 1 }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {options.map((opt) => (
          <SegmentButton
            key={opt.value}
            opt={opt}
            isSelected={value === opt.value}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    </SettingsRow>
  );
}

function A4FreqButton({
  freq,
  isSelected,
  onPress,
}: {
  freq: number;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: isSelected ? "#0A1A0A" : "#161616",
        borderWidth: 1,
        borderColor: isSelected ? "#00E676" : "#2A2A2A",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: isSelected ? "#00E676" : "#888888",
          fontSize: 14,
          fontWeight: isSelected ? "700" : "400",
        }}
      >
        {freq} Hz
      </Text>
    </Pressable>
  );
}
export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [a4Input, setA4Input] = useState(settings.a4Frequency.toString());
  const [a4Error, setA4Error] = useState("");

  const update = useCallback(
    (patch: Partial<AppSettings>) => updateSettings(patch),
    [updateSettings],
  );

  const handleA4Change = (val: string) => {
    setA4Input(val);
    const num = parseFloat(val);
    if (!Number.isNaN(num) && num >= 400 && num <= 460) {
      setA4Error("");
      update({ a4Frequency: num });
    } else {
      setA4Error("Must be between 400–460 Hz");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      {/* Header */}
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
          SETTINGS
        </Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Playing */}
        <SectionHeader title="Playing" />
        <ToggleRow
          label="Lefty Mode"
          description="Mirrors string layout for left-handed players"
          badge="PRO"
          value={settings.leftyMode}
          onChange={(v) => update({ leftyMode: v })}
        />
        <ToggleRow
          label="Pro Accuracy Mode"
          description="Higher precision pitch detection (0.1¢)"
          badge="PRO"
          value={settings.proAccuracy}
          onChange={(v) => update({ proAccuracy: v })}
        />
        <ToggleRow
          label="Haptic Feedback"
          description="Vibrate when in tune"
          value={settings.hapticFeedback}
          onChange={(v) => update({ hapticFeedback: v })}
        />

        {/* Tuning */}
        <SectionHeader title="Tuning" />

        {/* A4 frequency */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#1A1A1A",
            gap: 10,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "500" }}>
            A4 Reference Frequency
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[432, 440, 444].map((freq) => (
              <A4FreqButton
                key={freq}
                freq={freq}
                isSelected={settings.a4Frequency === freq}
                onPress={() => {
                  update({ a4Frequency: freq });
                  setA4Input(freq.toString());
                  setA4Error("");
                }}
              />
            ))}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ color: "#555555", fontSize: 12 }}>
              Custom (400–460 Hz)
            </Text>
            <TextInput
              value={a4Input}
              onChangeText={handleA4Change}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: "#161616",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: "#FFFFFF",
                fontSize: 15,
                borderWidth: 1,
                borderColor: a4Error ? "#FF1744" : "#2A2A2A",
              }}
              placeholderTextColor="#444444"
            />
            {a4Error ? (
              <Text style={{ color: "#FF1744", fontSize: 12 }}>{a4Error}</Text>
            ) : null}
          </View>
        </View>

        {/* Algorithm */}
        <SegmentRow
          label="Algorithm"
          options={[
            { value: "yin", label: "YIN" },
            { value: "autocorrelation", label: "Auto" },
          ]}
          value={settings.algorithm}
          onChange={(v) => update({ algorithm: v as AppSettings["algorithm"] })}
        />

        {/* Needle speed */}
        <SegmentRow
          label="Needle Speed"
          options={[
            { value: "fast", label: "Fast" },
            { value: "medium", label: "Med" },
            { value: "slow", label: "Slow" },
          ]}
          value={settings.needleSpeed}
          onChange={(v) =>
            update({ needleSpeed: v as AppSettings["needleSpeed"] })
          }
        />

        {/* Sensitivity */}
        <SegmentRow
          label="Mic Sensitivity"
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Med" },
            { value: "high", label: "High" },
          ]}
          value={settings.micSensitivity}
          onChange={(v) =>
            update({ micSensitivity: v as AppSettings["micSensitivity"] })
          }
        />

        {/* Display */}
        <SectionHeader title="Display" />
        <ToggleRow
          label="Show Waveform"
          description="Display frequency visualizer"
          value={settings.showWaveform}
          onChange={(v) => update({ showWaveform: v })}
        />

        {/* About */}
        <SectionHeader title="About" />
        <View style={{ padding: 20, gap: 4 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
            Guitar Tuner Pro
          </Text>
          <Text style={{ color: "#555555", fontSize: 13 }}>Version 1.0.0</Text>
          <Text
            style={{
              color: "#444444",
              fontSize: 12,
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            Professional guitar tuner with real-time pitch detection, alternate
            tunings, lefty mode, and pro accuracy for guitarists of all levels.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
