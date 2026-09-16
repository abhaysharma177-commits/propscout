import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../components/AppShell';
import { BriefPanel } from '../components/Brief';
import { MediaPanel } from '../components/Media';
import { Bar, Chip, ConfirmSheet, Note, Section, Stat, useToast } from '../components/ui';
import { formatCompact, formatSqft } from '../lib/money';
import { mapsUrl } from '../lib/property';
import { completeness, summariseChecks } from '../lib/score';
import { useProperty, useStore } from '../lib/store';
import {
  PROPERTY_TYPE_LABEL,
  STATUS_LABEL,
  type Property,
} from '../types';
import { ChecklistTab } from './tabs/ChecklistTab';
import { PriceTab } from './tabs/PriceTab';
import { QuestionsTab } from './tabs/QuestionsTab';
import { VerdictTab } from './tabs/VerdictTab';

type TabId = 'brief' | 'price' | 'check' | 'ask' | 'media' | 'verdict';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'brief', label: 'Briefing' },
  { id: 'price', label: 'Price' },
  { id: 'check', label: 'Checklist' },
  { id: 'ask', label: 'Questions' },
  { id: 'media', label: 'Photos' },
  { id: 'verdict', label: 'Verdict' },
];

function OverviewTab({ property, mediaCount }: { property: Property; mediaCount: number }) {
  const p = property;
  const url = mapsUrl(p);
  const done = useMemo(() => completeness(p, mediaCount), [p, mediaCount]);
  const area =
    p.type === 'plot'
      ? p.plotSqyd
        ? `${p.plotSqyd.toLocaleString('en-IN')} sq yd`
        : undefined
      : p.superBuiltUpSqft
        ? formatSqft(p.superBuiltUpSqft)
        : p.builtUpSqft
          ? formatSqft(p.builtUpSqft)
          : undefined;

  const facts: Array<[string, string | undefined]> = [
    ['Type', PROPERTY_TYPE_LABEL[p.type]],
    ['Configuration', p.config],
    ['Area', area],
    ['Carpet', p.carpetSqft ? formatSqft(p.carpetSqft) : undefined],
    ['Floor', p.floor && p.totalFloors ? `${p.floor} of ${p.totalFloors}` : p.floor],
    ['Facing', p.facing || undefined],
    ['Age', p.ageYears !== undefined ? `${p.ageYears} years` : undefined],
    ['Possession', p.possession],
    ['Builder', p.builder],
    ['Bathrooms', p.bathrooms !== undefined ? String(p.bathrooms) : undefined],
    ['Parking', p.parkingSlots !== undefined ? String(p.parkingSlots) : undefined],
    ['RERA', p.approvals?.reraNumber],
    ['Address', p.address],
  ];
  const present = facts.filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="btnrow">
        <Link className="btn btn--primary btn--lg" to={`/p/${p.id}/visit`}>
          ▶ Start visit
        </Link>
      </div>

      <div className="btnrow">
        {url && (
          <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
            🗺️ Directions
          </a>
        )}
        {p.contactPhone && (
          <a className="btn" href={`tel:${p.contactPhone.replace(/\s/g, '')}`}>
            📞 Call
          </a>
        )}
        {p.contactPhone && (
          <a
            className="btn"
            href={`https://wa.me/${p.contactPhone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 WhatsApp
          </a>
        )}
      </div>

      {done.overall < 1 && (
        <div className="card card--pad">
          <div className="row row--between" style={{ marginBottom: 8 }}>
            <span className="small muted">How well this one is recorded</span>
            <strong>{Math.round(done.overall * 100)}%</strong>
          </div>
          <Bar value={done.overall} tone={done.overall > 0.7 ? 'good' : 'warn'} label="Completeness" />
          <div className="pills" style={{ marginTop: 11 }}>
            {done.parts
              .filter((x) => !x.done)
              .map((x) => (
                <Chip key={x.label}>{x.label}</Chip>
              ))}
          </div>
        </div>
      )}

      {present.length > 0 && (
        <Section title="Details">
          <div className="card card--pad">
            <dl className="kv">
              {present.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd style={{ textAlign: 'right', whiteSpace: 'pre-wrap' }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>
      )}

      {p.notes && (
        <Section title="Your notes">
          <div className="card card--pad">
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
              {p.notes}
            </p>
          </div>
        </Section>
      )}

      <Section title="Pre-visit briefing">
        <BriefPanel property={p} />
      </Section>
    </div>
  );
}

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const property = useProperty(id);
  const { mediaCounts, remove } = useStore();
  const { show } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('brief');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!property) {
    return (
      <Screen title="Not found" back="/">
        <Note tone="warn" icon="🤔">
          That property is not here. It may have been deleted.
        </Note>
        <Link className="btn" to="/">
          Back to the list
        </Link>
      </Screen>
    );
  }

  const checks = summariseChecks(property);
  const mediaCount = mediaCounts[property.id] ?? 0;
  const price = property.costs.lastQuote ?? property.costs.askingPrice;

  const badgeFor = (t: TabId): { text: string; muted?: boolean } | null => {
    if (t === 'check' && checks.criticalUnchecked > 0) return { text: String(checks.criticalUnchecked) };
    if (t === 'media') return mediaCount > 0 ? { text: String(mediaCount), muted: true } : null;
    return null;
  };

  return (
    <Screen
      title={property.name}
      subtitle={[STATUS_LABEL[property.status], property.locality, price ? formatCompact(price) : null]
        .filter(Boolean)
        .join(' · ')}
      back="/"
      actions={
        <Link className="iconbtn" to={`/p/${property.id}/edit`} aria-label="Edit details">
          ✎
        </Link>
      }
    >
      <div className="tabs" role="tablist">
        {TABS.map((t) => {
          const badge = badgeFor(t.id);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {badge && (
                <span className={`tab__badge${badge.muted ? ' tab__badge--muted' : ''}`}>
                  {badge.text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'brief' && <OverviewTab property={property} mediaCount={mediaCount} />}
      {tab === 'price' && <PriceTab property={property} />}
      {tab === 'check' && <ChecklistTab property={property} />}
      {tab === 'ask' && <QuestionsTab property={property} />}
      {tab === 'media' && (
        <div className="col" style={{ gap: 14 }}>
          <Stat label="Captured here" value={mediaCount} note="photos, videos and voice notes" />
          <MediaPanel propertyId={property.id} />
        </div>
      )}
      {tab === 'verdict' && <VerdictTab property={property} />}

      {tab === 'brief' && (
        <button
          type="button"
          className="btn btn--danger"
          style={{ marginTop: 10 }}
          onClick={() => setConfirmDelete(true)}
        >
          Delete this property
        </button>
      )}

      {confirmDelete && (
        <ConfirmSheet
          title={`Delete ${property.name}?`}
          body="This removes the property and every photo, video and note attached to it. It cannot be undone."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await remove(property.id);
            setConfirmDelete(false);
            show('Deleted');
            navigate('/');
          }}
        />
      )}
    </Screen>
  );
}
