/**
 * PropScout domain model.
 *
 * All money is stored as plain rupees (integers). Areas are stored in the unit
 * named by the field (sqft / sqyd) so nothing is silently converted.
 *
 * Everything is optional except id/name/type/status so a property can be added
 * with just a name while standing at the gate, and filled in later.
 */

export type PropertyType = 'flat' | 'villa' | 'plot' | 'commercial';

export type PropertyStatus =
  | 'to_visit'
  | 'visited'
  | 'shortlisted'
  | 'negotiating'
  | 'rejected';

export type CheckState = 'unchecked' | 'ok' | 'issue' | 'na';

export type Facing = '' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type ContactRole = 'builder' | 'broker' | 'owner' | 'other';

export type Ownership = 'unknown' | 'freehold' | 'leasehold' | 'patta' | 'power_of_attorney';

export type Furnishing = 'unknown' | 'unfurnished' | 'semi' | 'full';

export interface PropertyCosts {
  /** The advertised / quoted price, before extras. */
  askingPrice?: number;
  /** Quote the seller has come down to most recently, if different. */
  lastQuote?: number;
  parkingCharge?: number;
  clubhouseCharge?: number;
  /** Preferred Location Charge (corner / park facing / low floor). */
  plcCharge?: number;
  /** One-time sinking fund / maintenance deposit taken by society. */
  maintenanceDeposit?: number;
  /** Recurring society maintenance, per month. */
  monthlyMaintenance?: number;
  /** Brokerage as a % of price. Usually 1-2% in Jaipur. */
  brokeragePct?: number;
  /** GST %: 0 for ready-to-move & resale, 5 under-construction, 1 affordable. */
  gstPct?: number;
  /** Stamp duty %. Rajasthan default is applied if left blank. */
  stampDutyPct?: number;
  registrationPct?: number;
  otherCharges?: number;
  /** What you expect to spend making it liveable. */
  interiorsBudget?: number;
}

export interface Negotiation {
  /** Going rate per sqft in this locality, from your own research. */
  marketRatePerSqft?: number;
  targetPrice?: number;
  walkAwayPrice?: number;
  /** ids from LEVERAGE catalogue that apply to this deal. */
  leverage: string[];
  notes?: string;
}

export interface Approvals {
  rera?: boolean;
  reraNumber?: string;
  /** JDA / municipal approved layout. */
  jda?: boolean;
  /** 90A / 90B agricultural-to-residential land conversion done. */
  conversion90?: boolean;
  buildingPlanSanction?: boolean;
  completionCert?: boolean;
  occupancyCert?: boolean;
  /** Banks that have approved this project for home loans. */
  loanApprovedBy?: string;
}

export interface CheckResult {
  state: CheckState;
  note?: string;
}

export type PossessionStatus = 'ready_to_move' | 'near_possession' | 'under_construction';

export type Confidence = 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';

/**
 * Pre-visit research carried into the app from the knowledge base: what is
 * already known about this property, what to verify on the ground, and the
 * exact arguments to use. Read-only reference — never overwritten by edits
 * you make on site.
 */
export interface PropertyBrief {
  /** Rank in the shortlist, 1 = best. */
  rank?: number;
  /** One-line summary of the read on this property. */
  verdict?: string;
  confidence?: Confidence;
  possessionStatus?: PossessionStatus;
  possessionNote?: string;

  /** Micro-market average rate for the locality, for the price comparison. */
  localityRatePerSqft?: number;
  /** Direction of travel in the locality, e.g. "-2.54% this quarter". */
  localityTrend?: string;

  loadingPct?: number;
  carpetRange?: [number, number];
  superRange?: [number, number];
  /** Quoted price range seen across portals. */
  priceRange?: [number, number];
  /** Realistically achievable negotiated base price. */
  negotiatedRange?: [number, number];
  /** Estimated total landed cost including everything. */
  allInRange?: [number, number];

  monthlyRentEstimate?: number;
  rentalYieldPct?: number;

  waterSource?: string;
  airportKm?: number;
  railwayKm?: number;
  metro?: string;
  schools?: string[];
  hospitals?: string[];

  developer?: string;
  developerNote?: string;
  /** Developer credibility out of 10. */
  developerScore?: number;

  /** Desk-research scores out of 10, for context against your own ratings. */
  kbScores?: {
    livability?: number;
    liquidity?: number;
    construction?: number;
    developer?: number;
    value?: number;
    negotiationRoom?: number;
  };

  /** What you can realistically win here. */
  winnable?: string[];
  /** What you will not win here — do not waste the visit on it. */
  hardToWin?: string[];
  /** Lines to use verbatim, specific to this property. */
  scripts?: string[];
  /** The conditions under which you should walk away from this one. */
  walkAway?: string[];
  /** Property-specific things to verify on site, beyond the standard checklist. */
  watchouts?: string[];
  /** Claims that are unverified and must be confirmed. */
  unverified?: string[];
  /** Which other properties to play this one against. */
  competitors?: string[];
  /** GST position: 0 for ready with OC, 5 for under construction. */
  gstPct?: number;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  status: PropertyStatus;
  /** Pre-visit research, if this property came from the knowledge base. */
  brief?: PropertyBrief;

  // Who
  builder?: string;
  contactName?: string;
  contactPhone?: string;
  contactRole?: ContactRole;

  // Where
  locality?: string;
  address?: string;
  /** Free text used to build a Google Maps link, e.g. "Mansarovar, Jaipur". */
  mapsQuery?: string;
  lat?: number;
  lng?: number;

  // What
  config?: string;
  superBuiltUpSqft?: number;
  builtUpSqft?: number;
  carpetSqft?: number;
  /** Plot size in square yards (how Jaipur quotes land). */
  plotSqyd?: number;
  floor?: string;
  totalFloors?: number;
  facing?: Facing;
  ageYears?: number;
  possession?: string;
  furnishing?: Furnishing;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  parkingSlots?: number;

  // Legal
  ownership?: Ownership;
  approvals?: Approvals;

  costs: PropertyCosts;
  negotiation: Negotiation;

  /** ids from the AMENITIES catalogue that this property actually has. */
  amenities: string[];
  /** criterionId -> 1..5 rating. */
  scores: Record<string, number>;
  /** checkId -> result. */
  checks: Record<string, CheckResult>;
  /** questionId -> the answer you were given. */
  answers: Record<string, string>;

  pros: string[];
  cons: string[];
  notes?: string;

  // Trip planning
  visitDate?: string;
  visitTime?: string;
  tripDay?: number;
  order?: number;

  sourceUrl?: string;
  tags?: string[];

  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

export type MediaKind = 'photo' | 'video' | 'audio';

/** Light record kept in its own store so listing a property never loads blobs. */
export interface MediaMeta {
  id: string;
  propertyId: string;
  kind: MediaKind;
  mime: string;
  sizeBytes: number;
  caption?: string;
  /** Room / area label, e.g. "Kitchen", "Terrace", "Approach road". */
  tag?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface Settings {
  /** Applied when a property leaves stampDutyPct blank. */
  defaultStampDutyPct: number;
  defaultRegistrationPct: number;
  defaultBrokeragePct: number;
  /** Rajasthan charges a labour cess as a % of the stamp duty amount. */
  labourCessPctOfStampDuty: number;
  /**
   * Rajasthan charges a lower stamp duty when the buyer is a sole female.
   * 2026 rates: ~8.98% all-in for men/joint vs ~7.65% for a sole female buyer.
   */
  womanBuyer: boolean;
  womanStampDutyPct: number;
  loanInterestPct: number;
  loanTenureYears: number;
  loanToValuePct: number;
  /** 'normal' | 'large' | 'xlarge' - bumps the root font size. */
  textSize: 'normal' | 'large' | 'xlarge';
  theme: 'light' | 'dark';
  /** Hide nice-to-have checklist rows in Visit Mode. */
  visitModeEssentialsOnly: boolean;
  /** Longest side in px that captured photos are downscaled to. */
  photoMaxEdge: number;
  city: string;
  /** Where you set out from each day — drives the trip route origin. */
  homeBase: string;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultStampDutyPct: 6,
  defaultRegistrationPct: 1,
  defaultBrokeragePct: 1,
  labourCessPctOfStampDuty: 20,
  womanBuyer: false,
  womanStampDutyPct: 5,
  loanInterestPct: 8.5,
  loanTenureYears: 20,
  loanToValuePct: 80,
  textSize: 'large',
  theme: 'light',
  visitModeEssentialsOnly: true,
  photoMaxEdge: 1600,
  city: 'Jaipur',
  homeBase: 'Jaipur Airport',
};

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  flat: 'Flat / Apartment',
  villa: 'House / Villa',
  plot: 'Plot / Land',
  commercial: 'Commercial',
};

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  to_visit: 'To visit',
  visited: 'Visited',
  shortlisted: 'Shortlisted',
  negotiating: 'Negotiating',
  rejected: 'Rejected',
};

export const STATUS_ORDER: PropertyStatus[] = [
  'to_visit',
  'visited',
  'shortlisted',
  'negotiating',
  'rejected',
];
