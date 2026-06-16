/** Chord library with fret diagrams for 6-string guitar */

export interface ChordFinger {
  string: number; // 1 = thinnest (high e), 6 = thickest (low E)
  fret: number; // 0 = open, -1 = muted/not played
  finger?: number; // 1-4
}

export interface ChordDef {
  id: string;
  name: string;
  fullName: string;
  category:
    | "major"
    | "minor"
    | "7th"
    | "minor7"
    | "major7"
    | "sus"
    | "aug"
    | "dim"
    | "add"
    | "power";
  baseFret: number; // 1 = standard position
  fingers: ChordFinger[];
  barre?: { fret: number; fromString: number; toString: number };
}

export const CHORD_LIBRARY: ChordDef[] = [
  // Major chords
  {
    id: "C_major",
    name: "C",
    fullName: "C Major",
    category: "major",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 3, finger: 3 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 1, finger: 1 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "D_major",
    name: "D",
    fullName: "D Major",
    category: "major",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 1 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 2, finger: 2 },
    ],
  },
  {
    id: "E_major",
    name: "E",
    fullName: "E Major",
    category: "major",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 2, finger: 3 },
      { string: 3, fret: 1, finger: 1 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "F_major",
    name: "F",
    fullName: "F Major",
    category: "major",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 1, finger: 1 },
      { string: 5, fret: 3, finger: 3 },
      { string: 4, fret: 3, finger: 4 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 1, finger: 1 },
      { string: 1, fret: 1, finger: 1 },
    ],
    barre: { fret: 1, fromString: 1, toString: 6 },
  },
  {
    id: "G_major",
    name: "G",
    fullName: "G Major",
    category: "major",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 3, finger: 2 },
      { string: 5, fret: 2, finger: 1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 3, finger: 4 },
    ],
  },
  {
    id: "A_major",
    name: "A",
    fullName: "A Major",
    category: "major",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 2, finger: 3 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "B_major",
    name: "B",
    fullName: "B Major",
    category: "major",
    baseFret: 2,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 2, finger: 1 },
      { string: 4, fret: 4, finger: 3 },
      { string: 3, fret: 4, finger: 4 },
      { string: 2, fret: 4, finger: 4 },
      { string: 1, fret: 2, finger: 1 },
    ],
    barre: { fret: 2, fromString: 1, toString: 5 },
  },

  // Minor chords
  {
    id: "Am_minor",
    name: "Am",
    fullName: "A Minor",
    category: "minor",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 2, finger: 3 },
      { string: 2, fret: 1, finger: 1 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Em_minor",
    name: "Em",
    fullName: "E Minor",
    category: "minor",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 2, finger: 3 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Dm_minor",
    name: "Dm",
    fullName: "D Minor",
    category: "minor",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 1, finger: 1 },
    ],
  },
  {
    id: "Bm_minor",
    name: "Bm",
    fullName: "B Minor",
    category: "minor",
    baseFret: 2,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 2, finger: 1 },
      { string: 4, fret: 4, finger: 3 },
      { string: 3, fret: 4, finger: 4 },
      { string: 2, fret: 3, finger: 2 },
      { string: 1, fret: 2, finger: 1 },
    ],
    barre: { fret: 2, fromString: 1, toString: 5 },
  },
  {
    id: "Cm_minor",
    name: "Cm",
    fullName: "C Minor",
    category: "minor",
    baseFret: 3,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 3, finger: 1 },
      { string: 4, fret: 5, finger: 3 },
      { string: 3, fret: 5, finger: 4 },
      { string: 2, fret: 4, finger: 2 },
      { string: 1, fret: 3, finger: 1 },
    ],
    barre: { fret: 3, fromString: 1, toString: 5 },
  },

  // 7th chords
  {
    id: "G7_dom7",
    name: "G7",
    fullName: "G Dominant 7th",
    category: "7th",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 3, finger: 3 },
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 0 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 1, finger: 1 },
    ],
  },
  {
    id: "D7_dom7",
    name: "D7",
    fullName: "D Dominant 7th",
    category: "7th",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 1, finger: 1 },
      { string: 1, fret: 2, finger: 3 },
    ],
  },
  {
    id: "A7_dom7",
    name: "A7",
    fullName: "A Dominant 7th",
    category: "7th",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 2, finger: 3 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "E7_dom7",
    name: "E7",
    fullName: "E Dominant 7th",
    category: "7th",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 0 },
      { string: 3, fret: 1, finger: 1 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "B7_dom7",
    name: "B7",
    fullName: "B Dominant 7th",
    category: "7th",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 2, finger: 1 },
      { string: 4, fret: 1, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 0 },
      { string: 1, fret: 2, finger: 3 },
    ],
  },

  // Major 7th
  {
    id: "Cmaj7",
    name: "Cmaj7",
    fullName: "C Major 7th",
    category: "major7",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 3, finger: 3 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Amaj7",
    name: "Amaj7",
    fullName: "A Major 7th",
    category: "major7",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 1, finger: 1 },
      { string: 2, fret: 2, finger: 3 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Gmaj7",
    name: "Gmaj7",
    fullName: "G Major 7th",
    category: "major7",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 3, finger: 2 },
      { string: 5, fret: 2, finger: 1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 2, finger: 3 },
    ],
  },

  // Minor 7th
  {
    id: "Am7",
    name: "Am7",
    fullName: "A Minor 7th",
    category: "minor7",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 1, finger: 1 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Em7",
    name: "Em7",
    fullName: "E Minor 7th",
    category: "minor7",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 0 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Dm7",
    name: "Dm7",
    fullName: "D Minor 7th",
    category: "minor7",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 1, finger: 1 },
      { string: 1, fret: 1, finger: 1 },
    ],
  },

  // Sus chords
  {
    id: "Asus2",
    name: "Asus2",
    fullName: "A Suspended 2nd",
    category: "sus",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Dsus2",
    name: "Dsus2",
    fullName: "D Suspended 2nd",
    category: "sus",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 1 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Asus4",
    name: "Asus4",
    fullName: "A Suspended 4th",
    category: "sus",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Dsus4",
    name: "Dsus4",
    fullName: "D Suspended 4th",
    category: "sus",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 1 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 3, finger: 4 },
    ],
  },

  // Power chords
  {
    id: "E5",
    name: "E5",
    fullName: "E Power Chord",
    category: "power",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 2, finger: 1 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: -1 },
      { string: 2, fret: -1 },
      { string: 1, fret: -1 },
    ],
  },
  {
    id: "A5",
    name: "A5",
    fullName: "A Power Chord",
    category: "power",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 0 },
      { string: 4, fret: 2, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: -1 },
      { string: 1, fret: -1 },
    ],
  },
  {
    id: "D5",
    name: "D5",
    fullName: "D Power Chord",
    category: "power",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 1 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: -1 },
    ],
  },

  // Diminished / Augmented
  {
    id: "Edim",
    name: "Edim",
    fullName: "E Diminished",
    category: "dim",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 1, finger: 1 },
      { string: 4, fret: 2, finger: 3 },
      { string: 3, fret: 0 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Eaug",
    name: "Eaug",
    fullName: "E Augmented",
    category: "aug",
    baseFret: 1,
    fingers: [
      { string: 6, fret: 0 },
      { string: 5, fret: 3, finger: 3 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 1, finger: 1 },
      { string: 2, fret: 0 },
      { string: 1, fret: 0 },
    ],
  },

  // Add chords
  {
    id: "Cadd9",
    name: "Cadd9",
    fullName: "C Add 9",
    category: "add",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: 3, finger: 3 },
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 0 },
      { string: 2, fret: 3, finger: 4 },
      { string: 1, fret: 0 },
    ],
  },
  {
    id: "Dadd9",
    name: "Dadd9",
    fullName: "D Add 9",
    category: "add",
    baseFret: 1,
    fingers: [
      { string: 6, fret: -1 },
      { string: 5, fret: -1 },
      { string: 4, fret: 0 },
      { string: 3, fret: 2, finger: 1 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 0 },
    ],
  },
];

export const CHORD_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "major", label: "Major" },
  { id: "minor", label: "Minor" },
  { id: "7th", label: "7th" },
  { id: "minor7", label: "Min 7" },
  { id: "major7", label: "Maj 7" },
  { id: "sus", label: "Sus" },
  { id: "power", label: "Power" },
  { id: "aug", label: "Aug" },
  { id: "dim", label: "Dim" },
  { id: "add", label: "Add" },
] as const;

export function searchChords(query: string, category?: string): ChordDef[] {
  let results = CHORD_LIBRARY;
  if (category && category !== "all") {
    results = results.filter((c) => c.category === category);
  }
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q),
    );
  }
  return results;
}
