import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { INSTRUMENTS, type Instrument } from "@/lib/instruments";
import { getDefaultTuning, TUNINGS_BY_INSTRUMENT } from "@/lib/tunings";
import { useSettings } from "@/ctx/settings";

function InstrumentItem({
  instrument,
  isSelected,
  onSelect,
}: {
  instrument: Instrument;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: isSelected ? "#0A1A0A" : "#0D0D0D",
        borderBottomWidth: 1,
        borderBottomColor: "#1A1A1A",
      }}
    >
      <Text style={{ fontSize: 30 }}>{instrument.emoji}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: isSelected ? "#00E676" : "#FFFFFF",
            fontSize: 16,
            fontWeight: isSelected ? "700" : "500",
          }}
        >
          {instrument.name}
        </Text>
        <Text style={{ color: "#555555", fontSize: 13 }}>
          {instrument.description}
        </Text>
        {instrument.id !== "chromatic" && (
          <Text style={{ color: "#444444", fontSize: 11, marginTop: 2 }}>
            {TUNINGS_BY_INSTRUMENT[instrument.id]?.length ?? 0} tunings
            available
          </Text>
        )}
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

export default function InstrumentSelectScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [selected, setSelected] = useState(settings.instrument);
  const [closePressed, setClosePressed] = useState(false);

  const handleSelect = useCallback(
    (id: typeof selected) => {
      setSelected(id);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const defaultTuning = getDefaultTuning(id);
      updateSettings({
        instrument: id,
        tuningId: defaultTuning?.id ?? "standard",
      });
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
        <Text
          style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700", flex: 1 }}
        >
          Select Instrument
        </Text>
      </View>

      <FlatList
        data={INSTRUMENTS}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }) => (
          <InstrumentItem
            instrument={item}
            isSelected={selected === item.id}
            onSelect={() => handleSelect(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}
