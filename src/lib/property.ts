import { AMENITIES } from '../data/amenities';
import {
  DEFAULT_SETTINGS,
  type ContactRole,
  type Facing,
  type Furnishing,
  type Ownership,
  type Property,
  type PropertyBrief,
  type PropertyStatus,
  type PropertyType,
} from '../types';
import { newId, slugId } from './id';
import { parseMoney, parseNum } from './money';

/**
 * The loose, hand-writable shape used to plug a list of properties into the
 * app (see src/data/seed.ts). Everything is optional except the name, and
 * money accepts "1.35 cr" / "85 lakh" / 13500000 interchangeably.
 */
export interface PropertySeed {
  name: string;
  type?: string;
  status?: string;

  builder?: string;
  contact?: string;
  phone?: string;
  role?: string;

  locality?: string;
  address?: string;
  /** A maps search string, a maps URL, or "26.9124,75.7873". */
  maps?: string;

  config?: string;
  /** Super built-up area in sqft. */
  sqft?: number | string;
  builtUp?: number | string;
  carpet?: number | string;
  /** Plot size in square yards. */
  sqyd?: number | string;
  floor?: string | number;
  totalFloors?: number | string;
  facing?: string;
  age?: number | string;
  possession?: string;
  furnishing?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  balconies?: number | string;
  parking?: number | string;

  ownership?: string;
  rera?: string | boolean;

  /** Advertised / quoted price. */
  price?: number | string;
  /** A lower number they have already come down to. */
  lastQuote?: number | string;
  /** Your researched going rate per sqft for the locality. */
  marketRate?: number | string;
  maintenance?: number | string;
  parkingCharge?: number | string;
  clubCharge?: number | string;
  plc?: number | string;
  deposit?: number | string;
  brokeragePct?: number | string;
  gstPct?: number | string;
  otherCharges?: number | string;
  interiors?: number | string;

  /** Amenity ids, or plain labels which are matched loosely. */
  amenities?: string[];
  pros?: string[];
  cons?: string[];
  notes?: string;
  url?: string;
  tags?: string[];

  /** Pre-visit research carried in from the knowledge base. */
  brief?: PropertyBrief;

  /** Trip planning: which day of the trip, and what time. */
  day?: number;
  time?: string;
  date?: string;
}

const TYPE_WORDS: Array<[PropertyType, string[]]> = [
  ['flat', ['flat', 'apartment', 'apt', 'condo', '2bhk', '3bhk', '4bhk', 'bhk', 'builder floor', 'floor']],
  ['villa', ['villa', 'house', 'independent', 'bungalow', 'kothi', 'duplex', 'row']],
  ['plot', ['plot', 'land', 'site', 'jda plot', 'residential plot']],
  ['commercial', ['commercial', 'shop', 'office', 'showroom', 'retail']],
];

export function normalizeType(raw: string | undefined): PropertyType {
  const s = (raw ?? '').toLowerCase().trim();
  if (!s) return 'flat';
  for (const [type, words] of TYPE_WORDS) {
    if (words.some((w) => s.includes(w))) return type;
  }
  return 'flat';
}

const STATUS_WORDS: Record<string, PropertyStatus> = {
  to_visit: 'to_visit',
  tovisit: 'to_visit',
  'to visit': 'to_visit',
  planned: 'to_visit',
  pending: 'to_visit',
  visited: 'visited',
  seen: 'visited',
  shortlisted: 'shortlisted',
  shortlist: 'shortlisted',
  maybe: 'shortlisted',
  negotiating: 'negotiating',
  negotiation: 'negotiating',
  rejected: 'rejected',
  reject: 'rejected',
  dropped: 'rejected',
  no: 'rejected',
};

export function normalizeStatus(raw: string | undefined): PropertyStatus {
  const s = (raw ?? '').toLowerCase().trim();
  return STATUS_WORDS[s] ?? 'to_visit';
}

const FACING_WORDS: Record<string, Facing> = {
  n: 'N',
  north: 'N',
  ne: 'NE',
  northeast: 'NE',
  'north east': 'NE',
  'north-east': 'NE',
  e: 'E',
  east: 'E',
  se: 'SE',
  southeast: 'SE',
  'south east': 'SE',
  'south-east': 'SE',
  s: 'S',
  south: 'S',
  sw: 'SW',
  southwest: 'SW',
  'south west': 'SW',
  'south-west': 'SW',
  w: 'W',
  west: 'W',
  nw: 'NW',
  northwest: 'NW',
  'north west': 'NW',
  'north-west': 'NW',
};

export function normalizeFacing(raw: string | undefined): Facing {
  const s = (raw ?? '').toLowerCase().trim();
  return FACING_WORDS[s] ?? '';
}

const OWNERSHIP_WORDS: Record<string, Ownership> = {
  freehold: 'freehold',
  free: 'freehold',
  leasehold: 'leasehold',
  lease: 'leasehold',
  patta: 'patta',
  'jda patta': 'patta',
  gpa: 'power_of_attorney',
  poa: 'power_of_attorney',
  'power of attorney': 'power_of_attorney',
};

function normalizeOwnership(raw: string | undefined): Ownership {
  const s = (raw ?? '').toLowerCase().trim();
  return OWNERSHIP_WORDS[s] ?? 'unknown';
}

const FURNISHING_WORDS: Record<string, Furnishing> = {
  unfurnished: 'unfurnished',
  bare: 'unfurnished',
  semi: 'semi',
  'semi furnished': 'semi',
  'semi-furnished': 'semi',
  full: 'full',
  furnished: 'full',
  'fully furnished': 'full',
};

function normalizeFurnishing(raw: string | undefined): Furnishing {
  const s = (raw ?? '').toLowerCase().trim();
  return FURNISHING_WORDS[s] ?? 'unknown';
}

const ROLE_WORDS: Record<string, ContactRole> = {
  builder: 'builder',
  developer: 'builder',
  broker: 'broker',
  agent: 'broker',
  dealer: 'broker',
  owner: 'owner',
  seller: 'owner',
};

function normalizeRole(raw: string | undefined): ContactRole | undefined {
  const s = (raw ?? '').toLowerCase().trim();
  return ROLE_WORDS[s];
}

/**
 * Matches a free-text amenity to a catalogue id: exact id, then exact label,
 * then a loose word overlap. Anything unmatched is returned so it can be kept
 * as a tag rather than silently dropped.
 */
export function resolveAmenities(input: string[] | undefined): {
  ids: string[];
  unmatched: string[];
} {
  const ids = new Set<string>();
  const unmatched: string[] = [];
  if (!input) return { ids: [], unmatched };

  for (const rawTerm of input) {
    const term = rawTerm.trim();
    if (!term) continue;
    const lower = term.toLowerCase();

    const byId = AMENITIES.find((a) => a.id === term || a.id === `am_${lower}`);
    if (byId) {
      ids.add(byId.id);
      continue;
    }
    const byLabel = AMENITIES.find((a) => a.label.toLowerCase() === lower);
    if (byLabel) {
      ids.add(byLabel.id);
      continue;
    }
    const words = lower.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const byWords = AMENITIES.find((a) => {
      const label = a.label.toLowerCase();
      return words.length > 0 && words.every((w) => label.includes(w));
    });
    if (byWords) {
      ids.add(byWords.id);
      continue;
    }
    unmatched.push(term);
  }
  return { ids: [...ids], unmatched };
}

/** Turns a maps string, URL or "lat,lng" pair into what we can use. */
function parseMaps(raw: string | undefined): { mapsQuery?: string; lat?: number; lng?: number } {
  const s = (raw ?? '').trim();
  if (!s) return {};

  const coords = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (coords) {
    const lat = Number.parseFloat(coords[1]!);
    const lng = Number.parseFloat(coords[2]!);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng, mapsQuery: s };
    }
  }

  // Pull coordinates out of a pasted Google Maps URL when they are present.
  const atMatch = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s);
  if (atMatch) {
    return {
      mapsQuery: s,
      lat: Number.parseFloat(atMatch[1]!),
      lng: Number.parseFloat(atMatch[2]!),
    };
  }
  return { mapsQuery: s };
}

const num = (v: number | string | undefined): number | undefined => parseNum(v ?? '');
const money = (v: number | string | undefined): number | undefined => parseMoney(v ?? '');

/** Drops undefined values so we never write `undefined` into IndexedDB fields. */
function compact<T extends object>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/**
 * Converts a hand-written seed into a full Property.
 * Ids are derived from the name so re-seeding updates rather than duplicates.
 */
export function fromSeed(seed: PropertySeed, now = Date.now()): Property {
  const type = normalizeType(seed.type ?? seed.config ?? seed.name);
  const { ids: amenityIds, unmatched } = resolveAmenities(seed.amenities);
  const maps = parseMaps(seed.maps);

  const tags = [...(seed.tags ?? []), ...unmatched];

  const costs = compact({
    askingPrice: money(seed.price),
    lastQuote: money(seed.lastQuote),
    monthlyMaintenance: money(seed.maintenance),
    parkingCharge: money(seed.parkingCharge),
    clubhouseCharge: money(seed.clubCharge),
    plcCharge: money(seed.plc),
    maintenanceDeposit: money(seed.deposit),
    brokeragePct: num(seed.brokeragePct) ?? DEFAULT_SETTINGS.defaultBrokeragePct,
    gstPct: num(seed.gstPct),
    otherCharges: money(seed.otherCharges),
    interiorsBudget: money(seed.interiors),
  });

  const negotiation = compact({
    marketRatePerSqft: money(seed.marketRate),
    leverage: [] as string[],
  });
  negotiation.leverage = [];

  const approvals = compact({
    rera: typeof seed.rera === 'boolean' ? seed.rera : seed.rera ? true : undefined,
    reraNumber: typeof seed.rera === 'string' ? seed.rera : undefined,
  });

  const base: Property = {
    id: slugId(seed.name),
    name: seed.name.trim(),
    type,
    status: normalizeStatus(seed.status),
    costs,
    negotiation,
    amenities: amenityIds,
    scores: {},
    checks: {},
    answers: {},
    pros: seed.pros ?? [],
    cons: seed.cons ?? [],
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...base,
    ...compact({
      builder: seed.builder,
      contactName: seed.contact,
      contactPhone: seed.phone,
      contactRole: normalizeRole(seed.role),
      locality: seed.locality,
      address: seed.address,
      mapsQuery: maps.mapsQuery,
      lat: maps.lat,
      lng: maps.lng,
      config: seed.config,
      superBuiltUpSqft: num(seed.sqft),
      builtUpSqft: num(seed.builtUp),
      carpetSqft: num(seed.carpet),
      plotSqyd: num(seed.sqyd),
      floor: seed.floor !== undefined ? String(seed.floor) : undefined,
      totalFloors: num(seed.totalFloors),
      facing: normalizeFacing(seed.facing) || undefined,
      ageYears: num(seed.age),
      possession: seed.possession,
      furnishing: normalizeFurnishing(seed.furnishing) === 'unknown' ? undefined : normalizeFurnishing(seed.furnishing),
      bedrooms: num(seed.bedrooms),
      bathrooms: num(seed.bathrooms),
      balconies: num(seed.balconies),
      parkingSlots: num(seed.parking),
      ownership: normalizeOwnership(seed.ownership) === 'unknown' ? undefined : normalizeOwnership(seed.ownership),
      approvals: Object.keys(approvals).length > 0 ? approvals : undefined,
      notes: seed.notes,
      sourceUrl: seed.url,
      tags: tags.length > 0 ? tags : undefined,
      brief: seed.brief,
      tripDay: seed.day,
      visitTime: seed.time,
      visitDate: seed.date,
    }),
  };
}

/** A fresh, empty property for the Add screen. */
export function blankProperty(type: PropertyType = 'flat'): Property {
  const now = Date.now();
  return {
    id: newId(),
    name: '',
    type,
    status: 'to_visit',
    costs: { brokeragePct: DEFAULT_SETTINGS.defaultBrokeragePct },
    negotiation: { leverage: [] },
    amenities: [],
    scores: {},
    checks: {},
    answers: {},
    pros: [],
    cons: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Repairs a property record read from storage or a backup file so the rest of
 * the app can assume its collections exist. Anything unrecognised is discarded
 * rather than allowed to crash a screen.
 */
export function normalizeProperty(raw: unknown): Property | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Property> & Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name.trim()) return null;

  const now = Date.now();
  return {
    ...r,
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    name: r.name.trim(),
    type: normalizeType(typeof r.type === 'string' ? r.type : undefined),
    status: normalizeStatus(typeof r.status === 'string' ? r.status : undefined),
    costs: isObject(r.costs) ? (r.costs as Property['costs']) : {},
    negotiation: {
      ...(isObject(r.negotiation) ? r.negotiation : {}),
      leverage: Array.isArray(r.negotiation?.leverage)
        ? r.negotiation.leverage.filter((x): x is string => typeof x === 'string')
        : [],
    },
    amenities: Array.isArray(r.amenities)
      ? r.amenities.filter((x): x is string => typeof x === 'string')
      : [],
    scores: isObject(r.scores) ? (r.scores as Record<string, number>) : {},
    checks: isObject(r.checks) ? (r.checks as Property['checks']) : {},
    answers: isObject(r.answers) ? (r.answers as Record<string, string>) : {},
    pros: Array.isArray(r.pros) ? r.pros.filter((x): x is string => typeof x === 'string') : [],
    cons: Array.isArray(r.cons) ? r.cons.filter((x): x is string => typeof x === 'string') : [],
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
  } as Property;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Google Maps link for directions, from coordinates when we have them. */
export function mapsUrl(p: Property): string | undefined {
  if (typeof p.lat === 'number' && typeof p.lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  const q = [p.mapsQuery, p.address, p.locality && `${p.locality}, Jaipur`, p.name]
    .filter(Boolean)
    .find((x) => typeof x === 'string' && x.trim().length > 0);
  if (!q) return undefined;
  if (/^https?:\/\//i.test(q)) return q;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Directions link between two properties, for the trip planner. */
export function directionsUrl(from: Property, to: Property): string | undefined {
  const origin = locationTerm(from);
  const dest = locationTerm(to);
  if (!origin || !dest) return undefined;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
}

export function locationTerm(p: Property): string | undefined {
  if (typeof p.lat === 'number' && typeof p.lng === 'number') return `${p.lat},${p.lng}`;
  const q = p.mapsQuery ?? p.address ?? (p.locality ? `${p.locality}, Jaipur` : undefined);
  if (q && /^https?:\/\//i.test(q)) return p.address ?? p.locality ?? p.name;
  return q ?? p.name;
}
