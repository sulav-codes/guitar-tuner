import type { InstrumentType } from "./tunings";

export interface Instrument {
  id: InstrumentType;
  name: string;
  emoji: string;
  stringCount: number;
  description: string;
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: "guitar",
    name: "Guitar",
    emoji: "🎸",
    stringCount: 6,
    description: "Acoustic & Electric 6-string",
  },
  {
    id: "bass4",
    name: "Bass (4-string)",
    emoji: "🎸",
    stringCount: 4,
    description: "4-string bass guitar",
  },
  {
    id: "bass5",
    name: "Bass (5-string)",
    emoji: "🎸",
    stringCount: 5,
    description: "5-string bass guitar",
  },
  {
    id: "ukulele",
    name: "Ukulele",
    emoji: "🪕",
    stringCount: 4,
    description: "Soprano, Concert & Tenor",
  },
  {
    id: "violin",
    name: "Violin",
    emoji: "🎻",
    stringCount: 4,
    description: "Standard violin tuning",
  },
  {
    id: "mandolin",
    name: "Mandolin",
    emoji: "🪕",
    stringCount: 4,
    description: "Standard mandolin tuning",
  },
  {
    id: "banjo",
    name: "Banjo",
    emoji: "🪕",
    stringCount: 5,
    description: "5-string banjo",
  },
  {
    id: "cello",
    name: "Cello",
    emoji: "🎻",
    stringCount: 4,
    description: "Standard cello tuning",
  },
  {
    id: "chromatic",
    name: "Chromatic",
    emoji: "🎵",
    stringCount: 0,
    description: "Detect any note",
  },
];

export function getInstrument(id: InstrumentType): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
}
