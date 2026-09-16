import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../components/AppShell';
import { MediaPanel } from '../components/Media';
import { Chip, ConfirmSheet, Note, ScoreDial, Sheet, useToast } from '../components/ui';
import { categoriesFor, checksFor, type CategoryId } from '../data/checklists';
import { questionsFor } from '../data/questions';
import { CRITERIA, RATING_LABEL } from '../data/scoring';
import { saveCapture } from '../lib/media';
import { computeScore, summariseChecks } from '../lib/score';
import { useProperty, useStore } from '../lib/store';
import type { CheckState, Property } from '../types';
import { CheckRow } from './tabs/ChecklistTab';

type Step =
  | { kind: 'brief' }
  | { kind: 'category'; cat: CategoryId; label: string; icon: string; blurb: string }
  | { kind: 'questions' }
  | { kind: 'rate' }
  | { kind: 'done' };

export function VisitMode() {
  const { id } = useParams<{ id: string }>();
  const property = useProperty(id);
  const { patch, settings, refreshMediaCounts, mediaCounts } = useStore();
  const { show } = useToast();
  const navigate = useNavigate();
  const mediaCount = id ? (mediaCounts[id] ?? 0) : 0;

  const [index, setIndex] = useState(0);
  const [showMedia, setShowMedia] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const steps = useMemo<Step[]>(() => {
    if (!property) return [];
    const cats = categoriesFor(property.type);
    return [
      { kind: 'brief' },
      ...cats.map((c) => ({
        kind: 'category' as const,
        cat: c.id,
        label: c.label,
        icon: c.icon,
        blurb: c.blurb,
      })),
      { kind: 'questions' },
      { kind: 'rate' },
      { kind: 'done' },
    ];
  }, [property]);

  if (!property) {
    return (
      <Screen title="Not found" back="/">
        <Note tone="warn" icon="🤔">
          That property is not here.
        </Note>
      </Screen>
    );
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const atEnd = index >= steps.length - 1;

  const quickPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSaving(true);
    try {
      for (const file of Array.from(files)) {
        await saveCapture({
          propertyId: property.id,
          file,
          ...(step?.kind === 'category' ? { tag: step.label } : {}),
          photoMaxEdge: settings.photoMaxEdge,
        });
      }
      await refreshMediaCounts();
      show(files.length === 1 ? 'Photo saved' : `${files.length} photos saved`);
    } catch {
      show('Could not save that photo');
    } finally {
      setSaving(false);
    }
  };

  const setCheck = (checkId: string, state: CheckState | undefined, note?: string) => {
    const next = { ...property.checks };
    if (state === undefined && !note) delete next[checkId];
    else {
      const entry: { state: CheckState; note?: string } = { state: state ?? 'unchecked' };
      if (note) entry.note = note;
      next[checkId] = entry;
    }
    void patch(property.id, { checks: next });
  };

  return (
    <div className="visit">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => {
          void quickPhoto(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="visit__head">
        <div className="row">
          <button
            type="button"
            className="iconbtn"
            aria-label="Leave visit mode"
            onClick={() => setConfirmExit(true)}
          >
            ✕
          </button>
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {property.name}
            </div>
            <div className="tiny muted-3">
              Step {index + 1} of {steps.length}
              {step?.kind === 'category' ? ` · ${step.label}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="iconbtn"
            aria-label="Photos and voice notes"
            onClick={() => setShowMedia(true)}
          >
            🖼️
            {(mediaCount ?? 0) > 0 && (
              <span className="tab__badge tab__badge--muted" style={{ marginLeft: 0 }}>
                {mediaCount}
              </span>
            )}
          </button>
        </div>
        <div className="visit__progress" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`visit__pip${i < index ? ' visit__pip--done' : i === index ? ' visit__pip--now' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="visit__body">
        {step?.kind === 'brief' && <BriefStep property={property} />}

        {step?.kind === 'category' && (
          <>
            <div>
              <h2>
                <span aria-hidden="true">{step.icon}</span> {step.label}
              </h2>
              <p className="small muted" style={{ marginTop: 4 }}>
                {step.blurb}
              </p>
            </div>
            <CategoryStep
              property={property}
              cat={step.cat}
              essentialsOnly={settings.visitModeEssentialsOnly}
              onChange={setCheck}
            />
          </>
        )}

        {step?.kind === 'questions' && <QuestionsStep property={property} />}
        {step?.kind === 'rate' && <RateStep property={property} />}
        {step?.kind === 'done' && <DoneStep property={property} />}
      </div>

      <div className="visit__foot">
        <button
          type="button"
          className="btn btn--lg"
          disabled={saving}
          onClick={() => photoRef.current?.click()}
        >
          {saving ? '…' : '📷 Photo'}
        </button>
        {atEnd ? (
          <Link className="btn btn--primary btn--lg" to={`/p/${property.id}`}>
            Finish
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => {
              setIndex(index + 1);
              window.scrollTo({ top: 0 });
            }}
          >
            Next →
          </button>
        )}
      </div>

      {index > 0 && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ position: 'fixed', left: 8, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 26 }}
          onClick={() => {
            setIndex(index - 1);
            window.scrollTo({ top: 0 });
          }}
        >
          ‹ Back
        </button>
      )}

      {showMedia && (
        <Sheet title="Photos & notes" onClose={() => setShowMedia(false)}>
          <MediaPanel propertyId={property.id} />
        </Sheet>
      )}

      {confirmExit && (
        <ConfirmSheet
          title="Leave visit mode?"
          body="Everything you have entered is already saved."
          confirmLabel="Leave"
          onCancel={() => setConfirmExit(false)}
          onConfirm={() => navigate(`/p/${property.id}`)}
        />
      )}
    </div>
  );
}

function BriefStep({ property }: { property: Property }) {
  const b = property.brief;
  return (
    <div className="col" style={{ gap: 14 }}>
      <h2>Before you go in</h2>
      {b?.verdict && (
        <Note tone="accent" icon="🧭">
          {b.verdict}
        </Note>
      )}

      {b?.watchouts && b.watchouts.length > 0 && (
        <div className="card card--pad">
          <h3 style={{ marginBottom: 8 }}>Verify these here</h3>
          <ul className="bullets bullets--warn">
            {b.watchouts.map((w, i) => (
              <li key={i}>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {b?.walkAway && b.walkAway.length > 0 && (
        <Note tone="bad" icon="🛑">
          <strong>Walk away if:</strong>
          <ul className="bullets bullets--bad" style={{ marginTop: 6 }}>
            {b.walkAway.map((w, i) => (
              <li key={i}>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Note>
      )}

      {property.negotiation.walkAwayPrice !== undefined && (
        <Note tone="warn" icon="💰">
          Your walk-away price is written down. Do not move it today.
        </Note>
      )}

      {b?.scripts && b.scripts.length > 0 && (
        <div className="card card--pad">
          <h3 style={{ marginBottom: 8 }}>Lines to use</h3>
          <div className="col">
            {b.scripts.map((s, i) => (
              <p className="script" key={i}>
                {s}
              </p>
            ))}
          </div>
        </div>
      )}

      {!b && (
        <Note tone="info" icon="💡">
          Take a photo of every document, and of anything that looks wrong. Then work through the
          checklist. Tap Photo at any time — it tags the shot with whatever section you are on.
        </Note>
      )}
    </div>
  );
}

function CategoryStep({
  property,
  cat,
  essentialsOnly,
  onChange,
}: {
  property: Property;
  cat: CategoryId;
  essentialsOnly: boolean;
  onChange: (id: string, state: CheckState | undefined, note?: string) => void;
}) {
  const [showAll, setShowAll] = useState(!essentialsOnly);
  const all = checksFor(property.type).filter((c) => c.cat === cat);
  const items = showAll ? all : all.filter((c) => c.severity !== 'nice');
  const hidden = all.length - items.length;

  return (
    <div className="col">
      <div className="list">
        {items.map((item) => (
          <CheckRow
            key={item.id}
            item={item}
            property={property}
            onChange={(state, note) => onChange(item.id, state, note)}
          />
        ))}
      </div>
      {hidden > 0 && (
        <button type="button" className="btn btn--sm" onClick={() => setShowAll(true)}>
          Show {hidden} more optional check{hidden === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}

function QuestionsStep({ property }: { property: Property }) {
  const { patch } = useStore();
  const killers = questionsFor(property.type).filter((q) => q.killer);

  const save = (qid: string, value: string) => {
    const next = { ...property.answers };
    const trimmed = value.trim();
    if (trimmed) next[qid] = trimmed;
    else delete next[qid];
    void patch(property.id, { answers: next });
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <h2>Ask these</h2>
      <Note tone="accent" icon="🗣️">
        Get five minutes with a resident, without the broker. Ask what they wish they had known
        before moving in.
      </Note>
      <div className="list">
        {killers.map((q) => (
          <div className="check" key={q.id}>
            <span className="check__label">{q.q}</span>
            {q.listen && <p className="check__how">Listen for: {q.listen}</p>}
            <input
              className="input"
              placeholder="Their answer…"
              defaultValue={property.answers[q.id] ?? ''}
              onBlur={(e) => save(q.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <Link className="btn btn--sm" to={`/p/${property.id}`}>
        See all questions
      </Link>
    </div>
  );
}

function RateStep({ property }: { property: Property }) {
  const { patch } = useStore();
  const rate = (criterionId: string, value: number) => {
    const next = { ...property.scores };
    if (next[criterionId] === value) delete next[criterionId];
    else next[criterionId] = value;
    void patch(property.id, { scores: next });
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      <h2>Rate it now</h2>
      <Note tone="info" icon="💡">
        Do this before you leave the gate, while it is fresh. In a week they will all blur together.
      </Note>
      {CRITERIA.map((c) => {
        const value = property.scores[c.id];
        return (
          <div className="card card--pad" key={c.id}>
            <div className="row" style={{ marginBottom: 8, gap: 8 }}>
              <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>
                {c.icon}
              </span>
              <span className="grow" style={{ fontWeight: 620 }}>
                {c.label}
              </span>
              {value !== undefined && (
                <Chip tone={value >= 4 ? 'good' : value <= 2 ? 'bad' : 'warn'}>
                  {RATING_LABEL[value]}
                </Chip>
              )}
            </div>
            <div className="rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="ratebtn"
                  data-low={n <= 2}
                  aria-pressed={value === n}
                  aria-label={`${c.label}: ${RATING_LABEL[n]}`}
                  onClick={() => rate(c.id, n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DoneStep({ property }: { property: Property }) {
  const { patch, mediaCounts } = useStore();
  const score = computeScore(property);
  const checks = summariseChecks(property);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="center" style={{ padding: '12px 0' }}>
        <ScoreDial value={score.overall} unrated={score.ratedCount === 0} size={90} />
        <h2 style={{ marginTop: 10 }}>Visit recorded</h2>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat__label">Checked</div>
          <div className="stat__value">
            {checks.ok + checks.issues + checks.na}/{checks.total}
          </div>
        </div>
        <div className={`stat${checks.issues > 0 ? ' stat--bad' : ' stat--good'}`}>
          <div className="stat__label">Problems</div>
          <div className="stat__value">{checks.issues}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Photos</div>
          <div className="stat__value">{mediaCounts[property.id] ?? 0}</div>
        </div>
      </div>

      {checks.criticalUnchecked > 0 && (
        <Note tone="warn" icon="⚠️">
          {checks.criticalUnchecked} must-check item{checks.criticalUnchecked === 1 ? '' : 's'} still
          unanswered. Go back now if you are still on site — it is much harder later.
        </Note>
      )}

      <div className="card card--pad">
        <h3 style={{ marginBottom: 10 }}>What do you think?</h3>
        <div className="col" style={{ gap: 9 }}>
          <button
            type="button"
            className="btn btn--lg"
            style={
              property.status === 'shortlisted'
                ? { background: 'var(--good)', borderColor: 'var(--good)', color: '#fff' }
                : undefined
            }
            onClick={() => void patch(property.id, { status: 'shortlisted' })}
          >
            👍 Shortlist it
          </button>
          <button
            type="button"
            className="btn btn--lg"
            style={
              property.status === 'visited'
                ? { background: 'var(--info)', borderColor: 'var(--info)', color: '#fff' }
                : undefined
            }
            onClick={() => void patch(property.id, { status: 'visited' })}
          >
            🤔 Undecided
          </button>
          <button
            type="button"
            className="btn btn--lg btn--danger"
            onClick={() => void patch(property.id, { status: 'rejected' })}
          >
            👎 Rule it out
          </button>
        </div>
      </div>

      <Note tone="info" icon="💡">
        Add your pros and cons on the Verdict tab while it is fresh, and record a voice note in the
        car if typing is awkward.
      </Note>
    </div>
  );
}
