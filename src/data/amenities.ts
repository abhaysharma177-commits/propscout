export type AmenityGroupId =
  | 'essentials'
  | 'security'
  | 'parking'
  | 'fitness'
  | 'community'
  | 'family'
  | 'outdoors'
  | 'convenience'
  | 'building';

export interface AmenityGroup {
  id: AmenityGroupId;
  label: string;
  icon: string;
}

export interface Amenity {
  id: string;
  group: AmenityGroupId;
  label: string;
  /**
   * 'core'      - genuinely changes daily life. Missing one of these is a real cost.
   * 'useful'    - adds real comfort or value.
   * 'brochure'  - looks good in the brochure, rarely used, and you pay for its
   *               upkeep every month. Nice, but never pay a premium for it.
   */
  weightClass: 'core' | 'useful' | 'brochure';
  note?: string;
}

export const AMENITY_GROUPS: AmenityGroup[] = [
  { id: 'essentials', label: 'Essentials', icon: '\u{1F6B0}' },
  { id: 'security', label: 'Security', icon: '\u{1F6E1}\u{FE0F}' },
  { id: 'parking', label: 'Parking & transport', icon: '\u{1F697}' },
  { id: 'building', label: 'Building', icon: '\u{1F3E2}' },
  { id: 'fitness', label: 'Fitness & sports', icon: '\u{1F3CB}\u{FE0F}' },
  { id: 'community', label: 'Community', icon: '\u{1F389}' },
  { id: 'family', label: 'Kids & elders', icon: '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}' },
  { id: 'outdoors', label: 'Green & outdoors', icon: '\u{1F333}' },
  { id: 'convenience', label: 'Convenience', icon: '\u{1F6CD}\u{FE0F}' },
];

export const AMENITIES: Amenity[] = [
  // Essentials
  {
    id: 'am_water_municipal',
    group: 'essentials',
    label: 'Municipal water connection',
    weightClass: 'core',
    note: 'In Jaipur this is worth more than any clubhouse.',
  },
  { id: 'am_water_borewell', group: 'essentials', label: 'Borewell', weightClass: 'useful' },
  {
    id: 'am_water_247',
    group: 'essentials',
    label: '24x7 water supply',
    weightClass: 'core',
    note: 'Verify with a resident, not the brochure.',
  },
  {
    id: 'am_softener',
    group: 'essentials',
    label: 'Water softener / treatment plant',
    weightClass: 'useful',
    note: 'Genuinely valuable given how hard Jaipur water is.',
  },
  {
    id: 'am_dg_full',
    group: 'essentials',
    label: 'Full-home power backup',
    weightClass: 'core',
    note: 'Ask for the kW limit per home. "Backup" often means lifts only.',
  },
  { id: 'am_dg_common', group: 'essentials', label: 'Backup for lifts & common areas', weightClass: 'useful' },
  { id: 'am_sewage', group: 'essentials', label: 'Municipal sewage connection', weightClass: 'core' },
  { id: 'am_stp', group: 'essentials', label: 'Sewage treatment plant', weightClass: 'useful' },
  { id: 'am_piped_gas', group: 'essentials', label: 'Piped gas', weightClass: 'useful' },
  { id: 'am_rwh', group: 'essentials', label: 'Rainwater harvesting', weightClass: 'useful' },
  { id: 'am_solar', group: 'essentials', label: 'Solar panels / solar water heating', weightClass: 'useful' },

  // Security
  { id: 'am_gate', group: 'security', label: 'Gated with manned entry', weightClass: 'core' },
  { id: 'am_guard_247', group: 'security', label: '24x7 security guards', weightClass: 'core' },
  { id: 'am_cctv', group: 'security', label: 'CCTV coverage', weightClass: 'useful' },
  { id: 'am_intercom', group: 'security', label: 'Video door phone / intercom', weightClass: 'useful' },
  { id: 'am_visitor_log', group: 'security', label: 'Visitor management system', weightClass: 'useful' },
  { id: 'am_boundary', group: 'security', label: 'Complete boundary wall', weightClass: 'core' },
  { id: 'am_fire', group: 'security', label: 'Fire safety system & extinguishers', weightClass: 'core' },

  // Parking
  { id: 'am_covered_parking', group: 'parking', label: 'Covered / basement parking', weightClass: 'core' },
  { id: 'am_two_parking', group: 'parking', label: 'Two or more parking slots', weightClass: 'useful' },
  { id: 'am_visitor_parking', group: 'parking', label: 'Visitor parking', weightClass: 'useful' },
  { id: 'am_ev', group: 'parking', label: 'EV charging point', weightClass: 'useful' },
  { id: 'am_wide_road', group: 'parking', label: 'Wide internal roads (car can turn)', weightClass: 'useful' },

  // Building
  { id: 'am_lift', group: 'building', label: 'Lift', weightClass: 'core' },
  { id: 'am_two_lifts', group: 'building', label: 'Two or more lifts', weightClass: 'useful' },
  { id: 'am_service_lift', group: 'building', label: 'Service / stretcher lift', weightClass: 'useful' },
  { id: 'am_terrace_access', group: 'building', label: 'Terrace access', weightClass: 'useful' },
  { id: 'am_modular_kitchen', group: 'building', label: 'Modular kitchen included', weightClass: 'useful' },
  { id: 'am_wardrobes', group: 'building', label: 'Built-in wardrobes', weightClass: 'useful' },
  { id: 'am_store', group: 'building', label: 'Store room', weightClass: 'useful' },
  { id: 'am_servant', group: 'building', label: 'Servant room / utility area', weightClass: 'useful' },
  { id: 'am_upvc', group: 'building', label: 'UPVC windows (dust & noise sealing)', weightClass: 'useful' },
  { id: 'am_mesh', group: 'building', label: 'Mosquito mesh on windows', weightClass: 'useful' },

  // Fitness
  { id: 'am_gym', group: 'fitness', label: 'Gym', weightClass: 'useful' },
  {
    id: 'am_pool',
    group: 'fitness',
    label: 'Swimming pool',
    weightClass: 'brochure',
    note: 'Check whether it actually has water in it, and who pays to keep it running.',
  },
  { id: 'am_walking', group: 'fitness', label: 'Walking / jogging track', weightClass: 'useful' },
  { id: 'am_badminton', group: 'fitness', label: 'Badminton / tennis court', weightClass: 'brochure' },
  { id: 'am_yoga', group: 'fitness', label: 'Yoga / meditation area', weightClass: 'brochure' },
  { id: 'am_indoor_games', group: 'fitness', label: 'Indoor games room', weightClass: 'brochure' },

  // Community
  { id: 'am_clubhouse', group: 'community', label: 'Clubhouse', weightClass: 'useful' },
  { id: 'am_banquet', group: 'community', label: 'Party / banquet hall', weightClass: 'brochure' },
  { id: 'am_amphitheatre', group: 'community', label: 'Amphitheatre', weightClass: 'brochure' },
  { id: 'am_temple', group: 'community', label: 'Temple / prayer area', weightClass: 'useful' },
  { id: 'am_rwa', group: 'community', label: 'Active residents’ association', weightClass: 'core' },

  // Family
  { id: 'am_play', group: 'family', label: 'Children’s play area', weightClass: 'useful' },
  { id: 'am_creche', group: 'family', label: 'Creche / day care', weightClass: 'brochure' },
  { id: 'am_senior', group: 'family', label: 'Seniors’ sitting area', weightClass: 'useful' },
  {
    id: 'am_step_free',
    group: 'family',
    label: 'Step-free / ramp access',
    weightClass: 'core',
    note: 'Matters enormously if elderly parents will visit or live here.',
  },
  { id: 'am_pet_friendly', group: 'family', label: 'Pet friendly', weightClass: 'useful' },

  // Outdoors
  { id: 'am_park', group: 'outdoors', label: 'Park / landscaped garden', weightClass: 'useful' },
  {
    id: 'am_shade',
    group: 'outdoors',
    label: 'Mature trees / real shade',
    weightClass: 'core',
    note: 'Underrated in Jaipur. Shade is the difference between a usable and unusable outdoor space.',
  },
  { id: 'am_open_space', group: 'outdoors', label: 'Generous open space between blocks', weightClass: 'useful' },
  { id: 'am_balcony_view', group: 'outdoors', label: 'Open view / park facing', weightClass: 'useful' },

  // Convenience
  { id: 'am_shops', group: 'convenience', label: 'Shops inside or at the gate', weightClass: 'useful' },
  { id: 'am_atm', group: 'convenience', label: 'ATM / bank nearby', weightClass: 'useful' },
  { id: 'am_housekeeping', group: 'convenience', label: 'Common-area housekeeping', weightClass: 'useful' },
  { id: 'am_garbage', group: 'convenience', label: 'Door-to-door garbage collection', weightClass: 'useful' },
  { id: 'am_maintenance_staff', group: 'convenience', label: 'On-site plumber / electrician', weightClass: 'useful' },
  { id: 'am_fibre', group: 'convenience', label: 'Fibre broadband available', weightClass: 'core' },
];

export const AMENITIES_BY_ID: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map((a) => [a.id, a]),
);

export const WEIGHT_CLASS_LABEL: Record<Amenity['weightClass'], string> = {
  core: 'Changes daily life',
  useful: 'Adds real value',
  brochure: 'Brochure filler',
};
