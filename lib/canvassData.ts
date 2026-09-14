import { CanvassRecord, VolunteerLocationPing, GroundVolunteerRole } from './types';
import { getCampaignId } from '@/lib/auth';
import { fetchFromSupabase, upsertToSupabase, deleteFromSupabase, subscribeToTable } from '@/lib/syncEngine';

export const CANVASS_STORAGE_KEY = 'campaignos_canvass_records';
export const CANVASS_PING_KEY = 'campaignos_canvass_ping';
export const VOLUNTEER_PINGS_STORAGE_KEY = 'campaignos_volunteer_pings';
export const VOLUNTEER_PINGS_PING_KEY = 'campaignos_volunteer_pings_tick';

export const SEED_CANVASS_RECORDS: CanvassRecord[] = [
  // Sarah Jenkins - Precinct 3A (Anderson Street Historic Residential Grid)
  {
    id: 'canvass-1',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Sarah Jenkins',
    volunteer_role: 'Door Canvasser',
    activity_type: 'door_knock',
    result: 'contact',
    sentiment: 'strong_support',
    latitude: 36.5910,
    longitude: -82.1945,
    street_address: '916 Anderson St',
    voter_name: 'Linda Campbell',
    wants_yard_sign: true,
    notes: 'Very excited about Melissa. Requested a yard sign for the front lawn.',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'canvass-2',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Sarah Jenkins',
    volunteer_role: 'Door Canvasser',
    activity_type: 'door_knock',
    result: 'no_contact',
    latitude: 36.5908,
    longitude: -82.1965,
    street_address: '1008 Anderson St',
    created_at: new Date(Date.now() - 3600000 * 1.3).toISOString(),
  },
  {
    id: 'canvass-3',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Sarah Jenkins',
    volunteer_role: 'Door Canvasser',
    activity_type: 'flyer_hang',
    result: 'left_flyer',
    latitude: 36.5905,
    longitude: -82.1985,
    street_address: '1032 Anderson St',
    notes: 'Left full candidate municipal platform door hanger on screen door handle.',
    created_at: new Date(Date.now() - 3600000 * 1.1).toISOString(),
  },
  {
    id: 'canvass-4',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Sarah Jenkins',
    volunteer_role: 'Door Canvasser',
    activity_type: 'door_knock',
    result: 'contact',
    sentiment: 'undecided',
    latitude: 36.5902,
    longitude: -82.2005,
    street_address: '1118 Anderson St',
    voter_name: 'Robert Vance Jr.',
    wants_yard_sign: false,
    notes: 'Friendly conversation. Focused on local street paving and downtown parking.',
    created_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
  },
  {
    id: 'canvass-5',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Sarah Jenkins',
    volunteer_role: 'Door Canvasser',
    activity_type: 'door_knock',
    result: 'contact',
    sentiment: 'strong_support',
    latitude: 36.5899,
    longitude: -82.2025,
    street_address: '1206 Anderson St',
    voter_name: 'Doris Jenkins',
    wants_yard_sign: true,
    notes: 'Loves our infrastructure plan. Put her on volunteer list for phone banks.',
    created_at: new Date(Date.now() - 3600000 * 0.4).toISOString(),
  },

  // Marcus Taylor - Precinct 2A (Virginia Ave / Melrose)
  {
    id: 'canvass-6',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Marcus Taylor',
    volunteer_role: 'Flyer Hanger',
    activity_type: 'flyer_hang',
    result: 'left_flyer',
    latitude: 36.6025,
    longitude: -82.1765,
    street_address: '1120 Virginia Ave',
    notes: 'Hung municipal election guide flyer.',
    created_at: new Date(Date.now() - 3600000 * 2.2).toISOString(),
  },
  {
    id: 'canvass-7',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Marcus Taylor',
    volunteer_role: 'Flyer Hanger',
    activity_type: 'flyer_hang',
    result: 'left_flyer',
    latitude: 36.6030,
    longitude: -82.1758,
    street_address: '1132 Virginia Ave',
    notes: 'Flyer placed in mail slot with permission.',
    created_at: new Date(Date.now() - 3600000 * 2.0).toISOString(),
  },
  {
    id: 'canvass-8',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Marcus Taylor',
    volunteer_role: 'Door Canvasser',
    activity_type: 'door_knock',
    result: 'contact',
    sentiment: 'lean_support',
    latitude: 36.6035,
    longitude: -82.1750,
    street_address: '1148 Virginia Ave',
    voter_name: 'Greg Higgins',
    notes: 'Leaning Melissa. Asked about small business tax relief.',
    created_at: new Date(Date.now() - 3600000 * 1.7).toISOString(),
  },
  {
    id: 'canvass-9',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    volunteer_name: 'Marcus Taylor',
    volunteer_role: 'Door Canvasser',
    activity_type: 'door_knock',
    result: 'no_contact',
    latitude: 36.6040,
    longitude: -82.1742,
    street_address: '1156 Virginia Ave',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
];

export const SEED_VOLUNTEER_PINGS: VolunteerLocationPing[] = [
  {
    volunteer_name: 'Sarah Jenkins',
    role: 'Door Canvasser',
    latitude: 36.5897,
    longitude: -82.2038,
    accuracy: 6,
    last_ping_at: new Date(Date.now() - 1000 * 45).toISOString(),
    is_active: true,
    current_action: 'Canvassing Anderson St / Precinct 3A',
    breadcrumbs: [
      [-82.1935, 36.5912],
      [-82.1945, 36.5910],
      [-82.1955, 36.5909],
      [-82.1965, 36.5908],
      [-82.1975, 36.5906],
      [-82.1985, 36.5905],
      [-82.1995, 36.5903],
      [-82.2005, 36.5902],
      [-82.2015, 36.5900],
      [-82.2025, 36.5899],
      [-82.2032, 36.5898],
      [-82.2038, 36.5897],
    ],
  },
  {
    volunteer_name: 'Marcus Taylor',
    role: 'Flyer Hanger',
    latitude: 36.6048,
    longitude: -82.1730,
    accuracy: 8,
    last_ping_at: new Date(Date.now() - 1000 * 120).toISOString(),
    is_active: true,
    current_action: 'Hanging Door Lit on Virginia Ave',
    breadcrumbs: [
      [-82.176466, 36.602484],
      [-82.176412, 36.602558],
      [-82.176153, 36.602914],
      [-82.176021, 36.603101],
      [-82.175669, 36.603597],
      [-82.174977, 36.603274],
      [-82.174858, 36.603431],
      [-82.174620, 36.603745],
      [-82.174488, 36.603903],
      [-82.174352, 36.604077],
      [-82.173000, 36.604800],
    ],
  },
  {
    volunteer_name: 'David Vance',
    role: 'Field Director',
    latitude: 36.5880,
    longitude: -82.1861,
    accuracy: 12,
    last_ping_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    is_active: false,
    current_action: 'Standby at Volunteer Pkwy HQ',
    breadcrumbs: [
      [-82.1861, 36.5880],
    ],
  },
  {
    volunteer_name: 'Campaign Volunteer',
    role: 'Field Volunteer',
    latitude: 36.5951,
    longitude: -82.1887,
    accuracy: 10,
    last_ping_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    is_active: false,
    current_action: 'Placing Signs on State St',
    breadcrumbs: [
      [-82.1887, 36.5951],
      [-82.1868, 36.5958],
      [-82.1848, 36.5966],
      [-82.1830, 36.5975],
    ],
  },
];

/* =========================================================================
   CANVASS RECORDS STORAGE
   ========================================================================= */

export function getStoredCanvassRecords(): CanvassRecord[] {
  if (typeof window === 'undefined') return SEED_CANVASS_RECORDS;
  try {
    const raw = localStorage.getItem(CANVASS_STORAGE_KEY) || localStorage.getItem('wardrunner_canvass_records');
    if (!raw) {
      localStorage.setItem(CANVASS_STORAGE_KEY, JSON.stringify(SEED_CANVASS_RECORDS));
      return SEED_CANVASS_RECORDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Auto-upgrade legacy 9th St Sarah Jenkins canvass records to Anderson St
      const sjRec = parsed.find((r: any) => r.id === 'canvass-1');
      if (sjRec && (sjRec.street_address === '901 9th St' || (sjRec.latitude && sjRec.latitude < 36.588))) {
        const userKnocks = parsed.filter((r: any) => !['canvass-1', 'canvass-2', 'canvass-3', 'canvass-4', 'canvass-5'].includes(r.id));
        const updated = [...SEED_CANVASS_RECORDS.slice(0, 5), ...userKnocks];
        localStorage.setItem(CANVASS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    return SEED_CANVASS_RECORDS;
  } catch {
    return SEED_CANVASS_RECORDS;
  }
}

export function saveStoredCanvassRecords(records: CanvassRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CANVASS_STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(CANVASS_PING_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('campaignos_canvass_updated', { detail: records }));
    window.dispatchEvent(new CustomEvent('wardrunner_canvass_updated', { detail: records }));
  } catch (e) {
    console.warn('Failed to save canvass records to localStorage:', e);
  }
}

export async function fetchCanvassRecords(): Promise<CanvassRecord[]> {
  const campaignId = getCampaignId();
  return fetchFromSupabase<CanvassRecord>('canvass_records', CANVASS_STORAGE_KEY, campaignId);
}

export function subscribeCanvassRecords(onUpdate: (records: CanvassRecord[]) => void): () => void {
  const campaignId = getCampaignId();
  return subscribeToTable('canvass_records', campaignId, onUpdate);
}

export function addCanvassRecord(payload: Partial<CanvassRecord>): CanvassRecord {
  const newRecord: CanvassRecord = {
    id: payload.id || 'canvass-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    campaign_id: payload.campaign_id || getCampaignId(),
    volunteer_name: payload.volunteer_name || 'Campaign Volunteer',
    volunteer_role: payload.volunteer_role || 'Door Canvasser',
    activity_type: payload.activity_type || 'door_knock',
    result: payload.result || 'contact',
    sentiment: payload.sentiment,
    latitude: Number(payload.latitude) || 36.5866,
    longitude: Number(payload.longitude) || -82.1963,
    accuracy: payload.accuracy,
    street_address: payload.street_address,
    voter_name: payload.voter_name,
    wants_yard_sign: !!payload.wants_yard_sign,
    notes: payload.notes,
    created_at: payload.created_at || new Date().toISOString(),
  };

  // Save locally first (synchronous, instant)
  const current = getStoredCanvassRecords();
  saveStoredCanvassRecords([newRecord, ...current]);

  // Fire-and-forget Supabase sync
  upsertToSupabase<CanvassRecord>('canvass_records', CANVASS_STORAGE_KEY, newRecord).catch(err => {
    console.warn('Failed to sync canvass record to Supabase:', err);
  });

  return newRecord;
}

export async function deleteCanvassRecord(id: string): Promise<void> {
  const current = getStoredCanvassRecords();
  const filtered = current.filter(r => r.id !== id);
  saveStoredCanvassRecords(filtered);

  await deleteFromSupabase('canvass_records', CANVASS_STORAGE_KEY, id);
}

/* =========================================================================
   VOLUNTEER LIVE LOCATION PINGS & BREADCRUMBS
   ========================================================================= */

export function getStoredVolunteerPings(): VolunteerLocationPing[] {
  if (typeof window === 'undefined') return SEED_VOLUNTEER_PINGS;
  try {
    const raw = localStorage.getItem(VOLUNTEER_PINGS_STORAGE_KEY) || localStorage.getItem('wardrunner_volunteer_pings');
    if (!raw) {
      localStorage.setItem(VOLUNTEER_PINGS_STORAGE_KEY, JSON.stringify(SEED_VOLUNTEER_PINGS));
      return SEED_VOLUNTEER_PINGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Auto-upgrade legacy straight 5-point breadcrumbs or overlap at 36.6040
      const mt = parsed.find((p: any) => p.volunteer_name === 'Marcus Taylor');
      if (mt && Math.abs(mt.latitude - 36.6040) < 0.0005) {
        localStorage.setItem(VOLUNTEER_PINGS_STORAGE_KEY, JSON.stringify(SEED_VOLUNTEER_PINGS));
        return SEED_VOLUNTEER_PINGS;
      }
      const sj = parsed.find((p: any) => p.volunteer_name === 'Sarah Jenkins');
      if (sj && (sj.latitude < 36.587 || (sj.current_action && sj.current_action.includes('9th St')) || (sj.breadcrumbs && (sj.breadcrumbs.length === 5 || sj.breadcrumbs.length === 13)))) {
        const otherPings = parsed.filter((p: any) => p.volunteer_name !== 'Sarah Jenkins');
        const updated = [SEED_VOLUNTEER_PINGS[0], ...otherPings];
        localStorage.setItem(VOLUNTEER_PINGS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    return SEED_VOLUNTEER_PINGS;
  } catch {
    return SEED_VOLUNTEER_PINGS;
  }
}

export function saveStoredVolunteerPings(pings: VolunteerLocationPing[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOLUNTEER_PINGS_STORAGE_KEY, JSON.stringify(pings));
    localStorage.setItem(VOLUNTEER_PINGS_PING_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('campaignos_pings_updated', { detail: pings }));
    window.dispatchEvent(new CustomEvent('wardrunner_pings_updated', { detail: pings }));
  } catch (e) {
    console.warn('Failed to save volunteer pings to localStorage:', e);
  }
}

export async function fetchVolunteerPings(): Promise<VolunteerLocationPing[]> {
  const campaignId = getCampaignId();
  return fetchFromSupabase<VolunteerLocationPing>('volunteer_pings', VOLUNTEER_PINGS_STORAGE_KEY, campaignId);
}

export function subscribeVolunteerPings(onUpdate: (records: VolunteerLocationPing[]) => void): () => void {
  const campaignId = getCampaignId();
  return subscribeToTable('volunteer_pings', campaignId, onUpdate);
}

/**
 * Report a live GPS ping from a volunteer device.
 * Appends [lng, lat] to their breadcrumb walk path (capped at last 60 points).
 */
export function reportVolunteerPing(ping: Partial<VolunteerLocationPing> & { volunteer_name: string; latitude: number; longitude: number }): VolunteerLocationPing {
  const current = getStoredVolunteerPings();
  const existingIndex = current.findIndex(p => p.volunteer_name.toLowerCase().trim() === ping.volunteer_name.toLowerCase().trim());
  const newCoord: [number, number] = [ping.longitude, ping.latitude];

  let updatedPing: VolunteerLocationPing;

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    const prevTrail = existing.breadcrumbs || [];
    // Only push if moved more than slight jitter (~3 meters)
    const lastCoord = prevTrail[prevTrail.length - 1];
    let trail = [...prevTrail];
    if (!lastCoord || Math.hypot(lastCoord[0] - newCoord[0], lastCoord[1] - newCoord[1]) > 0.00003) {
      trail.push(newCoord);
      if (trail.length > 60) trail = trail.slice(-60);
    }

    updatedPing = {
      ...existing,
      ...ping,
      role: ping.role || existing.role || 'Door Canvasser',
      latitude: ping.latitude,
      longitude: ping.longitude,
      last_ping_at: new Date().toISOString(),
      is_active: ping.is_active !== undefined ? ping.is_active : true,
      current_action: ping.current_action || existing.current_action,
      breadcrumbs: trail,
    };
    current[existingIndex] = updatedPing;
  } else {
    updatedPing = {
      volunteer_name: ping.volunteer_name,
      role: ping.role || 'Door Canvasser',
      latitude: ping.latitude,
      longitude: ping.longitude,
      accuracy: ping.accuracy || 10,
      last_ping_at: new Date().toISOString(),
      is_active: true,
      current_action: ping.current_action || 'Walking Field Turf',
      breadcrumbs: [newCoord],
    };
    current.push(updatedPing);
  }

  saveStoredVolunteerPings(current);

  // Sync to Supabase asynchronously — add synthetic id for upsert compatibility
  const pingWithId = {
    ...updatedPing,
    id: `ping-${updatedPing.volunteer_name.replace(/\s+/g, '-').toLowerCase()}`,
    campaign_id: getCampaignId(),
  };
  upsertToSupabase('volunteer_pings', VOLUNTEER_PINGS_STORAGE_KEY, pingWithId as any).catch(err => {
    console.warn('Failed to upsert ping to Supabase:', err);
  });

  return updatedPing;
}

const routeCache = new Map<string, [number, number][]>();

/**
 * Snaps a sequence of walking waypoints (house knocks or GPS pings)
 * to follow the actual street and sidewalk geometry rather than
 * drawing a direct diagonal line cutting across yards and houses.
 */
export async function snapWalkingPathToStreets(waypoints: [number, number][]): Promise<[number, number][]> {
  if (!waypoints || waypoints.length < 2) return waypoints || [];

  const cacheKey = waypoints.map(w => `${w[0].toFixed(5)},${w[1].toFixed(5)}`).join(';');
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // If waypoints is already a detailed street trace (>= 8 points), return directly
  if (waypoints.length >= 8) {
    routeCache.set(cacheKey, waypoints);
    return waypoints;
  }

  // Cap sampled waypoints to 25 to respect OSRM url limits
  let sampled = waypoints;
  if (waypoints.length > 25) {
    const step = Math.ceil(waypoints.length / 25);
    sampled = waypoints.filter((_, idx) => idx === 0 || idx === waypoints.length - 1 || idx % step === 0);
  }

  const coordStr = sampled.map(w => `${w[0].toFixed(6)},${w[1].toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/foot/${coordStr}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
        const coords = data.routes[0].geometry.coordinates as [number, number][];
        routeCache.set(cacheKey, coords);
        return coords;
      }
    }
  } catch {
    // Graceful offline fallback
  }

  // Orthogonal Street-Grid Angle Fallback:
  // Instead of cutting diagonally through a block, angle with the street grid!
  const streetAngledCoords: [number, number][] = [waypoints[0]];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];

    if (Math.hypot(dx, dy) > 0.0001) {
      // Step along street axes (Manhattan street corner)
      streetAngledCoords.push([p1[0] + dx * 0.75, p1[1] + dy * 0.25]);
      streetAngledCoords.push([p2[0], p1[1] + dy * 0.25]);
    }
    streetAngledCoords.push(p2);
  }

  routeCache.set(cacheKey, streetAngledCoords);
  return streetAngledCoords;
}
