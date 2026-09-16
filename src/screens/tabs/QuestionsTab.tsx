import { useMemo, useState } from 'react';
import { Accordion, Chip, ChipToggle, Note, Section } from '../../components/ui';
import { groupsFor, questionsFor, type Question } from '../../data/questions';
import { useStore } from '../../lib/store';
import type { Property } from '../../types';

type Scope = 'key' | 'all' | 'todo';

const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: 'key', label: 'The key ones' },
  { value: 'all', label: 'All questions' },
  { value: 'todo', label: 'Unanswered' },
];

function QuestionRow({
  q,
  answer,
  onSave,
}: {
  q: Question;
  answer: string;
  onSave: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasAnswer = answer.trim().length > 0;

  return (
    <div className={`check${hasAnswer ? ' check--ok' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
        <span className="check__label grow">{q.q}</span>
        {q.killer && <Chip tone="accent">Key</Chip>}
      </div>

      {(q.why || q.listen) && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide why' : 'Why ask this?'}
        </button>
      )}

      {open && (
        <>
          {q.why && <p className="check__why">{q.why}</p>}
          {q.listen && <p className="check__how">Listen for: {q.listen}</p>}
        </>
      )}

      <input
        className="input"
        placeholder="Their answer…"
        defaultValue={answer}
        onBlur={(e) => {
          if (e.target.value !== answer) onSave(e.target.value);
        }}
      />
    </div>
  );
}

export function QuestionsTab({ property }: { property: Property }) {
  const { patch } = useStore();
  const [scope, setScope] = useState<Scope>('key');

  const all = useMemo(() => questionsFor(property.type), [property.type]);
  const groups = useMemo(() => groupsFor(property.type), [property.type]);

  const answered = all.filter((q) => (property.answers[q.id] ?? '').trim().length > 0).length;
  const killersAnswered = all.filter(
    (q) => q.killer && (property.answers[q.id] ?? '').trim().length > 0,
  ).length;
  const killerTotal = all.filter((q) => q.killer).length;

  const save = (id: string, value: string) => {
    const next = { ...property.answers };
    const trimmed = value.trim();
    if (trimmed) next[id] = trimmed;
    else delete next[id];
    void patch(property.id, { answers: next });
  };

  const inScope = (q: Question): boolean => {
    const has = (property.answers[q.id] ?? '').trim().length > 0;
    switch (scope) {
      case 'key':
        return Boolean(q.killer);
      case 'todo':
        return !has;
      case 'all':
        return true;
    }
  };

  const visible = all.filter(inScope);

  return (
    <div className="col" style={{ gap: 14 }}>
      <Note tone="accent" icon="🗣️">
        <strong>The single most useful thing you can do</strong> is get five minutes with a resident,
        without the broker present. Ask them what they wish they had known before moving in.
      </Note>

      <div className="row row--wrap">
        <Chip tone={killersAnswered === killerTotal ? 'good' : 'warn'}>
          {killersAnswered}/{killerTotal} key questions answered
        </Chip>
        <Chip>
          {answered}/{all.length} total
        </Chip>
      </div>

      <ChipToggle options={SCOPES} value={scope} onChange={setScope} />

      {visible.length === 0 ? (
        <Note tone="good" icon="✅">
          Every question in this view has an answer recorded.
        </Note>
      ) : (
        <Section>
          {groups.map((group) => {
            const items = visible.filter((q) => q.group === group.id);
            if (items.length === 0) return null;
            const done = items.filter(
              (q) => (property.answers[q.id] ?? '').trim().length > 0,
            ).length;

            return (
              <Accordion
                key={group.id}
                icon={group.icon}
                title={group.label}
                subtitle={group.askWho}
                padded={false}
                right={
                  <Chip tone={done === items.length ? 'good' : undefined}>
                    {done}/{items.length}
                  </Chip>
                }
              >
                <div>
                  <p className="small muted" style={{ padding: '12px 14px 0' }}>
                    {group.blurb}
                  </p>
                  {items.map((q) => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      answer={property.answers[q.id] ?? ''}
                      onSave={(v) => save(q.id, v)}
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
