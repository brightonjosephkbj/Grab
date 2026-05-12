export const C = {
  bg:     '#050508',
  s1:     '#0c0c14',
  s2:     '#141420',
  s3:     '#1e1e2e',
  s4:     '#28283a',
  lime:   '#c8ff00',
  lime2:  '#a8d400',
  blue:   '#00aaff',
  orange: '#ff6b00',
  pink:   '#ff2d6b',
  ok:     '#00e676',
  err:    '#ff3d5a',
  txt:    '#f0f0ff',
  muted:  '#55556a',
};

export const S = {
  card: {
    backgroundColor: C.s1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.s3,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function fmtSize(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < 3) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${u[i]}`;
}
