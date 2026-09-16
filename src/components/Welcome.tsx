import { useEffect, useState } from 'react';
import { getMeta, setMeta } from '../lib/db';
import { INSTALL_STEPS, isInstalled, platform, type Platform } from '../lib/share';
import { Note, Sheet } from './ui';

/**
 * First-run introduction and install prompt.
 *
 * The app gets shared with family who did not build it, so the first screen
 * has to answer three questions without being asked: what is this, how do I
 * keep it, and where does my data go.
 */

const SEEN_KEY = 'welcomeSeen';

/** Chrome's install event, which is not in the DOM lib types. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it so we can show our own button at a sensible moment.
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
  });
}

const PLATFORM_LABEL: Record<Platform, string> = {
  ios: 'On iPhone or iPad',
  android: 'On Android',
  desktop: 'On this computer',
};

export function InstallCard({ compact }: { compact?: boolean }) {
  const [canPrompt, setCanPrompt] = useState(Boolean(deferredPrompt));
  const [installed, setInstalled] = useState(isInstalled());
  const os = platform();

  useEffect(() => {
    const onAvailable = () => setCanPrompt(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
    };
    window.addEventListener('beforeinstallprompt', onAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <Note tone="good" icon="✅">
        Installed on this device. It works with no signal at all.
      </Note>
    );
  }

  return (
    <div className="col" style={{ gap: 10 }}>
      {canPrompt && (
        <button
          type="button"
          className="btn btn--primary btn--lg btn--block"
          onClick={async () => {
            const p = deferredPrompt;
            if (!p) return;
            deferredPrompt = null;
            setCanPrompt(false);
            await p.prompt();
            const { outcome } = await p.userChoice;
            if (outcome === 'accepted') setInstalled(true);
          }}
        >
          ⬇️ Install app
        </button>
      )}

      {!canPrompt && (
        <div className={compact ? 'card card--pad' : 'card card--pad'}>
          <h4 style={{ marginBottom: 8 }}>{PLATFORM_LABEL[os]}</h4>
          <ol className="bullets">
            {INSTALL_STEPS[os].map((step, i) => (
              <li key={i}>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {os === 'ios' && (
            <p className="tiny muted-3" style={{ marginTop: 10 }}>
              This only works in Safari. Chrome on iPhone cannot install web apps.
            </p>
          )}
        </div>
      )}

      <p className="tiny muted-3">
        Installing matters: browsers are far less likely to clear the stored data of an installed
        app, and your photos live in that storage.
      </p>
    </div>
  );
}

export function Welcome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await getMeta<boolean>(SEEN_KEY);
      if (!cancelled && !seen) setShow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    void setMeta(SEEN_KEY, true);
  };

  return (
    <Sheet title="Welcome to PropScout" onClose={dismiss}>
      <p className="small">
        Everything for a property hunt in one place: the shortlist, what each one really costs, what
        to check when you are standing there, the questions to ask, and somewhere to put the photos
        and videos so you can review them properly afterwards.
      </p>

      <Note tone="accent" icon="🔒">
        <strong>No account, and nothing leaves your phone.</strong> Your photos, notes and ratings
        are stored on this device only. There is no server and no tracking.
      </Note>

      <Note tone="warn" icon="💾">
        <strong>Because of that, back it up.</strong> At the end of each day of visits, go to
        Settings and tap Backup, then send the file to yourself. If you clear your browser data, it
        is gone.
      </Note>

      <div>
        <h4 style={{ marginBottom: 8 }}>Add it to your home screen</h4>
        <InstallCard compact />
      </div>

      <p className="small muted">
        Tap <strong>Start visit</strong> on any property when you arrive — it walks you through the
        checks with big buttons and a camera always to hand.
      </p>

      <button type="button" className="btn btn--primary btn--lg btn--block" onClick={dismiss}>
        Got it
      </button>
    </Sheet>
  );
}
