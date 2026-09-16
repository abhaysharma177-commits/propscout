import { LEVERAGE_BY_ID } from '../data/leverage';
import type { Property, PropertyType } from '../types';
import { isFiniteNumber, perSqft } from './money';

/**
 * Negotiation estimator.
 *
 * This produces a *range*, from a starting room typical for the property type
 * plus whatever leverage applies. It is a structured opinion, not a valuation —
 * the UI always labels it as an estimate.
 */

/** Typical starting room off asking, before any leverage, by property type. */
const BASE_ROOM: Record<PropertyType, number> = {
  flat: 5,
  villa: 6,
  plot: 7,
  commercial: 6,
};

/** Resale sellers usually have more personal room than a builder's sales desk. */
const RESALE_BONUS = 1.5;

/** Never suggest more than this, however many boxes are ticked. */
const MAX_ROOM = 25;

/**
 * How much of a measured "above market" premium to claim as negotiation room.
 *
 * Deliberately conservative. A locality average covers all stock, so a branded
 * project legitimately sits above it for reasons that are not negotiable —
 * build quality, amenities, the developer's balance sheet. Claiming the whole
 * premium produces offers that are simply too low to be credible in the room,
 * which costs you the seller's attention. Calibrated against the researched
 * "realistically negotiable" figures for the shortlist.
 */
const PREMIUM_CLAIM = 0.35;
const PREMIUM_CAP = 5;

/** How far below the target to open, in percentage points. */
const OPENING_GAP = 4;

export interface LeverageContribution {
  id: string;
  label: string;
  pct: number;
}

export interface NegotiationEstimate {
  /** Point estimate of achievable discount off asking, in %. */
  roomPct: number;
  /** Conservative end of the range. */
  roomLowPct: number;
  /** Optimistic end of the range. */
  roomHighPct: number;

  askingPrice?: number;
  /** Your first number. Deliberately below the target. */
  suggestedOpening?: number;
  /** What you should realistically aim to pay. */
  suggestedTarget?: number;
  /** The most you should pay. Above this, walk. */
  suggestedWalkAway?: number;
  /** Rupees saved if you land the target. */
  estimatedSaving?: number;

  askRatePerSqft?: number;
  marketRatePerSqft?: number;
  /** Positive = asking above market, negative = below. */
  marketPremiumPct?: number;
  /** What the property is worth at the market rate you entered. */
  marketValue?: number;

  base: number;
  contributions: LeverageContribution[];
  againstYou: LeverageContribution[];
  /** Extra room derived from the market-rate comparison, if any. */
  marketContribution?: number;
  notes: string[];
}

/** The area a price should be judged against, for this property type. */
export function chargeableSqft(p: Property): number | undefined {
  if (p.type === 'plot') {
    // Plots are quoted per sq yard in Jaipur; convert so rates stay comparable.
    return isFiniteNumber(p.plotSqyd) ? p.plotSqyd * 9 : undefined;
  }
  return p.superBuiltUpSqft ?? p.builtUpSqft ?? p.carpetSqft ?? undefined;
}

export function estimateNegotiation(p: Property): NegotiationEstimate {
  const notes: string[] = [];
  const asking = p.costs.lastQuote ?? p.costs.askingPrice;
  const sqft = chargeableSqft(p);
  const askRate = perSqft(asking, sqft);
  const marketRate = p.negotiation.marketRatePerSqft;

  let base = BASE_ROOM[p.type];
  const isResale = isFiniteNumber(p.ageYears) && p.ageYears > 0;
  if (isResale) {
    base += RESALE_BONUS;
    notes.push('Resale seller, so slightly more personal room than a builder desk.');
  }

  // Market comparison.
  let marketPremiumPct: number | undefined;
  let marketValue: number | undefined;
  let marketContribution: number | undefined;
  const haveMarketRate = isFiniteNumber(marketRate) && marketRate > 0;

  if (haveMarketRate && isFiniteNumber(sqft) && sqft > 0) {
    marketValue = marketRate * sqft;
    if (isFiniteNumber(askRate)) {
      marketPremiumPct = ((askRate - marketRate) / marketRate) * 100;
      if (marketPremiumPct > 0) {
        // Only claim part of the premium; the rest is brand, spec and condition.
        marketContribution = Math.min(marketPremiumPct * PREMIUM_CLAIM, PREMIUM_CAP);
        notes.push(
          `Asking rate is ${marketPremiumPct.toFixed(0)}% above the market rate you entered, which is your strongest single argument.`,
        );
      } else if (marketPremiumPct < -3) {
        notes.push(
          `Asking rate is already below the market rate you entered. Verify there is nothing wrong with the property, then move quickly.`,
        );
      }
    }
  } else {
    notes.push(
      'Enter the going rate per sqft for this locality to sharpen this estimate considerably.',
    );
  }

  // Leverage. When a market rate is present, the computed premium replaces the
  // manual "asking above market" tick so the same argument is not counted twice.
  const contributions: LeverageContribution[] = [];
  const againstYou: LeverageContribution[] = [];
  for (const id of p.negotiation.leverage) {
    const item = LEVERAGE_BY_ID[id];
    if (!item) continue;
    if (item.id === 'lv_above_market' && marketContribution !== undefined) {
      notes.push(
        'Using the measured market premium instead of the "above market rate" tick, to avoid double counting.',
      );
      continue;
    }
    const entry = { id: item.id, label: item.label, pct: item.pct };
    if (item.pct >= 0) contributions.push(entry);
    else againstYou.push(entry);
  }

  const leverageSum = [...contributions, ...againstYou].reduce((sum, c) => sum + c.pct, 0);
  const raw = base + leverageSum + (marketContribution ?? 0);
  const roomPct = clamp(raw, 0, MAX_ROOM);

  if (raw > MAX_ROOM) {
    notes.push(
      `Capped at ${MAX_ROOM}%. Discounts beyond this are rare outside a genuinely distressed sale.`,
    );
  }

  // Band: tighter on the low side, wider on the high side.
  const roomLowPct = clamp(roomPct * 0.6, 0, MAX_ROOM);
  const roomHighPct = clamp(roomPct * 1.25, 0, MAX_ROOM + 5);

  const result: NegotiationEstimate = {
    roomPct,
    roomLowPct,
    roomHighPct,
    base,
    contributions,
    againstYou,
    notes,
  };

  if (marketContribution !== undefined) result.marketContribution = marketContribution;
  if (isFiniteNumber(askRate)) result.askRatePerSqft = askRate;
  if (haveMarketRate) result.marketRatePerSqft = marketRate;
  if (isFiniteNumber(marketPremiumPct)) result.marketPremiumPct = marketPremiumPct;
  if (isFiniteNumber(marketValue)) result.marketValue = marketValue;

  if (isFiniteNumber(asking) && asking > 0) {
    result.askingPrice = asking;
    const target = asking * (1 - roomPct / 100);
    const opening = asking * (1 - clamp(roomPct + OPENING_GAP, 0, 40) / 100);

    // Most you should pay: the conservative end of the range, but never above
    // what the property is worth at the market rate you researched.
    let walkAway = asking * (1 - roomLowPct / 100);
    if (isFiniteNumber(marketValue) && marketValue < walkAway) {
      walkAway = marketValue;
      notes.push('Walk-away capped at market value — do not pay above the rate you researched.');
    }

    result.suggestedTarget = target;
    result.suggestedOpening = opening;
    result.suggestedWalkAway = walkAway;
    result.estimatedSaving = asking - target;
  }

  return result;
}

function clamp(v: number, lo: number, hi: number): number {
  if (!isFiniteNumber(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

/** Short human verdict on the asking price, for the property card. */
export function priceVerdict(e: NegotiationEstimate): {
  tone: 'good' | 'fair' | 'high';
  text: string;
} {
  const premium = e.marketPremiumPct;
  if (!isFiniteNumber(premium)) {
    return { tone: 'fair', text: 'No market rate entered yet' };
  }
  if (premium > 12) return { tone: 'high', text: `${premium.toFixed(0)}% above market rate` };
  if (premium > 4) return { tone: 'high', text: `${premium.toFixed(0)}% above market` };
  if (premium < -4) return { tone: 'good', text: `${Math.abs(premium).toFixed(0)}% below market` };
  return { tone: 'fair', text: 'Around the market rate' };
}
