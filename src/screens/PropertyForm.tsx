import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../components/AppShell';
import { MoneyInput, NumberInput } from '../components/MoneyInput';
import { Accordion, Note, Section, Select, TextArea, TextInput, useToast } from '../components/ui';
import { blankProperty } from '../lib/property';
import { useProperty, useStore } from '../lib/store';
import {
  PROPERTY_TYPE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  type ContactRole,
  type Facing,
  type Furnishing,
  type Ownership,
  type Property,
  type PropertyStatus,
  type PropertyType,
} from '../types';

const TYPES: Array<{ value: PropertyType; label: string }> = (
  ['flat', 'villa', 'plot', 'commercial'] as PropertyType[]
).map((t) => ({ value: t, label: PROPERTY_TYPE_LABEL[t] }));

const FACINGS: Array<{ value: Facing; label: string }> = [
  { value: '', label: 'Not sure' },
  { value: 'N', label: 'North' },
  { value: 'NE', label: 'North-east' },
  { value: 'E', label: 'East' },
  { value: 'SE', label: 'South-east' },
  { value: 'S', label: 'South' },
  { value: 'SW', label: 'South-west' },
  { value: 'W', label: 'West' },
  { value: 'NW', label: 'North-west' },
];

const OWNERSHIPS: Array<{ value: Ownership; label: string }> = [
  { value: 'unknown', label: 'Not sure yet' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'patta', label: 'Patta (JDA / Nagar Nigam)' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'power_of_attorney', label: 'Power of Attorney (risky)' },
];

const ROLES: Array<{ value: ContactRole; label: string }> = [
  { value: 'broker', label: 'Broker / agent' },
  { value: 'owner', label: 'Owner' },
  { value: 'builder', label: 'Builder / developer' },
  { value: 'other', label: 'Someone else' },
];

const FURNISHINGS: Array<{ value: Furnishing; label: string }> = [
  { value: 'unknown', label: 'Not sure' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi', label: 'Semi-furnished' },
  { value: 'full', label: 'Fully furnished' },
];

export function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const existing = useProperty(id);
  const { save } = useStore();
  const { show } = useToast();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [draft, setDraft] = useState<Property>(() => existing ?? blankProperty());
  const [touched, setTouched] = useState(false);

  if (isEdit && !existing) {
    return (
      <Screen title="Not found" back="/">
        <Note tone="warn" icon="🤔">
          That property is not here any more.
        </Note>
      </Screen>
    );
  }

  const set = <K extends keyof Property>(key: K, value: Property[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setCost = <K extends keyof Property['costs']>(key: K, value: Property['costs'][K]) =>
    setDraft((d) => ({ ...d, costs: { ...d.costs, [key]: value } }));

  const nameOk = draft.name.trim().length > 0;

  const submit = async () => {
    setTouched(true);
    if (!nameOk) return;
    await save({ ...draft, name: draft.name.trim() });
    show(isEdit ? 'Saved' : 'Property added');
    navigate(`/p/${draft.id}`);
  };

  return (
    <Screen
      title={isEdit ? 'Edit details' : 'Add a property'}
      back={isEdit ? `/p/${draft.id}` : '/'}
      hideNav
    >
      <Note tone="info" icon="💡">
        Only the name is needed. Add a name now and fill the rest in later — you can edit any of this
        while you are standing there.
      </Note>

      <Section title="The basics">
        <div className="card card--pad">
          <div className="formgrid formgrid--full">
            <TextInput
              label="Name"
              placeholder="e.g. Trimurty Ariana"
              value={draft.name}
              onChange={(v) => set('name', v)}
              autoFocus={!isEdit}
            />
            {touched && !nameOk && (
              <p className="small" style={{ color: 'var(--bad)' }}>
                Give it a name so you can find it again.
              </p>
            )}
            <Select<PropertyType>
              label="What is it"
              value={draft.type}
              onChange={(v) => set('type', v)}
              options={TYPES}
            />
            <Select<PropertyStatus>
              label="Where it stands"
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
            <TextInput
              label="Locality"
              placeholder="e.g. Jagatpura"
              value={draft.locality ?? ''}
              onChange={(v) => set('locality', v)}
            />
            <TextInput
              label="Configuration"
              placeholder="e.g. 3 BHK + study"
              value={draft.config ?? ''}
              onChange={(v) => set('config', v)}
            />
          </div>
        </div>
      </Section>

      <Section title="Price">
        <div className="card card--pad">
          <div className="formgrid formgrid--full">
            <MoneyInput
              label="Advertised price"
              value={draft.costs.askingPrice}
              onChange={(v) => setCost('askingPrice', v)}
            />
            <MoneyInput
              label="Market rate per sqft here"
              hint="What comparable properties in this locality actually go for"
              placeholder="e.g. 4865"
              value={draft.negotiation.marketRatePerSqft}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  negotiation: { ...d.negotiation, marketRatePerSqft: v },
                }))
              }
            />
            <MoneyInput
              label="Monthly maintenance"
              value={draft.costs.monthlyMaintenance}
              onChange={(v) => setCost('monthlyMaintenance', v)}
            />
          </div>
        </div>
      </Section>

      <Section title="Size">
        <div className="card card--pad">
          <div className="formgrid">
            {draft.type === 'plot' ? (
              <NumberInput
                label="Plot size"
                suffix="sq yd"
                value={draft.plotSqyd}
                onChange={(v) => set('plotSqyd', v)}
              />
            ) : (
              <>
                <NumberInput
                  label="Super built-up"
                  suffix="sqft"
                  value={draft.superBuiltUpSqft}
                  onChange={(v) => set('superBuiltUpSqft', v)}
                />
                <NumberInput
                  label="Carpet area"
                  suffix="sqft"
                  hint="The honest number. Ask for it in writing."
                  value={draft.carpetSqft}
                  onChange={(v) => set('carpetSqft', v)}
                />
                <NumberInput
                  label="Bedrooms"
                  value={draft.bedrooms}
                  onChange={(v) => set('bedrooms', v)}
                />
                <NumberInput
                  label="Bathrooms"
                  value={draft.bathrooms}
                  onChange={(v) => set('bathrooms', v)}
                />
                <NumberInput
                  label="Parking slots"
                  value={draft.parkingSlots}
                  onChange={(v) => set('parkingSlots', v)}
                />
                <TextInput
                  label="Floor"
                  placeholder="e.g. 4"
                  value={draft.floor ?? ''}
                  onChange={(v) => set('floor', v)}
                />
                <NumberInput
                  label="Total floors"
                  value={draft.totalFloors}
                  onChange={(v) => set('totalFloors', v)}
                />
              </>
            )}
            <Select<Facing>
              label="Facing"
              value={draft.facing ?? ''}
              onChange={(v) => set('facing', v)}
              options={FACINGS}
            />
          </div>
        </div>
      </Section>

      <Section title="Where and who">
        <div className="card card--pad">
          <div className="formgrid formgrid--full">
            <TextInput
              label="Address"
              value={draft.address ?? ''}
              onChange={(v) => set('address', v)}
            />
            <TextInput
              label="For the map"
              hint="A place name, or paste a Google Maps link, or type latitude,longitude"
              placeholder="e.g. Ramnagariya, Jagatpura, Jaipur"
              value={draft.mapsQuery ?? ''}
              onChange={(v) => set('mapsQuery', v)}
            />
            <TextInput
              label="Builder"
              value={draft.builder ?? ''}
              onChange={(v) => set('builder', v)}
            />
            <TextInput
              label="Contact name"
              value={draft.contactName ?? ''}
              onChange={(v) => set('contactName', v)}
            />
            <TextInput
              label="Phone"
              type="tel"
              inputMode="tel"
              value={draft.contactPhone ?? ''}
              onChange={(v) => set('contactPhone', v)}
            />
            <Select<ContactRole>
              label="They are the"
              value={draft.contactRole ?? 'broker'}
              onChange={(v) => set('contactRole', v)}
              options={ROLES}
            />
          </div>
        </div>
      </Section>

      <Accordion icon="📅" title="Visit planning" subtitle="Which day of the trip, and when">
        <div className="formgrid">
          <NumberInput
            label="Trip day"
            hint="1, 2, 3…"
            value={draft.tripDay}
            onChange={(v) => set('tripDay', v)}
          />
          <TextInput
            label="Time"
            placeholder="09:30"
            type="time"
            value={draft.visitTime ?? ''}
            onChange={(v) => set('visitTime', v)}
          />
          <TextInput
            label="Date"
            type="date"
            value={draft.visitDate ?? ''}
            onChange={(v) => set('visitDate', v)}
          />
        </div>
      </Accordion>

      <Accordion icon="📄" title="Legal & possession">
        <div className="formgrid formgrid--full">
          <Select<Ownership>
            label="Ownership type"
            value={draft.ownership ?? 'unknown'}
            onChange={(v) => set('ownership', v)}
            options={OWNERSHIPS}
          />
          <TextInput
            label="RERA number"
            placeholder="RAJ/P/…"
            value={draft.approvals?.reraNumber ?? ''}
            onChange={(v) => set('approvals', { ...draft.approvals, reraNumber: v })}
          />
          <TextInput
            label="Possession"
            placeholder="e.g. Ready, or Dec 2027"
            value={draft.possession ?? ''}
            onChange={(v) => set('possession', v)}
          />
          <NumberInput
            label="Age of building"
            suffix="years"
            hint="0 or blank for new construction"
            value={draft.ageYears}
            onChange={(v) => set('ageYears', v)}
          />
          <Select<Furnishing>
            label="Furnishing"
            value={draft.furnishing ?? 'unknown'}
            onChange={(v) => set('furnishing', v)}
            options={FURNISHINGS}
          />
          <TextInput
            label="Listing link"
            type="url"
            inputMode="url"
            value={draft.sourceUrl ?? ''}
            onChange={(v) => set('sourceUrl', v)}
          />
        </div>
      </Accordion>

      <Accordion icon="📝" title="Notes">
        <TextArea
          label="Anything you want to remember"
          rows={5}
          value={draft.notes ?? ''}
          onChange={(v) => set('notes', v)}
        />
      </Accordion>

      <div className="btnrow" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(isEdit ? `/p/${draft.id}` : '/')}
        >
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={submit}>
          {isEdit ? 'Save changes' : 'Add property'}
        </button>
      </div>
    </Screen>
  );
}
