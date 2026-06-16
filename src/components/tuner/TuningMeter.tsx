import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

interface TuningMeterProps {
  cents: number | null; // -50 to +50
  isActive: boolean;
  isInTune: boolean;
  clarity: number; // 0-1
}

const RADIUS = 120;
const STROKE_WIDTH = 14;
const CENTER = RADIUS + STROKE_WIDTH;
const SVG_SIZE = (RADIUS + STROKE_WIDTH) * 2;

// Convert cents (-50 to +50) → needle angle (-90° to +90°)
function centsToAngle(cents: number): number {
  return (cents / 50) * 90;
}

export default function TuningMeter({
  cents,
  isActive,
  isInTune,
  clarity,
}: TuningMeterProps) {
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const prevCents = useRef<number | null>(null);

  useEffect(() => {
    if (cents !== null && isActive) {
      const targetAngle = centsToAngle(Math.max(-50, Math.min(50, cents)));
      rotation.value = withSpring(targetAngle, {
        damping: 18,
        stiffness: 200,
        mass: 0.8,
      });
      prevCents.current = cents;
    } else {
      rotation.value = withSpring(0, { damping: 12, stiffness: 120 });
    }
  }, [cents, isActive, rotation]);

  useEffect(() => {
    glowOpacity.value = withTiming(isInTune ? 1 : 0, { duration: 200 });
  }, [isInTune, glowOpacity]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Tick marks at -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50 cents
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  function polarToCartesian(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: CENTER + r * Math.cos(rad),
      y: CENTER + r * Math.sin(rad),
    };
  }

  return (
    <View className="items-center justify-center">
      {/* Glow ring when in tune */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: SVG_SIZE + 20,
            height: SVG_SIZE + 20,
            borderRadius: (SVG_SIZE + 20) / 2,
            borderWidth: 2,
            borderColor: "#00E676",
          },
          glowStyle,
        ]}
      />

      <Svg width={SVG_SIZE} height={SVG_SIZE + 20}>
        <Defs>
          <LinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF1744" stopOpacity="0.7" />
            <Stop offset="45%" stopColor="#FFC107" stopOpacity="0.5" />
            <Stop offset="50%" stopColor="#00E676" stopOpacity="0.9" />
            <Stop offset="55%" stopColor="#FFC107" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#FF1744" stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        {/* Background arc */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="#1E1E1E"
          strokeWidth={STROKE_WIDTH + 2}
        />

        {/* Colored arc */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${Math.PI * RADIUS} ${Math.PI * RADIUS * 10}`}
          strokeDashoffset={0}
          strokeLinecap="butt"
          rotation={-180}
          origin={`${CENTER}, ${CENTER}`}
        />

        {/* Center indicator line at top */}
        <Line
          x1={CENTER}
          y1={CENTER - RADIUS - STROKE_WIDTH}
          x2={CENTER}
          y2={CENTER - RADIUS + STROKE_WIDTH / 2}
          stroke="#00E676"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {ticks.map((tick) => {
          const angleDeg = -180 + (tick + 50) * 1.8; // map -50..50 → -180..-0
          const inner = polarToCartesian(
            angleDeg + 90,
            RADIUS - STROKE_WIDTH / 2 - 4,
          );
          const outer = polarToCartesian(
            angleDeg + 90,
            RADIUS + STROKE_WIDTH / 2 + 4,
          );
          const isMajor = tick % 10 === 0;
          const isCenter = tick === 0;
          return (
            <Line
              key={tick}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={isCenter ? "#00E676" : "#444444"}
              strokeWidth={isCenter ? 3 : isMajor ? 2 : 1}
            />
          );
        })}

        {/* Labels */}
        {[-50, -25, 0, 25, 50].map((label) => {
          const angleDeg = -180 + (label + 50) * 1.8;
          const pos = polarToCartesian(
            angleDeg + 90,
            RADIUS - STROKE_WIDTH / 2 - 20,
          );
          return (
            <SvgText
              key={label}
              x={pos.x}
              y={pos.y}
              fill={label === 0 ? "#00E676" : "#555555"}
              fontSize={label === 0 ? 12 : 10}
              fontWeight={label === 0 ? "bold" : "normal"}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label === 0 ? "0" : label > 0 ? `+${label}` : `${label}`}
            </SvgText>
          );
        })}
      </Svg>

      {/* Needle */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 20 + CENTER,
            left: CENTER - 2,
            width: 4,
            height: RADIUS - 20,
            borderRadius: 2,
            transformOrigin: "bottom center",
            backgroundColor: isInTune
              ? "#00E676"
              : isActive
                ? "#FFFFFF"
                : "#444444",
          },
          needleStyle,
        ]}
      />

      {/* Center pivot dot */}
      <View
        style={{
          position: "absolute",
          bottom: 20 + CENTER - 10,
          left: CENTER - 10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: isInTune ? "#00E676" : "#333333",
          borderWidth: 2,
          borderColor: isInTune ? "#00E676" : "#555555",
        }}
      />

      {/* Clarity indicator */}
      <View className="absolute bottom-0 left-0 right-0 items-center">
        <Text style={{ color: "#444444", fontSize: 10, letterSpacing: 1 }}>
          {isActive
            ? clarity > 0.7
              ? "●●●"
              : clarity > 0.4
                ? "●●○"
                : "●○○"
            : "○○○"}
        </Text>
      </View>
    </View>
  );
}
