import { buildSummary, exportZip, triggerDownload, type ZipProgress } from './backup';
import { allMedia, allProperties, loadSettings } from './db';

/**
 * Sharing, via the phone's own share sheet where it exists.
 *
 * On a phone, "download the file, find it in Files, attach it to WhatsApp" is
 * three steps too many. The Web Share API hands the file straight to WhatsApp,
 * Mail or AirDrop. Desktop browsers mostly cannot share files, so every
 * function falls back to a plain download.
 */

export type ShareOutcome = 'shared' | 'downloaded' | 'copied' | 'cancelled';

function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files })
  );
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

/** The public URL of this install, without any route hash. */
export function appUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`.replace(/index\.html$/, '');
}

/**
 * Shares the install link. This is the thing to send family — one URL that
 * installs on both iPhone and Android.
 */
export async function shareAppLink(): Promise<ShareOutcome> {
  const url = appUrl();
  const payload = {
    title: 'PropScout — property visits',
    text: 'Our property shortlist, checklists and photos, all in one app. Open this on your phone and add it to your home screen.',
    url,
  };

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
      // Fall through to the clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    // Last resort: a text file containing the link, which is at least sendable.
    triggerDownload(new Blob([url], { type: 'text/plain' }), 'propscout-link.txt');
    return 'downloaded';
  }
}

/**
 * Shares the full backup — everything, including photos — as a single zip.
 * This is how you get your notes and pictures onto someone else's phone.
 */
export async function shareBackup(onProgress?: (p: ZipProgress) => void): Promise<ShareOutcome> {
  const blob = await exportZip(onProgress);
  const name = `propscout-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  const file = new File([blob], name, { type: 'application/zip' });

  if (canShareFiles([file])) {
    try {
      await navigator.share({
        files: [file],
        title: 'PropScout backup',
        text: 'My property visits: notes, checklists and photos. Open PropScout and use Settings → Restore to load this.',
      });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
      // Fall through to a download.
    }
  }

  triggerDownload(blob, name);
  return 'downloaded';
}

/**
 * Shares the readable summary as text, for when you just want to send someone
 * the findings rather than a file they have to import.
 */
export async function shareSummary(): Promise<ShareOutcome> {
  const md = buildSummary(await allProperties(), await allMedia(), await loadSettings());
  const file = new File([md], 'propscout-summary.md', { type: 'text/markdown' });

  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title: 'Property visit summary' });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // Share sheets cap text length in practice; send the head of it.
      await navigator.share({ title: 'Property visit summary', text: md.slice(0, 4000) });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
    }
  }

  triggerDownload(new Blob([md], { type: 'text/markdown' }), 'propscout-summary.md');
  return 'downloaded';
}

export const OUTCOME_MESSAGE: Record<ShareOutcome, string> = {
  shared: 'Shared',
  downloaded: 'Saved to your downloads',
  copied: 'Link copied',
  cancelled: '',
};

// ------------------------------------------------------------------- install

export type Platform = 'ios' | 'android' | 'desktop';

export function platform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as a Mac, so check for touch as well.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** True when the app is already running from the home screen. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari's own non-standard flag.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export const INSTALL_STEPS: Record<Platform, string[]> = {
  ios: [
    'Tap the Share button at the bottom of Safari (the square with an arrow).',
    'Scroll down and tap "Add to Home Screen".',
    'Tap "Add".',
  ],
  android: [
    'Tap the ⋮ menu at the top right of Chrome.',
    'Tap "Install app", or "Add to Home screen".',
    'Confirm.',
  ],
  desktop: [
    'Look for the install icon in the address bar, or open the browser menu and choose "Install".',
    'To use it while visiting properties, open this link on your phone instead.',
  ],
};
