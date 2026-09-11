export type SignType = 'yard_sign' | 'large_sign' | 'banner' | 'billboard';
export type SignStatus = 'placed' | 'needs_repair' | 'retrieved';

export interface Campaign {
  id: string;
  name: string;
  access_pin: string;
  district_boundary?: any | null;
  created_at: string;
}

export interface Sign {
  id: string;
  campaign_id: string;
  location?: any;
  latitude: number;
  longitude: number;
  placed_by_name: string;
  sign_type: SignType;
  is_competitor: boolean;
  competitor_name?: string | null;
  photo_url?: string | null;
  status: SignStatus;
  street_address?: string | null;
  created_at: string;
  retrieved_at?: string | null;
}

export interface NearbySign extends Sign {
  distance_meters: number;
}

export interface VolunteerSession {
  campaignId: string;
  campaignName: string;
  pin: string;
  volunteerName: string;
}

export interface Recommendation {
  rank: number;
  street: string;
  lat: number;
  lng: number;
  reason: string;
  score: number;
  aadt: number;
  priority: 'critical' | 'high' | 'medium';
}

export interface InventoryStock {
  yard_sign: number;
  large_sign: number;
  banner: number;
  billboard: number;
}

export interface VolunteerAssignment {
  id: string;
  volunteer_id?: string;
  volunteer_name: string;
  target_type: 'intersection' | 'precinct' | 'scout_rec' | 'custom';
  title: string;
  street_address?: string;
  sign_type: SignType;
  quantity: number;
  lat: number;
  lng: number;
  priority: 'critical' | 'high' | 'medium';
  notes?: string;
  status: 'assigned' | 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
}

export type CanvassResult = 'contact' | 'no_contact' | 'left_flyer';
export type VoterSentiment = 'strong_support' | 'lean_support' | 'undecided' | 'lean_opposed' | 'strong_opposed';
export type GroundActivityType = 'door_knock' | 'flyer_hang' | 'town_hall' | 'lit_drop';
export type GroundVolunteerRole =
  | 'Door Canvasser'
  | 'Flyer Hanger'
  | 'Field Volunteer'
  | 'Field Scout'
  | 'Precinct Captain'
  | 'Field Director'
  | 'Town Hall / Events';

export interface CanvassRecord {
  id: string;
  campaign_id: string;
  volunteer_name: string;
  volunteer_role?: GroundVolunteerRole | string;
  activity_type: GroundActivityType;
  result: CanvassResult;
  sentiment?: VoterSentiment;
  latitude: number;
  longitude: number;
  accuracy?: number;
  street_address?: string;
  voter_name?: string;
  wants_yard_sign?: boolean;
  notes?: string;
  created_at: string;
}

export interface VolunteerLocationPing {
  volunteer_name: string;
  role: GroundVolunteerRole | string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  last_ping_at: string;
  is_active: boolean;
  current_action?: string;
  breadcrumbs?: [number, number][]; // [lng, lat] coordinate trail
}

