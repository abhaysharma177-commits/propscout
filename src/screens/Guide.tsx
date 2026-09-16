import { useState } from 'react';
import { Screen } from '../components/AppShell';
import { Accordion, Chip, ChipToggle, Note, Section } from '../components/ui';
import { GLOSSARY, NEGOTIATION_PLAYBOOK, RED_FLAGS } from '../data/guide';
import {
  HEADLINES,
  KB_COMPILED,
  KB_WEAKNESSES,
  MARKET_FRAME,
  MICRO_MARKETS,
  PLAY_OFFS,
  UNIVERSAL_SCRIPTS,
} from '../data/market';

type Tab = 'market' | 'negotiate' | 'flags' | 'words';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'market', label: 'The market' },
  { value: 'negotiate', label: 'Negotiating' },
  { value: 'flags', label: 'Red flags' },
  { value: 'words', label: 'Jargon' },
];

export function Guide() {
  const [tab, setTab] = useState<Tab>('market');

  return (
    <Screen title="Guide" subtitle={`Research compiled ${KB_COMPILED}`}>
      <ChipToggle options={TABS} value={tab} onChange={setTab} />

      {tab === 'market' && (
        <>
          <Section title="The three things that matter">
            <div className="card card--pad">
              <ul className="bullets">
                {HEADLINES.map((h, i) => (
                  <li key={i}>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="The market frame">
            {MARKET_FRAME.map((f) => (
              <Note key={f.id} tone={f.tone === 'good' ? 'good' : f.tone === 'warn' ? 'warn' : 'info'} icon={f.tone === 'warn' ? '⚠️' : '✓'}>
                <strong>{f.label}</strong>
                <p className="small" style={{ marginTop: 5 }}>
                  {f.detail}
                </p>
              </Note>
            ))}
          </Section>

          <Section title="Localities">
            {MICRO_MARKETS.map((m) => (
              <Accordion
                key={m.id}
                icon="📍"
                title={m.label}
                subtitle={`₹${m.ratePerSqft.toLocaleString('en-IN')}/sqft average`}
                right={<Chip>{m.properties.length}</Chip>}
              >
                <p className="small">{m.trend}</p>

                {m.properties.length > 0 && (
                  <>
                    <h4 style={{ margin: '14px 0 6px' }}>Your properties here</h4>
                    <div className="pills">
                      {m.properties.map((p) => (
                        <Chip key={p} tone="accent">
                          {p}
                        </Chip>
                      ))}
                    </div>
                  </>
                )}

                {m.confirmed.length > 0 && (
                  <>
                    <h4 style={{ margin: '14px 0 6px' }}>Confirmed infrastructure</h4>
                    <ul className="bullets bullets--good">
                      {m.confirmed.map((c) => (
                        <li key={c}>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {m.proposed.length > 0 && (
                  <>
                    <h4 style={{ margin: '14px 0 6px' }}>Only proposed — do not pay for it</h4>
                    <ul className="bullets bullets--warn">
                      {m.proposed.map((c) => (
                        <li key={c}>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Note tone="warn" icon="⚠️">
                  {m.downside}
                </Note>
              </Accordion>
            ))}
          </Section>

          <Section title="Where this research is weakest">
            <Note tone="warn" icon="🔍">
              <p className="small">
                Read this before you rely on any of it. Portal data lags the market by 1-3 months and
                the sources frequently conflict — these conflicts are flagged, not resolved.
              </p>
            </Note>
            <div className="card card--pad">
              <ul className="bullets bullets--warn">
                {KB_WEAKNESSES.map((w, i) => (
                  <li key={i}>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        </>
      )}

      {tab === 'negotiate' && (
        <>
          <Section title="How to negotiate">
            {NEGOTIATION_PLAYBOOK.map((step) => (
              <Accordion key={step.id} icon="→" title={step.title} defaultOpen={false}>
                <p className="small">{step.body}</p>
              </Accordion>
            ))}
          </Section>

          <Section title="Lines that work anywhere">
            <p className="small muted">
              These are grounded in real market data. Use them verbatim.
            </p>
            <div className="card card--pad">
              <div className="col">
                {UNIVERSAL_SCRIPTS.map((s, i) => (
                  <p className="script" key={i}>
                    {s}
                  </p>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Play them against each other">
            {PLAY_OFFS.map((po) => (
              <div className="card card--pad" key={po.id}>
                <h4 style={{ marginBottom: 6 }}>{po.label}</h4>
                <p className="small muted">{po.detail}</p>
              </div>
            ))}
          </Section>
        </>
      )}

      {tab === 'flags' && (
        <>
          <Section title="Walk away">
            <p className="small muted">
              Do not proceed on any of these without a property lawyer looking at the papers first.
            </p>
            {RED_FLAGS.filter((f) => f.level === 'walkaway').map((f) => (
              <div className="card card--pad" key={f.id}>
                <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
                    🛑
                  </span>
                  <div className="grow">
                    <strong>{f.label}</strong>
                    <p className="small muted" style={{ marginTop: 5 }}>
                      {f.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <Section title="Price it in hard">
            {RED_FLAGS.filter((f) => f.level === 'serious').map((f) => (
              <div className="card card--pad" key={f.id}>
                <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
                    ⚠️
                  </span>
                  <div className="grow">
                    <strong>{f.label}</strong>
                    <p className="small muted" style={{ marginTop: 5 }}>
                      {f.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <Note tone="bad" icon="📋">
            <strong>Never sign without seeing:</strong> the RERA certificate, the JDA-sanctioned
            layout, land-use conversion (patta / khasra), the OC and CC for a ready unit, and written
            proof of the parking allotment.
          </Note>
        </>
      )}

      {tab === 'words' && (
        <Section title="What the words mean">
          <p className="small muted">
            Plain explanations of the terms brokers use. Worth reading once before the first visit.
          </p>
          {GLOSSARY.map((g) => (
            <div className="card card--pad" key={g.term}>
              <strong>{g.term}</strong>
              <p className="small muted" style={{ marginTop: 5 }}>
                {g.meaning}
              </p>
            </div>
          ))}
        </Section>
      )}
    </Screen>
  );
}
