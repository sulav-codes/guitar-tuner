import React from "react";
import { View, Pressable, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import type { StringDef } from "@/lib/tunings";

interface StringSelectorProps {
  strings: StringDef[];
  activeStringIndex: number | null;
  stringStates: ("in-tune" | "sharp" | "flat" | "idle")[];
  leftyMode: boolean;
  onSelectString: (index: number) => void;
}

const STATE_COLORS = {
  "in-tune": "#00E676",
  sharp: "#FF1744",
  flat: "#FF9100",
  idle: "#444444",
};

function StringDot({
  string,
  state,
  isActive,
  onPress,
}: {
  string: StringDef;
  state: "in-tune" | "sharp" | "flat" | "idle";
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    scale.value = withTiming(isActive ? 1.2 : 1, { duration: 150 });
  }, [isActive, scale]);

  const color = STATE_COLORS[state];

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View
        style={[
          {
            alignItems: "center",
            gap: 4,
          },
          animStyle,
        ]}
      >
        {/* String number label */}
        <Text style={{ color: "#555555", fontSize: 10, fontWeight: "600" }}>
          {string.stringIndex + 1}
        </Text>

        {/* String circle */}
        <View
          style={{
            width: isActive ? 42 : 36,
            height: isActive ? 42 : 36,
            borderRadius: isActive ? 21 : 18,
            backgroundColor: isActive ? color + "22" : "#1A1A1A",
            borderWidth: isActive ? 2.5 : 1.5,
            borderColor: isActive ? color : "#333333",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: isActive ? color : "#888888",
              fontSize: isActive ? 15 : 13,
              fontWeight: "700",
              letterSpacing: -0.5,
            }}
          >
            {string.label}
          </Text>
        </View>

        {/* State dot */}
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: state !== "idle" ? color : "transparent",
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function StringSelector({
  strings,
  activeStringIndex,
  stringStates,
  leftyMode,
  onSelectString,
}: StringSelectorProps) {
  const displayStrings = leftyMode ? [...strings].reverse() : strings;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#0D0D0D",
        borderBottomWidth: 1,
        borderBottomColor: "#222222",
      }}
    >
      {displayStrings.map((string) => {
        const originalIndex = leftyMode
          ? strings.length - 1 - displayStrings.indexOf(string)
          : string.stringIndex;
        return (
          <StringDot
            key={string.stringIndex}
            string={string}
            state={stringStates[originalIndex] ?? "idle"}
            isActive={activeStringIndex === originalIndex}
            onPress={() => onSelectString(originalIndex)}
          />
        );
      })}
    </View>
  );
}
