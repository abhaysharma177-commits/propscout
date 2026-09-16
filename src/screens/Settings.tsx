import { useEffect, useRef, useState } from 'react';
import { Screen } from '../components/AppShell';
import { NumberInput } from '../components/MoneyInput';
import { InstallCard } from '../components/Welcome';
import {
  Accordion,
  Bar,
  ConfirmSheet,
  Note,
  Section,
  Select,
  Stat,
  Switch,
  TextInput,
  useToast,
} from '../components/ui';
import {
  downloadJson,
  downloadSummary,
  downloadZip,
  importBackup,
  type ImportMode,
  type ZipProgress,
} from '../lib/backup';
import { storageInfo, wipeAll, type StorageInfo } from '../lib/db';
import { formatBytes } from '../lib/media';
import { OUTCOME_MESSAGE, shareAppLink, shareBackup, shareSummary } from '../lib/share';
import { effectiveStampDutyPct, useStore } from '../lib/store';

export function Settings() {
  const { settings, updateSettings, reloadSeed, refresh, properties, mediaCounts } = useStore();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<ZipProgress | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  const totalMedia = Object.values(mediaCounts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    void storageInfo().then(setStorage);
  }, [properties.length, totalMedia]);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      show(e instanceof Error ? e.message : 'That did not work');
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <Screen title="Settings">
      {/* -------------------------------------------------- share */}
      <Section title="Share">
        <Note tone="accent" icon="📲">
          <strong>Send the app to someone.</strong> One link installs on both iPhone and Android,
          and they get the whole shortlist and all the research straight away. Their own photos and
          notes stay private to their phone.
        </Note>

        <button
          type="button"
          className="btn btn--primary btn--lg btn--block"
          disabled={busy !== null}
          onClick={() =>
            run('link', async () => {
              const outcome = await shareAppLink();
              if (OUTCOME_MESSAGE[outcome]) show(OUTCOME_MESSAGE[outcome]);
            })
          }
        >
          {busy === 'link' ? 'Opening…' : '🔗 Share the app link'}
        </button>

        <div className="btnrow">
          <button
            type="button"
            className="btn"
            disabled={busy !== null}
            onClick={() =>
              run('sharezip', async () => {
                const outcome = await shareBackup(setProgress);
                if (OUTCOME_MESSAGE[outcome]) show(OUTCOME_MESSAGE[outcome]);
              })
            }
          >
            {busy === 'sharezip' ? 'Preparing…' : '📤 Send my notes & photos'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy !== null}
            onClick={() =>
              run('sharesum', async () => {
                const outcome = await shareSummary();
                if (OUTCOME_MESSAGE[outcome]) show(OUTCOME_MESSAGE[outcome]);
              })
            }
          >
            {busy === 'sharesum' ? 'Preparing…' : '📝 Send a summary'}
          </button>
        </div>

        <p className="tiny muted-3">
          “Send my notes &amp; photos” hands the whole backup to WhatsApp, Mail or AirDrop. Whoever
          receives it opens PropScout and uses Restore below. “Send a summary” is readable text for
          someone who does not want the app.
        </p>
      </Section>

      {/* -------------------------------------------------- install */}
      <Section title="Install on this device">
        <InstallCard />
      </Section>

      {/* -------------------------------------------------- backup */}
      <Section title="Backup — do this every evening">
        <Note tone="warn" icon="⚠️">
          Everything lives on this phone only. Nothing is uploaded anywhere. If you clear your
          browser data or lose the phone, it is gone — so export a backup at the end of each day of
          visits and send the file to yourself.
        </Note>

        <button
          type="button"
          className="btn btn--primary btn--lg btn--block"
          disabled={busy !== null}
          onClick={() => run('zip', () => downloadZip(setProgress))}
        >
          {busy === 'zip' ? 'Preparing…' : '💾 Full backup (with photos)'}
        </button>

        {progress && (
          <div className="card card--pad">
            <p className="small muted">
              {progress.stage === 'collecting'
                ? `Gathering media ${progress.current ?? 0}/${progress.total ?? 0}…`
                : progress.stage === 'compressing'
                  ? 'Packing the file…'
                  : 'Done'}
            </p>
            {progress.total ? (
              <Bar value={(progress.current ?? 0) / progress.total} label="Backup progress" />
            ) : null}
          </div>
        )}

        <div className="btnrow">
          <button
            type="button"
            className="btn"
            disabled={busy !== null}
            onClick={() => run('json', downloadJson)}
          >
            Data only
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy !== null}
            onClick={() => run('summary', downloadSummary)}
          >
            Readable summary
          </button>
        </div>

        <p className="tiny muted-3">
          The full backup is a .zip containing every photo, video and voice note, plus a
          plain-text summary you can read without the app. “Data only” is a small .json — good for
          moving between phones quickly, but it carries no photos.
        </p>
      </Section>

      {/* -------------------------------------------------- restore */}
      <Section title="Restore">
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            await run('import', async () => {
              const result = await importBackup(file, importMode);
              await refresh();
              show(
                `Restored ${result.properties} properties and ${result.media} files${
                  result.skipped > 0 ? `, skipped ${result.skipped}` : ''
                }`,
              );
              for (const w of result.warnings) show(w);
            });
          }}
        />
        <Select<ImportMode>
          label="How to restore"
          value={importMode}
          onChange={setImportMode}
          options={[
            { value: 'merge', label: 'Merge — keep whichever copy is newer' },
            { value: 'replace', label: 'Replace — wipe everything first' },
          ]}
          full
        />
        <button
          type="button"
          className="btn btn--block"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          {busy === 'import' ? 'Restoring…' : '📂 Choose a backup file'}
        </button>
      </Section>

      {/* -------------------------------------------------- display */}
      <Section title="Display">
        <div className="card card--pad">
          <div className="formgrid formgrid--full">
            <Select
              label="Text size"
              hint="Larger is easier outdoors and for older eyes"
              value={settings.textSize}
              onChange={(v) => void updateSettings({ textSize: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Large' },
                { value: 'xlarge', label: 'Extra large' },
              ]}
            />
            <Select
              label="Theme"
              value={settings.theme}
              onChange={(v) => void updateSettings({ theme: v })}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <Switch
            label="Visit mode shows essentials only"
            hint="Hides the nice-to-have checks so the on-site flow stays short"
            checked={settings.visitModeEssentialsOnly}
            onChange={(v) => void updateSettings({ visitModeEssentialsOnly: v })}
          />
        </div>
      </Section>

      {/* -------------------------------------------------- trip */}
      <Section title="Your trip">
        <div className="card card--pad">
          <TextInput
            label="Where you set out from each day"
            hint="Your hotel or the airport. The whole-day route in the Plan tab starts here."
            placeholder="e.g. Hotel name, Jaipur"
            value={settings.homeBase}
            onChange={(v) => void updateSettings({ homeBase: v })}
            full
          />
        </div>
      </Section>

      {/* -------------------------------------------------- money */}
      <Section title="Money assumptions">
        <div className="card card--pad">
          <Switch
            label="Registering in a woman's sole name"
            hint={`Rajasthan charges ${settings.womanStampDutyPct}% stamp duty instead of ${settings.defaultStampDutyPct}%. Currently applying ${effectiveStampDutyPct(settings)}%.`}
            checked={settings.womanBuyer}
            onChange={(v) => void updateSettings({ womanBuyer: v })}
          />
          <div className="formgrid" style={{ marginTop: 12 }}>
            <NumberInput
              label="Stamp duty"
              suffix="%"
              value={settings.defaultStampDutyPct}
              onChange={(v) => void updateSettings({ defaultStampDutyPct: v ?? 6 })}
            />
            <NumberInput
              label="Woman buyer rate"
              suffix="%"
              value={settings.womanStampDutyPct}
              onChange={(v) => void updateSettings({ womanStampDutyPct: v ?? 5 })}
            />
            <NumberInput
              label="Labour cess"
              suffix="% of duty"
              value={settings.labourCessPctOfStampDuty}
              onChange={(v) => void updateSettings({ labourCessPctOfStampDuty: v ?? 20 })}
            />
            <NumberInput
              label="Registration"
              suffix="%"
              value={settings.defaultRegistrationPct}
              onChange={(v) => void updateSettings({ defaultRegistrationPct: v ?? 1 })}
            />
            <NumberInput
              label="Brokerage"
              suffix="%"
              value={settings.defaultBrokeragePct}
              onChange={(v) => void updateSettings({ defaultBrokeragePct: v ?? 1 })}
            />
          </div>
          <p className="tiny muted-3" style={{ marginTop: 10 }}>
            Rajasthan 2026: roughly 8.98% all-in for men or joint buyers, 7.65% for a sole female
            buyer. Confirm the current rates and the DLC circle rate at the sub-registrar office
            before you finalise.
          </p>
        </div>

        <Accordion icon="🏦" title="Loan assumptions">
          <div className="formgrid">
            <NumberInput
              label="Interest rate"
              suffix="% a year"
              step="0.1"
              value={settings.loanInterestPct}
              onChange={(v) => void updateSettings({ loanInterestPct: v ?? 8.5 })}
            />
            <NumberInput
              label="Tenure"
              suffix="years"
              value={settings.loanTenureYears}
              onChange={(v) => void updateSettings({ loanTenureYears: v ?? 20 })}
            />
            <NumberInput
              label="Loan share"
              suffix="% of cost"
              value={settings.loanToValuePct}
              onChange={(v) => void updateSettings({ loanToValuePct: v ?? 80 })}
            />
          </div>
        </Accordion>
      </Section>

      {/* -------------------------------------------------- storage */}
      <Section title="Storage on this phone">
        <div className="stats">
          <Stat label="Properties" value={properties.length} />
          <Stat label="Photos & videos" value={totalMedia} />
          {storage?.usedBytes !== undefined && (
            <Stat
              label="Space used"
              value={formatBytes(storage.usedBytes)}
              note={storage.quotaBytes ? `of ${formatBytes(storage.quotaBytes)}` : undefined}
              tone={storage.nearLimit ? 'bad' : undefined}
            />
          )}
        </div>

        {storage?.nearLimit && (
          <Note tone="bad" icon="⚠️">
            Storage is nearly full. Export a full backup now, then delete some videos — they take far
            more space than photos.
          </Note>
        )}

        {storage && !storage.persisted && (
          <Note tone="info" icon="💡">
            Install the app to your home screen (Share → Add to Home Screen on iPhone, or the
            install prompt on Android). Installed apps are much less likely to have their data
            cleared by the browser.
          </Note>
        )}
      </Section>

      {/* -------------------------------------------------- property list */}
      <Section title="Property list">
        <button
          type="button"
          className="btn btn--block"
          disabled={busy !== null}
          onClick={() => setConfirmReload(true)}
        >
          🔄 Reload the built-in property list
        </button>
        <p className="tiny muted-3">
          Re-reads the eight researched Jaipur projects. Safe to press at any time: it only fills
          blanks and refreshes the research briefing. Your photos, checklist answers, ratings, notes
          and prices are never overwritten.
        </p>
      </Section>

      {/* -------------------------------------------------- danger */}
      <Section title="Start over">
        <button
          type="button"
          className="btn btn--danger btn--block"
          disabled={busy !== null}
          onClick={() => setConfirmReset(true)}
        >
          Delete everything
        </button>
      </Section>

      <p className="tiny muted-3 center" style={{ marginTop: 8 }}>
        PropScout · works offline · no account, no tracking, nothing leaves this device
      </p>

      {confirmReload && (
        <ConfirmSheet
          title="Reload the property list?"
          body="Fills in any blank fields and refreshes the research briefing. Nothing you have entered is overwritten."
          confirmLabel="Reload"
          onCancel={() => setConfirmReload(false)}
          onConfirm={async () => {
            setConfirmReload(false);
            await run('seed', async () => {
              const r = await reloadSeed();
              show(`${r.added} added, ${r.updated} refreshed`);
            });
          }}
        />
      )}

      {confirmReset && (
        <ConfirmSheet
          title="Delete everything?"
          body="Every property, photo, video, note and rating on this device. This cannot be undone — export a backup first if you are not sure."
          confirmLabel="Delete it all"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            setConfirmReset(false);
            await run('reset', async () => {
              await wipeAll();
              await refresh();
              show('Everything deleted');
            });
          }}
        />
      )}
    </Screen>
  );
}
