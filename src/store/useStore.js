import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useStore = create((set, get) => ({
  // ── Downloads ──────────────────────────────────────────────────────────────
  downloads: [],
  addDownload: (dl) => set(s => ({ downloads: [dl, ...s.downloads] })),
  updateDownload: (id, patch) => set(s => ({
    downloads: s.downloads.map(d => d.id === id ? { ...d, ...patch } : d),
  })),
  removeDownload: (id) => set(s => ({ downloads: s.downloads.filter(d => d.id !== id) })),
  clearDone: () => set(s => ({
    downloads: s.downloads.filter(d => d.status !== 'completed' && d.status !== 'failed'),
  })),

  // ── Library ────────────────────────────────────────────────────────────────
  library: [],
  addToLib: async (item) => {
    const lib = [item, ...get().library];
    set({ library: lib });
    await AsyncStorage.setItem('grab_library', JSON.stringify(lib.slice(0, 500)));
  },
  removeFromLib: async (id) => {
    const lib = get().library.filter(t => t.id !== id);
    set({ library: lib });
    await AsyncStorage.setItem('grab_library', JSON.stringify(lib));
  },
  loadLibrary: async () => {
    try {
      const raw = await AsyncStorage.getItem('grab_library');
      if (raw) set({ library: JSON.parse(raw) });
    } catch {}
  },

  // ── Player ─────────────────────────────────────────────────────────────────
  currentTrack: null,
  isPlaying: false,
  queue: [],
  queueIdx: 0,
  shuffle: false,
  repeat: false,
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setQueue: (q, idx = 0) => set({ queue: q, queueIdx: idx }),
  setQueueIdx: (idx) => set({ queueIdx: idx }),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set(s => ({ repeat: !s.repeat })),

  // ── Browser ────────────────────────────────────────────────────────────────
  browserUrl: '',
  setBrowserUrl: (url) => set({ browserUrl: url }),
  detectedMeta: null,
  setDetectedMeta: (meta) => set({ detectedMeta: meta }),

  // ── Active downloads count ─────────────────────────────────────────────────
  get activeCount() {
    return get().downloads.filter(d => d.status === 'downloading' || d.status === 'fetching' || d.status === 'converting').length;
  },
}));

export default useStore;
