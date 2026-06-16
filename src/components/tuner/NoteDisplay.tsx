import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface NoteDisplayProps {
  noteName: string | null;
  octave: number | null;
  frequency: number | null;
  cents: number | null;
  isInTune: boolean;
  isActive: boolean;
  targetFrequency: number | null;
  onPlayReference: () => void;
}

export default function NoteDisplay({
  noteName,
  octave,
  frequency,
  cents,
  isInTune,
  isActive,
  targetFrequency,
  onPlayReference,
}: NoteDisplayProps) {
  const flash = useSharedValue(0);

  React.useEffect(() => {
    if (isInTune) {
      flash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 100 }),
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 200 }),
      );
    }
  }, [isInTune, flash]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: isInTune ? 1 : flash.value * 0.3 + (isActive ? 1 : 0.3),
  }));

  const centsColor =
    !isActive || cents === null
      ? "#444444"
      : Math.abs(cents) <= 5
        ? "#00E676"
        : Math.abs(cents) <= 15
          ? "#FFC107"
          : "#FF1744";

  const centsText =
    cents === null
      ? "—"
      : cents > 0
        ? `+${cents.toFixed(1)}¢`
        : `${cents.toFixed(1)}¢`;

  return (
    <View className="items-center" style={{ gap: 4 }}>
      {/* Note name */}
      <Animated.View style={[{ alignItems: "center" }, flashStyle]}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 2 }}
        >
          <Text
            style={{
              fontSize: 80,
              fontWeight: "800",
              letterSpacing: -2,
              lineHeight: 80,
              color: isInTune ? "#00E676" : isActive ? "#FFFFFF" : "#333333",
            }}
          >
            {noteName ?? "—"}
          </Text>
          {octave !== null && (
            <Text
              style={{
                fontSize: 28,
                fontWeight: "600",
                color: "#666666",
                marginTop: 8,
              }}
            >
              {octave}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Frequency + cents row */}
      <View style={{ flexDirection: "row", gap: 24, alignItems: "center" }}>
        {/* Cents */}
        <View className="items-center" style={{ gap: 2 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: centsColor,
              letterSpacing: -0.5,
            }}
          >
            {centsText}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: "#555555",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Cents
          </Text>
        </View>

        {/* Divider */}
        <View style={{ width: 1, height: 32, backgroundColor: "#2A2A2A" }} />

        {/* Frequency */}
        <View className="items-center" style={{ gap: 2 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: isActive ? "#CCCCCC" : "#444444",
              letterSpacing: -0.5,
            }}
          >
            {frequency !== null ? `${frequency.toFixed(1)}` : "—"}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: "#555555",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Hz
          </Text>
        </View>

        {/* Divider */}
        <View style={{ width: 1, height: 32, backgroundColor: "#2A2A2A" }} />

        {/* Reference play button */}
        <Pressable
          onPress={onPlayReference}
          disabled={targetFrequency === null}
          style={{
            alignItems: "center",
            gap: 2,
            opacity: targetFrequency === null ? 0.3 : 1,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: "#1E1E1E",
              borderWidth: 1,
              borderColor: "#333333",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14 }}>▶</Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              color: "#555555",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Ref
          </Text>
        </Pressable>
      </View>

      {/* In tune banner */}
      {isInTune && (
        <View
          style={{
            backgroundColor: "#00E67622",
            borderRadius: 8,
            paddingHorizontal: 20,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: "#00E67655",
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: "#00E676",
              fontSize: 14,
              fontWeight: "700",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            IN TUNE ✓
          </Text>
        </View>
      )}
    </View>
  );
}
