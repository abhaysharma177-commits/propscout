import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../components/AppShell';
import { Chip, EmptyState, Note, Section } from '../components/ui';
import { formatCompact } from '../lib/money';
import { directionsUrl, locationTerm, mapsUrl } from '../lib/property';
import { summariseChecks } from '../lib/score';
import { useStore } from '../lib/store';
import { STATUS_LABEL, type Property } from '../types';

function byTime(a: Property, b: Property): number {
  const ta = a.visitTime ?? '99:99';
  const tb = b.visitTime ?? '99:99';
  if (ta !== tb) return ta.localeCompare(tb);
  return (a.brief?.rank ?? 99) - (b.brief?.rank ?? 99);
}

/**
 * Google Maps link covering every stop of a day in order, starting from
 * wherever you set out (hotel, airport) so the first leg is useful too.
 */
function dayRouteUrl(stops: Property[], homeBase?: string): string | undefined {
  const stopTerms = stops.map(locationTerm).filter((t): t is string => Boolean(t));
  const start = homeBase?.trim();
  const terms = start ? [start, ...stopTerms] : stopTerms;
  if (terms.length < 2) return undefined;
  const origin = encodeURIComponent(terms[0]!);
  const destination = encodeURIComponent(terms[terms.length - 1]!);
  const waypoints = terms
    .slice(1, -1)
    .map((t) => encodeURIComponent(t))
    .join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
}

function Stop({
  property,
  index,
  next,
  isLast,
}: {
  property: Property;
  index: number;
  next?: Property;
  isLast: boolean;
}) {
  const checks = summariseChecks(property);
  const url = mapsUrl(property);
  const legUrl = next ? directionsUrl(property, next) : undefined;
  const price = property.costs.lastQuote ?? property.costs.askingPrice;
  const done = property.status !== 'to_visit';

  return (
    <div className="stop">
      <div className="stop__rail">
        <span
          className="stop__dot"
          style={done ? { background: 'var(--good)' } : undefined}
          aria-hidden="true"
        >
          {done ? '✓' : index + 1}
        </span>
        {!isLast && <span className="stop__line" />}
      </div>

      <div className="stop__body">
        <Link to={`/p/${property.id}`} className="card card--pad" style={{ display: 'block', color: 'inherit' }}>
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            {property.visitTime && (
              <strong className="mono nowrap" style={{ fontSize: '0.95rem' }}>
                {property.visitTime}
              </strong>
            )}
            <span className="grow" style={{ fontWeight: 650 }}>
              {property.name}
            </span>
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            {[property.locality, property.config].filter(Boolean).join(' · ')}
          </div>
          <div className="row row--wrap" style={{ marginTop: 8 }}>
            {price && <Chip>{formatCompact(price)}</Chip>}
            <Chip tone={done ? 'good' : undefined}>{STATUS_LABEL[property.status]}</Chip>
            {checks.criticalIssues > 0 && <Chip tone="bad">{checks.criticalIssues} problems</Chip>}
            {property.brief?.rank !== undefined && <Chip tone="accent">Rank {property.brief.rank}</Chip>}
          </div>
        </Link>

        <div className="row" style={{ marginTop: 8, gap: 8 }}>
          {url && (
            <a className="btn btn--sm" href={url} target="_blank" rel="noopener noreferrer">
              🗺️ Map
            </a>
          )}
          <Link className="btn btn--sm btn--primary" to={`/p/${property.id}/visit`}>
            ▶ Visit
          </Link>
        </div>

        {legUrl && (
          <a className="stop__leg" href={legUrl} target="_blank" rel="noopener noreferrer">
            ↓ Directions to {next?.name}
          </a>
        )}
      </div>
    </div>
  );
}

export function Planner() {
  const { properties, ready, settings } = useStore();

  const { days, unscheduled } = useMemo(() => {
    const active = properties.filter((p) => !p.archived);
    const grouped = new Map<number, Property[]>();
    const loose: Property[] = [];

    for (const p of active) {
      if (p.tripDay === undefined) loose.push(p);
      else {
        const list = grouped.get(p.tripDay) ?? [];
        list.push(p);
        grouped.set(p.tripDay, list);
      }
    }

    const sortedDays = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, stops]) => ({ day, stops: stops.sort(byTime) }));

    return { days: sortedDays, unscheduled: loose.sort((a, b) => a.name.localeCompare(b.name)) };
  }, [properties]);

  if (!ready) {
    return (
      <Screen title="Trip plan">
        <div className="empty">
          <div className="spinner" />
        </div>
      </Screen>
    );
  }

  if (days.length === 0 && unscheduled.length === 0) {
    return (
      <Screen title="Trip plan">
        <EmptyState
          icon="🗺️"
          title="Nothing scheduled"
          body="Add properties, then set a trip day and time on each one to build your route."
          action={
            <Link className="btn btn--primary" to="/new">
              Add a property
            </Link>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Trip plan"
      subtitle={`${days.reduce((n, d) => n + d.stops.length, 0)} stops across ${days.length} day${days.length === 1 ? '' : 's'}`}
    >
      <Note tone="accent" icon="⏰">
        <strong>Time your visits.</strong> Go to the ready-to-move flats first, since a completed
        building has to be physically inspected. Try to see at least one shortlisted property again
        at 7pm on a weekday — traffic, noise, parking and water pressure are all different then.
      </Note>

      {days.map(({ day, stops }) => {
        const route = dayRouteUrl(stops, settings.homeBase);
        const doneCount = stops.filter((p) => p.status !== 'to_visit').length;
        return (
          <Section key={day} title={`Day ${day}`}>
            <div className="day">
              <div className="day__head">
                <div className="row row--wrap">
                  <Chip tone={doneCount === stops.length ? 'good' : undefined}>
                    {doneCount}/{stops.length} visited
                  </Chip>
                  {stops[0]?.visitDate && <Chip>{stops[0].visitDate}</Chip>}
                </div>
                {route && (
                  <a className="btn btn--sm" href={route} target="_blank" rel="noopener noreferrer">
                    🚗 Whole day route
                  </a>
                )}
              </div>

              <div>
                {stops.map((p, i) => (
                  <Stop
                    key={p.id}
                    property={p}
                    index={i}
                    {...(stops[i + 1] ? { next: stops[i + 1] } : {})}
                    isLast={i === stops.length - 1}
                  />
                ))}
              </div>
            </div>
          </Section>
        );
      })}

      {unscheduled.length > 0 && (
        <Section title="Not scheduled yet">
          <p className="small muted">
            Open one and set a trip day under “Visit planning” to drop it into the route.
          </p>
          <div className="list">
            {unscheduled.map((p) => (
              <Link key={p.id} className="listrow" to={`/p/${p.id}/edit`}>
                <span className="listrow__main">
                  <span className="listrow__title">{p.name}</span>
                  <span className="listrow__sub">
                    {[p.locality, STATUS_LABEL[p.status]].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="listrow__right">Set day ›</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Note tone="info" icon="💡">
        Allow 60-90 minutes for a ready property you are serious about, and 30-45 for one you are
        only benchmarking. Leave gaps — the useful part of a visit is the unhurried conversation with
        a resident, and that never happens when you are running late.
      </Note>
    </Screen>
  );
}
