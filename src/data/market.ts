/**
 * Market context from the knowledge base (compiled 16 Sep 2026).
 *
 * Everything here is desk research that lags the market by 1-3 months. It is
 * for anchoring a negotiation, not for relying on. Re-confirm rates with two
 * local brokers before you transact.
 */

export const KB_COMPILED = '16 September 2026';

export interface MicroMarket {
  id: string;
  label: string;
  ratePerSqft: number;
  trend: string;
  /** Which of your shortlisted properties sit here. */
  properties: string[];
  confirmed: string[];
  proposed: string[];
  downside: string;
}

export const MICRO_MARKETS: MicroMarket[] = [
  {
    id: 'mansarovar_ext',
    label: 'Mansarovar Extension',
    ratePerSqft: 4950,
    trend:
      'Apartments ₹4,200-6,450/sqft, average ~₹4,950 (+3.1% YoY) on 99acres, but Square Yards shows the apartment segment at ~₹4,400 and DEPRECIATING. Five-year appreciation +78.6%, but the last 12 months are flat to soft. A buyer’s market.',
    properties: ['Shubhashish Prakash', 'Shubhashish Geeta', 'Ashiana Ekansh', 'Dukia Aerovista'],
    confirmed: ['200-ft & Vande Mataram roads', 'Pink Line metro at Mansarovar (operational)', 'DMart', 'ISKCON'],
    proposed: ['Pink Line Ajmer Road extension (under construction, no guaranteed date)', 'Orange Line (approved, not built)'],
    downside: 'Apartment oversupply. Bisalpur and borewell mix — test summer water.',
  },
  {
    id: 'jagatpura',
    label: 'Jagatpura',
    ratePerSqft: 4865,
    trend:
      '₹4,865/sqft with a -2.54% recent correction (Square Yards, Jun 2026), yet +14.9% over 1 yr and +63.9% over 5 yr on 99acres. A volatile, coaching- and airport-driven belt. Best rental yield of your corridors at ~5%.',
    properties: ['Trimurty Ariana', 'JVJ Silicon Valley'],
    confirmed: ['Airport ~6 km', '80-ft road', 'SKIT / Gyan Vihar colleges', 'Jayshree Periwal & SRN schools'],
    proposed: ['Metro Phase 2 (no funded timeline)', 'Delhi-Mumbai Expressway spur'],
    downside:
      'Borewell and tanker water is the known weak spot. Transient coaching-student rental churn.',
  },
  {
    id: 'ajmer_road',
    label: 'Ajmer Road / Bhankrota',
    ratePerSqft: 4250,
    trend: '₹4,250/sqft, +12.03% YoY (Square Yards) — the fastest riser of your corridors, but off a low base.',
    properties: ['Ashiana Nitara'],
    confirmed: ['NH-48', 'DPS Jaipur', 'JK Lakshmipat University'],
    proposed: ['Metro extension'],
    downside: 'Thin daily-needs retail and hospitals. Long run to the airport.',
  },
  {
    id: 'vaishali_ext',
    label: 'Vaishali Nagar Extension / Keshopura',
    ratePerSqft: 6200,
    trend:
      'Premium at ₹6,200-7,100/sqft. Ashiana Amantran itself moved ₹6,350 → ₹7,100/sqft in Q2 2026 (+11.81%).',
    properties: ['Ashiana Amantran'],
    confirmed: ['Mature social infrastructure — schools, hospitals, markets'],
    proposed: [],
    downside: 'Price, and NH traffic on the Vaishali Nagar Extension stretch.',
  },
];

export interface MarketFact {
  id: string;
  label: string;
  detail: string;
  tone: 'good' | 'warn' | 'neutral';
}

export const MARKET_FRAME: MarketFact[] = [
  {
    id: 'mf_buyers',
    label: 'This is a buyer-favouring apartment market right now',
    detail:
      'Mansarovar apartments are depreciating on Square Yards, Jagatpura corrected -2.54%, and Ashiana’s own Q3 FY26 filing shows area booked down to 5.56 lakh sqft from 6.77 lakh a year ago. Sellers and developers need to move inventory. Expect 5-10% on primary units plus freebies, and 5-8% on motivated resale.',
    tone: 'good',
  },
  {
    id: 'mf_gst',
    label: 'GST is a ~5% swing that favours ready-to-move',
    detail:
      'Ready-to-move with an Occupancy Certificate attracts NIL GST. Under-construction attracts 5% with no input tax credit on the agreement value. On a ₹1.1 Cr flat that is about ₹5.5 lakh, for nothing. It is the single largest structural cost difference between your options.',
    tone: 'good',
  },
  {
    id: 'mf_stamp',
    label: 'Register in a woman’s sole name to save ~1.33% of the deal value',
    detail:
      'Rajasthan 2026: total sale-deed charge is about 8.98% for men or joint buyers, and 7.65% for a sole female buyer. That is stamp duty 6% (men/joint) or 5% (sole female), plus a 20% labour cess calculated on the stamp duty, plus 1% registration. On a ₹1-1.2 Cr flat the saving is roughly ₹1.3-1.6 lakh. Confirm on the e-Panjiyan portal against the DLC rate.',
    tone: 'good',
  },
  {
    id: 'mf_metro',
    label: 'Do not pay a metro premium you are not getting',
    detail:
      'The Pink Line runs Mansarovar to Badi Chaupar and is operational. The Ajmer Road extension (Phase 1D) is UNDER CONSTRUCTION, not operational. Jagatpura has NO operational metro; Phase 2 is only proposed. Treat every metro-proximity sales pitch for Mansarovar Extension and Jagatpura as proposed, not confirmed.',
    tone: 'warn',
  },
  {
    id: 'mf_loading',
    label: 'Jaipur quotes super built-up, and loading runs 30-38%',
    detail:
      'Almost every listing you see is super built-up. Loading in this set runs from ~30% (Amantran) to ~38% (Prakash). Always demand the RERA carpet figure and compare properties on carpet. A "1,968 sqft" flat with 38% loading gives you less usable space than an "1,810 sqft" flat with 30%.',
    tone: 'warn',
  },
  {
    id: 'mf_dlc',
    label: 'Stamp duty applies on the DLC rate or the deal value, whichever is higher',
    detail:
      'If the government circle rate for the locality is above your negotiated price, you pay duty on the higher figure. Check the DLC rate for the exact sector before you finalise, so the registry cost does not surprise you.',
    tone: 'warn',
  },
];

/** Scripts that work at any of the eight, not just one. */
export const UNIVERSAL_SCRIPTS: string[] = [
  '"Square Yards shows Jagatpura corrected -2.54% this quarter and Mansarovar apartments are flat-to-down — why am I paying above the 12-month trend?"',
  '"Ashiana’s own Q3 FY26 exchange filing shows area booked down to 5.56 lakh sqft from 6.77 lakh — inventory is moving slower, so let us talk realistically."',
  '"Ariana is 2,200+ sqft super built-up at about ₹4,000/sqft, ready, with NIL GST. Justify your premium on carpet, not super built-up."',
  '"I will register in my [female family member]\'s name — you help me on stamp cost, or match the ~1.33% saving in the price."',
  '"This is under construction, so I am paying 5% GST and carrying delivery risk. A ready flat costs me neither — close that gap."',
];

export interface PlayOff {
  id: string;
  label: string;
  detail: string;
}

/** How to run the shortlist against itself. */
export const PLAY_OFFS: PlayOff[] = [
  {
    id: 'po_ashiana',
    label: 'Within Ashiana: Ekansh vs Amantran',
    detail:
      'Ekansh is ~₹3,900/sqft and not ready. Amantran is ready at ~₹7,100/sqft. Same builder, same brand. Ask Amantran’s team why the premium, and ask Ekansh’s team to discount for the 2028 wait.',
  },
  {
    id: 'po_jagatpura',
    label: 'Within Jagatpura: Ariana vs JVJ',
    detail:
      'Ariana is ready, 2,200+ sqft, ~₹4,000/sqft. JVJ is 2028, 1,750 sqft, ~₹5,500/sqft. JVJ has no credible answer to Ariana on value — use it to extract 8-10% plus freebies from JVJ, or simply buy Ariana.',
  },
  {
    id: 'po_mansarovar',
    label: 'Within Mansarovar Extension: Geeta vs Prakash vs Dukia',
    detail:
      'Geeta’s near-readiness is the trump card. Make Prakash and Dukia beat it on price, or lose you.',
  },
];

/** The three things that actually matter, from the knowledge base TL;DR. */
export const HEADLINES: string[] = [
  'Buy one of the two ready-to-move flats: Trimurty Ariana (Jagatpura) for the most space per rupee, or Ashiana Amantran (Vaishali Nagar Extension) for brand, amenities and liquidity. Both fit a ₹1.5 Cr all-in ceiling comfortably.',
  'Avoid or defer the five under-construction plays unless you will carry construction risk. Ashiana Nitara is largely a villa project, not the spacious apartment you want — deprioritise it.',
  'You are in a buyer-favouring apartment market in these corridors. Expect 5-10% negotiable room on primary units plus freebies, and 5-8% on motivated resale.',
];

/** Where the research is weakest — read this before acting on any of it. */
export const KB_WEAKNESSES: string[] = [
  'Thinnest verified data: Dukia Aerovista and JVJ Silicon Valley. Dukia’s carpet area, bathroom count and parking are entirely unpublished. Both RERA project numbers need portal confirmation. Do not act on either without a brochure plus RERA verification.',
  'Possession-date conflicts to resolve on the RERA certificate: Shubhashish Prakash (2027 vs 2028) and Ashiana Nitara (2026 vs 2028). These change both the GST bill and your move-in timeline.',
  'Most figures are super built-up. Re-run every value judgement on the RERA carpet number.',
  'All-in costs and negotiated prices are estimates built on portal quotes plus statutory rates. Actual base price, PLC, club/IFMS and brokerage vary by unit and by the day.',
  'What would most change the ranking once you are on the ground: if Ariana’s 7-year-old building shows seepage, lift or RWA-fund problems it drops from #1. If Amantran’s available unit is high-floor single-lift, it drops. If a Shubhashish phase or Ekansh turns out to have OC and a near-term date, it jumps. If Jagatpura water tests poorly in summer, both Jagatpura options fall.',
];
