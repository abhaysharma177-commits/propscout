import { addMedia } from './db';
import { newId } from './id';
import type { MediaKind, MediaMeta } from '../types';

/**
 * Photo, video and voice-note capture.
 *
 * Photos are downscaled and re-encoded on the device before they are stored,
 * because a 4 MB phone photo x 200 photos will hit Safari's storage quota
 * halfway through a trip. Videos are stored as-is (a browser cannot re-encode
 * them cheaply) with a size warning instead.
 */

export const THUMB_EDGE = 320;

/** Above this, we warn before saving a video. */
export const BIG_VIDEO_BYTES = 40 * 1024 * 1024;

export function formatBytes(bytes: number | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function kindForFile(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'photo';
}

interface Decoded {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  close: () => void;
}

/** Decodes via createImageBitmap when available, falling back to an <img>. */
async function decodeImage(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> path — Safari cannot decode every HEIC here.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image'));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      type,
      quality,
    );
  });
}

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Downscales so the longest edge is at most maxEdge, and re-encodes as JPEG. */
export async function resizeImage(
  source: Blob,
  maxEdge: number,
  quality = 0.82,
): Promise<ResizedImage> {
  const decoded = await decodeImage(source);
  try {
    const { width: sw, height: sh } = decoded;
    if (!sw || !sh) throw new Error('Image had no dimensions');

    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    decoded.draw(ctx, w, h);

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    return { blob, width: w, height: h };
  } finally {
    decoded.close();
  }
}

/** Grabs a poster frame from a video file, for the media grid. */
async function videoPoster(file: Blob): Promise<{ blob: Blob; durationSec?: number } | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  try {
    await new Promise<void>((resolve, reject) => {
      const done = () => resolve();
      const fail = () => reject(new Error('Could not read that video'));
      video.onloadeddata = done;
      video.onerror = fail;
      // Some browsers never fire loadeddata for a hidden video; do not hang.
      setTimeout(done, 3000);
      video.src = url;
    });

    // Seek slightly in — frame zero is often black.
    const target = Math.min(0.3, (video.duration || 1) / 4);
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      video.onseeked = done;
      setTimeout(done, 1500);
      try {
        video.currentTime = target;
      } catch {
        resolve();
      }
    });

    const sw = video.videoWidth;
    const sh = video.videoHeight;
    if (!sw || !sh) return null;

    const scale = Math.min(1, THUMB_EDGE / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.7);
    const durationSec = Number.isFinite(video.duration) ? video.duration : undefined;
    return durationSec === undefined ? { blob } : { blob, durationSec };
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export interface SaveOptions {
  propertyId: string;
  file: Blob;
  kind?: MediaKind;
  tag?: string;
  caption?: string;
  /** Longest edge for stored photos. */
  photoMaxEdge?: number;
  durationSec?: number;
}

/**
 * Stores one captured item and returns its record.
 * Photo compression failures fall back to storing the original rather than
 * losing the capture — on a property visit, a large photo beats no photo.
 */
export async function saveCapture(opts: SaveOptions): Promise<MediaMeta> {
  const kind: MediaKind =
    opts.kind ?? (opts.file instanceof File ? kindForFile(opts.file) : 'photo');
  const id = newId('m');
  const createdAt = Date.now();

  let blob = opts.file;
  let thumb: Blob | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let durationSec = opts.durationSec;

  if (kind === 'photo') {
    try {
      const full = await resizeImage(blob, opts.photoMaxEdge ?? 1600);
      blob = full.blob;
      width = full.width;
      height = full.height;
      const small = await resizeImage(full.blob, THUMB_EDGE, 0.7);
      thumb = small.blob;
    } catch {
      // Keep the original bytes; the grid falls back to the full image.
    }
  } else if (kind === 'video') {
    const poster = await videoPoster(blob);
    if (poster) {
      thumb = poster.blob;
      if (durationSec === undefined) durationSec = poster.durationSec;
    }
  }

  const meta: MediaMeta = {
    id,
    propertyId: opts.propertyId,
    kind,
    mime: blob.type || (kind === 'photo' ? 'image/jpeg' : 'application/octet-stream'),
    sizeBytes: blob.size,
    createdAt,
    ...(opts.tag ? { tag: opts.tag } : {}),
    ...(opts.caption ? { caption: opts.caption } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(durationSec !== undefined ? { durationSec } : {}),
  };

  await addMedia(meta, blob, thumb);
  return meta;
}

/** Common room / area labels offered when tagging a photo. */
export const MEDIA_TAGS = [
  'Outside / approach',
  'Entrance',
  'Living room',
  'Kitchen',
  'Bedroom',
  'Bathroom',
  'Balcony',
  'View',
  'Terrace',
  'Parking',
  'Common area',
  'Lift / stairs',
  'Problem / defect',
  'Documents',
  'Cost sheet',
  'Neighbourhood',
];

// ------------------------------------------------------------ voice notes

export interface Recorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
  mimeType: string;
}

/** True when this browser can record audio at all. */
export function canRecordAudio(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

function pickAudioMime(): string {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

/**
 * Starts recording. The returned promise rejects if permission is denied, so
 * the caller can show a plain message rather than failing silently.
 */
export async function startRecording(): Promise<Recorder> {
  if (!canRecordAudio()) throw new Error('This browser cannot record audio');

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioMime();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const cleanup = () => {
    for (const track of stream.getTracks()) track.stop();
  };

  return {
    mimeType: recorder.mimeType || mimeType || 'audio/webm',
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
        };
        if (recorder.state === 'inactive') {
          cleanup();
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
        } else {
          recorder.stop();
        }
      }),
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } finally {
        cleanup();
      }
    },
  };
}

export function formatDuration(seconds: number | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
