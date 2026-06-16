import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Svg, { Line, Circle, Rect, Text as SvgText } from "react-native-svg";

import type { ChordDef } from "@/lib/chords";

interface ChordDiagramProps {
  chord: ChordDef;
  onPlayChord?: () => void;
}

const FRETS = 5;
const STRINGS = 6;
const FRET_HEIGHT = 36;
const STRING_SPACING = 32;
const MARGIN_LEFT = 32;
const MARGIN_TOP = 36;
const DOT_RADIUS = 11;

const DIAGRAM_WIDTH = MARGIN_LEFT + (STRINGS - 1) * STRING_SPACING + 30;
const DIAGRAM_HEIGHT = MARGIN_TOP + FRETS * FRET_HEIGHT + 20;

export default function ChordDiagram({
  chord,
  onPlayChord,
}: ChordDiagramProps) {
  const frettedFingers = chord.fingers.filter((f) => f.fret > 0);
  const openStrings = chord.fingers.filter((f) => f.fret === 0);
  const mutedStrings = chord.fingers.filter((f) => f.fret === -1);

  // Finger color map
  const fingerColors: Record<number, string> = {
    1: "#00E676",
    2: "#2979FF",
    3: "#FF6D00",
    4: "#D500F9",
  };

  function stringX(stringNum: number): number {
    // string 1 = high e = right, string 6 = low E = left
    return MARGIN_LEFT + (STRINGS - stringNum) * STRING_SPACING;
  }

  function fretY(fretNum: number): number {
    return (
      MARGIN_TOP + (fretNum - chord.baseFret) * FRET_HEIGHT + FRET_HEIGHT / 2
    );
  }

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      {/* Chord name */}
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 20,
          fontWeight: "700",
          letterSpacing: -0.5,
        }}
      >
        {chord.fullName}
      </Text>

      <Svg width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT}>
        {/* Nut (thick top bar if baseFret is 1) */}
        {chord.baseFret === 1 ? (
          <Rect
            x={MARGIN_LEFT - 2}
            y={MARGIN_TOP - FRET_HEIGHT / 2}
            width={(STRINGS - 1) * STRING_SPACING + 4}
            height={5}
            fill="#888888"
            rx={2}
          />
        ) : (
          // Fret position marker
          <SvgText
            x={MARGIN_LEFT - 16}
            y={MARGIN_TOP}
            fill="#888888"
            fontSize={11}
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {chord.baseFret}fr
          </SvgText>
        )}

        {/* Fret lines */}
        {Array.from({ length: FRETS + 1 }).map((_, i) => (
          <Line
            key={i}
            x1={MARGIN_LEFT}
            y1={MARGIN_TOP - FRET_HEIGHT / 2 + i * FRET_HEIGHT}
            x2={MARGIN_LEFT + (STRINGS - 1) * STRING_SPACING}
            y2={MARGIN_TOP - FRET_HEIGHT / 2 + i * FRET_HEIGHT}
            stroke={i === 0 && chord.baseFret === 1 ? "transparent" : "#333333"}
            strokeWidth={1.5}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: STRINGS }).map((_, i) => (
          <Line
            key={i}
            x1={MARGIN_LEFT + i * STRING_SPACING}
            y1={MARGIN_TOP - FRET_HEIGHT / 2}
            x2={MARGIN_LEFT + i * STRING_SPACING}
            y2={MARGIN_TOP - FRET_HEIGHT / 2 + FRETS * FRET_HEIGHT}
            stroke="#444444"
            strokeWidth={1.5}
          />
        ))}

        {/* Barre */}
        {chord.barre && (
          <Rect
            x={stringX(chord.barre.toString) - DOT_RADIUS}
            y={fretY(chord.barre.fret) - DOT_RADIUS}
            width={
              stringX(chord.barre.fromString) -
              stringX(chord.barre.toString) +
              DOT_RADIUS * 2
            }
            height={DOT_RADIUS * 2}
            rx={DOT_RADIUS}
            fill="#00E676"
            opacity={0.85}
          />
        )}

        {/* Fretted finger dots */}
        {frettedFingers.map((f) => {
          if (chord.barre && f.fret === chord.barre.fret) return null;
          const color = f.finger
            ? (fingerColors[f.finger] ?? "#00E676")
            : "#00E676";
          return (
            <React.Fragment key={`${f.string}-${f.fret}`}>
              <Circle
                cx={stringX(f.string)}
                cy={fretY(f.fret)}
                r={DOT_RADIUS}
                fill={color}
              />
              {f.finger && (
                <SvgText
                  x={stringX(f.string)}
                  y={fretY(f.fret)}
                  fill="#000000"
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {f.finger}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* Open string indicators */}
        {openStrings.map((f) => (
          <Circle
            key={`open-${f.string}`}
            cx={stringX(f.string)}
            cy={MARGIN_TOP - FRET_HEIGHT / 2 - 12}
            r={7}
            fill="none"
            stroke="#00E676"
            strokeWidth={2}
          />
        ))}

        {/* Muted string X */}
        {mutedStrings.map((f) => {
          const cx = stringX(f.string);
          const cy = MARGIN_TOP - FRET_HEIGHT / 2 - 12;
          return (
            <React.Fragment key={`mute-${f.string}`}>
              <Line
                x1={cx - 6}
                y1={cy - 6}
                x2={cx + 6}
                y2={cy + 6}
                stroke="#FF1744"
                strokeWidth={2}
              />
              <Line
                x1={cx + 6}
                y1={cy - 6}
                x2={cx - 6}
                y2={cy + 6}
                stroke="#FF1744"
                strokeWidth={2}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Play reference button */}
      {onPlayChord && (
        <Pressable
          onPress={onPlayChord}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#161616",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "#2A2A2A",
          }}
        >
          <Text style={{ color: "#00E676", fontSize: 12 }}>▶</Text>
          <Text style={{ color: "#888888", fontSize: 12 }}>Play</Text>
        </Pressable>
      )}
    </View>
  );
}
