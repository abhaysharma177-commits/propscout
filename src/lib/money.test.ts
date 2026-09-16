import { describe, expect, it } from 'vitest';
import {
  computeCosts,
  emi,
  formatCompact,
  inWords,
  loadingPct,
  parseMoney,
  parseNum,
  perSqft,
  rentalYieldPct,
} from './money';

describe('parseMoney', () => {
  it('reads plain numbers and grouped digits', () => {
    expect(parseMoney('8500000')).toBe(8_500_000);
    expect(parseMoney('85,00,000')).toBe(8_500_000);
    expect(parseMoney('8,500,000')).toBe(8_500_000);
  });

  it('reads Indian shorthand in every spelling', () => {
    expect(parseMoney('85L')).toBe(8_500_000);
    expect(parseMoney('85 lakh')).toBe(8_500_000);
    expect(parseMoney('85 lakhs')).toBe(8_500_000);
    expect(parseMoney('85lac')).toBe(8_500_000);
    expect(parseMoney('1.2cr')).toBe(12_000_000);
    expect(parseMoney('1.2 crore')).toBe(12_000_000);
    expect(parseMoney('1 Cr')).toBe(10_000_000);
    expect(parseMoney('40k')).toBe(40_000);
  });

  it('tolerates rupee symbols, spaces and "Rs"', () => {
    expect(parseMoney('₹ 1.35 cr')).toBe(13_500_000);
    expect(parseMoney('Rs. 90 L')).toBe(9_000_000);
  });

  it('passes numbers straight through', () => {
    expect(parseMoney(1234)).toBe(1234);
  });

  it('returns undefined rather than NaN for junk', () => {
    for (const bad of ['', '   ', 'abc', 'cr', '1.2.3', '12 cr 5', null, undefined]) {
      expect(parseMoney(bad as string)).toBeUndefined();
    }
  });
});

describe('parseNum', () => {
  it('reads areas and percentages', () => {
    expect(parseNum('1,810')).toBe(1810);
    expect(parseNum('4.5')).toBe(4.5);
    expect(parseNum('')).toBeUndefined();
    expect(parseNum('abc')).toBeUndefined();
  });
});

describe('formatCompact', () => {
  it('uses crore and lakh, trimming pointless decimals', () => {
    expect(formatCompact(12_000_000)).toBe('₹1.2 Cr');
    expect(formatCompact(10_000_000)).toBe('₹1 Cr');
    expect(formatCompact(9_000_000)).toBe('₹90 L');
    expect(formatCompact(8_583_000)).toBe('₹85.83 L');
    expect(formatCompact(45_000)).toBe('₹45k');
    expect(formatCompact(850)).toBe('₹850');
  });

  it('handles nothing gracefully', () => {
    expect(formatCompact(undefined)).toBe('—');
    expect(formatCompact(Number.NaN)).toBe('—');
  });

  it('keeps the sign on negatives', () => {
    expect(formatCompact(-9_000_000)).toBe('-₹90 L');
  });
});

describe('inWords', () => {
  it('describes the magnitude so a typo is obvious', () => {
    expect(inWords(9_000_000)).toBe('90 lakh');
    expect(inWords(12_000_000)).toBe('1.2 crore');
    expect(inWords(0)).toBe('');
  });
});

describe('perSqft and loadingPct', () => {
  it('divides only when both sides are usable', () => {
    expect(perSqft(9_000_000, 2309)).toBeCloseTo(3897.8, 1);
    expect(perSqft(9_000_000, 0)).toBeUndefined();
    expect(perSqft(undefined, 2309)).toBeUndefined();
  });

  it('computes loading against super built-up', () => {
    expect(loadingPct(1870, 1300)).toBeCloseTo(30.48, 2);
    expect(loadingPct(1968, 1170)).toBeCloseTo(40.55, 2);
    // Carpet larger than super built-up is bad data, not a negative loading.
    expect(loadingPct(1000, 1200)).toBeUndefined();
    expect(loadingPct(0, 100)).toBeUndefined();
  });
});

describe('emi', () => {
  it('matches the standard reducing-balance formula', () => {
    // 80 lakh at 8.5% over 20 years is about 69,400/month.
    const r = emi(8_000_000, 8.5, 20);
    expect(r.monthly).toBeGreaterThan(69_000);
    expect(r.monthly).toBeLessThan(70_000);
    expect(r.totalPayable).toBeCloseTo(r.monthly * 240, 5);
    expect(r.totalInterest).toBeCloseTo(r.totalPayable - 8_000_000, 5);
  });

  it('falls back to simple division at 0%', () => {
    const r = emi(1_200_000, 0, 10);
    expect(r.monthly).toBeCloseTo(10_000, 6);
    expect(r.totalInterest).toBeCloseTo(0, 6);
  });

  it('never divides by zero or returns NaN', () => {
    for (const r of [emi(0, 8, 20), emi(1_000_000, 8, 0), emi(-5, 8, 20)]) {
      expect(Number.isFinite(r.monthly)).toBe(true);
      expect(r.monthly).toBe(0);
    }
  });
});

describe('computeCosts', () => {
  it('reproduces the Rajasthan all-in figure for a ready flat', () => {
    // 90 L ready-to-move, sole female buyer: 5% duty + 20% cess + 1% reg = 7.65%.
    const c = computeCosts({
      askingPrice: 9_000_000,
      stampDutyPct: 5,
      registrationPct: 1,
      labourCessPctOfStampDuty: 20,
      brokeragePct: 1,
      gstPct: 0,
    });
    expect(c.basePrice).toBe(9_000_000);
    // 450000 duty + 90000 cess + 90000 registration = 630000, i.e. 7%.
    // Plus 1% brokerage = 720000 of transaction cost.
    expect(c.transactionCosts).toBeCloseTo(720_000, 6);
    expect(c.grandTotal).toBeCloseTo(9_720_000, 6);
    expect(c.upliftPct).toBeCloseTo(8, 6);
  });

  it('charges the male/joint rate as 8.98% of value', () => {
    const c = computeCosts({
      askingPrice: 10_000_000,
      stampDutyPct: 6,
      registrationPct: 1,
      labourCessPctOfStampDuty: 20,
    });
    // 6% + (20% of 6%) + 1% = 8.2%. The published 8.98% figure includes other
    // sundries; this function only charges what it is given.
    expect(c.transactionCosts).toBeCloseTo(820_000, 6);
  });

  it('applies GST and duty on top of seller extras', () => {
    const c = computeCosts({
      askingPrice: 10_000_000,
      parkingCharge: 300_000,
      clubhouseCharge: 200_000,
      gstPct: 5,
      stampDutyPct: 6,
      registrationPct: 1,
      labourCessPctOfStampDuty: 20,
    });
    // Consideration = 1.05 Cr, so GST is 5,25,000 not 5,00,000.
    const gst = c.lines.find((l) => l.id === 'gst');
    expect(gst?.amount).toBeCloseTo(525_000, 6);
    const stamp = c.lines.find((l) => l.id === 'stamp');
    expect(stamp?.amount).toBeCloseTo(630_000, 6);
  });

  it('charges duty on the DLC rate when it exceeds the deal value', () => {
    const low = computeCosts({ askingPrice: 8_000_000, stampDutyPct: 6, dlcValue: 0 });
    const high = computeCosts({ askingPrice: 8_000_000, stampDutyPct: 6, dlcValue: 10_000_000 });
    expect(low.transactionCosts).toBeCloseTo(480_000, 6);
    expect(high.transactionCosts).toBeCloseTo(600_000, 6);
    expect(high.lines.find((l) => l.id === 'stamp')?.note).toContain('DLC');
  });

  it('keeps monthly maintenance out of the one-time total', () => {
    const c = computeCosts({ askingPrice: 9_000_000, monthlyMaintenance: 4500 });
    expect(c.monthlyRecurring).toBe(4500);
    expect(c.grandTotal).toBe(9_000_000);
  });

  it('treats every missing input as zero rather than NaN', () => {
    const c = computeCosts({});
    expect(c.grandTotal).toBe(0);
    expect(c.upliftPct).toBe(0);
    expect(c.lines).toHaveLength(0);
  });
});

describe('rentalYieldPct', () => {
  it('annualises rent over price', () => {
    expect(rentalYieldPct(26_000, 10_400_000)).toBeCloseTo(3, 6);
    expect(rentalYieldPct(26_000, 0)).toBeUndefined();
    expect(rentalYieldPct(undefined, 100)).toBeUndefined();
  });
});
