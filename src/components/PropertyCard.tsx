import { Link } from 'react-router-dom';
import { formatCompact } from '../lib/money';
import { estimateNegotiation, priceVerdict } from '../lib/negotiate';
import { computeScore, summariseChecks } from '../lib/score';
import { STATUS_LABEL, type Property, type PropertyStatus } from '../types';
import { PropertyThumb } from './Media';
import { Chip, ScoreDial } from './ui';

const STATUS_TONE: Record<PropertyStatus, 'good' | 'warn' | 'bad' | 'info' | 'accent' | undefined> =
  {
    to_visit: undefined,
    visited: 'info',
    shortlisted: 'good',
    negotiating: 'accent',
    rejected: 'bad',
  };

export function PropertyCard({ property, mediaCount }: { property: Property; mediaCount: number }) {
  const score = computeScore(property);
  const checks = summariseChecks(property);
  const neg = estimateNegotiation(property);
  const verdict = priceVerdict(neg);
  const price = property.costs.lastQuote ?? property.costs.askingPrice;

  return (
    <Link className="pcard" to={`/p/${property.id}`}>
      <div className="pcard__body">
        <PropertyThumb propertyId={property.id} />

        <div className="grow">
          <div className="row" style={{ gap: 7, alignItems: 'flex-start' }}>
            {property.brief?.rank !== undefined && (
              <span className="pcard__rank" aria-label={`Rank ${property.brief.rank}`}>
                {property.brief.rank}
              </span>
            )}
            <span className="pcard__name grow">{property.name}</span>
            <ScoreDial value={score.overall} unrated={score.ratedCount === 0} size={42} />
          </div>

          <div className="pcard__meta">
            {[property.config, property.locality].filter(Boolean).join(' · ') || 'No details yet'}
          </div>

          <div className="row" style={{ marginTop: 6, gap: 8 }}>
            <span className="pcard__price">{price ? formatCompact(price) : 'No price'}</span>
            {neg.askRatePerSqft && (
              <span className="tiny muted-3 nowrap">
                ₹{Math.round(neg.askRatePerSqft).toLocaleString('en-IN')}/sqft
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pcard__foot">
        <Chip tone={STATUS_TONE[property.status]}>{STATUS_LABEL[property.status]}</Chip>

        {neg.marketPremiumPct !== undefined && (
          <Chip tone={verdict.tone === 'good' ? 'good' : verdict.tone === 'high' ? 'bad' : undefined}>
            {verdict.text}
          </Chip>
        )}

        {checks.criticalIssues > 0 && (
          <Chip tone="bad">
            {checks.criticalIssues} serious problem{checks.criticalIssues === 1 ? '' : 's'}
          </Chip>
        )}

        {checks.progress > 0 && checks.progress < 1 && (
          <Chip>{Math.round(checks.progress * 100)}% checked</Chip>
        )}

        {mediaCount > 0 && <Chip>📷 {mediaCount}</Chip>}

        {property.tripDay !== undefined && (
          <Chip tone="info">
            Day {property.tripDay}
            {property.visitTime ? ` · ${property.visitTime}` : ''}
          </Chip>
        )}
      </div>
    </Link>
  );
}
