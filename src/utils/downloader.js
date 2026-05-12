import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// ── Platform detection ─────────────────────────────────────────────────────
export function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(u)) return 'image';
  if (/\.(mp4|mp3|wav|flac|m4a|aac|webm)(\?.*)?$/i.test(u)) return 'direct';
  return 'other';
}

export function extractVideoId(url) {
  return url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;
}

export function isSupported(url) {
  const p = detectPlatform(url);
  return p !== 'other';
}

// ── YouTube download via Cobalt → Piped → Invidious ────────────────────────
async function getYouTubeStream(videoId, format) {
  const isAudio = format === 'mp3';

  // 1. Cobalt.tools
  const cobaltBases = ['https://api.cobalt.tools'];
  for (const base of cobaltBases) {
    try {
      const r = await fetch(base + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          downloadMode: isAudio ? 'audio' : 'auto',
          audioFormat: 'mp3',
          videoQuality: '720',
          filenameStyle: 'basic',
        }),
        signal: AbortSignal.timeout(12000),
      });
      const d = await r.json();
      if (['tunnel', 'redirect', 'stream'].includes(d.status)) return { url: d.url, title: null, thumb: null };
      if (d.status === 'picker' && d.picker?.[0]?.url) return { url: d.picker[0].url, title: null, thumb: null };
    } catch {}
  }

  // 2. Piped API
  const pipedBases = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://piped-api.garudalinux.org'];
  for (const base of pipedBases) {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const d = await r.json();
      const audio = d.audioStreams || [];
      const video = d.videoStreams || [];
      let url;
      if (isAudio) {
        url = (audio.find(s => s.mimeType?.includes('mp4')) || audio[0])?.url;
      } else {
        url = (video.find(s => s.quality === '720p') || video.find(s => s.mimeType?.includes('mp4')) || video[0])?.url;
      }
      if (url) return { url, title: d.title, thumb: d.thumbnailUrl };
    } catch {}
  }

  // 3. Invidious
  const invBases = ['https://invidious.privacyredirect.com', 'https://inv.nadeko.net', 'https://invidious.fdn.fr'];
  for (const base of invBases) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${videoId}?fields=title,videoThumbnails,adaptiveFormats,formatStreams`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const d = await r.json();
      const all = [...(d.adaptiveFormats || []), ...(d.formatStreams || [])];
      let url;
      if (isAudio) {
        url = (all.find(s => s.itag === 140) || all.find(s => s.type?.includes('audio')))?.url;
      } else {
        url = (all.find(s => s.itag === 22) || all.find(s => s.type?.includes('video/mp4')))?.url;
      }
      if (url) return { url, title: d.title, thumb: d.videoThumbnails?.find(t => t.quality === 'medium')?.url };
    } catch {}
  }

  throw new Error('YouTube blocked — all sources failed');
}

// ── TikTok download via TikWM ──────────────────────────────────────────────
async function getTikTokStream(url, format) {
  const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, { signal: AbortSignal.timeout(10000) });
  const d = await r.json();
  if (!d || d.code !== 0) throw new Error('TikTok fetch failed: ' + (d?.msg || 'Unknown'));
  return {
    url: format === 'mp3' ? d.data?.music : (d.data?.hdplay || d.data?.play),
    title: d.data?.title || 'TikTok Video',
    thumb: d.data?.cover || null,
  };
}

// ── Song search via Piped ──────────────────────────────────────────────────
export async function searchSongs(query) {
  const bases = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://piped-api.garudalinux.org'];
  for (const base of bases) {
    try {
      const r = await fetch(`${base}/search?q=${encodeURIComponent(query + ' music')}&filter=videos`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const d = await r.json();
      if (!d.items?.length) continue;
      return d.items
        .filter(i => i.url?.includes('watch') && i.duration > 30)
        .slice(0, 20)
        .map(i => ({
          videoId: (i.url.split('v=')[1] || '').split('&')[0] || i.url.split('/').pop(),
          title: i.title || 'Unknown',
          artist: i.uploaderName || '',
          thumb: i.thumbnail || null,
          duration: i.duration || 0,
        }))
        .filter(s => s.videoId?.length === 11);
    } catch {}
  }
  throw new Error('Search unavailable — check connection');
}

// ── Main download function ─────────────────────────────────────────────────
export async function startDownload({ id, url, platform, format, onProgress, onMeta }) {
  const isAudio = format === 'mp3';
  let streamUrl, title, thumb;

  if (platform === 'youtube') {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');
    const result = await getYouTubeStream(videoId, format);
    streamUrl = result.url; title = result.title; thumb = result.thumb;
  } else if (platform === 'tiktok') {
    const result = await getTikTokStream(url, format);
    streamUrl = result.url; title = result.title; thumb = result.thumb;
  } else if (platform === 'image' || platform === 'direct') {
    streamUrl = url;
    title = url.split('/').pop().split('?')[0];
    thumb = platform === 'image' ? url : null;
  } else {
    streamUrl = url;
    title = 'Download';
    thumb = null;
  }

  if (!streamUrl) throw new Error('No download URL found');
  if (onMeta) onMeta({ title, thumb });

  const ext = isAudio ? 'mp3' : (platform === 'image' ? (url.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg') : 'mp4');
  const filename = `${(title || 'file').replace(/[<>:"/\\|?*]/g, '').trim()}.${ext}`;
  const dir = `${FileSystem.documentDirectory}GRAB/${isAudio ? 'Music' : (ext === 'mp4' ? 'Videos' : 'Images')}/`;
  const dest = dir + filename;

  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  const dl = FileSystem.createDownloadResumable(
    streamUrl, dest, {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0 && onProgress) {
        onProgress(Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100), totalBytesWritten);
      }
    }
  );

  const result = await dl.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  // Save to media library
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(result.uri);
      const albumName = isAudio ? 'GRAB Music' : (ext === 'mp4' ? 'GRAB Videos' : 'GRAB Images');
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      }
    }
  } catch {}

  return { filePath: result.uri, filename, ext, title: title || filename, thumb };
}
