import { AMENITIES_BY_ID } from '../data/amenities';
import { checksFor, CHECKS_BY_ID } from '../data/checklists';
import { questionsFor } from '../data/questions';
import { CRITERIA } from '../data/scoring';
import type { Property } from '../types';

export interface ScoreResult {
  /** 0-100, computed over the criteria you have actually rated. */
  overall: number;
  /** How much of the total weight has been rated, 0-1. Low = score is provisional. */
  confidence: number;
  ratedCount: number;
  totalCount: number;
  band: 'unrated' | 'weak' | 'average' | 'good' | 'strong';
  byCriterion: Array<{ id: string; label: string; icon: string; weight: number; value?: number }>;
  /** The two best and two worst rated criteria, for the summary line. */
  strengths: string[];
  weaknesses: string[];
}

export function computeScore(p: Property): ScoreResult {
  let weightedSum = 0;
  let ratedWeight = 0;
  let totalWeight = 0;
  let ratedCount = 0;

  const byCriterion = CRITERIA.map((c) => {
    const raw = p.scores[c.id];
    const value = typeof raw === 'number' && raw >= 1 && raw <= 5 ? raw : undefined;
    totalWeight += c.weight;
    if (value !== undefined) {
      weightedSum += value * c.weight;
      ratedWeight += c.weight;
      ratedCount += 1;
    }
    return value === undefined
      ? { id: c.id, label: c.label, icon: c.icon, weight: c.weight }
      : { id: c.id, label: c.label, icon: c.icon, weight: c.weight, value };
  });

  // Average rating on a 1-5 scale, rescaled so 1 -> 0 and 5 -> 100.
  const avg = ratedWeight > 0 ? weightedSum / ratedWeight : 0;
  const overall = ratedWeight > 0 ? ((avg - 1) / 4) * 100 : 0;

  const rated = byCriterion.filter(
    (c): c is { id: string; label: string; icon: string; weight: number; value: number } =>
      c.value !== undefined,
  );
  const sorted = [...rated].sort((a, b) => b.value * b.weight - a.value * a.weight);

  return {
    overall,
    confidence: totalWeight > 0 ? ratedWeight / totalWeight : 0,
    ratedCount,
    totalCount: CRITERIA.length,
    band: bandFor(overall, ratedCount),
    byCriterion,
    strengths: sorted
      .filter((c) => c.value >= 4)
      .slice(0, 3)
      .map((c) => c.label),
    weaknesses: sorted
      .filter((c) => c.value <= 2)
      .slice(-3)
      .map((c) => c.label),
  };
}

function bandFor(overall: number, ratedCount: number): ScoreResult['band'] {
  if (ratedCount === 0) return 'unrated';
  if (overall >= 75) return 'strong';
  if (overall >= 55) return 'good';
  if (overall >= 35) return 'average';
  return 'weak';
}

export const BAND_LABEL: Record<ScoreResult['band'], string> = {
  unrated: 'Not rated yet',
  weak: 'Weak',
  average: 'Average',
  good: 'Good',
  strong: 'Strong',
};

export interface CheckSummary {
  total: number;
  ok: number;
  issues: number;
  na: number;
  unchecked: number;
  /** Checks marked as a problem that are flagged critical. */
  criticalIssues: number;
  /** Critical checks not yet looked at — what Visit Mode should push you towards. */
  criticalUnchecked: number;
  /** Fraction of applicable checks that have any answer, 0-1. */
  progress: number;
  /** ids of critical checks currently marked as an issue. */
  criticalIssueIds: string[];
}

export function summariseChecks(p: Property): CheckSummary {
  const applicable = checksFor(p.type);
  let ok = 0;
  let issues = 0;
  let na = 0;
  let unchecked = 0;
  let criticalIssues = 0;
  let criticalUnchecked = 0;
  const criticalIssueIds: string[] = [];

  for (const item of applicable) {
    const state = p.checks[item.id]?.state ?? 'unchecked';
    const isCritical = item.severity === 'critical';
    switch (state) {
      case 'ok':
        ok += 1;
        break;
      case 'issue':
        issues += 1;
        if (isCritical) {
          criticalIssues += 1;
          criticalIssueIds.push(item.id);
        }
        break;
      case 'na':
        na += 1;
        break;
      default:
        unchecked += 1;
        if (isCritical) criticalUnchecked += 1;
    }
  }

  const answered = ok + issues + na;
  return {
    total: applicable.length,
    ok,
    issues,
    na,
    unchecked,
    criticalIssues,
    criticalUnchecked,
    progress: applicable.length > 0 ? answered / applicable.length : 0,
    criticalIssueIds,
  };
}

/** Labels for the critical problems found, for the card and the compare table. */
export function criticalIssueLabels(p: Property): string[] {
  return summariseChecks(p).criticalIssueIds.map((id) => CHECKS_BY_ID[id]?.label ?? id);
}

export interface AmenitySummary {
  total: number;
  core: number;
  useful: number;
  brochure: number;
  /** Core amenities the property does NOT have — these are the real gaps. */
  missingCore: string[];
}

export function summariseAmenities(p: Property): AmenitySummary {
  let core = 0;
  let useful = 0;
  let brochure = 0;
  for (const id of p.amenities) {
    const a = AMENITIES_BY_ID[id];
    if (!a) continue;
    if (a.weightClass === 'core') core += 1;
    else if (a.weightClass === 'useful') useful += 1;
    else brochure += 1;
  }
  const have = new Set(p.amenities);
  const missingCore = Object.values(AMENITIES_BY_ID)
    .filter((a) => a.weightClass === 'core' && !have.has(a.id))
    .map((a) => a.label);

  return { total: p.amenities.length, core, useful, brochure, missingCore };
}

export interface Completeness {
  /** 0-1 across the things worth capturing on a visit. */
  overall: number;
  parts: Array<{ label: string; done: boolean }>;
}

/** Drives the "how well have I actually recorded this property" nudge. */
export function completeness(p: Property, mediaCount: number): Completeness {
  const checks = summariseChecks(p);
  const answered = questionsFor(p.type).filter((q) => (p.answers[q.id] ?? '').trim().length > 0);
  const parts = [
    { label: 'Price entered', done: Boolean(p.costs.askingPrice) },
    { label: 'Size entered', done: Boolean(chargeableArea(p)) },
    { label: 'Market rate researched', done: Boolean(p.negotiation.marketRatePerSqft) },
    { label: 'Critical checks done', done: checks.criticalUnchecked === 0 },
    { label: 'Some questions answered', done: answered.length >= 3 },
    { label: 'Photos taken', done: mediaCount > 0 },
    { label: 'Rated', done: Object.keys(p.scores).length >= 5 },
    { label: 'Pros & cons noted', done: p.pros.length + p.cons.length > 0 },
  ];
  return {
    overall: parts.filter((x) => x.done).length / parts.length,
    parts,
  };
}

function chargeableArea(p: Property): number | undefined {
  if (p.type === 'plot') return p.plotSqyd;
  return p.superBuiltUpSqft ?? p.builtUpSqft ?? p.carpetSqft;
}
