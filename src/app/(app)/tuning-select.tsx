import React, { useCallback, useState } from "react";
import { View, Text, SectionList, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { TUNINGS_BY_INSTRUMENT, type Tuning } from "@/lib/tunings";
import { useSettings } from "@/ctx/settings";

const CATEGORY_ORDER = [
  "standard",
  "drop",
  "open",
  "alternate",
  "pitch",
  "custom",
] as const;
const CATEGORY_LABELS: Record<string, string> = {
  standard: "Standard",
  drop: "Drop Tunings",
  open: "Open Tunings",
  alternate: "Alternate",
  pitch: "Pitch Variations",
  custom: "Custom",
};

function TuningRow({
  item,
  isSelected,
  onPress,
}: {
  item: Tuning;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: isSelected ? "#0A1A0A" : "#0D0D0D",
        borderBottomWidth: 1,
        borderBottomColor: "#1A1A1A",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            color: isSelected ? "#00E676" : "#FFFFFF",
            fontSize: 15,
            fontWeight: isSelected ? "700" : "500",
          }}
        >
          {item.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {item.strings.map((s) => (
            <View
              key={s.stringIndex}
              style={{
                backgroundColor: "#1A1A1A",
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{ color: "#888888", fontSize: 11, fontWeight: "600" }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {isSelected && (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: "#00E676",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#000000", fontSize: 14, fontWeight: "700" }}>
            ✓
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TuningSelectScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [selected, setSelected] = useState(settings.tuningId);
  const [closePressed, setClosePressed] = useState(false);

  const tunings = TUNINGS_BY_INSTRUMENT[settings.instrument] ?? [];

  const sections = CATEGORY_ORDER.map((cat) => ({
    title: CATEGORY_LABELS[cat],
    data: tunings.filter((t) => t.category === cat),
  })).filter((s) => s.data.length > 0);

  const handleSelect = useCallback(
    (tuning: Tuning) => {
      setSelected(tuning.id);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      updateSettings({ tuningId: tuning.id });
      router.back();
    },
    [router, updateSettings],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#1A1A1A",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          onPressIn={() => setClosePressed(true)}
          onPressOut={() => setClosePressed(false)}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: closePressed ? "#1A1A1A" : "transparent",
          }}
        >
          <Text style={{ color: "#00E676", fontSize: 16 }}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            Select Tuning
          </Text>
          <Text style={{ color: "#555555", fontSize: 12 }}>
            {tunings.length} tunings for selected instrument
          </Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 8,
              backgroundColor: "#0A0A0A",
              borderBottomWidth: 1,
              borderBottomColor: "#1A1A1A",
            }}
          >
            <Text
              style={{
                color: "#00E676",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TuningRow
            item={item}
            isSelected={selected === item.id}
            onPress={() => handleSelect(item)}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "#444444", fontSize: 14 }}>
              No tunings available for this instrument
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
