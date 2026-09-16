import { useMemo } from 'react';
import {
  Accordion,
  Chip,
  ListEditor,
  Note,
  ScoreDial,
  Section,
  Select,
  Stat,
  TextArea,
} from '../../components/ui';
import { AMENITIES, AMENITY_GROUPS, WEIGHT_CLASS_LABEL } from '../../data/amenities';
import { CRITERIA, RATING_LABEL } from '../../data/scoring';
import { useStore } from '../../lib/store';
import { BAND_LABEL, computeScore, criticalIssueLabels, summariseAmenities } from '../../lib/score';
import { STATUS_LABEL, STATUS_ORDER, type Property, type PropertyStatus } from '../../types';

export function VerdictTab({ property }: { property: Property }) {
  const { patch } = useStore();
  const p = property;

  const score = useMemo(() => computeScore(p), [p]);
  const amenities = useMemo(() => summariseAmenities(p), [p]);
  const problems = useMemo(() => criticalIssueLabels(p), [p]);

  const rate = (criterionId: string, value: number) => {
    const next = { ...p.scores };
    if (next[criterionId] === value) delete next[criterionId];
    else next[criterionId] = value;
    void patch(p.id, { scores: next });
  };

  const toggleAmenity = (id: string) => {
    const has = p.amenities.includes(id);
    void patch(p.id, {
      amenities: has ? p.amenities.filter((x) => x !== id) : [...p.amenities, id],
    });
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <Section title="Where it stands">
        <div className="card card--pad">
          <div className="row" style={{ gap: 16 }}>
            <ScoreDial value={score.overall} unrated={score.ratedCount === 0} size={76} />
            <div className="grow">
              <h3>{BAND_LABEL[score.band]}</h3>
              <p className="small muted">
                {score.ratedCount === 0
                  ? 'Rate the categories below to get a score you can compare against the others.'
                  : `Based on ${score.ratedCount} of ${score.totalCount} categories rated.`}
              </p>
              {score.confidence > 0 && score.confidence < 0.6 && (
                <Chip tone="warn">Provisional — rate more categories</Chip>
              )}
            </div>
          </div>

          {(score.strengths.length > 0 || score.weaknesses.length > 0) && (
            <div className="col" style={{ marginTop: 14, gap: 6 }}>
              {score.strengths.length > 0 && (
                <p className="small">
                  <strong style={{ color: 'var(--good)' }}>Strong on:</strong>{' '}
                  {score.strengths.join(', ')}
                </p>
              )}
              {score.weaknesses.length > 0 && (
                <p className="small">
                  <strong style={{ color: 'var(--bad)' }}>Weak on:</strong>{' '}
                  {score.weaknesses.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        <Select<PropertyStatus>
          label="Decision"
          value={p.status}
          onChange={(v) => void patch(p.id, { status: v })}
          options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          full
        />
      </Section>

      {problems.length > 0 && (
        <Note tone="bad" icon="🛑">
          <strong>Serious problems you recorded:</strong>
          <ul className="bullets bullets--bad" style={{ marginTop: 6 }}>
            {problems.map((label) => (
              <li key={label}>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </Note>
      )}

      <Section title="Rate it">
        <p className="small muted">
          One tap each. Rate honestly and consistently, because this is what lets you compare eight
          properties fairly a week later, when they have all blurred together.
        </p>
        {CRITERIA.map((c) => {
          const value = p.scores[c.id];
          return (
            <div className="card card--pad" key={c.id}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>
                  {c.icon}
                </span>
                <span className="grow" style={{ fontWeight: 620 }}>
                  {c.label}
                </span>
                {value !== undefined && <Chip tone={value >= 4 ? 'good' : value <= 2 ? 'bad' : 'warn'}>{RATING_LABEL[value]}</Chip>}
              </div>
              <p className="tiny muted-3" style={{ marginBottom: 9 }}>
                {c.hint}
              </p>
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
              <div className="row row--between tiny muted-3" style={{ marginTop: 6 }}>
                <span>{c.low}</span>
              </div>
              <div className="row row--between tiny muted-3">
                <span style={{ marginLeft: 'auto', textAlign: 'right' }}>{c.high}</span>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Good and bad">
        <div className="card card--pad">
          <div className="formgrid formgrid--full">
            <ListEditor
              label="What you liked"
              items={p.pros}
              onChange={(pros) => void patch(p.id, { pros })}
              placeholder="Add something good…"
              tone="good"
            />
            <ListEditor
              label="What worried you"
              items={p.cons}
              onChange={(cons) => void patch(p.id, { cons })}
              placeholder="Add a concern…"
              tone="bad"
            />
          </div>
        </div>
      </Section>

      <Section title="Amenities">
        <div className="stats">
          <Stat label="Total" value={amenities.total} />
          <Stat label="Genuinely useful" value={amenities.core + amenities.useful} tone="good" />
          {amenities.brochure > 0 && (
            <Stat label="Brochure filler" value={amenities.brochure} tone="warn" />
          )}
        </div>

        {amenities.missingCore.length > 0 && (
          <Note tone="warn" icon="⚠️">
            <strong>Missing things that change daily life:</strong>{' '}
            {amenities.missingCore.slice(0, 6).join(', ')}
            {amenities.missingCore.length > 6 ? `, and ${amenities.missingCore.length - 6} more` : ''}.
            Tick anything below that the property actually has.
          </Note>
        )}

        {AMENITY_GROUPS.map((group) => {
          const items = AMENITIES.filter((a) => a.group === group.id);
          const on = items.filter((a) => p.amenities.includes(a.id)).length;
          return (
            <Accordion
              key={group.id}
              icon={group.icon}
              title={group.label}
              right={<Chip tone={on > 0 ? 'good' : undefined}>{on}/{items.length}</Chip>}
            >
              <div className="col" style={{ gap: 8 }}>
                {items.map((a) => {
                  const has = p.amenities.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="listrow"
                      style={{ borderBottom: 'none', padding: '8px 0' }}
                      aria-pressed={has}
                      onClick={() => toggleAmenity(a.id)}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          flex: 'none',
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          display: 'grid',
                          placeItems: 'center',
                          background: has ? 'var(--good)' : 'var(--surface-2)',
                          border: `1.5px solid ${has ? 'var(--good)' : 'var(--line-strong)'}`,
                          color: '#fff',
                          fontSize: '0.8rem',
                        }}
                      >
                        {has ? '✓' : ''}
                      </span>
                      <span className="listrow__main">
                        <span className="listrow__title">{a.label}</span>
                        <span className="listrow__sub">
                          {WEIGHT_CLASS_LABEL[a.weightClass]}
                          {a.note ? ` · ${a.note}` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Accordion>
          );
        })}

        {p.tags && p.tags.length > 0 && (
          <div className="card card--pad">
            <h4 style={{ marginBottom: 8 }}>Other features noted</h4>
            <div className="pills">
              {p.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Notes">
        <div className="card card--pad">
          <TextArea
            label="Anything else"
            placeholder="Write freely. What did it feel like? Who did you meet? What do you want to remember?"
            rows={7}
            value={p.notes ?? ''}
            onChange={(notes) => void patch(p.id, { notes })}
          />
          <TextArea
            label="Negotiation notes"
            placeholder="What numbers were discussed, what they said, what you promised to revert on…"
            rows={4}
            value={p.negotiation.notes ?? ''}
            onChange={(notes) =>
              void patch(p.id, { negotiation: { ...p.negotiation, notes } })
            }
          />
        </div>
      </Section>
    </div>
  );
}
