import { formatCompact } from '../lib/money';
import type { PossessionStatus, Property, PropertyBrief } from '../types';
import { Accordion, Chip, Note, Section } from './ui';

const POSSESSION_LABEL: Record<PossessionStatus, string> = {
  ready_to_move: 'Ready to move',
  near_possession: 'Near possession',
  under_construction: 'Under construction',
};

const POSSESSION_TONE: Record<PossessionStatus, 'good' | 'warn' | 'bad'> = {
  ready_to_move: 'good',
  near_possession: 'warn',
  under_construction: 'bad',
};

function range(pair: [number, number] | undefined): string | undefined {
  if (!pair) return undefined;
  const [lo, hi] = pair;
  if (lo === hi) return formatCompact(lo);
  return `${formatCompact(lo)} – ${formatCompact(hi)}`;
}

function List({
  items,
  tone,
}: {
  items: string[] | undefined;
  tone?: 'good' | 'bad' | 'warn';
}) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={`bullets${tone ? ` bullets--${tone}` : ''}`}>
      {items.map((x, i) => (
        <li key={`${i}-${x.slice(0, 12)}`}>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

/** The headline strip shown at the top of a property, before you go in. */
export function BriefHeader({ brief }: { brief: PropertyBrief }) {
  return (
    <div className="col">
      <div className="row row--wrap">
        {brief.rank !== undefined && <Chip tone="accent">Rank {brief.rank} of 8</Chip>}
        {brief.possessionStatus && (
          <Chip tone={POSSESSION_TONE[brief.possessionStatus]}>
            {POSSESSION_LABEL[brief.possessionStatus]}
          </Chip>
        )}
        {brief.gstPct !== undefined && (
          <Chip tone={brief.gstPct === 0 ? 'good' : 'warn'}>
            {brief.gstPct === 0 ? 'NIL GST' : `${brief.gstPct}% GST`}
          </Chip>
        )}
        {brief.confidence && <Chip>Research confidence: {brief.confidence}</Chip>}
      </div>
      {brief.verdict && (
        <Note tone="accent" icon="🧭">
          <strong>Pre-visit read.</strong> {brief.verdict}
        </Note>
      )}
    </div>
  );
}

/**
 * Everything the research knows about this property, arranged so the things
 * you need while standing at the gate come first.
 */
export function BriefPanel({ property }: { property: Property }) {
  const brief = property.brief;
  if (!brief) {
    return (
      <Note tone="info" icon="💡">
        No pre-visit research for this one — you added it yourself. Use the checklist and questions
        tabs, and fill in the price and market rate to get a negotiation estimate.
      </Note>
    );
  }

  const quoted = range(brief.priceRange);
  const negotiated = range(brief.negotiatedRange);
  const allIn = range(brief.allInRange);

  return (
    <div className="col" style={{ gap: 14 }}>
      <BriefHeader brief={brief} />

      {brief.watchouts && brief.watchouts.length > 0 && (
        <Section title="Verify these here">
          <div className="card card--pad">
            <p className="small muted" style={{ marginBottom: 10 }}>
              Specific to this property, on top of the standard checklist.
            </p>
            <List items={brief.watchouts} tone="warn" />
          </div>
        </Section>
      )}

      {brief.walkAway && brief.walkAway.length > 0 && (
        <Note tone="bad" icon="🛑">
          <strong>Walk away if:</strong>
          <List items={brief.walkAway} tone="bad" />
        </Note>
      )}

      {(brief.scripts?.length || brief.winnable?.length || brief.hardToWin?.length) && (
        <Accordion icon="🗣️" title="What to say, and what you can win" defaultOpen>
          {brief.scripts && brief.scripts.length > 0 && (
            <div className="col" style={{ marginBottom: 14 }}>
              {brief.scripts.map((s, i) => (
                <p className="script" key={i}>
                  {s}
                </p>
              ))}
            </div>
          )}
          {brief.winnable && brief.winnable.length > 0 && (
            <>
              <h4 style={{ marginBottom: 6 }}>Winnable</h4>
              <List items={brief.winnable} tone="good" />
            </>
          )}
          {brief.hardToWin && brief.hardToWin.length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 6px' }}>Do not waste time on</h4>
              <List items={brief.hardToWin} tone="bad" />
            </>
          )}
        </Accordion>
      )}

      {(quoted || negotiated || allIn || brief.localityRatePerSqft) && (
        <Accordion icon="💰" title="Price research" defaultOpen>
          <dl className="kv">
            {quoted && (
              <>
                <dt>Quoted range seen</dt>
                <dd>{quoted}</dd>
              </>
            )}
            {negotiated && (
              <>
                <dt>Realistic negotiated</dt>
                <dd>{negotiated}</dd>
              </>
            )}
            {allIn && (
              <>
                <dt>Estimated all-in</dt>
                <dd>{allIn}</dd>
              </>
            )}
            {brief.localityRatePerSqft !== undefined && (
              <>
                <dt>Locality rate</dt>
                <dd>₹{brief.localityRatePerSqft.toLocaleString('en-IN')}/sqft</dd>
              </>
            )}
            {brief.loadingPct !== undefined && (
              <>
                <dt>Loading factor</dt>
                <dd>{brief.loadingPct}%</dd>
              </>
            )}
            {brief.carpetRange && (
              <>
                <dt>Carpet range</dt>
                <dd>
                  {brief.carpetRange[0]}–{brief.carpetRange[1]} sqft
                </dd>
              </>
            )}
            {brief.superRange && (
              <>
                <dt>Super built-up</dt>
                <dd>
                  {brief.superRange[0]}–{brief.superRange[1]} sqft
                </dd>
              </>
            )}
            {brief.monthlyRentEstimate !== undefined && (
              <>
                <dt>Rent estimate</dt>
                <dd>{formatCompact(brief.monthlyRentEstimate)}/mo</dd>
              </>
            )}
            {brief.rentalYieldPct !== undefined && (
              <>
                <dt>Rental yield</dt>
                <dd>{brief.rentalYieldPct}%</dd>
              </>
            )}
          </dl>
          {brief.localityTrend && (
            <p className="small muted" style={{ marginTop: 12 }}>
              {brief.localityTrend}
            </p>
          )}
        </Accordion>
      )}

      {brief.unverified && brief.unverified.length > 0 && (
        <Accordion
          icon="⚠️"
          title="Unverified — confirm on site"
          subtitle={`${brief.unverified.length} item${brief.unverified.length === 1 ? '' : 's'}`}
          defaultOpen
        >
          <List items={brief.unverified} tone="warn" />
        </Accordion>
      )}

      {(brief.waterSource ||
        brief.airportKm !== undefined ||
        brief.metro ||
        brief.schools?.length ||
        brief.hospitals?.length) && (
        <Accordion icon="📍" title="Daily life & connectivity">
          <dl className="kv">
            {brief.waterSource && (
              <>
                <dt>Water source</dt>
                <dd>{brief.waterSource}</dd>
              </>
            )}
            {brief.airportKm !== undefined && (
              <>
                <dt>Airport</dt>
                <dd>{brief.airportKm} km</dd>
              </>
            )}
            {brief.railwayKm !== undefined && (
              <>
                <dt>Railway</dt>
                <dd>{brief.railwayKm} km</dd>
              </>
            )}
            {brief.metro && (
              <>
                <dt>Metro</dt>
                <dd>{brief.metro}</dd>
              </>
            )}
          </dl>
          {brief.schools && brief.schools.length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 6px' }}>Schools</h4>
              <List items={brief.schools} />
            </>
          )}
          {brief.hospitals && brief.hospitals.length > 0 && (
            <>
              <h4 style={{ margin: '14px 0 6px' }}>Hospitals</h4>
              <List items={brief.hospitals} />
            </>
          )}
        </Accordion>
      )}

      {(brief.developerNote || brief.developerScore !== undefined) && (
        <Accordion
          icon="🏗️"
          title={brief.developer ?? 'Developer'}
          subtitle={
            brief.developerScore !== undefined ? `Credibility ${brief.developerScore}/10` : undefined
          }
        >
          {brief.developerNote && <p className="small">{brief.developerNote}</p>}
        </Accordion>
      )}

      {brief.kbScores && (
        <Accordion icon="📊" title="Desk-research scores" subtitle="Out of 10, before your visit">
          <dl className="kv">
            {Object.entries({
              Livability: brief.kbScores.livability,
              Liquidity: brief.kbScores.liquidity,
              Construction: brief.kbScores.construction,
              Developer: brief.kbScores.developer,
              Value: brief.kbScores.value,
              'Negotiation room': brief.kbScores.negotiationRoom,
            })
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}/10</dd>
                </div>
              ))}
          </dl>
          <p className="tiny muted-3" style={{ marginTop: 12 }}>
            These came from desk research. Your own ratings on the Verdict tab are what should decide
            it — that is the whole point of going.
          </p>
        </Accordion>
      )}

      {brief.competitors && brief.competitors.length > 0 && (
        <Accordion icon="⚖️" title="Play it against">
          <List items={brief.competitors} />
        </Accordion>
      )}

      <p className="tiny muted-3">
        Research compiled 16 Sep 2026 from portal data, which lags the market by 1-3 months. Prices
        and RERA numbers must be re-confirmed on rera.rajasthan.gov.in and with two local brokers.
      </p>
    </div>
  );
}
