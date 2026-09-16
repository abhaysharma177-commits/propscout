/**
 * Indian money formatting, parsing and property cost maths.
 *
 * All amounts are plain rupees. Nothing here rounds silently except where the
 * function name says so.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPlain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const LAKH = 100_000;
const CRORE = 10_000_000;

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** "₹45,00,000" — full precision, Indian digit grouping. */
export function formatINR(n: number | undefined | null): string {
  if (!isFiniteNumber(n)) return '—';
  return inr.format(Math.round(n));
}

/** "45,00,000" without the symbol. */
export function formatPlain(n: number | undefined | null): string {
  if (!isFiniteNumber(n)) return '—';
  return inrPlain.format(Math.round(n));
}

/**
 * "₹1.25 Cr" / "₹45 L" / "₹8,500" — the short form used on cards and tiles.
 * Trailing ".0" and ".00" are trimmed so ₹1 Cr does not read as ₹1.00 Cr.
 */
export function formatCompact(n: number | undefined | null): string {
  if (!isFiniteNumber(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= CRORE) return `${sign}₹${trimZeros(abs / CRORE, 2)} Cr`;
  if (abs >= LAKH) return `${sign}₹${trimZeros(abs / LAKH, 2)} L`;
  if (abs >= 1000) return `${sign}₹${trimZeros(abs / 1000, 1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

/** Words, for the "did I type the right number of zeros?" confirmation line. */
export function inWords(n: number | undefined | null): string {
  if (!isFiniteNumber(n) || n === 0) return '';
  const abs = Math.abs(n);
  if (abs >= CRORE) return `${trimZeros(abs / CRORE, 2)} crore`;
  if (abs >= LAKH) return `${trimZeros(abs / LAKH, 2)} lakh`;
  if (abs >= 1000) return `${trimZeros(abs / 1000, 2)} thousand`;
  return String(Math.round(abs));
}

function trimZeros(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Accepts what a person would actually type: "8500000", "85,00,000", "85 lakh",
 * "85L", "1.2 cr", "1.2crore", "₹85L". Returns undefined for anything unusable
 * rather than NaN, so callers never have to guard against NaN leaking into maths.
 */
export function parseMoney(raw: string | number | undefined | null): number | undefined {
  if (isFiniteNumber(raw)) return raw;
  if (typeof raw !== 'string') return undefined;

  const s = raw
    .toLowerCase()
    .replace(/[₹,\s_]/g, '')
    .replace(/rs\.?/g, '')
    .trim();
  if (!s) return undefined;

  const match = /^(-?\d*\.?\d+)(cr|crore|crores|l|lac|lakh|lakhs|k|thousand)?$/.exec(s);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1]!);
  if (!Number.isFinite(value)) return undefined;

  switch (match[2]) {
    case 'cr':
    case 'crore':
    case 'crores':
      return value * CRORE;
    case 'l':
    case 'lac':
    case 'lakh':
    case 'lakhs':
      return value * LAKH;
    case 'k':
    case 'thousand':
      return value * 1000;
    default:
      return value;
  }
}

/** Parses a plain number field (areas, percentages, counts). */
export function parseNum(raw: string | number | undefined | null): number | undefined {
  if (isFiniteNumber(raw)) return raw;
  if (typeof raw !== 'string') return undefined;
  const s = raw.replace(/[,\s₹]/g, '');
  if (!s) return undefined;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

export const SQYD_TO_SQFT = 9;

export function sqydToSqft(sqyd: number): number {
  return sqyd * SQYD_TO_SQFT;
}

/** Rate per sqft, or undefined when either input is missing or zero. */
export function perSqft(price: number | undefined, sqft: number | undefined): number | undefined {
  if (!isFiniteNumber(price) || !isFiniteNumber(sqft) || sqft <= 0) return undefined;
  return price / sqft;
}

/**
 * Super built-up vs carpet gap, as a percentage of super built-up.
 * Under ~25% is efficient, over ~35% means a lot of shared corridor.
 */
export function loadingPct(
  superBuiltUp: number | undefined,
  carpet: number | undefined,
): number | undefined {
  if (!isFiniteNumber(superBuiltUp) || !isFiniteNumber(carpet)) return undefined;
  if (superBuiltUp <= 0 || carpet <= 0 || carpet > superBuiltUp) return undefined;
  return ((superBuiltUp - carpet) / superBuiltUp) * 100;
}

export interface EmiResult {
  monthly: number;
  totalPayable: number;
  totalInterest: number;
  principal: number;
}

/**
 * Standard reducing-balance EMI.
 * A 0% rate falls back to simple division rather than dividing by zero.
 */
export function emi(principal: number, annualRatePct: number, years: number): EmiResult {
  const months = Math.round(years * 12);
  if (!isFiniteNumber(principal) || principal <= 0 || months <= 0) {
    return { monthly: 0, totalPayable: 0, totalInterest: 0, principal: Math.max(0, principal || 0) };
  }
  const r = annualRatePct / 12 / 100;
  let monthly: number;
  if (!isFiniteNumber(r) || r <= 0) {
    monthly = principal / months;
  } else {
    const factor = Math.pow(1 + r, months);
    monthly = (principal * r * factor) / (factor - 1);
  }
  const totalPayable = monthly * months;
  return {
    monthly,
    totalPayable,
    totalInterest: totalPayable - principal,
    principal,
  };
}

export interface CostLine {
  id: string;
  label: string;
  amount: number;
  /** Shown as a muted explanation under the line. */
  note?: string;
  /** One-time vs recurring — recurring lines are excluded from the total. */
  recurring?: boolean;
}

export interface CostBreakdown {
  /** The headline / quoted price. */
  basePrice: number;
  /** Extras charged by the seller on top of the base price. */
  sellerExtras: number;
  /** Government and transaction costs. */
  transactionCosts: number;
  /** Your own spend to make it liveable. */
  yourSpend: number;
  /** Everything one-time, added up. This is the real number. */
  grandTotal: number;
  /** Monthly recurring cost (maintenance), shown separately. */
  monthlyRecurring: number;
  lines: CostLine[];
  /** grandTotal as a percentage above basePrice. */
  upliftPct: number;
}

export interface CostInputs {
  askingPrice?: number;
  parkingCharge?: number;
  clubhouseCharge?: number;
  plcCharge?: number;
  maintenanceDeposit?: number;
  monthlyMaintenance?: number;
  brokeragePct?: number;
  gstPct?: number;
  stampDutyPct?: number;
  registrationPct?: number;
  otherCharges?: number;
  interiorsBudget?: number;
  /** Rajasthan levies a labour cess as a % OF the stamp duty amount. */
  labourCessPctOfStampDuty?: number;
  /**
   * Circle (DLC) rate value for the property. Stamp duty applies on whichever
   * is higher: this or the agreement value.
   */
  dlcValue?: number;
}

const n = (v: number | undefined): number => (isFiniteNumber(v) ? v : 0);

/**
 * Builds the full "what will this actually cost me" breakdown.
 *
 * Deliberate choices:
 * - Seller extras (parking, club, PLC) are treated as part of the consideration,
 *   so stamp duty and GST apply on top of them too. That is how a cost sheet works.
 * - Stamp duty is charged on max(consideration, DLC value), matching Rajasthan practice.
 * - Monthly maintenance is never folded into the total; it is reported separately.
 */
export function computeCosts(input: CostInputs): CostBreakdown {
  const basePrice = n(input.askingPrice);

  const parking = n(input.parkingCharge);
  const club = n(input.clubhouseCharge);
  const plc = n(input.plcCharge);
  const deposit = n(input.maintenanceDeposit);
  const other = n(input.otherCharges);

  // Consideration = what the seller receives for the property itself.
  const consideration = basePrice + parking + club + plc;

  const gst = (consideration * n(input.gstPct)) / 100;
  const brokerage = (consideration * n(input.brokeragePct)) / 100;

  const dutyBase = Math.max(consideration, n(input.dlcValue));
  const stampDuty = (dutyBase * n(input.stampDutyPct)) / 100;
  const labourCess = (stampDuty * n(input.labourCessPctOfStampDuty)) / 100;
  const registration = (dutyBase * n(input.registrationPct)) / 100;

  const interiors = n(input.interiorsBudget);
  const monthlyRecurring = n(input.monthlyMaintenance);

  const lines: CostLine[] = [
    { id: 'base', label: 'Quoted price', amount: basePrice },
    { id: 'parking', label: 'Parking', amount: parking },
    { id: 'club', label: 'Club / amenities charge', amount: club },
    { id: 'plc', label: 'Preferred location charge', amount: plc },
    {
      id: 'gst',
      label: `GST${input.gstPct ? ` @ ${input.gstPct}%` : ''}`,
      amount: gst,
      note: input.gstPct ? undefined : 'Nil for ready-to-move and resale',
    },
    {
      id: 'stamp',
      label: `Stamp duty${input.stampDutyPct ? ` @ ${input.stampDutyPct}%` : ''}`,
      amount: stampDuty,
      note:
        n(input.dlcValue) > consideration
          ? 'Charged on the DLC rate, which is higher than the deal value'
          : undefined,
    },
    { id: 'cess', label: 'Labour cess on stamp duty', amount: labourCess },
    {
      id: 'reg',
      label: `Registration${input.registrationPct ? ` @ ${input.registrationPct}%` : ''}`,
      amount: registration,
    },
    {
      id: 'brokerage',
      label: `Brokerage${input.brokeragePct ? ` @ ${input.brokeragePct}%` : ''}`,
      amount: brokerage,
    },
    { id: 'deposit', label: 'Maintenance / corpus deposit', amount: deposit },
    { id: 'other', label: 'Other charges', amount: other },
    { id: 'interiors', label: 'Interiors & move-in', amount: interiors },
    {
      id: 'monthly',
      label: 'Monthly maintenance',
      amount: monthlyRecurring,
      recurring: true,
      note: 'Every month, forever — not included in the total',
    },
  ].filter((l) => l.amount > 0);

  const sellerExtras = parking + club + plc + deposit + other;
  const transactionCosts = gst + stampDuty + labourCess + registration + brokerage;
  const yourSpend = interiors;
  const grandTotal = basePrice + sellerExtras + transactionCosts + yourSpend;

  return {
    basePrice,
    sellerExtras,
    transactionCosts,
    yourSpend,
    grandTotal,
    monthlyRecurring,
    lines,
    upliftPct: basePrice > 0 ? ((grandTotal - basePrice) / basePrice) * 100 : 0,
  };
}

/** Annual rent / price, as a percentage. Below ~2% means price is ahead of value. */
export function rentalYieldPct(
  monthlyRent: number | undefined,
  price: number | undefined,
): number | undefined {
  if (!isFiniteNumber(monthlyRent) || !isFiniteNumber(price) || price <= 0) return undefined;
  return ((monthlyRent * 12) / price) * 100;
}

export function formatPct(n: number | undefined, decimals = 1): string {
  if (!isFiniteNumber(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function formatSqft(n: number | undefined): string {
  if (!isFiniteNumber(n)) return '—';
  return `${inrPlain.format(Math.round(n))} sqft`;
}
