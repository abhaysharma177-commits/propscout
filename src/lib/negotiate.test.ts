import { describe, expect, it } from 'vitest';
import { SEED_PROPERTIES } from '../data/seed';
import { chargeableSqft, estimateNegotiation, priceVerdict } from './negotiate';
import { fromSeed } from './property';
import type { Property } from '../types';
import { blankProperty } from './property';

function flat(over: Partial<Property> = {}): Property {
  const base = blankProperty('flat');
  return {
    ...base,
    name: 'Test',
    superBuiltUpSqft: 2000,
    costs: { ...base.costs, askingPrice: 10_000_000 },
    negotiation: { leverage: [], marketRatePerSqft: 5000 },
    ...over,
  };
}

describe('chargeableSqft', () => {
  it('prefers super built-up, then built-up, then carpet', () => {
    expect(chargeableSqft(flat({ superBuiltUpSqft: 1800, carpetSqft: 1200 }))).toBe(1800);
    const noSuper = flat({ builtUpSqft: 1700 });
    delete noSuper.superBuiltUpSqft;
    expect(chargeableSqft(noSuper)).toBe(1700);
    const onlyCarpet = flat({ carpetSqft: 1100 });
    delete onlyCarpet.superBuiltUpSqft;
    expect(chargeableSqft(onlyCarpet)).toBe(1100);
  });

  it('converts plot square yards to square feet', () => {
    const plot = blankProperty('plot');
    expect(chargeableSqft({ ...plot, plotSqyd: 200 })).toBe(1800);
    expect(chargeableSqft(plot)).toBeUndefined();
  });
});

describe('estimateNegotiation', () => {
  it('produces an ordered opening / target / walk-away ladder', () => {
    const e = estimateNegotiation(flat());
    expect(e.suggestedOpening!).toBeLessThan(e.suggestedTarget!);
    expect(e.suggestedTarget!).toBeLessThanOrEqual(e.suggestedWalkAway!);
    expect(e.suggestedWalkAway!).toBeLessThanOrEqual(e.askingPrice!);
  });

  it('never suggests a negative or absurd discount', () => {
    const everything = flat({
      negotiation: {
        marketRatePerSqft: 3000,
        leverage: [
          'lv_long_market',
          'lv_urgent',
          'lv_price_cut',
          'lv_vacant',
          'lv_unsold',
          'lv_fell_through',
          'lv_defects',
          'lv_papers',
          'lv_no_bank',
          'lv_water',
          'lv_nuisance',
          'lv_ready',
          'lv_options',
          'lv_walkaway',
          'lv_quarter',
          'lv_supply',
        ],
      },
      ageYears: 8,
    });
    const e = estimateNegotiation(everything);
    expect(e.roomPct).toBeGreaterThan(0);
    expect(e.roomPct).toBeLessThanOrEqual(25);
    expect(e.suggestedOpening!).toBeGreaterThan(0);
    expect(e.notes.some((n) => n.includes('Capped'))).toBe(true);
  });

  it('gives no room at all when everything is against you', () => {
    const e = estimateNegotiation(
      flat({
        negotiation: {
          marketRatePerSqft: 9000,
          leverage: ['lv_x_demand', 'lv_x_rare', 'lv_x_new', 'lv_x_loan', 'lv_x_deadline'],
        },
      }),
    );
    expect(e.roomPct).toBe(0);
    expect(e.suggestedTarget).toBe(e.askingPrice);
  });

  it('measures the premium against the market rate', () => {
    // 1 Cr on 2000 sqft is 5000/sqft against a 4000/sqft market = +25%.
    const e = estimateNegotiation(flat({ negotiation: { leverage: [], marketRatePerSqft: 4000 } }));
    expect(e.marketPremiumPct).toBeCloseTo(25, 6);
    expect(e.marketValue).toBe(8_000_000);
    // 25% premium * 0.35 = 8.75, capped at 5 so one input cannot dominate.
    expect(e.marketContribution).toBe(5);
  });

  it('does not double count the manual "above market" tick', () => {
    const withRate = estimateNegotiation(
      flat({ negotiation: { leverage: ['lv_above_market'], marketRatePerSqft: 4000 } }),
    );
    expect(withRate.contributions.some((c) => c.id === 'lv_above_market')).toBe(false);
    expect(withRate.notes.some((n) => n.includes('double counting'))).toBe(true);

    const noRate = flat({ negotiation: { leverage: ['lv_above_market'] } });
    const e = estimateNegotiation(noRate);
    expect(e.contributions.some((c) => c.id === 'lv_above_market')).toBe(true);
  });

  it('caps the walk-away at market value', () => {
    // Asking 1 Cr, market says it is worth 70 lakh.
    const e = estimateNegotiation(flat({ negotiation: { leverage: [], marketRatePerSqft: 3500 } }));
    expect(e.suggestedWalkAway!).toBeLessThanOrEqual(7_000_000);
    expect(e.notes.some((n) => n.includes('market value'))).toBe(true);
  });

  it('gives resale sellers slightly more room than a builder desk', () => {
    const newBuild = estimateNegotiation(flat({ negotiation: { leverage: [] } }));
    const resale = estimateNegotiation(flat({ ageYears: 7, negotiation: { leverage: [] } }));
    expect(resale.base).toBeGreaterThan(newBuild.base);
  });

  it('works with no price and no area at all', () => {
    const bare = blankProperty('flat');
    const e = estimateNegotiation(bare);
    expect(e.askingPrice).toBeUndefined();
    expect(e.suggestedTarget).toBeUndefined();
    expect(Number.isFinite(e.roomPct)).toBe(true);
    expect(e.notes.length).toBeGreaterThan(0);
  });

  it('uses the latest quote in preference to the original asking price', () => {
    const p = flat();
    p.costs.lastQuote = 9_000_000;
    expect(estimateNegotiation(p).askingPrice).toBe(9_000_000);
  });

  it('ignores unknown leverage ids instead of crashing', () => {
    const e = estimateNegotiation(flat({ negotiation: { leverage: ['nope', 'lv_urgent'] } }));
    expect(e.contributions).toHaveLength(1);
  });
});

describe('priceVerdict', () => {
  it('labels the price against the market', () => {
    expect(priceVerdict(estimateNegotiation(flat({ negotiation: { leverage: [], marketRatePerSqft: 4000 } }))).tone).toBe('high');
    expect(priceVerdict(estimateNegotiation(flat({ negotiation: { leverage: [], marketRatePerSqft: 6000 } }))).tone).toBe('good');
    expect(priceVerdict(estimateNegotiation(flat({ negotiation: { leverage: [], marketRatePerSqft: 5000 } }))).tone).toBe('fair');
  });

  it('says so when there is no market rate', () => {
    const p = flat();
    delete p.negotiation.marketRatePerSqft;
    expect(priceVerdict(estimateNegotiation(p)).text).toMatch(/no market rate/i);
  });
});

describe('the seeded properties', () => {
  const built = SEED_PROPERTIES.map((s) => fromSeed(s));

  it('all convert without losing their name or price', () => {
    expect(built).toHaveLength(8);
    for (const p of built) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.costs.askingPrice).toBeGreaterThan(1_000_000);
      expect(p.negotiation.marketRatePerSqft).toBeGreaterThan(1000);
    }
  });

  it('all produce a sane negotiation ladder', () => {
    for (const p of built) {
      const e = estimateNegotiation(p);
      expect(e.suggestedOpening, p.name).toBeGreaterThan(0);
      expect(e.suggestedOpening!, p.name).toBeLessThan(e.suggestedTarget!);
      expect(e.suggestedTarget!, p.name).toBeLessThanOrEqual(e.askingPrice!);
      expect(e.roomPct, p.name).toBeLessThanOrEqual(25);
    }
  });

  it('gives every seeded property a unique id', () => {
    expect(new Set(built.map((p) => p.id)).size).toBe(built.length);
  });

  it('prices Trimurty Ariana below the Jagatpura market rate', () => {
    const ariana = built.find((p) => p.name === 'Trimurty Ariana')!;
    const e = estimateNegotiation(ariana);
    expect(e.marketPremiumPct!).toBeLessThan(0);
  });
});

describe('calibration against the researched figures', () => {
  const built = SEED_PROPERTIES.map((s) => fromSeed(s));

  /**
   * The estimator is generic — it knows nothing about these eight projects
   * beyond price, area and market rate. This pins it against the independently
   * researched "realistically negotiable" range, so a future change to the
   * weights cannot quietly start producing offers that are too low to be
   * credible in the room.
   */
  it('suggests a target no more than 8% below the researched floor', () => {
    for (const p of built) {
      const kb = p.brief?.negotiatedRange;
      if (!kb) continue;
      const target = estimateNegotiation(p).suggestedTarget!;
      expect(target / kb[0], `${p.name}: target ${Math.round(target)} vs research floor ${kb[0]}`).toBeGreaterThan(0.92);
    }
  });

  it('never suggests paying more than the researched ceiling', () => {
    for (const p of built) {
      const kb = p.brief?.negotiatedRange;
      if (!kb) continue;
      const target = estimateNegotiation(p).suggestedTarget!;
      expect(target, p.name).toBeLessThanOrEqual(p.costs.askingPrice!);
      // A target above the researched ceiling means we are leaving money behind.
      expect(target / kb[1], p.name).toBeLessThan(1.25);
    }
  });

  it('keeps a single market-premium signal from dominating the estimate', () => {
    // Ashiana Ekansh shows a ~37% premium against the locality average, which
    // is partly a carpet-vs-super-built-up quoting difference, not real room.
    const ekansh = built.find((p) => p.name === 'Ashiana Ekansh')!;
    const e = estimateNegotiation(ekansh);
    expect(e.marketPremiumPct!).toBeGreaterThan(30);
    expect(e.marketContribution).toBeLessThanOrEqual(5);
    expect(e.roomPct).toBeLessThanOrEqual(12);
  });
});
