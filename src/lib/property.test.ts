import { describe, expect, it } from 'vitest';
import { CHECKS, checksFor } from '../data/checklists';
import { QUESTIONS, questionsFor } from '../data/questions';
import { AMENITIES } from '../data/amenities';
import { CRITERIA } from '../data/scoring';
import { LEVERAGE } from '../data/leverage';
import {
  blankProperty,
  fromSeed,
  mapsUrl,
  normalizeFacing,
  normalizeProperty,
  normalizeStatus,
  normalizeType,
  resolveAmenities,
} from './property';
import { completeness, computeScore, summariseAmenities, summariseChecks } from './score';

describe('normalizers', () => {
  it('maps loose type words onto a property type', () => {
    expect(normalizeType('3 BHK Apartment')).toBe('flat');
    expect(normalizeType('Independent House')).toBe('villa');
    expect(normalizeType('villa')).toBe('villa');
    expect(normalizeType('JDA Plot')).toBe('plot');
    expect(normalizeType('Showroom')).toBe('commercial');
    expect(normalizeType(undefined)).toBe('flat');
    expect(normalizeType('something odd')).toBe('flat');
  });

  it('maps loose status words', () => {
    expect(normalizeStatus('Shortlist')).toBe('shortlisted');
    expect(normalizeStatus('to visit')).toBe('to_visit');
    expect(normalizeStatus('dropped')).toBe('rejected');
    expect(normalizeStatus('gibberish')).toBe('to_visit');
  });

  it('maps compass directions', () => {
    expect(normalizeFacing('North East')).toBe('NE');
    expect(normalizeFacing('nw')).toBe('NW');
    expect(normalizeFacing('South-West')).toBe('SW');
    expect(normalizeFacing('sideways')).toBe('');
  });
});

describe('resolveAmenities', () => {
  it('matches ids, exact labels and loose wording', () => {
    const r = resolveAmenities(['am_lift', 'Swimming pool', 'covered parking']);
    expect(r.ids).toContain('am_lift');
    expect(r.ids).toContain('am_pool');
    expect(r.ids).toContain('am_covered_parking');
    expect(r.unmatched).toHaveLength(0);
  });

  it('keeps anything unrecognised rather than dropping it', () => {
    const r = resolveAmenities(['IGBC Platinum green building', 'Duck pond']);
    expect(r.ids).toHaveLength(0);
    expect(r.unmatched).toEqual(['IGBC Platinum green building', 'Duck pond']);
  });

  it('never returns duplicates', () => {
    const r = resolveAmenities(['am_lift', 'Lift', 'lift']);
    expect(r.ids).toEqual(['am_lift']);
  });

  it('handles empty input', () => {
    expect(resolveAmenities(undefined).ids).toHaveLength(0);
    expect(resolveAmenities(['', '  ']).ids).toHaveLength(0);
  });
});

describe('fromSeed', () => {
  it('parses money strings and keeps unmatched amenities as tags', () => {
    const p = fromSeed({
      name: 'Example Heights',
      type: '3 BHK flat',
      price: '1.35 cr',
      marketRate: '5,000',
      sqft: 1800,
      maintenance: '4500',
      amenities: ['am_lift', 'Rooftop helipad'],
      day: 2,
      time: '10:30',
    });

    expect(p.costs.askingPrice).toBe(13_500_000);
    expect(p.negotiation.marketRatePerSqft).toBe(5000);
    expect(p.costs.monthlyMaintenance).toBe(4500);
    expect(p.superBuiltUpSqft).toBe(1800);
    expect(p.amenities).toContain('am_lift');
    expect(p.tags).toContain('Rooftop helipad');
    expect(p.tripDay).toBe(2);
    expect(p.visitTime).toBe('10:30');
    expect(p.negotiation.leverage).toEqual([]);
  });

  it('gives the same id for the same name, so re-seeding updates not duplicates', () => {
    expect(fromSeed({ name: 'Trimurty Ariana' }).id).toBe(fromSeed({ name: 'Trimurty Ariana' }).id);
    expect(fromSeed({ name: 'A' }).id).not.toBe(fromSeed({ name: 'B' }).id);
  });

  it('never writes empty strings or undefined into the record', () => {
    const p = fromSeed({ name: 'Bare', locality: '', builder: undefined });
    expect('locality' in p).toBe(false);
    expect('builder' in p).toBe(false);
  });

  it('reads coordinates out of a maps string', () => {
    const p = fromSeed({ name: 'Coord', maps: '26.9124, 75.7873' });
    expect(p.lat).toBeCloseTo(26.9124, 4);
    expect(p.lng).toBeCloseTo(75.7873, 4);
  });

  it('reads coordinates out of a pasted Google Maps URL', () => {
    const p = fromSeed({
      name: 'Pasted',
      maps: 'https://www.google.com/maps/place/x/@26.8505,75.7628,17z',
    });
    expect(p.lat).toBeCloseTo(26.8505, 4);
  });

  it('ignores impossible coordinates', () => {
    const p = fromSeed({ name: 'Bad', maps: '999, 999' });
    expect(p.lat).toBeUndefined();
  });
});

describe('normalizeProperty', () => {
  it('repairs a partial record from a backup', () => {
    const p = normalizeProperty({ name: 'Half a record', type: 'apartment' });
    expect(p).not.toBeNull();
    expect(p!.costs).toEqual({});
    expect(p!.negotiation.leverage).toEqual([]);
    expect(p!.amenities).toEqual([]);
    expect(p!.pros).toEqual([]);
    expect(p!.checks).toEqual({});
    expect(p!.id).toBeTruthy();
  });

  it('rejects records with no usable name', () => {
    expect(normalizeProperty(null)).toBeNull();
    expect(normalizeProperty({})).toBeNull();
    expect(normalizeProperty({ name: '   ' })).toBeNull();
    expect(normalizeProperty('a string')).toBeNull();
  });

  it('strips non-string entries out of string arrays', () => {
    const p = normalizeProperty({ name: 'Mixed', pros: ['good', 42, null], amenities: ['am_lift', 7] });
    expect(p!.pros).toEqual(['good']);
    expect(p!.amenities).toEqual(['am_lift']);
  });
});

describe('mapsUrl', () => {
  it('prefers coordinates', () => {
    const p = blankProperty();
    p.name = 'X';
    p.lat = 26.9;
    p.lng = 75.8;
    expect(mapsUrl(p)).toContain('26.9,75.8');
  });

  it('falls back through query, address and locality', () => {
    const p = blankProperty();
    p.name = 'Somewhere';
    p.locality = 'Jagatpura';
    expect(mapsUrl(p)).toContain('Jagatpura');
  });

  it('passes a pasted URL straight through', () => {
    const p = blankProperty();
    p.name = 'X';
    p.mapsQuery = 'https://maps.app.goo.gl/abc';
    expect(mapsUrl(p)).toBe('https://maps.app.goo.gl/abc');
  });

  it('returns nothing when there is nothing to search for', () => {
    const p = blankProperty();
    expect(mapsUrl(p)).toBeUndefined();
  });
});

describe('scoring', () => {
  it('scores only what has been rated, and rescales 1-5 onto 0-100', () => {
    const p = blankProperty();
    expect(computeScore(p).overall).toBe(0);
    expect(computeScore(p).band).toBe('unrated');

    p.scores = { cr_location: 5 };
    expect(computeScore(p).overall).toBe(100);

    p.scores = { cr_location: 1 };
    expect(computeScore(p).overall).toBe(0);

    p.scores = { cr_location: 3 };
    expect(computeScore(p).overall).toBe(50);
  });

  it('weights criteria rather than averaging them flat', () => {
    const p = blankProperty();
    // cr_location has weight 3, cr_amenities weight 1.
    p.scores = { cr_location: 5, cr_amenities: 1 };
    // (5*3 + 1*1) / 4 = 4 -> (4-1)/4 = 75.
    expect(computeScore(p).overall).toBe(75);
  });

  it('ignores out-of-range ratings', () => {
    const p = blankProperty();
    p.scores = { cr_location: 9, cr_value: 4 };
    const s = computeScore(p);
    expect(s.ratedCount).toBe(1);
    expect(s.overall).toBe(75);
  });

  it('reports confidence as the share of weight rated', () => {
    const p = blankProperty();
    expect(computeScore(p).confidence).toBe(0);
    p.scores = Object.fromEntries(CRITERIA.map((c) => [c.id, 4]));
    expect(computeScore(p).confidence).toBe(1);
  });
});

describe('check summaries', () => {
  it('counts states and flags critical problems', () => {
    const p = blankProperty('flat');
    const applicable = checksFor('flat');
    const critical = applicable.find((c) => c.severity === 'critical')!;
    p.checks = { [critical.id]: { state: 'issue', note: 'bad' } };

    const s = summariseChecks(p);
    expect(s.total).toBe(applicable.length);
    expect(s.issues).toBe(1);
    expect(s.criticalIssues).toBe(1);
    expect(s.criticalIssueIds).toEqual([critical.id]);
    expect(s.progress).toBeCloseTo(1 / applicable.length, 6);
  });

  it('treats not-applicable as answered', () => {
    const p = blankProperty('flat');
    const first = checksFor('flat')[0]!;
    p.checks = { [first.id]: { state: 'na' } };
    expect(summariseChecks(p).na).toBe(1);
    expect(summariseChecks(p).progress).toBeGreaterThan(0);
  });

  it('only counts checks that apply to the property type', () => {
    const plotChecks = checksFor('plot');
    const flatChecks = checksFor('flat');
    expect(plotChecks.some((c) => c.cat === 'land')).toBe(true);
    expect(flatChecks.some((c) => c.cat === 'land')).toBe(false);
  });
});

describe('amenity summary', () => {
  it('lists the core amenities a property is missing', () => {
    const p = blankProperty();
    const s = summariseAmenities(p);
    expect(s.total).toBe(0);
    expect(s.missingCore.length).toBeGreaterThan(0);

    p.amenities = AMENITIES.filter((a) => a.weightClass === 'core').map((a) => a.id);
    expect(summariseAmenities(p).missingCore).toHaveLength(0);
  });

  it('ignores unknown amenity ids', () => {
    const p = blankProperty();
    p.amenities = ['not_a_real_amenity'];
    const s = summariseAmenities(p);
    expect(s.core + s.useful + s.brochure).toBe(0);
  });
});

describe('completeness', () => {
  it('rises as the record is filled in', () => {
    const p = blankProperty();
    const empty = completeness(p, 0).overall;
    p.costs.askingPrice = 9_000_000;
    p.superBuiltUpSqft = 2000;
    p.negotiation.marketRatePerSqft = 4800;
    p.pros = ['bright'];
    expect(completeness(p, 3).overall).toBeGreaterThan(empty);
  });
});

describe('data integrity', () => {
  it('has no duplicate ids anywhere in the catalogues', () => {
    for (const [name, ids] of [
      ['checks', CHECKS.map((c) => c.id)],
      ['questions', QUESTIONS.map((q) => q.id)],
      ['amenities', AMENITIES.map((a) => a.id)],
      ['criteria', CRITERIA.map((c) => c.id)],
      ['leverage', LEVERAGE.map((l) => l.id)],
    ] as Array<[string, string[]]>) {
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes, `${name} has duplicates: ${dupes.join(', ')}`).toHaveLength(0);
    }
  });

  it('gives every property type a usable checklist and question set', () => {
    for (const type of ['flat', 'villa', 'plot', 'commercial'] as const) {
      expect(checksFor(type).length, type).toBeGreaterThan(20);
      expect(questionsFor(type).length, type).toBeGreaterThan(15);
      expect(questionsFor(type).some((q) => q.killer), type).toBe(true);
    }
  });

  it('keeps every criterion weight between 1 and 3', () => {
    for (const c of CRITERIA) {
      expect(c.weight).toBeGreaterThanOrEqual(1);
      expect(c.weight).toBeLessThanOrEqual(3);
    }
  });
});
