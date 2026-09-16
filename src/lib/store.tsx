import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SEED_PROPERTIES } from '../data/seed';
import * as db from './db';
import { fromSeed } from './property';
import { DEFAULT_SETTINGS, type Property, type Settings } from '../types';

interface StoreValue {
  properties: Property[];
  settings: Settings;
  /** propertyId -> number of photos/videos/voice notes. */
  mediaCounts: Record<string, number>;
  ready: boolean;
  error: string | null;

  save: (p: Property) => Promise<void>;
  patch: (id: string, changes: Partial<Property>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateSettings: (changes: Partial<Settings>) => Promise<void>;
  /** Re-reads src/data/seed.ts, filling blanks and refreshing research only. */
  reloadSeed: () => Promise<{ added: number; updated: number }>;
  refresh: () => Promise<void>;
  refreshMediaCounts: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const SEEDED_KEY = 'seeded';

function normKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isBlank(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/**
 * Merges a seed record into an existing property.
 *
 * Rule: anything you could have typed on site wins. The seed only fills fields
 * that are still blank, plus it always refreshes `brief`, which is research and
 * is never editable in the app. This makes "Reload property list" safe to press
 * at any point in the trip.
 */
function mergeSeed(existing: Property, incoming: Property): Property {
  // Work through a loose view of the records; the result is re-typed on return.
  const out = { ...existing } as unknown as Record<string, unknown>;
  const before = existing as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

    if (key === 'brief') {
      // Research is always the seed's, never the user's.
      if (value !== undefined) out.brief = value;
      continue;
    }

    if (key === 'costs' || key === 'negotiation') {
      const existingSub = (before[key] ?? {}) as Record<string, unknown>;
      const incomingSub = (value ?? {}) as Record<string, unknown>;
      const subOut: Record<string, unknown> = { ...existingSub };
      for (const [k, v] of Object.entries(incomingSub)) {
        if (isBlank(existingSub[k]) && !isBlank(v)) subOut[k] = v;
      }
      out[key] = subOut;
      continue;
    }

    if (isBlank(before[key]) && !isBlank(value)) out[key] = value;
  }

  out.updatedAt = existing.updatedAt;
  return out as unknown as Property;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const booted = useRef(false);

  const refresh = useCallback(async () => {
    const [list, counts] = await Promise.all([db.allProperties(), db.mediaCounts()]);
    setProperties(list);
    setMediaCounts(counts);
  }, []);

  const refreshMediaCounts = useCallback(async () => {
    setMediaCounts(await db.mediaCounts());
  }, []);

  const applySeed = useCallback(async (): Promise<{ added: number; updated: number }> => {
    const existing = await db.allProperties();
    const byId = new Map(existing.map((p) => [p.id, p]));
    const byName = new Map(existing.map((p) => [normKey(p.name), p]));

    const writes: Property[] = [];
    let added = 0;
    let updated = 0;

    for (const seed of SEED_PROPERTIES) {
      const candidate = fromSeed(seed);
      const match = byId.get(candidate.id) ?? byName.get(normKey(candidate.name));
      if (match) {
        writes.push(mergeSeed(match, candidate));
        updated += 1;
      } else {
        writes.push(candidate);
        added += 1;
      }
    }

    if (writes.length > 0) await db.putProperties(writes);
    await db.setMeta(SEEDED_KEY, true);
    await refresh();
    return { added, updated };
  }, [refresh]);

  // Boot: load settings and data, seeding on genuine first run only.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    (async () => {
      try {
        if (!(await db.dbAvailable())) {
          setError(
            'This browser will not let the app store data. If you are in Private Browsing, switch to a normal window.',
          );
          setReady(true);
          return;
        }

        const loaded = await db.loadSettings();
        setSettings(loaded);

        const seeded = await db.getMeta<boolean>(SEEDED_KEY);
        const existing = await db.allProperties();
        if (!seeded && existing.length === 0) {
          await applySeed();
        } else {
          await refresh();
        }

        // Best effort: ask the browser not to evict the data mid-trip.
        void db.requestPersistence();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong loading your data');
      } finally {
        setReady(true);
      }
    })();
  }, [applySeed, refresh]);

  // Reflect text size and theme on the document root.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.text = settings.textSize;
    root.dataset.theme = settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'dark' ? '#10201a' : '#1c6b52');
  }, [settings.textSize, settings.theme]);

  const save = useCallback(async (p: Property) => {
    const next = { ...p, updatedAt: Date.now() };
    await db.putProperty(next);
    setProperties((prev) => {
      const i = prev.findIndex((x) => x.id === next.id);
      if (i === -1) return [...prev, next];
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
  }, []);

  const patch = useCallback(
    async (id: string, changes: Partial<Property>) => {
      // Read from the freshest copy so rapid taps do not clobber each other.
      const current = (await db.getProperty(id)) ?? properties.find((p) => p.id === id);
      if (!current) return;
      await save({ ...current, ...changes });
    },
    [properties, save],
  );

  const remove = useCallback(async (id: string) => {
    await db.deleteProperty(id);
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setMediaCounts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const updateSettings = useCallback(
    async (changes: Partial<Settings>) => {
      const next = { ...settings, ...changes };
      setSettings(next);
      await db.saveSettings(next);
    },
    [settings],
  );

  const value = useMemo<StoreValue>(
    () => ({
      properties,
      settings,
      mediaCounts,
      ready,
      error,
      save,
      patch,
      remove,
      updateSettings,
      reloadSeed: applySeed,
      refresh,
      refreshMediaCounts,
    }),
    [
      properties,
      settings,
      mediaCounts,
      ready,
      error,
      save,
      patch,
      remove,
      updateSettings,
      applySeed,
      refresh,
      refreshMediaCounts,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useProperty(id: string | undefined): Property | undefined {
  const { properties } = useStore();
  return useMemo(() => properties.find((p) => p.id === id), [properties, id]);
}

/** Effective stamp duty %, honouring the woman-buyer setting. */
export function effectiveStampDutyPct(settings: Settings): number {
  return settings.womanBuyer ? settings.womanStampDutyPct : settings.defaultStampDutyPct;
}
