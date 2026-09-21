import { CanvassRecord, VolunteerLocationPing, GroundVolunteerRole } from './types';
import { getCampaignId } from '@/lib/auth';
import { fetchFromSupabase, upsertToSupabase, deleteFromSupabase, subscribeToTable } from '@/lib/syncEngine';
import { checkDataVersion } from './signData';

export const CANVASS_STORAGE_KEY = 'campaignos_canvass_records';
export const CANVASS_PING_KEY = 'campaignos_canvass_ping';
export const VOLUNTEER_PINGS_STORAGE_KEY = 'campaignos_volunteer_pings';
export const VOLUNTEER_PINGS_PING_KEY = 'campaignos_volunteer_pings_tick';

export const SEED_CANVASS_RECORDS: CanvassRecord[] = [];

export const SEED_VOLUNTEER_PINGS: VolunteerLocationPing[] = [];

/* =========================================================================
   CANVASS RECORDS STORAGE
   ========================================================================= */

export function getStoredCanvassRecords(): CanvassRecord[] {
  if (typeof window === 'undefined') return SEED_CANVASS_RECORDS;
  checkDataVersion();
  try {
    const raw = localStorage.getItem(CANVASS_STORAGE_KEY) || localStorage.getItem('wardrunner_canvass_records');
    if (!raw) {
      localStorage.setItem(CANVASS_STORAGE_KEY, JSON.stringify(SEED_CANVASS_RECORDS));
      return SEED_CANVASS_RECORDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
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
  checkDataVersion();
  try {
    const raw = localStorage.getItem(VOLUNTEER_PINGS_STORAGE_KEY) || localStorage.getItem('wardrunner_volunteer_pings');
    if (!raw) {
      localStorage.setItem(VOLUNTEER_PINGS_STORAGE_KEY, JSON.stringify(SEED_VOLUNTEER_PINGS));
      return SEED_VOLUNTEER_PINGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
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
