/**
 * Negotiation leverage catalogue.
 *
 * Each item you tick adds (or removes) estimated negotiation room, expressed in
 * percentage points off the asking price. These are judgement-based heuristics
 * for the Indian resale/builder market, not guarantees — the app always shows
 * them as a range and labels them as an estimate.
 */

export interface LeverageItem {
  id: string;
  label: string;
  /** Percentage points of extra room this creates. Negative = you have less room. */
  pct: number;
  /** What to actually say, out loud, to use this. */
  script?: string;
  group: 'seller' | 'property' | 'you' | 'market' | 'against';
}

export interface LeverageGroup {
  id: LeverageItem['group'];
  label: string;
  icon: string;
  blurb: string;
}

export const LEVERAGE_GROUPS: LeverageGroup[] = [
  {
    id: 'seller',
    label: 'The seller’s position',
    icon: '\u{1F464}',
    blurb: 'How badly do they need to sell? This is most of your leverage.',
  },
  {
    id: 'property',
    label: 'Issues with the property',
    icon: '\u{1F50D}',
    blurb: 'Every documented defect is money. Photograph it, then price it.',
  },
  {
    id: 'you',
    label: 'Your position',
    icon: '\u{1F4AA}',
    blurb: 'Certainty and speed are worth real money to a seller.',
  },
  {
    id: 'market',
    label: 'Market & timing',
    icon: '\u{1F4C5}',
    blurb: 'When you buy matters almost as much as what you buy.',
  },
  {
    id: 'against',
    label: 'Working against you',
    icon: '\u{26A0}\u{FE0F}',
    blurb: 'Be honest about these. They reduce your room.',
  },
];

export const LEVERAGE: LeverageItem[] = [
  // --- Seller's position ---
  {
    id: 'lv_long_market',
    group: 'seller',
    label: 'On the market 6 months or more',
    pct: 3,
    script:
      '"I understand this has been available for a while. I am a serious buyer today, and my number reflects that."',
  },
  {
    id: 'lv_urgent',
    group: 'seller',
    label: 'Seller is in a hurry (transfer, medical, loan, family need)',
    pct: 4,
    script:
      '"I can close on your timeline. If the date matters to you, let us make the number work for me."',
  },
  {
    id: 'lv_price_cut',
    group: 'seller',
    label: 'Price has already been reduced at least once',
    pct: 2,
    script: '"The price has moved once already. Let us finish the journey and close it today."',
  },
  {
    id: 'lv_vacant',
    group: 'seller',
    label: 'Lying vacant / unoccupied for a long time',
    pct: 2,
    script: '"It has been empty a while. You are paying maintenance on it every month with no return."',
  },
  {
    id: 'lv_unsold',
    group: 'seller',
    label: 'Builder has many unsold units left',
    pct: 2.5,
    script: '"You still have a lot of inventory here. What can you do for someone booking now?"',
  },
  {
    id: 'lv_fell_through',
    group: 'seller',
    label: 'An earlier deal fell through',
    pct: 2,
    script: '"I would rather not repeat what happened last time. Give me a number I can actually close at."',
  },
  {
    id: 'lv_direct',
    group: 'seller',
    label: 'Dealing directly with the owner, no broker',
    pct: 1,
    script: '"There is no brokerage on this deal. Let us split that saving."',
  },

  // --- Issues with the property ---
  {
    id: 'lv_defects',
    group: 'property',
    label: 'Documented defects: seepage, cracks, repairs needed',
    pct: 3,
    script:
      '"I will need to spend on this before moving in — here are the photos. That cost has to come off the price."',
  },
  {
    id: 'lv_above_market',
    group: 'property',
    label: 'Asking rate is above the comparable rate for this locality',
    pct: 3,
    script:
      '"Similar properties here are transacting at a lower rate per sqft. I can show you. I will pay the market rate, not above it."',
  },
  {
    id: 'lv_old',
    group: 'property',
    label: 'Building is 10+ years old and will need work',
    pct: 2,
  },
  {
    id: 'lv_papers',
    group: 'property',
    label: 'Papers incomplete: OC, CC, approvals or mutation pending',
    pct: 3,
    script:
      '"Until these documents are in place I am carrying the risk, and my bank is uncomfortable. That has a price."',
  },
  {
    id: 'lv_no_bank',
    group: 'property',
    label: 'Few or no major banks will fund it',
    pct: 2.5,
  },
  {
    id: 'lv_water',
    group: 'property',
    label: 'Water problems: tanker dependent, hard water, short supply',
    pct: 2,
    script: '"I will be running tankers and a softener from day one. That is a recurring cost I am taking on."',
  },
  {
    id: 'lv_bad_floor',
    group: 'property',
    label: 'Less desirable unit: top or ground floor, west facing, no view',
    pct: 1.5,
  },
  {
    id: 'lv_high_maint',
    group: 'property',
    label: 'High monthly maintenance for what it delivers',
    pct: 1,
  },
  {
    id: 'lv_vastu',
    group: 'property',
    label: 'Vastu negatives that will hurt resale',
    pct: 1.5,
    script: '"This will narrow the pool of buyers when I eventually sell, and that has to be priced in."',
  },
  {
    id: 'lv_nuisance',
    group: 'property',
    label: 'Nearby nuisance: noise, dump, high-tension line, waterlogging',
    pct: 2,
  },

  // --- Your position ---
  {
    id: 'lv_ready',
    group: 'you',
    label: 'You can close quickly, funds arranged',
    pct: 2,
    script: '"My funding is in place. I can register within three weeks. That certainty is worth something."',
  },
  {
    id: 'lv_options',
    group: 'you',
    label: 'You have 2+ genuine alternatives you are considering',
    pct: 2.5,
    script:
      '"I am looking at two other properties this week at a similar budget. I would prefer this one, but the number has to work."',
  },
  {
    id: 'lv_no_chain',
    group: 'you',
    label: 'No other sale to complete first, no chain',
    pct: 1,
  },
  {
    id: 'lv_walkaway',
    group: 'you',
    label: 'You are genuinely willing to walk away',
    pct: 2,
    script: 'Say nothing. Willingness to walk is only leverage if you would actually do it.',
  },

  // --- Market & timing ---
  {
    id: 'lv_quarter',
    group: 'market',
    label: 'End of month / quarter / financial year',
    pct: 1.5,
    script: '"If we can register before the 31st, I am ready to go at this number."',
  },
  {
    id: 'lv_slow_season',
    group: 'market',
    label: 'Slow season, few buyers around',
    pct: 1,
  },
  {
    id: 'lv_supply',
    group: 'market',
    label: 'Lots of similar inventory available in this locality',
    pct: 2,
  },

  // --- Against you ---
  {
    id: 'lv_x_demand',
    group: 'against',
    label: 'Other buyers are genuinely interested',
    pct: -3,
  },
  {
    id: 'lv_x_rare',
    group: 'against',
    label: 'Rare unit: park facing, corner, preferred floor, unusual size',
    pct: -2,
  },
  {
    id: 'lv_x_new',
    group: 'against',
    label: 'Fresh launch or hot locality, prices rising',
    pct: -2,
  },
  {
    id: 'lv_x_loan',
    group: 'against',
    label: 'You need a loan that is not yet approved',
    pct: -1.5,
  },
  {
    id: 'lv_x_deadline',
    group: 'against',
    label: 'You have a hard deadline to move in',
    pct: -2,
  },
];

export const LEVERAGE_BY_ID: Record<string, LeverageItem> = Object.fromEntries(
  LEVERAGE.map((l) => [l.id, l]),
);
