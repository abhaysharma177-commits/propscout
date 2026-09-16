/**
 * Weighted scoring model.
 *
 * Every property is rated 1-5 on each criterion. Weights reflect how much each
 * one actually affects living in Jaipur (water and power score as high as
 * construction; amenities deliberately score low). Weights are editable per
 * user in Settings if a different set of priorities applies.
 */

export interface Criterion {
  id: string;
  label: string;
  icon: string;
  /** Relative importance, 1-3. */
  weight: number;
  hint: string;
  /** What a 1 looks like, and what a 5 looks like. Keeps ratings consistent. */
  low: string;
  high: string;
}

export const CRITERIA: Criterion[] = [
  {
    id: 'cr_location',
    label: 'Location & commute',
    icon: '\u{1F4CD}',
    weight: 3,
    hint: 'Travel time to the places you actually go, and what surrounds the property.',
    low: 'Long commute, nothing walkable, bad surroundings',
    high: 'Short commute, market and hospital close, pleasant surroundings',
  },
  {
    id: 'cr_value',
    label: 'Value for money',
    icon: '\u{1F4B0}',
    weight: 3,
    hint: 'Price against the honest market rate for this locality and condition.',
    low: 'Clearly overpriced for what it is',
    high: 'Priced below comparable properties nearby',
  },
  {
    id: 'cr_water',
    label: 'Water & power',
    icon: '\u{1F6B0}',
    weight: 3,
    hint: 'Source, hours, quality, and what happens in May-June.',
    low: 'Tanker dependent, hard water, frequent cuts',
    high: 'Municipal supply most of the day, soft water, reliable backup',
  },
  {
    id: 'cr_construction',
    label: 'Construction & condition',
    icon: '\u{1F3D7}\u{FE0F}',
    weight: 3,
    hint: 'Structure, seepage, finish quality, and how much you will need to spend.',
    low: 'Cracks or seepage, poor finish, needs major work',
    high: 'Solid, dry, well finished, move-in ready',
  },
  {
    id: 'cr_legal',
    label: 'Papers & legal clarity',
    icon: '\u{1F4C4}',
    weight: 3,
    hint: 'Clean title, approvals in place, banks willing to fund it.',
    low: 'Missing papers, unapproved, GPA sale, no bank funds it',
    high: 'Clean chain, JDA approved, multiple banks fund it',
  },
  {
    id: 'cr_light',
    label: 'Light, air & layout',
    icon: '\u{2600}\u{FE0F}',
    weight: 2,
    hint: 'Natural light, cross ventilation, usable room shapes, noise.',
    low: 'Dark, stuffy, awkward layout, noisy',
    high: 'Bright, cross ventilated, well proportioned, quiet',
  },
  {
    id: 'cr_society',
    label: 'Society & neighbours',
    icon: '\u{1F465}',
    weight: 2,
    hint: 'Occupancy, how it is run, the people, security, maintenance cost.',
    low: 'Half empty, badly run, disputes, high maintenance',
    high: 'Well occupied, well run, good neighbours, sensible maintenance',
  },
  {
    id: 'cr_parents',
    label: 'Suitable for elders',
    icon: '\u{1F475}',
    weight: 2,
    hint: 'Step-free access, lift, safe bathrooms, hospital and market nearby, company.',
    low: 'Many stairs, no lift, isolated, nothing walkable',
    high: 'Step-free, reliable lift, market and doctor close, active community',
  },
  {
    id: 'cr_resale',
    label: 'Resale & rental potential',
    icon: '\u{1F4C8}',
    weight: 2,
    hint: 'Would someone else want this in five years, and at what rent?',
    low: 'Odd property, stagnant area, weak demand',
    high: 'Sought-after area, easy to rent, steady appreciation',
  },
  {
    id: 'cr_amenities',
    label: 'Amenities',
    icon: '\u{1F3CA}',
    weight: 1,
    hint: 'What is actually built and working. Deliberately low weight — you pay for these every month.',
    low: 'Promised but not built, or not maintained',
    high: 'Everything built, running and well kept',
  },
  {
    id: 'cr_vastu',
    label: 'Vastu / direction',
    icon: '\u{1F9ED}',
    weight: 1,
    hint: 'Even if you do not mind, the next buyer in Jaipur probably will.',
    low: 'Entrance and kitchen in disfavoured directions',
    high: 'Good entrance direction, favourable kitchen and bedroom placement',
  },
];

export const CRITERIA_BY_ID: Record<string, Criterion> = Object.fromEntries(
  CRITERIA.map((c) => [c.id, c]),
);

export const RATING_LABEL: Record<number, string> = {
  1: 'Bad',
  2: 'Poor',
  3: 'OK',
  4: 'Good',
  5: 'Great',
};
