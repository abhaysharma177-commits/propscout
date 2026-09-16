import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../components/AppShell';
import { PropertyCard } from '../components/PropertyCard';
import { ChipToggle, EmptyState, Note, Section } from '../components/ui';
import { useStore } from '../lib/store';
import { computeScore, summariseChecks } from '../lib/score';
import { STATUS_LABEL, type Property, type PropertyStatus } from '../types';

type Filter = 'all' | PropertyStatus;
type Sort = 'plan' | 'rank' | 'score' | 'price_low' | 'price_high' | 'name';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'to_visit', label: STATUS_LABEL.to_visit },
  { value: 'visited', label: STATUS_LABEL.visited },
  { value: 'shortlisted', label: STATUS_LABEL.shortlisted },
  { value: 'negotiating', label: STATUS_LABEL.negotiating },
  { value: 'rejected', label: STATUS_LABEL.rejected },
];

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'plan', label: 'Visit order' },
  { value: 'rank', label: 'Research rank' },
  { value: 'score', label: 'My score' },
  { value: 'price_low', label: 'Cheapest' },
  { value: 'price_high', label: 'Dearest' },
  { value: 'name', label: 'A-Z' },
];

function priceOf(p: Property): number | undefined {
  return p.costs.lastQuote ?? p.costs.askingPrice;
}

function compare(a: Property, b: Property, sort: Sort): number {
  switch (sort) {
    case 'plan': {
      const da = a.tripDay ?? 99;
      const db = b.tripDay ?? 99;
      if (da !== db) return da - db;
      const ta = a.visitTime ?? '99:99';
      const tb = b.visitTime ?? '99:99';
      if (ta !== tb) return ta.localeCompare(tb);
      return (a.brief?.rank ?? 99) - (b.brief?.rank ?? 99);
    }
    case 'rank':
      return (a.brief?.rank ?? 99) - (b.brief?.rank ?? 99);
    case 'score':
      return computeScore(b).overall - computeScore(a).overall;
    case 'price_low':
      return (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity);
    case 'price_high':
      return (priceOf(b) ?? -Infinity) - (priceOf(a) ?? -Infinity);
    case 'name':
      return a.name.localeCompare(b.name);
  }
}

export function Properties() {
  const { properties, mediaCounts, ready, error } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('plan');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties
      .filter((p) => !p.archived)
      .filter((p) => filter === 'all' || p.status === filter)
      .filter((p) => {
        if (!q) return true;
        return [p.name, p.locality, p.builder, p.config, p.address]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q));
      })
      .sort((a, b) => compare(a, b, sort));
  }, [properties, filter, sort, query]);

  const counts = useMemo(() => {
    const active = properties.filter((p) => !p.archived);
    const problems = active.reduce((sum, p) => sum + summariseChecks(p).criticalIssues, 0);
    return {
      total: active.length,
      toVisit: active.filter((p) => p.status === 'to_visit').length,
      done: active.filter((p) => p.status !== 'to_visit').length,
      problems,
    };
  }, [properties]);

  return (
    <Screen
      title="Properties"
      subtitle={
        counts.total > 0
          ? `${counts.total} total · ${counts.toVisit} still to visit`
          : 'Jaipur house hunt'
      }
      actions={
        <Link className="iconbtn" to="/new" aria-label="Add a property">
          ＋
        </Link>
      }
    >
      {error && (
        <Note tone="bad" icon="⚠️">
          {error}
        </Note>
      )}

      {!ready ? (
        <div className="empty">
          <div className="spinner" />
          <p className="small muted">Loading your properties…</p>
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No properties yet"
          body="Add one by hand, or reload the built-in list from Settings."
          action={
            <Link className="btn btn--primary" to="/new">
              Add a property
            </Link>
          }
        />
      ) : (
        <>
          {counts.problems > 0 && (
            <Note tone="warn" icon="⚠️">
              {counts.problems} serious problem{counts.problems === 1 ? '' : 's'} recorded across your
              properties. Check the Compare tab to see them side by side.
            </Note>
          )}

          <input
            className="input"
            type="search"
            placeholder="Search by name, locality, builder…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <ChipToggle options={FILTERS} value={filter} onChange={setFilter} />
          <ChipToggle options={SORTS} value={sort} onChange={setSort} />

          {visible.length === 0 ? (
            <EmptyState icon="🔍" title="Nothing matches" body="Try a different filter or search." />
          ) : (
            <Section>
              <div className="col" style={{ gap: 11 }}>
                {visible.map((p) => (
                  <PropertyCard key={p.id} property={p} mediaCount={mediaCounts[p.id] ?? 0} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {properties.length > 0 && (
        <Link className="fab" to="/new">
          <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>
            ＋
          </span>
          Add
        </Link>
      )}
    </Screen>
  );
}
