import { useMemo } from 'react';
import { MoneyInput, NumberInput } from '../../components/MoneyInput';
import { Accordion, Bar, Chip, Note, Section, Stat, Switch } from '../../components/ui';
import { LEVERAGE, LEVERAGE_GROUPS } from '../../data/leverage';
import {
  computeCosts,
  emi,
  formatCompact,
  formatINR,
  formatPct,
  loadingPct,
  perSqft,
  rentalYieldPct,
} from '../../lib/money';
import { chargeableSqft, estimateNegotiation } from '../../lib/negotiate';
import { effectiveStampDutyPct, useStore } from '../../lib/store';
import type { Property } from '../../types';

export function PriceTab({ property }: { property: Property }) {
  const { patch, settings, updateSettings } = useStore();
  const p = property;

  const neg = useMemo(() => estimateNegotiation(p), [p]);
  const sqft = chargeableSqft(p);

  const stampPct = effectiveStampDutyPct(settings);
  const costs = useMemo(
    () =>
      computeCosts({
        ...p.costs,
        askingPrice: p.costs.lastQuote ?? p.costs.askingPrice,
        stampDutyPct: p.costs.stampDutyPct ?? stampPct,
        registrationPct: p.costs.registrationPct ?? settings.defaultRegistrationPct,
        labourCessPctOfStampDuty: settings.labourCessPctOfStampDuty,
      }),
    [p.costs, stampPct, settings.defaultRegistrationPct, settings.labourCessPctOfStampDuty],
  );

  // What the deal looks like if you land your target instead of paying asking.
  const atTarget = useMemo(() => {
    const target = p.negotiation.targetPrice ?? neg.suggestedTarget;
    if (target === undefined) return undefined;
    return computeCosts({
      ...p.costs,
      askingPrice: target,
      stampDutyPct: p.costs.stampDutyPct ?? stampPct,
      registrationPct: p.costs.registrationPct ?? settings.defaultRegistrationPct,
      labourCessPctOfStampDuty: settings.labourCessPctOfStampDuty,
    });
  }, [
    p.costs,
    p.negotiation.targetPrice,
    neg.suggestedTarget,
    stampPct,
    settings.defaultRegistrationPct,
    settings.labourCessPctOfStampDuty,
  ]);

  const loan = useMemo(() => {
    const price = atTarget?.grandTotal ?? costs.grandTotal;
    const principal = (price * settings.loanToValuePct) / 100;
    return emi(principal, settings.loanInterestPct, settings.loanTenureYears);
  }, [atTarget, costs.grandTotal, settings.loanToValuePct, settings.loanInterestPct, settings.loanTenureYears]);

  const loading = loadingPct(p.superBuiltUpSqft, p.carpetSqft);
  const carpetRate = perSqft(p.costs.lastQuote ?? p.costs.askingPrice, p.carpetSqft);
  const yieldPct = rentalYieldPct(p.brief?.monthlyRentEstimate, costs.grandTotal);

  const setCosts = (changes: Partial<Property['costs']>) =>
    void patch(p.id, { costs: { ...p.costs, ...changes } });

  const setNeg = (changes: Partial<Property['negotiation']>) =>
    void patch(p.id, { negotiation: { ...p.negotiation, ...changes } });

  const toggleLeverage = (id: string) => {
    const has = p.negotiation.leverage.includes(id);
    setNeg({
      leverage: has
        ? p.negotiation.leverage.filter((x) => x !== id)
        : [...p.negotiation.leverage, id],
    });
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* ------------------------------------------------- the numbers */}
      <Section title="The numbers">
        <div className="card card--pad">
          <div className="formgrid formgrid--full">
            <MoneyInput
              label="Advertised / quoted price"
              value={p.costs.askingPrice}
              onChange={(v) => setCosts({ askingPrice: v })}
            />
            <MoneyInput
              label="Latest quote, if they have come down"
              hint="Leave blank if unchanged"
              value={p.costs.lastQuote}
              onChange={(v) => setCosts({ lastQuote: v })}
            />
            <MoneyInput
              label="Market rate per sqft in this locality"
              hint="From a broker who is NOT selling you this. This one input drives the whole estimate."
              placeholder="e.g. 4865"
              value={p.negotiation.marketRatePerSqft}
              onChange={(v) => setNeg({ marketRatePerSqft: v })}
            />
          </div>
        </div>

        <div className="stats">
          <Stat
            label="Rate on quoted area"
            value={neg.askRatePerSqft ? `₹${Math.round(neg.askRatePerSqft).toLocaleString('en-IN')}` : '—'}
            note={sqft ? `on ${Math.round(sqft).toLocaleString('en-IN')} sqft` : 'enter the area'}
          />
          {carpetRate !== undefined && (
            <Stat
              label="Rate on carpet"
              value={`₹${Math.round(carpetRate).toLocaleString('en-IN')}`}
              note="the honest comparison"
              tone="accent"
            />
          )}
          {neg.marketPremiumPct !== undefined && (
            <Stat
              label="Against market"
              value={`${neg.marketPremiumPct > 0 ? '+' : ''}${neg.marketPremiumPct.toFixed(0)}%`}
              note={neg.marketPremiumPct > 0 ? 'above the locality rate' : 'below the locality rate'}
              tone={neg.marketPremiumPct > 8 ? 'bad' : neg.marketPremiumPct < -3 ? 'good' : 'warn'}
            />
          )}
          {loading !== undefined && (
            <Stat
              label="Loading"
              value={`${loading.toFixed(0)}%`}
              note={loading > 35 ? 'high — lots of corridor' : loading < 26 ? 'efficient' : 'typical'}
              tone={loading > 35 ? 'bad' : loading < 26 ? 'good' : 'warn'}
            />
          )}
        </div>
      </Section>

      {/* ------------------------------------------------- negotiation */}
      <Section title="What to offer">
        {neg.askingPrice === undefined ? (
          <Note tone="info" icon="💡">
            Enter the asking price above and this becomes a real negotiation plan.
          </Note>
        ) : (
          <>
            <div className="card card--pad">
              <div className="row row--between" style={{ marginBottom: 6 }}>
                <span className="small muted">Estimated room off asking</span>
                <strong style={{ fontSize: '1.15rem' }}>
                  {neg.roomLowPct.toFixed(0)}–{neg.roomHighPct.toFixed(0)}%
                </strong>
              </div>
              <Bar value={neg.roomPct / 25} tone={neg.roomPct > 10 ? 'good' : 'warn'} label="Negotiation room" />

              <div className="stats" style={{ marginTop: 14 }}>
                <Stat
                  label="Open at"
                  value={formatCompact(neg.suggestedOpening)}
                  note="your first number"
                  tone="accent"
                />
                <Stat
                  label="Aim for"
                  value={formatCompact(neg.suggestedTarget)}
                  note={neg.estimatedSaving ? `saves ${formatCompact(neg.estimatedSaving)}` : undefined}
                  tone="good"
                />
                <Stat
                  label="Never above"
                  value={formatCompact(neg.suggestedWalkAway)}
                  note="walk away past this"
                  tone="bad"
                />
              </div>
            </div>

            {p.brief?.negotiatedRange && (
              <Note tone="info" icon="📋">
                <strong>Pre-visit research said:</strong> realistically negotiable to{' '}
                {formatCompact(p.brief.negotiatedRange[0])}
                {p.brief.negotiatedRange[0] !== p.brief.negotiatedRange[1]
                  ? ` – ${formatCompact(p.brief.negotiatedRange[1])}`
                  : ''}
                . Use whichever of the two numbers is better supported by what you actually see today.
              </Note>
            )}

            {neg.notes.length > 0 && (
              <div className="card card--pad">
                <ul className="bullets">
                  {neg.notes.map((n, i) => (
                    <li key={i}>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card card--pad">
              <div className="formgrid formgrid--full">
                <MoneyInput
                  label="My target price"
                  hint="Overrides the suggestion. Decide this before you walk in."
                  value={p.negotiation.targetPrice}
                  onChange={(v) => setNeg({ targetPrice: v })}
                />
                <MoneyInput
                  label="My walk-away price"
                  hint="The number above which you leave. Write it down and do not move it on the day."
                  value={p.negotiation.walkAwayPrice}
                  onChange={(v) => setNeg({ walkAwayPrice: v })}
                />
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ------------------------------------------------- leverage */}
      <Section title="Your leverage">
        <p className="small muted">
          Tick what is true. Each one moves the estimate above, and taps that show a line to say.
        </p>
        {LEVERAGE_GROUPS.map((group) => {
          const items = LEVERAGE.filter((l) => l.group === group.id);
          const onCount = items.filter((l) => p.negotiation.leverage.includes(l.id)).length;
          return (
            <Accordion
              key={group.id}
              icon={group.icon}
              title={group.label}
              subtitle={group.blurb}
              right={onCount > 0 ? <Chip tone={group.id === 'against' ? 'bad' : 'good'}>{onCount}</Chip> : undefined}
              padded={false}
            >
              <div>
                {items.map((item) => {
                  const on = p.negotiation.leverage.includes(item.id);
                  return (
                    <div key={item.id} className="check" style={{ paddingTop: 10, paddingBottom: 10 }}>
                      <Switch
                        label={item.label}
                        hint={`${item.pct > 0 ? '+' : ''}${item.pct}% room`}
                        checked={on}
                        onChange={() => toggleLeverage(item.id)}
                      />
                      {on && item.script && <p className="script">{item.script}</p>}
                    </div>
                  );
                })}
              </div>
            </Accordion>
          );
        })}
      </Section>

      {/* ------------------------------------------------- real cost */}
      <Section title="What it really costs">
        <div className="card card--pad">
          <div className="stats">
            <Stat
              label="All-in, at asking"
              value={formatCompact(costs.grandTotal)}
              note={`${costs.upliftPct.toFixed(0)}% above the quoted price`}
              tone="warn"
            />
            {atTarget && (
              <Stat
                label="All-in, at your target"
                value={formatCompact(atTarget.grandTotal)}
                note="if the negotiation lands"
                tone="good"
              />
            )}
            {costs.monthlyRecurring > 0 && (
              <Stat
                label="Monthly maintenance"
                value={formatCompact(costs.monthlyRecurring)}
                note="every month, forever"
              />
            )}
          </div>

          {costs.lines.length > 0 && (
            <dl className="kv" style={{ marginTop: 16 }}>
              {costs.lines.map((line) => (
                <div key={line.id} style={{ display: 'contents' }}>
                  <dt style={line.recurring ? { fontStyle: 'italic' } : undefined}>
                    {line.label}
                    {line.note && (
                      <span className="tiny muted-3" style={{ display: 'block', fontWeight: 400 }}>
                        {line.note}
                      </span>
                    )}
                  </dt>
                  <dd>{formatINR(line.amount)}</dd>
                </div>
              ))}
              <div style={{ display: 'contents' }}>
                <dt style={{ fontWeight: 800, color: 'var(--ink)' }}>Total one-time</dt>
                <dd style={{ fontWeight: 800 }}>{formatINR(costs.grandTotal)}</dd>
              </div>
            </dl>
          )}
        </div>

        <Switch
          label="Registering in a woman's sole name"
          hint={`Rajasthan charges ${settings.womanStampDutyPct}% stamp duty instead of ${settings.defaultStampDutyPct}%. On this deal that is about ${formatCompact((costs.basePrice * (settings.defaultStampDutyPct - settings.womanStampDutyPct) * (1 + settings.labourCessPctOfStampDuty / 100)) / 100)}.`}
          checked={settings.womanBuyer}
          onChange={(v) => void updateSettings({ womanBuyer: v })}
        />

        <Accordion icon="🧾" title="Extras and charges" subtitle="The things not in the headline price">
          <div className="formgrid formgrid--full">
            <MoneyInput
              label="Parking charge"
              value={p.costs.parkingCharge}
              onChange={(v) => setCosts({ parkingCharge: v })}
            />
            <MoneyInput
              label="Club / amenities charge"
              value={p.costs.clubhouseCharge}
              onChange={(v) => setCosts({ clubhouseCharge: v })}
            />
            <MoneyInput
              label="Preferred location charge (PLC)"
              value={p.costs.plcCharge}
              onChange={(v) => setCosts({ plcCharge: v })}
            />
            <MoneyInput
              label="Maintenance / corpus deposit"
              hint="One-time"
              value={p.costs.maintenanceDeposit}
              onChange={(v) => setCosts({ maintenanceDeposit: v })}
            />
            <MoneyInput
              label="Monthly maintenance"
              value={p.costs.monthlyMaintenance}
              onChange={(v) => setCosts({ monthlyMaintenance: v })}
            />
            <MoneyInput
              label="Other charges"
              value={p.costs.otherCharges}
              onChange={(v) => setCosts({ otherCharges: v })}
            />
            <MoneyInput
              label="Interiors & move-in budget"
              value={p.costs.interiorsBudget}
              onChange={(v) => setCosts({ interiorsBudget: v })}
            />
            <NumberInput
              label="GST"
              suffix="%"
              hint="0 for ready-to-move and resale, 5 for under-construction"
              value={p.costs.gstPct}
              onChange={(v) => setCosts({ gstPct: v })}
            />
            <NumberInput
              label="Brokerage"
              suffix="%"
              value={p.costs.brokeragePct}
              onChange={(v) => setCosts({ brokeragePct: v })}
            />
            <NumberInput
              label="Stamp duty"
              suffix="%"
              hint={`Blank uses ${stampPct}% from Settings`}
              value={p.costs.stampDutyPct}
              onChange={(v) => setCosts({ stampDutyPct: v })}
            />
          </div>
        </Accordion>

        <Accordion
          icon="🏦"
          title="Loan & EMI"
          subtitle={`${settings.loanToValuePct}% of cost at ${settings.loanInterestPct}% over ${settings.loanTenureYears} years`}
        >
          <div className="stats">
            <Stat label="Monthly EMI" value={formatCompact(loan.monthly)} tone="accent" />
            <Stat label="Down payment" value={formatCompact((atTarget?.grandTotal ?? costs.grandTotal) - loan.principal)} />
            <Stat label="Total interest" value={formatCompact(loan.totalInterest)} tone="warn" />
          </div>
          <p className="tiny muted-3" style={{ marginTop: 12 }}>
            Change the rate, tenure and loan share in Settings. This assumes the loan is taken on the
            all-in cost, which banks will not always fund — stamp duty and interiors usually come out
            of your own pocket.
          </p>
        </Accordion>

        {yieldPct !== undefined && (
          <Note tone={yieldPct < 2 ? 'warn' : 'good'} icon="📈">
            At an estimated rent of {formatCompact(p.brief?.monthlyRentEstimate)}/month, the rental
            yield on your all-in cost is {formatPct(yieldPct)}.{' '}
            {yieldPct < 2
              ? 'Below about 2% means the price is running ahead of what the property actually earns.'
              : 'That is a reasonable yield for an Indian metro.'}
          </Note>
        )}
      </Section>

      <Note tone="info" icon="ℹ️">
        Every figure here is an estimate built on what you have entered. Stamp duty applies on the
        DLC circle rate or the deal value, whichever is higher — check the DLC rate for this sector
        before you finalise.
      </Note>
    </div>
  );
}
