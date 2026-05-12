import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { Video, Audio, ResizeMode } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, fmt } from '../theme';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');
const ART_SIZE = width - 80;

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const soundRef = useRef(null);
  const videoRef = useRef(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);

  const {
    currentTrack, isPlaying, setIsPlaying,
    queue, queueIdx, setQueueIdx, setCurrentTrack,
    shuffle, repeat, toggleShuffle, toggleRepeat,
  } = useStore();

  const isVideo = currentTrack?.ext === 'mp4' || currentTrack?.type === 'video';

  // ── Audio setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(() => {
    if (!currentTrack || isVideo) return;
    loadAudio(currentTrack.filePath);
    return () => { soundRef.current?.unloadAsync(); };
  }, [currentTrack?.id]);

  const loadAudio = async (uri) => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onAudioStatus
      );
      soundRef.current = sound;
    } catch (e) {
      console.log('Audio load error:', e.message);
    }
  };

  const onAudioStatus = useCallback((status) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis / 1000);
    setDuration(status.durationMillis / 1000);
    setIsPlaying(status.isPlaying);
    setBuffering(status.isBuffering);
    if (status.didJustFinish && !repeat) nextTrack();
  }, [repeat]);

  const onVideoStatus = useCallback((status) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis / 1000);
    setDuration(status.durationMillis / 1000);
    setIsPlaying(status.isPlaying);
    setBuffering(status.isBuffering);
    if (status.didJustFinish && !repeat) nextTrack();
  }, [repeat]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (isVideo) {
      isPlaying ? await videoRef.current?.pauseAsync() : await videoRef.current?.playAsync();
    } else {
      isPlaying ? await soundRef.current?.pauseAsync() : await soundRef.current?.playAsync();
    }
  };

  const seekTo = async (secs) => {
    const ms = secs * 1000;
    if (isVideo) await videoRef.current?.setPositionAsync(ms);
    else await soundRef.current?.setPositionAsync(ms);
    setPosition(secs);
  };

  const nextTrack = useCallback(() => {
    if (!queue.length) return;
    let next;
    if (shuffle) next = Math.floor(Math.random() * queue.length);
    else next = (queueIdx + 1) % queue.length;
    setQueueIdx(next);
    setCurrentTrack(queue[next]);
  }, [queue, queueIdx, shuffle]);

  const prevTrack = useCallback(() => {
    if (!queue.length) return;
    const prev = (queueIdx - 1 + queue.length) % queue.length;
    setQueueIdx(prev);
    setCurrentTrack(queue[prev]);
  }, [queue, queueIdx]);

  const setVol = async (v) => {
    await soundRef.current?.setVolumeAsync(v);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Art / Video */}
      <View style={styles.artZone}>
        {isVideo && currentTrack?.filePath ? (
          <Video
            ref={videoRef}
            source={{ uri: currentTrack.filePath }}
            style={[styles.art, { height: ART_SIZE }]}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying}
            isLooping={repeat}
            onPlaybackStatusUpdate={onVideoStatus}
            useNativeControls={false}
          />
        ) : (
          <View style={[styles.art, { height: ART_SIZE }]}>
            {currentTrack?.thumb ? (
              <Image source={{ uri: currentTrack.thumb }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
            ) : (
              <Text style={{ fontSize: 72 }}>🎵</Text>
            )}
          </View>
        )}
        {buffering && (
          <View style={styles.bufferOverlay}>
            <ActivityIndicator color={C.lime} size="large" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.trackTitle} numberOfLines={2}>{currentTrack?.title || 'Nothing Playing'}</Text>
        <Text style={styles.trackSub}>{currentTrack?.platform || ''} · {(currentTrack?.ext || '').toUpperCase()}</Text>
      </View>

      {/* Seekbar */}
      <View style={styles.seekZone}>
        <Slider
          style={styles.slider}
          value={duration > 0 ? position / duration : 0}
          onSlidingComplete={(v) => seekTo(v * duration)}
          minimumValue={0}
          maximumValue={1}
          minimumTrackTintColor={C.lime}
          maximumTrackTintColor={C.s3}
          thumbTintColor={C.lime}
        />
        <View style={styles.times}>
          <Text style={styles.timeTxt}>{fmt(position)}</Text>
          <Text style={styles.timeTxt}>{fmt(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrl} onPress={prevTrack}>
          <Ionicons name="play-skip-back" size={22} color={C.txt} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
          {isPlaying
            ? <Ionicons name="pause" size={30} color="#000" />
            : <Ionicons name="play" size={30} color="#000" />
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={nextTrack}>
          <Ionicons name="play-skip-forward" size={22} color={C.txt} />
        </TouchableOpacity>
      </View>

      {/* Extras */}
      <View style={styles.extras}>
        <TouchableOpacity
          style={[styles.extraBtn, shuffle && styles.extraActive]}
          onPress={toggleShuffle}
        >
          <Ionicons name="shuffle" size={20} color={shuffle ? C.lime : C.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.extraBtn, repeat && styles.extraActive]}
          onPress={toggleRepeat}
        >
          <Ionicons name="repeat" size={20} color={repeat ? C.lime : C.muted} />
        </TouchableOpacity>
        <View style={styles.volRow}>
          <Ionicons name="volume-low" size={16} color={C.muted} />
          <Slider
            style={{ flex: 1, height: 30 }}
            defaultValue={1}
            onValueChange={setVol}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={C.lime}
            maximumTrackTintColor={C.s3}
            thumbTintColor={C.muted}
          />
          <Ionicons name="volume-high" size={16} color={C.muted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  artZone: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' },
  art: {
    width: ART_SIZE, borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.lime, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10,
  },
  bufferOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center' },
  trackTitle: { fontSize: 18, fontWeight: '800', color: C.txt, textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  trackSub: { fontSize: 12, color: C.muted, textTransform: 'capitalize' },
  seekZone: { paddingHorizontal: 24, paddingBottom: 10 },
  slider: { width: '100%', height: 30 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeTxt: { fontSize: 10, color: C.muted, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24, paddingBottom: 12 },
  ctrl: { width: 48, height: 48, borderRadius: 50, backgroundColor: C.s2, borderWidth: 1, borderColor: C.s3, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', shadowColor: C.lime, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  extras: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 20 },
  extraBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.s2, borderWidth: 1, borderColor: C.s4, alignItems: 'center', justifyContent: 'center' },
  extraActive: { borderColor: C.lime, backgroundColor: 'rgba(200,255,0,0.1)' },
  volRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
