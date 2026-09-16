import { unzip, zip, type Zippable } from 'fflate';
import { CHECKS_BY_ID } from '../data/checklists';
import { CRITERIA_BY_ID } from '../data/scoring';
import {
  addMedia,
  allMedia,
  allProperties,
  getMediaBlob,
  loadSettings,
  putProperties,
  saveSettings,
  wipeAll,
} from './db';
import { formatCompact, formatPct } from './money';
import { estimateNegotiation } from './negotiate';
import { normalizeProperty } from './property';
import { computeScore, summariseChecks } from './score';
import { DEFAULT_SETTINGS, type MediaMeta, type Property, type Settings } from '../types';

/**
 * Backup and restore.
 *
 * Everything lives in the browser's storage, which a phone can clear. A backup
 * is the only real protection, so it is one button and the export includes a
 * plain-text summary you can read without the app.
 */

export const BACKUP_VERSION = 1;

interface BackupData {
  app: 'propscout';
  version: number;
  exportedAt: string;
  properties: Property[];
  media: MediaMeta[];
  settings: Settings;
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function extFor(meta: MediaMeta): string {
  const fromMime = meta.mime.split('/')[1]?.split(';')[0];
  if (fromMime) return fromMime.replace(/[^a-z0-9]/gi, '') || 'bin';
  return meta.kind === 'photo' ? 'jpg' : meta.kind === 'video' ? 'mp4' : 'webm';
}

function safeName(s: string): string {
  return s.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'property';
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Small, shareable, data-only export. No photos. */
export async function exportJson(): Promise<Blob> {
  const data: BackupData = {
    app: 'propscout',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    properties: await allProperties(),
    media: await allMedia(),
    settings: await loadSettings(),
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export async function downloadJson(): Promise<void> {
  triggerDownload(await exportJson(), `propscout-data-${stamp()}.json`);
}

export interface ZipProgress {
  stage: 'collecting' | 'compressing' | 'done';
  current?: number;
  total?: number;
}

/**
 * Full backup: data, every photo/video/voice note, and a readable summary.
 * Media is stored uncompressed because JPEG and MP4 do not compress further,
 * and level 0 keeps a 500 MB export from taking minutes on a phone.
 */
export async function exportZip(onProgress?: (p: ZipProgress) => void): Promise<Blob> {
  onProgress?.({ stage: 'collecting' });

  const properties = await allProperties();
  const media = await allMedia();
  const settings = await loadSettings();

  const data: BackupData = {
    app: 'propscout',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    properties,
    media,
    settings,
  };

  const byId = new Map(properties.map((p) => [p.id, p]));
  const files: Zippable = {
    'data.json': [new TextEncoder().encode(JSON.stringify(data, null, 2)), { level: 6 }],
    'summary.md': [new TextEncoder().encode(buildSummary(properties, media, settings)), { level: 6 }],
    'README.txt': [
      new TextEncoder().encode(
        [
          'PropScout backup',
          '',
          'data.json    — everything, restorable from the app: Settings > Restore from backup.',
          'summary.md   — plain-text summary you can read without the app.',
          'media/       — every photo, video and voice note, foldered by property.',
          '',
          `Exported ${new Date().toLocaleString()}`,
        ].join('\n'),
      ),
      { level: 6 },
    ],
  };

  let done = 0;
  for (const m of media) {
    const blob = await getMediaBlob(m.id);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const folder = safeName(byId.get(m.propertyId)?.name ?? m.propertyId);
    const tag = m.tag ? `-${safeName(m.tag).replace(/\s+/g, '_')}` : '';
    files[`media/${folder}/${m.kind}-${m.id}${tag}.${extFor(m)}`] = [bytes, { level: 0 }];
    done += 1;
    onProgress?.({ stage: 'collecting', current: done, total: media.length });
  }

  onProgress?.({ stage: 'compressing' });
  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, out) => (err ? reject(err) : resolve(out)));
  });

  onProgress?.({ stage: 'done' });
  // Copy into a fresh buffer so the Blob owns plain ArrayBuffer-backed bytes.
  return new Blob([new Uint8Array(zipped)], { type: 'application/zip' });
}

export async function downloadZip(onProgress?: (p: ZipProgress) => void): Promise<void> {
  triggerDownload(await exportZip(onProgress), `propscout-backup-${stamp()}.zip`);
}

export interface ImportResult {
  properties: number;
  media: number;
  skipped: number;
  warnings: string[];
}

export type ImportMode = 'merge' | 'replace';

/** Restores from a .json or .zip produced by this app. */
export async function importBackup(file: File, mode: ImportMode = 'merge'): Promise<ImportResult> {
  const warnings: string[] = [];
  const isZip =
    file.name.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed';

  let data: BackupData;
  let blobs = new Map<string, Uint8Array>();

  if (isZip) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(bytes, (err, out) => (err ? reject(err) : resolve(out)));
    });
    const raw = entries['data.json'];
    if (!raw) throw new Error('That zip does not contain data.json — is it a PropScout backup?');
    data = JSON.parse(new TextDecoder().decode(raw)) as BackupData;

    // Media ids are embedded in the filename: media/<property>/<kind>-<id>[-tag].<ext>
    for (const [path, content] of Object.entries(entries)) {
      if (!path.startsWith('media/')) continue;
      const base = path.slice(path.lastIndexOf('/') + 1);
      const match = /^(?:photo|video|audio)-([^.\-]+)/.exec(base);
      if (match?.[1]) blobs.set(match[1], content);
    }
  } else {
    data = JSON.parse(await file.text()) as BackupData;
    blobs = new Map();
  }

  if (data?.app !== 'propscout' || !Array.isArray(data.properties)) {
    throw new Error('That file is not a PropScout backup');
  }
  if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
    warnings.push(
      `This backup was made by a newer version of the app (v${data.version}). Some fields may be ignored.`,
    );
  }

  if (mode === 'replace') await wipeAll();

  let skipped = 0;
  const incoming: Property[] = [];
  for (const raw of data.properties) {
    const p = normalizeProperty(raw);
    if (p) incoming.push(p);
    else skipped += 1;
  }

  if (mode === 'merge') {
    const existing = new Map((await allProperties()).map((p) => [p.id, p]));
    const merged = incoming.map((p) => {
      const old = existing.get(p.id);
      // Keep whichever copy was edited more recently.
      return old && old.updatedAt > p.updatedAt ? old : p;
    });
    await putProperties(merged);
  } else {
    await putProperties(incoming);
  }

  let mediaRestored = 0;
  if (Array.isArray(data.media)) {
    for (const m of data.media) {
      const bytes = blobs.get(m.id);
      if (!bytes) continue;
      // Copy so the stored Blob does not retain the whole unzipped buffer.
      await addMedia(m, new Blob([new Uint8Array(bytes)], { type: m.mime }));
      mediaRestored += 1;
    }
    const missing = data.media.length - mediaRestored;
    if (missing > 0 && !isZip) {
      warnings.push(
        `${missing} photos/videos were listed but not included — a .json backup carries data only. Restore the .zip to get the media back.`,
      );
    } else if (missing > 0) {
      warnings.push(`${missing} media files were listed but missing from the zip.`);
    }
  }

  if (data.settings && typeof data.settings === 'object') {
    await saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  }

  return { properties: incoming.length, media: mediaRestored, skipped, warnings };
}

/** Human-readable trip summary, included in the zip and offered on its own. */
export function buildSummary(
  properties: Property[],
  media: MediaMeta[],
  settings: Settings,
): string {
  const lines: string[] = [];
  const mediaByProp = new Map<string, number>();
  for (const m of media) mediaByProp.set(m.propertyId, (mediaByProp.get(m.propertyId) ?? 0) + 1);

  lines.push('# PropScout — property visit summary');
  lines.push('');
  lines.push(`Exported ${new Date().toLocaleString()} · ${properties.length} properties · ${media.length} media files`);
  lines.push('');

  const ranked = [...properties].sort((a, b) => {
    const sa = computeScore(a).overall;
    const sb = computeScore(b).overall;
    return sb - sa;
  });

  for (const p of ranked) {
    const score = computeScore(p);
    const checks = summariseChecks(p);
    const neg = estimateNegotiation(p);

    lines.push('---');
    lines.push('');
    lines.push(`## ${p.name}`);
    lines.push('');
    lines.push(`- Status: ${p.status.replace('_', ' ')}`);
    if (p.locality) lines.push(`- Locality: ${p.locality}`);
    if (p.config) lines.push(`- Configuration: ${p.config}`);
    if (p.costs.askingPrice) lines.push(`- Asking: ${formatCompact(p.costs.askingPrice)}`);
    if (neg.askRatePerSqft) lines.push(`- Rate: ₹${Math.round(neg.askRatePerSqft)}/sqft`);
    if (neg.marketPremiumPct !== undefined) {
      lines.push(`- Against market: ${formatPct(neg.marketPremiumPct)}`);
    }
    if (neg.suggestedTarget) {
      lines.push(
        `- Negotiation: open at ${formatCompact(neg.suggestedOpening)}, target ${formatCompact(neg.suggestedTarget)}, walk away above ${formatCompact(neg.suggestedWalkAway)}`,
      );
    }
    if (score.ratedCount > 0) {
      lines.push(`- Your score: ${Math.round(score.overall)}/100 (${score.ratedCount} of ${score.totalCount} rated)`);
    }
    lines.push(
      `- Checklist: ${checks.ok} ok, ${checks.issues} problems, ${checks.unchecked} not checked`,
    );
    lines.push(`- Media captured: ${mediaByProp.get(p.id) ?? 0}`);

    if (checks.criticalIssueIds.length > 0) {
      lines.push('');
      lines.push('**Critical problems found:**');
      for (const id of checks.criticalIssueIds) {
        const note = p.checks[id]?.note;
        lines.push(`- ${CHECKS_BY_ID[id]?.label ?? id}${note ? ` — ${note}` : ''}`);
      }
    }

    if (p.pros.length > 0) {
      lines.push('');
      lines.push('**Good:**');
      for (const x of p.pros) lines.push(`- ${x}`);
    }
    if (p.cons.length > 0) {
      lines.push('');
      lines.push('**Bad:**');
      for (const x of p.cons) lines.push(`- ${x}`);
    }

    const rated = score.byCriterion.filter((c) => c.value !== undefined);
    if (rated.length > 0) {
      lines.push('');
      lines.push('**Ratings:**');
      for (const c of rated) {
        lines.push(`- ${CRITERIA_BY_ID[c.id]?.label ?? c.label}: ${c.value}/5`);
      }
    }

    if (p.notes?.trim()) {
      lines.push('');
      lines.push('**Notes:**');
      lines.push(p.notes.trim());
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    `Stamp duty assumption: ${settings.womanBuyer ? settings.womanStampDutyPct : settings.defaultStampDutyPct}% + ${settings.labourCessPctOfStampDuty}% labour cess + ${settings.defaultRegistrationPct}% registration.`,
  );
  lines.push('All negotiation figures are estimates. Verify prices and papers before you transact.');

  return lines.join('\n');
}

export async function downloadSummary(): Promise<void> {
  const md = buildSummary(await allProperties(), await allMedia(), await loadSettings());
  triggerDownload(new Blob([md], { type: 'text/markdown' }), `propscout-summary-${stamp()}.md`);
}
