import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../components/AppShell';
import { Chip, EmptyState, Note, Section } from '../components/ui';
import { computeCosts, formatCompact, loadingPct, perSqft } from '../lib/money';
import { chargeableSqft, estimateNegotiation } from '../lib/negotiate';
import { computeScore, criticalIssueLabels, summariseChecks } from '../lib/score';
import { effectiveStampDutyPct, useStore } from '../lib/store';
import { STATUS_LABEL, type Property } from '../types';

type Dir = 'high' | 'low' | 'none';

interface Row {
  label: string;
  dir: Dir;
  /** Sortable value, or undefined when not applicable. */
  num: (p: Property, ctx: Ctx) => number | undefined;
  text: (p: Property, ctx: Ctx) => string;
}

interface Ctx {
  stampPct: number;
  registrationPct: number;
  cessPct: number;
  mediaCounts: Record<string, number>;
}

function allIn(p: Property, ctx: Ctx): number | undefined {
  const base = p.costs.lastQuote ?? p.costs.askingPrice;
  if (base === undefined) return undefined;
  return computeCosts({
    ...p.costs,
    askingPrice: base,
    stampDutyPct: p.costs.stampDutyPct ?? ctx.stampPct,
    registrationPct: p.costs.registrationPct ?? ctx.registrationPct,
    labourCessPctOfStampDuty: ctx.cessPct,
  }).grandTotal;
}

const ROWS: Row[] = [
  {
    label: 'My score /100',
    dir: 'high',
    num: (p) => (computeScore(p).ratedCount > 0 ? computeScore(p).overall : undefined),
    text: (p) => {
      const s = computeScore(p);
      return s.ratedCount === 0 ? 'Not rated' : String(Math.round(s.overall));
    },
  },
  {
    label: 'Decision',
    dir: 'none',
    num: () => undefined,
    text: (p) => STATUS_LABEL[p.status],
  },
  {
    label: 'Asking price',
    dir: 'low',
    num: (p) => p.costs.lastQuote ?? p.costs.askingPrice,
    text: (p) => formatCompact(p.costs.lastQuote ?? p.costs.askingPrice),
  },
  {
    label: 'All-in cost',
    dir: 'low',
    num: (p, c) => allIn(p, c),
    text: (p, c) => formatCompact(allIn(p, c)),
  },
  {
    label: 'Aim to pay',
    dir: 'low',
    num: (p) => p.negotiation.targetPrice ?? estimateNegotiation(p).suggestedTarget,
    text: (p) => formatCompact(p.negotiation.targetPrice ?? estimateNegotiation(p).suggestedTarget),
  },
  {
    label: 'Rate / sqft',
    dir: 'low',
    num: (p) => estimateNegotiation(p).askRatePerSqft,
    text: (p) => {
      const r = estimateNegotiation(p).askRatePerSqft;
      return r ? `₹${Math.round(r).toLocaleString('en-IN')}` : '—';
    },
  },
  {
    label: 'Rate on carpet',
    dir: 'low',
    num: (p) => perSqft(p.costs.lastQuote ?? p.costs.askingPrice, p.carpetSqft),
    text: (p) => {
      const r = perSqft(p.costs.lastQuote ?? p.costs.askingPrice, p.carpetSqft);
      return r ? `₹${Math.round(r).toLocaleString('en-IN')}` : '—';
    },
  },
  {
    label: 'Against market',
    dir: 'low',
    num: (p) => estimateNegotiation(p).marketPremiumPct,
    text: (p) => {
      const v = estimateNegotiation(p).marketPremiumPct;
      return v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(0)}%`;
    },
  },
  {
    label: 'Area (quoted)',
    dir: 'high',
    num: (p) => chargeableSqft(p),
    text: (p) => {
      const a = chargeableSqft(p);
      return a ? `${Math.round(a).toLocaleString('en-IN')} sqft` : '—';
    },
  },
  {
    label: 'Carpet area',
    dir: 'high',
    num: (p) => p.carpetSqft,
    text: (p) => (p.carpetSqft ? `${p.carpetSqft.toLocaleString('en-IN')} sqft` : '—'),
  },
  {
    label: 'Loading',
    dir: 'low',
    num: (p) => loadingPct(p.superBuiltUpSqft, p.carpetSqft) ?? p.brief?.loadingPct,
    text: (p) => {
      const v = loadingPct(p.superBuiltUpSqft, p.carpetSqft) ?? p.brief?.loadingPct;
      return v === undefined ? '—' : `${v.toFixed(0)}%`;
    },
  },
  {
    label: 'Negotiation room',
    dir: 'high',
    num: (p) => (p.costs.askingPrice ? estimateNegotiation(p).roomPct : undefined),
    text: (p) => {
      if (!p.costs.askingPrice) return '—';
      const n = estimateNegotiation(p);
      return `${n.roomLowPct.toFixed(0)}–${n.roomHighPct.toFixed(0)}%`;
    },
  },
  {
    label: 'Possession',
    dir: 'none',
    num: () => undefined,
    text: (p) => p.possession ?? '—',
  },
  {
    label: 'GST',
    dir: 'low',
    num: (p) => p.costs.gstPct ?? p.brief?.gstPct,
    text: (p) => {
      const v = p.costs.gstPct ?? p.brief?.gstPct;
      return v === undefined ? '—' : v === 0 ? 'Nil' : `${v}%`;
    },
  },
  {
    label: 'Monthly maintenance',
    dir: 'low',
    num: (p) => p.costs.monthlyMaintenance,
    text: (p) => formatCompact(p.costs.monthlyMaintenance),
  },
  {
    label: 'Serious problems',
    dir: 'low',
    num: (p) => summariseChecks(p).criticalIssues,
    text: (p) => String(summariseChecks(p).criticalIssues),
  },
  {
    label: 'Checked',
    dir: 'high',
    num: (p) => summariseChecks(p).progress,
    text: (p) => `${Math.round(summariseChecks(p).progress * 100)}%`,
  },
  {
    label: 'Photos & notes',
    dir: 'high',
    num: (p, c) => c.mediaCounts[p.id] ?? 0,
    text: (p, c) => String(c.mediaCounts[p.id] ?? 0),
  },
  {
    label: 'Research rank',
    dir: 'low',
    num: (p) => p.brief?.rank,
    text: (p) => (p.brief?.rank === undefined ? '—' : `#${p.brief.rank}`),
  },
];

export function Compare() {
  const { properties, mediaCounts, settings, ready } = useStore();
  const [includeRejected, setIncludeRejected] = useState(false);

  const ctx: Ctx = {
    stampPct: effectiveStampDutyPct(settings),
    registrationPct: settings.defaultRegistrationPct,
    cessPct: settings.labourCessPctOfStampDuty,
    mediaCounts,
  };

  const shown = useMemo(
    () =>
      properties
        .filter((p) => !p.archived)
        .filter((p) => includeRejected || p.status !== 'rejected')
        .sort((a, b) => {
          const sa = computeScore(a);
          const sb = computeScore(b);
          if (sa.ratedCount > 0 || sb.ratedCount > 0) return sb.overall - sa.overall;
          return (a.brief?.rank ?? 99) - (b.brief?.rank ?? 99);
        }),
    [properties, includeRejected],
  );

  const problems = useMemo(
    () =>
      shown
        .map((p) => ({ name: p.name, id: p.id, labels: criticalIssueLabels(p) }))
        .filter((x) => x.labels.length > 0),
    [shown],
  );

  if (!ready) {
    return (
      <Screen title="Compare">
        <div className="empty">
          <div className="spinner" />
        </div>
      </Screen>
    );
  }

  if (shown.length === 0) {
    return (
      <Screen title="Compare">
        <EmptyState
          icon="⚖️"
          title="Nothing to compare yet"
          body="Add a couple of properties and enter their prices and sizes."
          action={
            <Link className="btn btn--primary" to="/new">
              Add a property
            </Link>
          }
        />
      </Screen>
    );
  }

  const rejectedCount = properties.filter((p) => p.status === 'rejected' && !p.archived).length;

  return (
    <Screen title="Compare" subtitle={`${shown.length} properties side by side`}>
      <Note tone="info" icon="👉">
        Scroll the table sideways. Green is the best value in each row. Compare on{' '}
        <strong>carpet rate</strong> and <strong>all-in cost</strong>, not the headline price.
      </Note>

      {rejectedCount > 0 && (
        <button
          type="button"
          className="btn btn--sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setIncludeRejected(!includeRejected)}
        >
          {includeRejected ? 'Hide' : 'Show'} {rejectedCount} ruled out
        </button>
      )}

      <div className="cmpwrap">
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col">Property</th>
              {shown.map((p) => (
                <th key={p.id} scope="col">
                  <Link to={`/p/${p.id}`} style={{ color: 'var(--accent)' }}>
                    {p.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const values = shown.map((p) => row.num(p, ctx));
              const defined = values.filter((v): v is number => v !== undefined);
              let best: number | undefined;
              let worst: number | undefined;
              if (row.dir !== 'none' && defined.length > 1) {
                best = row.dir === 'high' ? Math.max(...defined) : Math.min(...defined);
                worst = row.dir === 'high' ? Math.min(...defined) : Math.max(...defined);
                if (best === worst) {
                  best = undefined;
                  worst = undefined;
                }
              }
              return (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {shown.map((p, i) => {
                    const v = values[i];
                    const cls =
                      v !== undefined && best !== undefined && v === best
                        ? 'best'
                        : v !== undefined && worst !== undefined && v === worst
                          ? 'worst'
                          : undefined;
                    return (
                      <td key={p.id} className={cls}>
                        {row.text(p, ctx)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {problems.length > 0 && (
        <Section title="Serious problems found">
          {problems.map((x) => (
            <div className="card card--pad" key={x.id}>
              <Link to={`/p/${x.id}`} style={{ fontWeight: 650 }}>
                {x.name}
              </Link>
              <ul className="bullets bullets--bad" style={{ marginTop: 8 }}>
                {x.labels.map((label) => (
                  <li key={label}>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      <Section title="Where each one wins">
        {shown.map((p) => {
          const s = computeScore(p);
          if (s.ratedCount === 0) return null;
          return (
            <div className="card card--pad" key={p.id}>
              <div className="row row--between" style={{ marginBottom: 6 }}>
                <Link to={`/p/${p.id}`} style={{ fontWeight: 650 }}>
                  {p.name}
                </Link>
                <Chip tone={s.overall >= 70 ? 'good' : s.overall >= 45 ? 'warn' : 'bad'}>
                  {Math.round(s.overall)}/100
                </Chip>
              </div>
              {s.strengths.length > 0 && (
                <p className="small">
                  <strong style={{ color: 'var(--good)' }}>Strong:</strong> {s.strengths.join(', ')}
                </p>
              )}
              {s.weaknesses.length > 0 && (
                <p className="small">
                  <strong style={{ color: 'var(--bad)' }}>Weak:</strong> {s.weaknesses.join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </Section>
    </Screen>
  );
}
