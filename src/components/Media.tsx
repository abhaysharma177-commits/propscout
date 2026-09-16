import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteMedia, getMediaBlob, getThumbBlob, mediaForProperty, updateMedia } from '../lib/db';
import {
  BIG_VIDEO_BYTES,
  canRecordAudio,
  formatBytes,
  formatDuration,
  MEDIA_TAGS,
  saveCapture,
  startRecording,
  type Recorder,
} from '../lib/media';
import { useStore } from '../lib/store';
import type { MediaKind, MediaMeta } from '../types';
import { ConfirmSheet, Note, Sheet, useToast } from './ui';

/** Loads a blob from storage and hands back an object URL, revoked on unmount. */
function useBlobUrl(id: string | undefined, which: 'thumb' | 'full'): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!id) {
      setUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;

    (async () => {
      const blob =
        which === 'thumb' ? ((await getThumbBlob(id)) ?? (await getMediaBlob(id))) : await getMediaBlob(id);
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, which]);

  return url;
}

const KIND_ICON: Record<MediaKind, string> = {
  photo: '\u{1F5BC}\u{FE0F}',
  video: '\u{1F3AC}',
  audio: '\u{1F3A4}',
};

function MediaTile({ item, onOpen }: { item: MediaMeta; onOpen: () => void }) {
  const url = useBlobUrl(item.kind === 'audio' ? undefined : item.id, 'thumb');

  return (
    <button type="button" className="mtile" onClick={onOpen} aria-label={item.caption ?? item.tag ?? item.kind}>
      {item.kind === 'audio' ? (
        <span className="mtile__audio" aria-hidden="true">
          {KIND_ICON.audio}
        </span>
      ) : url ? (
        <img src={url} alt={item.caption ?? item.tag ?? ''} loading="lazy" />
      ) : (
        <span className="mtile__audio" aria-hidden="true" style={{ background: 'var(--bg-tint)' }}>
          {KIND_ICON[item.kind]}
        </span>
      )}
      <span className="mtile__badge">
        {item.kind === 'video'
          ? `▶ ${formatDuration(item.durationSec) || 'video'}`
          : item.kind === 'audio'
            ? formatDuration(item.durationSec) || 'note'
            : (item.tag ?? 'photo')}
      </span>
    </button>
  );
}

function MediaViewer({
  items,
  index,
  onClose,
  onChanged,
}: {
  items: MediaMeta[];
  index: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [i, setI] = useState(index);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = items[i];
  const url = useBlobUrl(item?.id, 'full');
  const [caption, setCaption] = useState(item?.caption ?? '');
  const [tag, setTag] = useState(item?.tag ?? '');

  useEffect(() => {
    setCaption(item?.caption ?? '');
    setTag(item?.tag ?? '');
  }, [item?.id, item?.caption, item?.tag]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((v) => Math.min(items.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  if (!item) return null;

  const saveMeta = async () => {
    const next: MediaMeta = { ...item };
    const c = caption.trim();
    const t = tag.trim();
    if (c) next.caption = c;
    else delete next.caption;
    if (t) next.tag = t;
    else delete next.tag;
    await updateMedia(next);
    onChanged();
  };

  return (
    <div className="viewer">
      <div className="viewer__bar">
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <span className="grow small" style={{ color: '#ddd' }}>
          {i + 1} of {items.length} · {formatBytes(item.sizeBytes)}
        </span>
        <button
          type="button"
          className="iconbtn"
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete"
        >
          🗑
        </button>
      </div>

      <div className="viewer__stage">
        {!url ? (
          <div className="spinner" />
        ) : item.kind === 'photo' ? (
          <img src={url} alt={item.caption ?? ''} />
        ) : item.kind === 'video' ? (
          <video src={url} controls playsInline preload="metadata" />
        ) : (
          <audio src={url} controls style={{ width: '90%' }} />
        )}
      </div>

      <div className="viewer__foot">
        <div className="row">
          <button
            type="button"
            className="btn btn--sm"
            disabled={i === 0}
            onClick={() => setI(i - 1)}
          >
            ‹ Prev
          </button>
          <span className="grow" />
          <button
            type="button"
            className="btn btn--sm"
            disabled={i >= items.length - 1}
            onClick={() => setI(i + 1)}
          >
            Next ›
          </button>
        </div>
        <input
          className="input"
          placeholder="Add a note about this…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveMeta}
        />
        <div className="chipbar" style={{ margin: 0, padding: 0 }}>
          {MEDIA_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className="chipbtn"
              aria-pressed={tag === t}
              onClick={() => {
                const next = tag === t ? '' : t;
                setTag(next);
                const meta: MediaMeta = { ...item };
                if (next) meta.tag = next;
                else delete meta.tag;
                void updateMedia(meta).then(onChanged);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmSheet
          title="Delete this?"
          body="It cannot be recovered unless you have a backup."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteMedia(item.id);
            setConfirmDelete(false);
            onChanged();
            if (items.length <= 1) onClose();
            else setI(Math.max(0, i - 1));
          }}
        />
      )}
    </div>
  );
}

function VoiceRecorder({ onDone, onCancel }: { onDone: (blob: Blob, seconds: number) => void; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        recorder.current = await startRecording();
      } catch {
        setError('Could not access the microphone. Check the permission and try again.');
      }
    })();
  }, []);

  useEffect(() => {
    if (error) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [error]);

  useEffect(
    () => () => {
      recorder.current?.cancel();
    },
    [],
  );

  const stop = async () => {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    const blob = await r.stop();
    onDone(blob, seconds);
  };

  return (
    <Sheet title="Voice note" onClose={onCancel}>
      {error ? (
        <Note tone="bad" icon="⚠️">
          {error}
        </Note>
      ) : (
        <>
          <div className="center" style={{ padding: '18px 0' }}>
            <div style={{ fontSize: '2.6rem' }} aria-hidden="true">
              🎤
            </div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              {formatDuration(seconds)}
            </div>
            <p className="small muted">Recording. Say what you are seeing.</p>
          </div>
          <div className="btnrow">
            <button
              type="button"
              className="btn"
              onClick={() => {
                recorder.current?.cancel();
                recorder.current = null;
                onCancel();
              }}
            >
              Discard
            </button>
            <button type="button" className="btn btn--primary" onClick={stop}>
              Save note
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/**
 * Capture + gallery for one property.
 * The tag selector is sticky so you can shoot ten photos of the same room
 * without re-tagging each one.
 */
export function MediaPanel({ propertyId, compact }: { propertyId: string; compact?: boolean }) {
  const { settings, refreshMediaCounts } = useStore();
  const { show } = useToast();
  const [items, setItems] = useState<MediaMeta[]>([]);
  const [viewer, setViewer] = useState<number | null>(null);
  const [tag, setTag] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingBigVideo, setPendingBigVideo] = useState<File | null>(null);

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setItems(await mediaForProperty(propertyId));
    await refreshMediaCounts();
  }, [propertyId, refreshMediaCounts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const store = useCallback(
    async (file: Blob, kind?: MediaKind, durationSec?: number) => {
      setBusy(true);
      try {
        await saveCapture({
          propertyId,
          file,
          ...(kind ? { kind } : {}),
          ...(tag ? { tag } : {}),
          ...(durationSec !== undefined ? { durationSec } : {}),
          photoMaxEdge: settings.photoMaxEdge,
        });
        await reload();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not save that';
        show(
          /quota|storage|full/i.test(message)
            ? 'Storage is full. Export a backup, then delete some videos.'
            : message,
        );
      } finally {
        setBusy(false);
      }
    },
    [propertyId, tag, settings.photoMaxEdge, reload, show],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/') && file.size > BIG_VIDEO_BYTES) {
          setPendingBigVideo(file);
          continue;
        }
        await store(file);
      }
    },
    [store],
  );

  return (
    <div className="col">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={pickRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {!compact && (
        <>
          <p className="tiny muted-3">
            Tap a label first and it sticks, so a run of photos of the same room all get tagged.
          </p>
          <div className="chipbar">
            {MEDIA_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className="chipbtn"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="btnrow">
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={() => photoRef.current?.click()}
        >
          📷 Photo
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => videoRef.current?.click()}>
          🎬 Video
        </button>
      </div>
      <div className="btnrow">
        {canRecordAudio() && (
          <button type="button" className="btn" disabled={busy} onClick={() => setRecording(true)}>
            🎤 Voice note
          </button>
        )}
        <button type="button" className="btn" disabled={busy} onClick={() => pickRef.current?.click()}>
          🖼️ From gallery
        </button>
      </div>

      {busy && (
        <div className="row small muted">
          <div className="spinner" /> Saving…
        </div>
      )}

      {items.length === 0 ? (
        <Note tone="info" icon="💡">
          Nothing captured here yet. Photograph every document, every defect, the approach road, and
          the view from each window — it is what you will actually rely on when you get back.
        </Note>
      ) : (
        <>
          <div className="row small muted-3">
            <span className="grow">
              {items.filter((m) => m.kind === 'photo').length} photos ·{' '}
              {items.filter((m) => m.kind === 'video').length} videos ·{' '}
              {items.filter((m) => m.kind === 'audio').length} notes
            </span>
            <span>{formatBytes(items.reduce((sum, m) => sum + m.sizeBytes, 0))}</span>
          </div>
          <div className="mgrid">
            {items.map((item, i) => (
              <MediaTile key={item.id} item={item} onOpen={() => setViewer(i)} />
            ))}
          </div>
        </>
      )}

      {viewer !== null && (
        <MediaViewer
          items={items}
          index={viewer}
          onClose={() => setViewer(null)}
          onChanged={reload}
        />
      )}

      {recording && (
        <VoiceRecorder
          onCancel={() => setRecording(false)}
          onDone={async (blob, seconds) => {
            setRecording(false);
            await store(blob, 'audio', seconds);
          }}
        />
      )}

      {pendingBigVideo && (
        <ConfirmSheet
          title="That is a large video"
          body={`${formatBytes(pendingBigVideo.size)}. Videos are stored as-is and a phone's storage for a web app is limited. Save it anyway?`}
          confirmLabel="Save it"
          onCancel={() => setPendingBigVideo(null)}
          onConfirm={async () => {
            const file = pendingBigVideo;
            setPendingBigVideo(null);
            await store(file);
          }}
        />
      )}
    </div>
  );
}

/** Small first-photo thumbnail for the property card. */
export function PropertyThumb({ propertyId }: { propertyId: string }) {
  const [first, setFirst] = useState<MediaMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await mediaForProperty(propertyId);
      if (!cancelled) setFirst(list.find((m) => m.kind !== 'audio') ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const url = useBlobUrl(first?.id, 'thumb');
  if (url) return <img className="pcard__thumb" src={url} alt="" />;
  return (
    <span className="pcard__thumb" aria-hidden="true">
      🏢
    </span>
  );
}
