import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS, type MediaMeta, type Property, type Settings } from '../types';

/**
 * Local-only storage. Nothing here ever talks to a network.
 *
 * Blobs live in their own store, keyed by media id, so listing a property's
 * media never pulls megabytes of video into memory.
 */

const DB_NAME = 'propscout';
const DB_VERSION = 1;

interface PropScoutDB extends DBSchema {
  properties: {
    key: string;
    value: Property;
    indexes: { 'by-updated': number };
  };
  media: {
    key: string;
    value: MediaMeta;
    indexes: { 'by-property': string; 'by-created': number };
  };
  blobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  thumbs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<PropScoutDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PropScoutDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PropScoutDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('properties')) {
          const store = db.createObjectStore('properties', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('media')) {
          const store = db.createObjectStore('media', { keyPath: 'id' });
          store.createIndex('by-property', 'propertyId');
          store.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('thumbs')) {
          db.createObjectStore('thumbs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

/** True when IndexedDB is usable (it is not, in Safari private browsing). */
export async function dbAvailable(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- properties

export async function allProperties(): Promise<Property[]> {
  const db = await getDb();
  return db.getAll('properties');
}

export async function getProperty(id: string): Promise<Property | undefined> {
  const db = await getDb();
  return db.get('properties', id);
}

export async function putProperty(p: Property): Promise<void> {
  const db = await getDb();
  await db.put('properties', p);
}

export async function putProperties(list: Property[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('properties', 'readwrite');
  await Promise.all([...list.map((p) => tx.store.put(p)), tx.done]);
}

/** Removes the property and every blob, thumb and media record belonging to it. */
export async function deleteProperty(id: string): Promise<void> {
  const db = await getDb();
  const media = await db.getAllFromIndex('media', 'by-property', id);
  const tx = db.transaction(['properties', 'media', 'blobs', 'thumbs'], 'readwrite');
  const ops: Promise<unknown>[] = [tx.objectStore('properties').delete(id)];
  for (const m of media) {
    ops.push(tx.objectStore('media').delete(m.id));
    ops.push(tx.objectStore('blobs').delete(m.id));
    ops.push(tx.objectStore('thumbs').delete(m.id));
  }
  ops.push(tx.done);
  await Promise.all(ops);
}

// --------------------------------------------------------------------- media

export async function mediaForProperty(propertyId: string): Promise<MediaMeta[]> {
  const db = await getDb();
  const list = await db.getAllFromIndex('media', 'by-property', propertyId);
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

export async function allMedia(): Promise<MediaMeta[]> {
  const db = await getDb();
  return db.getAll('media');
}

export async function mediaCounts(): Promise<Record<string, number>> {
  const list = await allMedia();
  const counts: Record<string, number> = {};
  for (const m of list) counts[m.propertyId] = (counts[m.propertyId] ?? 0) + 1;
  return counts;
}

export async function addMedia(meta: MediaMeta, blob: Blob, thumb?: Blob): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['media', 'blobs', 'thumbs'], 'readwrite');
  const ops: Promise<unknown>[] = [
    tx.objectStore('media').put(meta),
    tx.objectStore('blobs').put({ id: meta.id, blob }),
  ];
  if (thumb) ops.push(tx.objectStore('thumbs').put({ id: meta.id, blob: thumb }));
  ops.push(tx.done);
  await Promise.all(ops);
}

export async function updateMedia(meta: MediaMeta): Promise<void> {
  const db = await getDb();
  await db.put('media', meta);
}

export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  return (await db.get('blobs', id))?.blob;
}

export async function getThumbBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  return (await db.get('thumbs', id))?.blob;
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['media', 'blobs', 'thumbs'], 'readwrite');
  await Promise.all([
    tx.objectStore('media').delete(id),
    tx.objectStore('blobs').delete(id),
    tx.objectStore('thumbs').delete(id),
    tx.done,
  ]);
}

// ------------------------------------------------------------------ settings

export async function loadSettings(): Promise<Settings> {
  const db = await getDb();
  const stored = (await db.get('meta', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  const db = await getDb();
  await db.put('meta', s, 'settings');
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get('meta', key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('meta', value, key);
}

// ----------------------------------------------------------------- wholesale

export async function wipeAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['properties', 'media', 'blobs', 'thumbs', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('properties').clear(),
    tx.objectStore('media').clear(),
    tx.objectStore('blobs').clear(),
    tx.objectStore('thumbs').clear(),
    tx.objectStore('meta').clear(),
    tx.done,
  ]);
}

export interface StorageInfo {
  usedBytes?: number;
  quotaBytes?: number;
  /** True once we are close enough to the quota to warn the user. */
  nearLimit: boolean;
  /** True when the browser has promised not to evict our data. */
  persisted: boolean;
}

export async function storageInfo(): Promise<StorageInfo> {
  let usedBytes: number | undefined;
  let quotaBytes: number | undefined;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usedBytes = est.usage;
      quotaBytes = est.quota;
    }
  } catch {
    // Estimation is unavailable on some browsers; not an error worth surfacing.
  }
  let persisted = false;
  try {
    persisted = (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    persisted = false;
  }
  const nearLimit =
    usedBytes !== undefined && quotaBytes !== undefined && quotaBytes > 0
      ? usedBytes / quotaBytes > 0.8
      : false;
  return { usedBytes, quotaBytes, nearLimit, persisted };
}

/**
 * Asks the browser to keep our data even under storage pressure. Safari in
 * particular can clear IndexedDB for sites it considers unused, and a home
 * screen install plus this call makes that far less likely.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    // Ignore — best effort only.
  }
  return false;
}
