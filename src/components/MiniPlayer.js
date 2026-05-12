import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import useStore from '../store/useStore';

export default function MiniPlayer({ onPress }) {
  const { currentTrack, isPlaying } = useStore();
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentTrack ? 0 : 80,
      useNativeDriver: true,
    }).start();
  }, [!!currentTrack]);

  if (!currentTrack) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.inner} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.art}>
          {currentTrack.thumb
            ? <Image source={{ uri: currentTrack.thumb }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
            : <Text style={{ fontSize: 18 }}>🎵</Text>}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title || '—'}</Text>
          <Text style={styles.sub} numberOfLines={1}>{currentTrack.platform || '—'}</Text>
        </View>
        <View style={styles.ctrls}>
          <TouchableOpacity style={styles.ctrlBtn}>
            <Ionicons name="play-skip-back" size={14} color={C.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrlBtn, styles.playBtn]}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn}>
            <Ionicons name="play-skip-forward" size={14} color={C.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 10, right: 10,
    backgroundColor: 'rgba(20,20,32,0.98)',
    borderRadius: 14, borderWidth: 1, borderColor: C.s3,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
    overflow: 'hidden',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  art: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '700', color: C.txt },
  sub: { fontSize: 10, color: C.muted, marginTop: 2 },
  ctrls: { flexDirection: 'row', gap: 5, flexShrink: 0 },
  ctrlBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' },
  playBtn: { backgroundColor: C.lime },
});
