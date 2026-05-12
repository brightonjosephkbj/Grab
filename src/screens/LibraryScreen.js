import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, fmtSize } from '../theme';
import useStore from '../store/useStore';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 14 * 3) / 2;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'music', label: '🎵 Music' },
  { id: 'video', label: '🎬 Video' },
  { id: 'image', label: '🖼 Images' },
];

function LibCard({ item, onPress, onDelete }) {
  const ext = (item.ext || 'mp3').toLowerCase();
  const badgeColor = ['mp3','aac','flac','wav'].includes(ext) ? C.lime : ext === 'mp4' ? C.blue : C.orange;

  return (
    <TouchableOpacity style={[styles.card, { width: CARD_SIZE }]} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={[styles.thumb, { height: CARD_SIZE }]}>
        {item.thumb ? (
          <Image source={{ uri: item.thumb }} style={styles.thumbImg} />
        ) : (
          <Text style={{ fontSize: 36 }}>{item.type === 'video' ? '🎬' : item.type === 'image' ? '🖼' : '🎵'}</Text>
        )}
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: badgeColor + '33', borderColor: badgeColor + '66' }]}>
          <Text style={[styles.badgeTxt, { color: badgeColor }]}>{ext.toUpperCase()}</Text>
        </View>
        {/* Delete btn */}
        <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(item.id, item.filePath)}>
          <Ionicons name="trash-outline" size={12} color={C.err} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={styles.cardSize}>{fmtSize(item.size)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LibraryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { library, removeFromLib, setCurrentTrack, setQueue, setIsPlaying, loadLibrary } = useStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadLibrary(); }, []);

  const filtered = filter === 'all' ? library : library.filter(t => t.type === filter);

  const handlePlay = (item) => {
    setCurrentTrack(item);
    const sameType = library.filter(t => t.type === item.type);
    const idx = sameType.findIndex(t => t.id === item.id);
    setQueue(sameType, idx >= 0 ? idx : 0);
    setIsPlaying(true);
    navigation.navigate('Player');
  };

  const handleDelete = (id, filePath) => {
    Alert.alert('Delete', 'Delete this file permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { if (filePath) await FileSystem.deleteAsync(filePath, { idempotent: true }); } catch {}
          removeFromLib(id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>LIBRARY</Text>
        <Text style={styles.count}>{library.length} files</Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, filter === f.id && styles.filterActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterTxt, filter === f.id && styles.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No {filter === 'all' ? 'files' : filter} yet</Text>
          <Text style={styles.emptyDesc}>Downloads will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          numColumns={2}
          renderItem={({ item }) => <LibCard item={item} onPress={handlePlay} onDelete={handleDelete} />}
          contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 80 }}
          columnWrapperStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontWeight: '900', fontSize: 28, color: C.lime, letterSpacing: 2 },
  count: { fontSize: 12, color: C.muted, fontVariant: ['tabular-nums'] },
  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 12, flexWrap: 'nowrap' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.s4, backgroundColor: C.s2 },
  filterActive: { backgroundColor: C.lime, borderColor: C.lime },
  filterTxt: { fontSize: 12, fontWeight: '700', color: C.muted },
  filterTxtActive: { color: '#000' },
  card: { backgroundColor: C.s1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.s3 },
  thumb: { backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', position: 'absolute' },
  badge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  badgeTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  delBtn: { position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 8 },
  cardName: { fontSize: 12, fontWeight: '600', color: C.txt, marginBottom: 2 },
  cardSize: { fontSize: 10, color: C.muted, fontVariant: ['tabular-nums'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  emptyIcon: { fontSize: 48, opacity: 0.25 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.txt },
  emptyDesc: { fontSize: 12, color: C.muted, textAlign: 'center' },
});
