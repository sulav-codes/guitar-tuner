import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CHORD_LIBRARY,
  CHORD_CATEGORIES,
  searchChords,
  type ChordDef,
} from '@/lib/chords';
import { audioEngine } from '@/lib/audio-engine';
import { midiToFreq } from '@/lib/pitch-detection';
import ChordDiagram from '@/components/chords/ChordDiagram';

const CHORD_ROOT_MIDI: Record<string, number> = {
  C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71,
};

function getChordMidi(chord: ChordDef): number[] {
  const rootName = chord.name.replace(/[^A-G]/g, '')[0] ?? 'A';
  const root = CHORD_ROOT_MIDI[rootName] ?? 60;
  return chord.fingers
    .filter((f) => f.fret >= 0)
    .map((f) => root + f.fret + (f.string === 1 ? 12 : f.string === 2 ? 7 : f.string === 3 ? 3 : f.string === 4 ? -2 : f.string === 5 ? -7 : -12));
}

function ChordCard({ chord, onPress }: { chord: ChordDef; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#141414',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#222222',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        minWidth: 80,
        maxWidth: 100,
        margin: 4,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{chord.name}</Text>
      <Text style={{ color: '#555555', fontSize: 10 }}>{chord.category}</Text>
    </Pressable>
  );
}

export default function ChordsScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedChord, setSelectedChord] = useState<ChordDef | null>(null);

  const chords = searchChords(query, category);

  const handlePlayChord = useCallback(() => {
    if (!selectedChord) return;
    const midiNotes = getChordMidi(selectedChord);
    midiNotes.forEach((midi, i) => {
      setTimeout(() => {
        audioEngine.playReferenceTone(midiToFreq(midi, 440), 400);
      }, i * 80);
    });
  }, [selectedChord]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <View style={{ alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' }}>
        <Text style={{ color: '#00E676', fontSize: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          CHORD LIBRARY
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chords..."
          placeholderTextColor="#444444"
          style={{ backgroundColor: '#161616', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A2A' }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        style={{ borderBottomWidth: 1, borderBottomColor: '#1A1A1A', maxHeight: 52 }}
      >
        {CHORD_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setCategory(cat.id)}
            style={{
              backgroundColor: category === cat.id ? '#0A1A0A' : '#141414',
              borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
              borderWidth: 1, borderColor: category === cat.id ? '#00E676' : '#2A2A2A',
            }}
          >
            <Text style={{ color: category === cat.id ? '#00E676' : '#888888', fontSize: 13, fontWeight: category === cat.id ? '700' : '400' }}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={chords}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 8 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#444444', fontSize: 14 }}>No chords found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ChordCard chord={item} onPress={() => setSelectedChord(item)} />
        )}
      />

      <Modal
        visible={selectedChord !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedChord(null)}
      >
        <Pressable style={{ flex: 1, backgroundColor: '#00000080' }} onPress={() => setSelectedChord(null)} />
        <View
          style={{
            backgroundColor: '#141414', borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: 24, borderTopWidth: 1, borderTopColor: '#2A2A2A', alignItems: 'center', gap: 16,
          }}
        >
          <View style={{ width: 36, height: 4, backgroundColor: '#333333', borderRadius: 2, marginBottom: 4 }} />
          {selectedChord && <ChordDiagram chord={selectedChord} onPlayChord={handlePlayChord} />}
          <Pressable
            onPress={() => setSelectedChord(null)}
            style={{ backgroundColor: '#161616', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12, borderWidth: 1, borderColor: '#2A2A2A', marginTop: 8 }}
          >
            <Text style={{ color: '#888888', fontSize: 14, fontWeight: '600' }}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
