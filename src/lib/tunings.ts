// Note frequencies based on A4 = 440Hz
// MIDI note 69 = A4 = 440Hz
// freq = 440 * 2^((midi - 69) / 12)

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
export const NOTE_NAMES_FLAT = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function noteNameFromMidi(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function centsDeviation(detected: number, target: number): number {
  return 1200 * Math.log2(detected / target);
}

// Build a string from note name + octave, e.g. "E2" → MIDI
function noteToMidi(note: string): number {
  const match = note.match(/^([A-Ga-g][#b]?)(\d)$/);
  if (!match) return 40;
  const notePart = match[1].toUpperCase();
  const octave = parseInt(match[2]);
  const noteIdx =
    NOTE_NAMES.indexOf(notePart) !== -1
      ? NOTE_NAMES.indexOf(notePart)
      : NOTE_NAMES_FLAT.indexOf(notePart);
  return (octave + 1) * 12 + noteIdx;
}

export interface StringDef {
  note: string; // e.g. "E2"
  midi: number;
  label: string; // display label e.g. "E" or "6"
  stringIndex: number; // 0 = thickest
}

export interface Tuning {
  id: string;
  name: string;
  category: "standard" | "drop" | "open" | "alternate" | "pitch" | "custom";
  strings: StringDef[];
}

function makeTuning(
  id: string,
  name: string,
  category: Tuning["category"],
  notes: string[],
  labels?: string[],
): Tuning {
  return {
    id,
    name,
    category,
    strings: notes.map((note, i) => ({
      note,
      midi: noteToMidi(note),
      label: labels ? labels[i] : note.replace(/\d/, ""),
      stringIndex: i,
    })),
  };
}

// Guitar tunings (6-string, from thickest to thinnest)
export const GUITAR_TUNINGS: Tuning[] = [
  makeTuning(
    "standard",
    "Standard (EADGBe)",
    "standard",
    ["E2", "A2", "D3", "G3", "B3", "E4"],
    ["E", "A", "D", "G", "B", "e"],
  ),
  makeTuning(
    "drop_d",
    "Drop D",
    "drop",
    ["D2", "A2", "D3", "G3", "B3", "E4"],
    ["D", "A", "D", "G", "B", "e"],
  ),
  makeTuning(
    "double_drop_d",
    "Double Drop D",
    "drop",
    ["D2", "A2", "D3", "G3", "B3", "D4"],
    ["D", "A", "D", "G", "B", "d"],
  ),
  makeTuning(
    "open_g",
    "Open G",
    "open",
    ["D2", "G2", "D3", "G3", "B3", "D4"],
    ["D", "G", "D", "G", "B", "d"],
  ),
  makeTuning(
    "open_d",
    "Open D",
    "open",
    ["D2", "A2", "D3", "F#3", "A3", "D4"],
    ["D", "A", "D", "F#", "A", "d"],
  ),
  makeTuning(
    "open_e",
    "Open E",
    "open",
    ["E2", "B2", "E3", "G#3", "B3", "E4"],
    ["E", "B", "E", "G#", "B", "e"],
  ),
  makeTuning(
    "open_a",
    "Open A",
    "open",
    ["E2", "A2", "E3", "A3", "C#4", "E4"],
    ["E", "A", "E", "A", "C#", "e"],
  ),
  makeTuning(
    "open_g_cgdgbd",
    "Open G (CGDGBD)",
    "open",
    ["C2", "G2", "D3", "G3", "B3", "D4"],
    ["C", "G", "D", "G", "B", "d"],
  ),
  makeTuning(
    "dadgad",
    "DADGAD",
    "alternate",
    ["D2", "A2", "D3", "G3", "A3", "D4"],
    ["D", "A", "D", "G", "A", "d"],
  ),
  makeTuning(
    "nashville",
    "Nashville Tuning",
    "alternate",
    ["E3", "A3", "D4", "G4", "B3", "E4"],
    ["E", "A", "D", "G", "B", "e"],
  ),
  makeTuning(
    "half_step_down",
    "Half Step Down (Eb)",
    "pitch",
    ["D#2", "G#2", "C#3", "F#3", "A#3", "D#4"],
    ["Eb", "Ab", "Db", "Gb", "Bb", "eb"],
  ),
  makeTuning(
    "full_step_down",
    "Full Step Down (D)",
    "pitch",
    ["D2", "G2", "C3", "F3", "A3", "D4"],
    ["D", "G", "C", "F", "A", "d"],
  ),
  makeTuning(
    "baritone",
    "Baritone (B)",
    "alternate",
    ["B1", "E2", "A2", "D3", "F#3", "B3"],
    ["B", "E", "A", "D", "F#", "b"],
  ),
  makeTuning(
    "twelve_string",
    "12-String (Standard)",
    "alternate",
    ["E2", "A2", "D3", "G3", "B3", "E4"],
    ["E", "A", "D", "G", "B", "e"],
  ),
];

// Bass tunings (4-string)
export const BASS_4_TUNINGS: Tuning[] = [
  makeTuning(
    "bass4_standard",
    "Standard (EADGBe)",
    "standard",
    ["E1", "A1", "D2", "G2"],
    ["E", "A", "D", "G"],
  ),
  makeTuning(
    "bass4_drop_d",
    "Drop D",
    "drop",
    ["D1", "A1", "D2", "G2"],
    ["D", "A", "D", "G"],
  ),
  makeTuning(
    "bass4_half_down",
    "Half Step Down",
    "pitch",
    ["D#1", "G#1", "C#2", "F#2"],
    ["Eb", "Ab", "Db", "Gb"],
  ),
  makeTuning(
    "bass4_full_down",
    "Full Step Down",
    "pitch",
    ["D1", "G1", "C2", "F2"],
    ["D", "G", "C", "F"],
  ),
];

// Bass 5-string tunings
export const BASS_5_TUNINGS: Tuning[] = [
  makeTuning(
    "bass5_standard",
    "Standard (BEADGBe)",
    "standard",
    ["B0", "E1", "A1", "D2", "G2"],
    ["B", "E", "A", "D", "G"],
  ),
  makeTuning(
    "bass5_drop_a",
    "Drop A",
    "drop",
    ["A0", "E1", "A1", "D2", "G2"],
    ["A", "E", "A", "D", "G"],
  ),
];

// Ukulele
export const UKULELE_TUNINGS: Tuning[] = [
  makeTuning(
    "uke_standard",
    "Standard (GCEA)",
    "standard",
    ["G4", "C4", "E4", "A4"],
    ["G", "C", "E", "A"],
  ),
  makeTuning(
    "uke_low_g",
    "Low G",
    "alternate",
    ["G3", "C4", "E4", "A4"],
    ["G", "C", "E", "A"],
  ),
  makeTuning(
    "uke_d_tuning",
    "D Tuning (ADF#B)",
    "alternate",
    ["A4", "D4", "F#4", "B4"],
    ["A", "D", "F#", "B"],
  ),
];

// Violin
export const VIOLIN_TUNINGS: Tuning[] = [
  makeTuning(
    "violin_standard",
    "Standard (GDAE)",
    "standard",
    ["G3", "D4", "A4", "E5"],
    ["G", "D", "A", "E"],
  ),
];

// Mandolin
export const MANDOLIN_TUNINGS: Tuning[] = [
  makeTuning(
    "mandolin_standard",
    "Standard (GDAE)",
    "standard",
    ["G3", "D4", "A4", "E5"],
    ["G", "D", "A", "E"],
  ),
];

// Banjo (5-string)
export const BANJO_TUNINGS: Tuning[] = [
  makeTuning(
    "banjo_open_g",
    "Open G (gDGBD)",
    "standard",
    ["G4", "D3", "G3", "B3", "D4"],
    ["g", "D", "G", "B", "D"],
  ),
  makeTuning(
    "banjo_double_c",
    "Double C (gCGCD)",
    "alternate",
    ["G4", "C3", "G3", "C4", "D4"],
    ["g", "C", "G", "C", "D"],
  ),
];

// Cello
export const CELLO_TUNINGS: Tuning[] = [
  makeTuning(
    "cello_standard",
    "Standard (CGDA)",
    "standard",
    ["C2", "G2", "D3", "A3"],
    ["C", "G", "D", "A"],
  ),
];

export type InstrumentType =
  | "guitar"
  | "bass4"
  | "bass5"
  | "ukulele"
  | "violin"
  | "mandolin"
  | "banjo"
  | "cello"
  | "chromatic";

export const TUNINGS_BY_INSTRUMENT: Record<InstrumentType, Tuning[]> = {
  guitar: GUITAR_TUNINGS,
  bass4: BASS_4_TUNINGS,
  bass5: BASS_5_TUNINGS,
  ukulele: UKULELE_TUNINGS,
  violin: VIOLIN_TUNINGS,
  mandolin: MANDOLIN_TUNINGS,
  banjo: BANJO_TUNINGS,
  cello: CELLO_TUNINGS,
  chromatic: [],
};

export function getDefaultTuning(instrument: InstrumentType): Tuning | null {
  const tunings = TUNINGS_BY_INSTRUMENT[instrument];
  return tunings && tunings.length > 0 ? tunings[0] : null;
}
