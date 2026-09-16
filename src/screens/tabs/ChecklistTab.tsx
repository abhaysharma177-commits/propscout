import { useMemo, useState } from 'react';
import { Accordion, Bar, Chip, ChipToggle, Note, Section } from '../../components/ui';
import { categoriesFor, checksFor, type CheckItem, type Severity } from '../../data/checklists';
import { useStore } from '../../lib/store';
import { summariseChecks } from '../../lib/score';
import type { CheckState, Property } from '../../types';

const STATES: Array<{ value: CheckState; label: string }> = [
  { value: 'ok', label: 'Fine' },
  { value: 'issue', label: 'Problem' },
  { value: 'na', label: 'N/A' },
];

type Scope = 'must' | 'all' | 'todo' | 'problems';

const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: 'must', label: 'Must check' },
  { value: 'all', label: 'Everything' },
  { value: 'todo', label: 'Not done' },
  { value: 'problems', label: 'Problems' },
];

const SEVERITY_TONE: Record<Severity, 'bad' | 'warn' | undefined> = {
  critical: 'bad',
  important: 'warn',
  nice: undefined,
};

export function CheckRow({
  item,
  property,
  onChange,
}: {
  item: CheckItem;
  property: Property;
  onChange: (state: CheckState | undefined, note?: string) => void;
}) {
  const result = property.checks[item.id];
  const state = result?.state ?? 'unchecked';
  const [noteOpen, setNoteOpen] = useState(Boolean(result?.note));

  return (
    <div className={`check${state !== 'unchecked' ? ` check--${state}` : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
        <span className="check__label grow">{item.label}</span>
        {item.severity !== 'nice' && (
          <Chip tone={SEVERITY_TONE[item.severity]}>
            {item.severity === 'critical' ? 'Must' : 'Should'}
          </Chip>
        )}
      </div>

      {item.why && <p className="check__why">{item.why}</p>}
      {item.how && <p className="check__how">How: {item.how}</p>}

      <div className="states">
        {STATES.map((s) => (
          <button
            key={s.value}
            type="button"
            className="statebtn"
            data-state={s.value}
            aria-pressed={state === s.value}
            onClick={() => onChange(state === s.value ? undefined : s.value, result?.note)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {noteOpen || result?.note ? (
        <input
          className="input"
          placeholder="What did you find?"
          defaultValue={result?.note ?? ''}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next !== (result?.note ?? '')) onChange(result?.state, next);
          }}
        />
      ) : (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setNoteOpen(true)}
        >
          + Add a note
        </button>
      )}
    </div>
  );
}

export function ChecklistTab({ property }: { property: Property }) {
  const { patch } = useStore();
  const [scope, setScope] = useState<Scope>('must');

  const summary = useMemo(() => summariseChecks(property), [property]);
  const categories = useMemo(() => categoriesFor(property.type), [property.type]);
  const all = useMemo(() => checksFor(property.type), [property.type]);

  const setCheck = (id: string, state: CheckState | undefined, note?: string) => {
    const next = { ...property.checks };
    if (state === undefined && !note) {
      delete next[id];
    } else {
      const entry: { state: CheckState; note?: string } = { state: state ?? 'unchecked' };
      if (note) entry.note = note;
      next[id] = entry;
    }
    void patch(property.id, { checks: next });
  };

  const inScope = (item: CheckItem): boolean => {
    const state = property.checks[item.id]?.state ?? 'unchecked';
    switch (scope) {
      case 'must':
        return item.severity === 'critical' || item.severity === 'important';
      case 'todo':
        return state === 'unchecked';
      case 'problems':
        return state === 'issue';
      case 'all':
        return true;
    }
  };

  const visible = all.filter(inScope);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card card--pad">
        <div className="row row--between" style={{ marginBottom: 8 }}>
          <span className="small muted">
            {summary.ok + summary.issues + summary.na} of {summary.total} looked at
          </span>
          <strong>{Math.round(summary.progress * 100)}%</strong>
        </div>
        <Bar
          value={summary.progress}
          tone={summary.criticalUnchecked === 0 ? 'good' : 'warn'}
          label="Checklist progress"
        />
        <div className="row row--wrap" style={{ marginTop: 11 }}>
          <Chip tone="good">{summary.ok} fine</Chip>
          {summary.issues > 0 && <Chip tone="bad">{summary.issues} problems</Chip>}
          {summary.criticalUnchecked > 0 && (
            <Chip tone="warn">{summary.criticalUnchecked} must-checks left</Chip>
          )}
        </div>
      </div>

      {summary.criticalIssues > 0 && (
        <Note tone="bad" icon="🛑">
          <strong>
            {summary.criticalIssues} serious problem{summary.criticalIssues === 1 ? '' : 's'} found.
          </strong>{' '}
          Photograph each one — documented defects are the strongest thing you can bring to a price
          conversation.
        </Note>
      )}

      <ChipToggle options={SCOPES} value={scope} onChange={setScope} />

      {visible.length === 0 ? (
        <Note tone="good" icon="✅">
          {scope === 'problems'
            ? 'No problems recorded here yet.'
            : scope === 'todo'
              ? 'Everything applicable has been looked at.'
              : 'Nothing in this view.'}
        </Note>
      ) : (
        <Section>
          {categories.map((cat) => {
            const items = visible.filter((c) => c.cat === cat.id);
            if (items.length === 0) return null;
            const done = items.filter(
              (c) => (property.checks[c.id]?.state ?? 'unchecked') !== 'unchecked',
            ).length;
            const problems = items.filter((c) => property.checks[c.id]?.state === 'issue').length;

            return (
              <Accordion
                key={cat.id}
                icon={cat.icon}
                title={cat.label}
                subtitle={cat.blurb}
                padded={false}
                defaultOpen={false}
                right={
                  problems > 0 ? (
                    <Chip tone="bad">{problems}</Chip>
                  ) : (
                    <Chip tone={done === items.length ? 'good' : undefined}>
                      {done}/{items.length}
                    </Chip>
                  )
                }
              >
                <div>
                  {items.map((item) => (
                    <CheckRow
                      key={item.id}
                      item={item}
                      property={property}
                      onChange={(state, note) => setCheck(item.id, state, note)}
                    />
                  ))}
                </div>
              </Accordion>
            );
          })}
        </Section>
      )}
    </div>
  );
}
