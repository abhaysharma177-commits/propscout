import type { PropertyType } from '../types';

export type GroupId =
  | 'opening'
  | 'price'
  | 'legal'
  | 'living'
  | 'society'
  | 'project'
  | 'resident'
  | 'closing';

export interface QuestionGroup {
  id: GroupId;
  label: string;
  icon: string;
  askWho: string;
  blurb: string;
}

export interface Question {
  id: string;
  group: GroupId;
  q: string;
  /** Why this question is worth asking. */
  why?: string;
  /** What a good answer sounds like, and what should worry you. */
  listen?: string;
  appliesTo: PropertyType[];
  /** Marks the handful of questions that reveal the most. */
  killer?: boolean;
}

const ALL: PropertyType[] = ['flat', 'villa', 'plot', 'commercial'];
const BUILT: PropertyType[] = ['flat', 'villa', 'commercial'];
const FLAT: PropertyType[] = ['flat', 'commercial'];

export const QUESTION_GROUPS: QuestionGroup[] = [
  {
    id: 'opening',
    label: 'Ask first',
    icon: '\u{1F44B}',
    askWho: 'Whoever is showing you the property',
    blurb: 'These set the tone and quietly tell you how much leverage you have.',
  },
  {
    id: 'price',
    label: 'Price & negotiation',
    icon: '\u{1F4B0}',
    askWho: 'Broker / owner / sales office',
    blurb: 'Never make the first number. Ask, listen, and write the answers down.',
  },
  {
    id: 'legal',
    label: 'Papers & legality',
    icon: '\u{1F4C4}',
    askWho: 'Owner, or the builder’s sales head',
    blurb: 'Ask calmly and factually. A straight seller answers these without flinching.',
  },
  {
    id: 'living',
    label: 'Daily living',
    icon: '\u{1F3E0}',
    askWho: 'Anyone — then verify with a resident',
    blurb: 'The answers here decide whether you enjoy living there.',
  },
  {
    id: 'society',
    label: 'Society & maintenance',
    icon: '\u{1F465}',
    askWho: 'Society office / RWA member / guard',
    blurb: 'The guard at the gate often knows more than the sales office.',
  },
  {
    id: 'project',
    label: 'If under construction',
    icon: '\u{1F3D7}\u{FE0F}',
    askWho: 'Builder’s sales team',
    blurb: 'Promises are cheap. Ask for everything in the agreement, not the brochure.',
  },
  {
    id: 'resident',
    label: 'Ask a resident',
    icon: '\u{1F6AA}',
    askWho: 'Any resident, with the broker out of earshot',
    blurb: 'The most honest information you will get all day. Make time for this.',
  },
  {
    id: 'closing',
    label: 'Ask at the end',
    icon: '\u{1F91D}',
    askWho: 'The seller or broker, as you leave',
    blurb: 'Leave the door open and keep the next move yours.',
  },
];

export const QUESTIONS: Question[] = [
  // -------- OPENING --------
  {
    id: 'q_onmarket',
    group: 'opening',
    q: 'How long has this been on the market?',
    why: 'The longer it has sat unsold, the more room you have. This is the cheapest leverage you can buy with one question.',
    listen: 'Under a month means little room. Six months or more means real room. A vague "just came" when the listing looks old is a tell.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_whyselling',
    group: 'opening',
    q: 'Why is the owner selling?',
    why: 'Urgency is the thing you are really negotiating against. A transfer, a medical need or a loan repayment means a faster, cheaper deal.',
    listen: '"Shifting abroad next month" or "needs funds" is leverage. "Just testing the market" means they will not move on price.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_fellthrough',
    group: 'opening',
    q: 'Has any earlier deal on this fallen through? What happened?',
    why: 'A collapsed deal usually means a buyer found something in the papers or the building. That something is still there.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_howmanyseen',
    group: 'opening',
    q: 'How many people have seen it, and has anyone made an offer?',
    listen: 'If offers were made and refused, ask what number was refused.',
    appliesTo: ALL,
  },
  {
    id: 'q_role',
    group: 'opening',
    q: 'Are you the owner, the builder, or the broker here?',
    why: 'Changes who can actually say yes to a discount, and who is only passing messages.',
    appliesTo: ALL,
  },

  // -------- PRICE --------
  {
    id: 'q_allin',
    group: 'price',
    q: 'Is this price all-inclusive? Can I get a written cost sheet?',
    why: 'Parking, club charges, PLC, deposits, GST and registry are usually extra. The real number is often 10-15% higher than quoted.',
    listen: 'Refusal to put it in writing is the answer.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_lastdeal',
    group: 'price',
    q: 'What was the last transaction price in this building or street?',
    why: 'Actual registered prices, not asking prices, are the only honest benchmark.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_best',
    group: 'price',
    q: 'If I were ready to pay quickly, what is the best the owner would do?',
    why: 'This asks for their floor without you naming a number first.',
    listen: 'Whatever figure comes out, it is not the floor. Treat it as the new ceiling.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_ratepersqft',
    group: 'price',
    q: 'What is the rate per sqft, and is it on carpet or super built-up?',
    why: 'Two flats quoted at the same rate can differ by a fifth in usable space.',
    appliesTo: FLAT,
  },
  {
    id: 'q_unsold',
    group: 'price',
    q: 'How many units are still unsold in this project?',
    why: 'Heavy unsold inventory, especially near the end of a quarter, is when builders actually discount.',
    appliesTo: FLAT,
    killer: true,
  },
  {
    id: 'q_cash',
    group: 'price',
    q: 'Is the full amount going into the registry, or is there a cash component?',
    why: 'A cash demand is illegal, unbankable, and it understates your purchase price so you pay more tax on resale.',
    listen: 'Any hesitation here should change how you feel about the whole deal.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_brokerage',
    group: 'price',
    q: 'What is the brokerage and who pays it?',
    appliesTo: ALL,
  },
  {
    id: 'q_freebies',
    group: 'price',
    q: 'What can you include instead of cutting the price?',
    why: 'When they will not move on the number, they will often throw in parking, club membership, stamp duty, a modular kitchen or free maintenance for two years. Real money, easier yes.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_payment',
    group: 'price',
    q: 'What is the payment schedule, and what is the booking amount?',
    appliesTo: ALL,
  },

  // -------- LEGAL --------
  {
    id: 'q_patta',
    group: 'legal',
    q: 'Whose name is the patta in, and who issued it?',
    appliesTo: ALL,
  },
  {
    id: 'q_owners',
    group: 'legal',
    q: 'How many names are on the title, and will all of them sign?',
    appliesTo: ALL,
  },
  {
    id: 'q_loanon',
    group: 'legal',
    q: 'Is there any loan running on the property right now?',
    appliesTo: ALL,
  },
  {
    id: 'q_banks',
    group: 'legal',
    q: 'Which banks have approved home loans here?',
    why: 'Banks do their own legal and technical diligence. Two or three major banks funding it is free verification for you.',
    listen: 'If only obscure lenders or none at all will fund it, ask why, and take the answer seriously.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_rera',
    group: 'legal',
    q: 'What is the RERA registration number?',
    why: 'Write it down and check it yourself the same evening.',
    appliesTo: ['flat', 'villa', 'commercial'],
  },
  {
    id: 'q_oc',
    group: 'legal',
    q: 'Do you have the Completion and Occupancy Certificates?',
    appliesTo: FLAT,
  },
  {
    id: 'q_dispute',
    group: 'legal',
    q: 'Is there any dispute, court case or stay order on this property?',
    appliesTo: ALL,
  },
  {
    id: 'q_dlc',
    group: 'legal',
    q: 'What is the DLC / circle rate here, and what will registry cost?',
    why: 'Stamp duty applies on the DLC rate or deal value, whichever is higher. It changes your total by lakhs.',
    appliesTo: ALL,
  },
  {
    id: 'q_conversion',
    group: 'legal',
    q: 'Is the 90A / 90B conversion complete, or still in process?',
    listen: '"In process" means not done. Do not pay against a promise of conversion.',
    appliesTo: ['plot', 'villa'],
  },

  // -------- LIVING --------
  {
    id: 'q_water',
    group: 'living',
    q: 'Where does the water come from, and how many hours a day?',
    why: 'The most common regret in Jaipur. Ask here, then ask a resident the same thing.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_summer',
    group: 'living',
    q: 'What happens to water in May and June? Are tankers needed?',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_waterquality',
    group: 'living',
    q: 'Is the water hard or salty? Does anyone here use a softener?',
    appliesTo: BUILT,
  },
  {
    id: 'q_power',
    group: 'living',
    q: 'How often are power cuts, and does the backup cover the whole home?',
    listen: '"Power backup available" often means only the lift and the corridor lights. Ask for the per-home kW limit.',
    appliesTo: BUILT,
  },
  {
    id: 'q_flood',
    group: 'living',
    q: 'Does this road or the basement fill up during the monsoon?',
    why: 'Nobody volunteers this. Ask a shopkeeper nearby for the real answer.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_noise',
    group: 'living',
    q: 'What is the noise like in the evening and early morning?',
    appliesTo: BUILT,
  },
  {
    id: 'q_revisit',
    group: 'living',
    q: 'Can I come back at 7pm on a weekday, and once in the morning?',
    why: 'A property is a completely different place at rush hour, at night, and on a weekday. A confident seller says yes immediately.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_included',
    group: 'living',
    q: 'What stays with the house — ACs, geysers, wardrobes, light fittings, curtains?',
    why: 'Worth a lakh or two, and the source of a lot of bad feeling at handover if it is not written down.',
    appliesTo: BUILT,
  },
  {
    id: 'q_repairs',
    group: 'living',
    q: 'What has been repaired in the last two years, and what still needs doing?',
    appliesTo: BUILT,
  },
  {
    id: 'q_possession',
    group: 'living',
    q: 'When can I actually get possession?',
    appliesTo: ALL,
  },

  // -------- SOCIETY --------
  {
    id: 'q_maint',
    group: 'society',
    q: 'What is the monthly maintenance, and what does it include?',
    appliesTo: FLAT,
  },
  {
    id: 'q_maintrise',
    group: 'society',
    q: 'How much has maintenance gone up in the last three years?',
    why: 'Tells you whether the society is run sensibly, and what you will be paying in a decade.',
    appliesTo: FLAT,
  },
  {
    id: 'q_occupancy',
    group: 'society',
    q: 'How many flats are occupied out of the total?',
    appliesTo: FLAT,
  },
  {
    id: 'q_rwa',
    group: 'society',
    q: 'Is there a residents’ association, or is the builder still running maintenance?',
    appliesTo: FLAT,
  },
  {
    id: 'q_rules',
    group: 'society',
    q: 'Any rules on pets, food, tenants or guests?',
    appliesTo: FLAT,
  },
  {
    id: 'q_parking',
    group: 'society',
    q: 'Is the parking slot allotted and in writing? Can I see the exact slot?',
    appliesTo: FLAT,
  },
  {
    id: 'q_deposits',
    group: 'society',
    q: 'Any one-time deposits: corpus fund, transfer charge, club membership?',
    appliesTo: FLAT,
  },
  {
    id: 'q_neighbours',
    group: 'society',
    q: 'Who lives above, below and next door?',
    appliesTo: FLAT,
  },

  // -------- PROJECT --------
  {
    id: 'q_track',
    group: 'project',
    q: 'Which projects have you completed and handed over in Jaipur, and when?',
    why: 'Go and look at one of their five-year-old buildings. That is what yours will look like.',
    appliesTo: FLAT,
    killer: true,
  },
  {
    id: 'q_delay',
    group: 'project',
    q: 'What is the penalty if possession is delayed, and is it in the agreement?',
    appliesTo: FLAT,
  },
  {
    id: 'q_exit',
    group: 'project',
    q: 'If I want to exit, what do I get back and on what timeline?',
    appliesTo: FLAT,
  },
  {
    id: 'q_priceescalation',
    group: 'project',
    q: 'Can the price be revised after booking?',
    listen: 'An escalation clause means your budget is not really your budget.',
    appliesTo: FLAT,
  },
  {
    id: 'q_spec',
    group: 'project',
    q: 'Can I get the specification list — brands of tiles, fittings, wiring, lift?',
    why: 'Brochures say "premium fittings". Ask for brand names in writing, and check them at handover.',
    appliesTo: FLAT,
  },
  {
    id: 'q_sample',
    group: 'project',
    q: 'Is the sample flat the same size and spec as what I will get?',
    why: 'Sample flats are routinely built oversized, with thinner walls and no door frames, to feel bigger.',
    appliesTo: FLAT,
    killer: true,
  },
  {
    id: 'q_amenitydate',
    group: 'project',
    q: 'Which amenities are built today, and what is the committed date for the rest?',
    appliesTo: FLAT,
  },

  // -------- RESIDENT --------
  {
    id: 'q_r_years',
    group: 'resident',
    q: 'How long have you lived here?',
    appliesTo: ALL,
  },
  {
    id: 'q_r_problem',
    group: 'resident',
    q: 'What is the one thing you wish you had known before moving in?',
    why: 'The single best question in this entire app. People answer it honestly, and it goes straight to the real problem.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_r_water',
    group: 'resident',
    q: 'How is the water, honestly? And in summer?',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_r_builder',
    group: 'resident',
    q: 'How was the builder to deal with after possession?',
    appliesTo: FLAT,
  },
  {
    id: 'q_r_maint',
    group: 'resident',
    q: 'Is the maintenance money actually being spent well?',
    appliesTo: FLAT,
  },
  {
    id: 'q_r_safety',
    group: 'resident',
    q: 'Do you feel safe here at night? Any incidents?',
    appliesTo: ALL,
  },
  {
    id: 'q_r_again',
    group: 'resident',
    q: 'Would you buy here again?',
    why: 'A pause before the answer tells you as much as the answer.',
    appliesTo: ALL,
    killer: true,
  },

  // -------- CLOSING --------
  {
    id: 'q_c_docs',
    group: 'closing',
    q: 'Can you send me the cost sheet and copies of the papers on WhatsApp today?',
    why: 'Whether it actually arrives tells you how serious and how organised they are.',
    appliesTo: ALL,
  },
  {
    id: 'q_c_worry',
    group: 'closing',
    q: 'If you were me, what would worry you about this property?',
    why: 'Disarming, and it works surprisingly often. Brokers who want a long-term client will tell you something real.',
    appliesTo: ALL,
    killer: true,
  },
  {
    id: 'q_c_similar',
    group: 'closing',
    q: 'What else do you have that is similar but better value?',
    why: 'Signals you are comparing, not committed, and often surfaces unlisted inventory.',
    appliesTo: ALL,
  },
  {
    id: 'q_c_valid',
    group: 'closing',
    q: 'How long is this price valid for?',
    listen: '"Only today" is a pressure tactic. Real prices survive a night’s sleep.',
    appliesTo: ALL,
  },
  {
    id: 'q_c_nonumber',
    group: 'closing',
    q: 'Do NOT give your number yet — say you will revert after seeing the others',
    why: 'Whoever names a price first loses ground. Leaving without an offer keeps every option open and often brings a call with a better price.',
    appliesTo: ALL,
    killer: true,
  },
];

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

export function questionsFor(type: PropertyType): Question[] {
  return QUESTIONS.filter((q) => q.appliesTo.includes(type));
}

export function groupsFor(type: PropertyType): QuestionGroup[] {
  const present = new Set(questionsFor(type).map((q) => q.group));
  return QUESTION_GROUPS.filter((g) => present.has(g.id));
}
