/** Reference content shown in the Guide tab. Read once before the trip. */

export interface RedFlag {
  id: string;
  label: string;
  detail: string;
  /** 'walkaway' = do not proceed without a lawyer. 'serious' = price it in hard. */
  level: 'walkaway' | 'serious';
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: 'rf_gpa',
    label: 'Sale on General Power of Attorney',
    detail:
      'You get weak title, banks will usually not fund it, and reselling is very hard. If the titleholder will not register in your name personally, walk away.',
    level: 'walkaway',
  },
  {
    id: 'rf_unapproved',
    label: 'Unapproved colony, or Panchayat patta sold as JDA',
    detail:
      'No loan, poor resale, and in the worst case demolition or regularisation charges later. Verify who issued the patta before anything else.',
    level: 'walkaway',
  },
  {
    id: 'rf_agri',
    label: 'Agricultural land with conversion "in process"',
    detail:
      '90A/90B conversion must already be complete. "In process" is not a status you can pay against — it can stay in process for years.',
    level: 'walkaway',
  },
  {
    id: 'rf_nobank',
    label: 'No major bank will lend against it',
    detail:
      'Banks run free legal and technical diligence for you. If SBI, HDFC and ICICI all decline, they have found something. Find out what.',
    level: 'walkaway',
  },
  {
    id: 'rf_cash',
    label: 'Cash component demanded',
    detail:
      'Illegal, unbankable, and the risk sits entirely with you. It also understates your purchase price, so you pay far more capital gains tax when you sell.',
    level: 'walkaway',
  },
  {
    id: 'rf_masterplan',
    label: 'Affected by road widening or a master-plan reservation',
    detail:
      'A planned road or green belt through the property can wipe out most of its value. Check the JDA master plan for the sector.',
    level: 'walkaway',
  },
  {
    id: 'rf_heirs',
    label: 'Inherited property where one heir has not consented',
    detail:
      'The most common source of long litigation. Every legal heir must sign or give a registered NOC.',
    level: 'walkaway',
  },
  {
    id: 'rf_nooc',
    label: 'No Occupancy Certificate on a completed building',
    detail:
      'Means the building is not certified fit for occupation. Never pay the final instalment or move in without it.',
    level: 'walkaway',
  },
  {
    id: 'rf_pressure',
    label: 'Heavy pressure to decide today, or to pay a token immediately',
    detail:
      'Real prices survive a night’s sleep. "Only valid today" and "two other buyers are coming" are scripts, not facts. A good deal is still there tomorrow.',
    level: 'serious',
  },
  {
    id: 'rf_seepage',
    label: 'Seepage, or fresh paint on just one patch of wall',
    detail:
      'Recurring, expensive, and often structural at the source. Get it priced by a contractor before you commit, not after.',
    level: 'serious',
  },
  {
    id: 'rf_tanker',
    label: 'Entirely dependent on water tankers',
    detail:
      'A permanent monthly cost and a genuine worry every May. Ask residents what they paid last summer.',
    level: 'serious',
  },
  {
    id: 'rf_empty',
    label: 'Society less than half occupied, two years after possession',
    detail:
      'High maintenance per family, amenities that never run, weak security, and a hard resale. Ask why nobody moved in.',
    level: 'serious',
  },
  {
    id: 'rf_illegal',
    label: 'Construction beyond the sanctioned plan',
    detail:
      'Extra floors or covered setbacks. You inherit the penalty, the regularisation cost, or the demolition notice.',
    level: 'serious',
  },
  {
    id: 'rf_noresident',
    label: 'You are not allowed to speak to any resident',
    detail:
      'On its own, this tells you something. A well-run building is happy for you to talk to the people living in it.',
    level: 'serious',
  },
  {
    id: 'rf_noplan',
    label: 'Seller cannot or will not produce the documents',
    detail:
      'Ask for the cost sheet and paper copies on WhatsApp the same day. If they do not arrive, that is your answer.',
    level: 'serious',
  },
];

export interface PlaybookStep {
  id: string;
  title: string;
  body: string;
}

export const NEGOTIATION_PLAYBOOK: PlaybookStep[] = [
  {
    id: 'pb_before',
    title: 'Before you walk in',
    body: 'Know the honest per-sqft rate for that locality from a broker who is not selling you this property. Decide your walk-away number in advance, write it down here, and do not move it on the day. Emotion in the room is what costs money.',
  },
  {
    id: 'pb_never_first',
    title: 'Never name the first number',
    body: 'Ask "what is the best the owner would do for a quick close?" instead. Whatever figure comes back is not their floor — treat it as the new ceiling and work down from there.',
  },
  {
    id: 'pb_allin',
    title: 'Negotiate the all-inclusive number, not the headline',
    body: 'Parking, club charges, PLC, deposits, GST, registry and brokerage can add 10-15%. Always ask: "what is the final number I pay, all in, with keys in my hand?" Get it in writing.',
  },
  {
    id: 'pb_evidence',
    title: 'Negotiate with evidence, not opinion',
    body: '"It is too expensive" gets nothing. "Here are photos of the seepage, here is a contractor’s estimate, and here are two comparable flats at a lower rate" gets a discount. This is exactly what your photos and checklist notes are for.',
  },
  {
    id: 'pb_silence',
    title: 'Use silence',
    body: 'Make your offer, then stop talking. Most people negotiate against themselves in the pause. Let them fill it.',
  },
  {
    id: 'pb_freebies',
    title: 'When the price will not move, move the other things',
    body: 'Ask them to cover stamp duty, include parking or club membership, throw in the modular kitchen, waive maintenance for two years, or improve the payment schedule. Sellers protect the headline price far more than the total value.',
  },
  {
    id: 'pb_walk',
    title: 'Leave without agreeing',
    body: 'Say "let me see the others and revert." The call you get that evening is often better than anything offered in the room. This single habit is worth more than every other tactic here.',
  },
  {
    id: 'pb_writing',
    title: 'Get everything in writing before any token',
    body: 'Price, inclusions, what stays in the house, possession date, penalty for delay, and refund terms. A token paid on a verbal understanding is a token you may not see again.',
  },
];

export interface GlossaryTerm {
  term: string;
  meaning: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Patta',
    meaning:
      'The title document for land or property in Rajasthan. Who issued it matters enormously: JDA and Nagar Nigam pattas are strong, Panchayat pattas are weak for loans and resale.',
  },
  {
    term: 'JDA',
    meaning:
      'Jaipur Development Authority. Approves layouts and issues pattas for most of urban Jaipur. "JDA approved" is what you want to see.',
  },
  {
    term: '90A / 90B',
    meaning:
      'The process of converting agricultural land to residential or commercial use. Must be complete before a home can legally stand on it.',
  },
  {
    term: 'DLC rate',
    meaning:
      'District Level Committee rate, i.e. the government circle rate. Stamp duty is charged on the DLC value or the deal value, whichever is higher.',
  },
  {
    term: 'Stamp duty',
    meaning:
      'State tax on the registry, a percentage of the property value, plus a labour cess calculated on the stamp duty itself. Rajasthan charges a lower rate when the buyer is a woman. Always confirm current rates at the sub-registrar office.',
  },
  {
    term: 'Mutation (namantaran)',
    meaning:
      'Updating the government record to show the new owner after a sale. Not the same as registration — both need to happen.',
  },
  {
    term: 'Encumbrance certificate',
    meaning: 'A record showing whether any loan, mortgage or charge exists against the property.',
  },
  {
    term: 'Carpet area',
    meaning:
      'The area you can actually walk on, inside the walls. This is the only number worth comparing between properties.',
  },
  {
    term: 'Super built-up area',
    meaning:
      'Carpet area plus walls, plus your share of lobbies, staircases and amenities. Usually 25-35% larger than carpet. Builders quote rates on this because it makes the rate look lower.',
  },
  {
    term: 'Loading',
    meaning:
      'The gap between carpet and super built-up, as a percentage. Under 25% is good, over 35% means you are paying for a lot of corridor.',
  },
  {
    term: 'PLC',
    meaning:
      'Preferred Location Charge. Extra money for a corner, park-facing or lower-floor unit. Entirely negotiable.',
  },
  {
    term: 'OC / CC',
    meaning:
      'Occupancy Certificate and Completion Certificate. Proof the building is legally complete and fit to live in. Do not take possession without the OC.',
  },
  {
    term: 'RERA',
    meaning:
      'Real Estate Regulatory Authority. A registered project gives you a complaint forum and binds the builder to the promised specification and date.',
  },
  {
    term: 'Freehold vs leasehold',
    meaning:
      'Freehold means you own the land outright. Leasehold means you hold it for a fixed term from the authority, with transfer charges and a finite life.',
  },
  {
    term: 'Rental yield',
    meaning:
      'Annual rent divided by the purchase price. Below about 2% means the price is running well ahead of what the property actually earns.',
  },
];
