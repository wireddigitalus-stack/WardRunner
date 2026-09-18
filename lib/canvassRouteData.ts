import { CanvassRoute, CanvassRouteStatus, CanvassRecord } from './types';
import { snapWalkingPathToStreets } from './canvassData';
import { fetchFromSupabase, upsertToSupabase, deleteFromSupabase, subscribeToTable } from '@/lib/syncEngine';
import { getCampaignId } from '@/lib/auth';

export const CANVASS_ROUTES_STORAGE_KEY = 'campaignos_canvass_routes';
export const CANVASS_ROUTES_PING_KEY = 'campaignos_canvass_routes_ping';

const TABLE_NAME = 'canvass_routes';

export const SEED_CANVASS_ROUTES: CanvassRoute[] = [];

/* =========================================================================
   CANVASS ROUTES STORAGE & PERSISTENCE
   ========================================================================= */

export function getStoredCanvassRoutes(): CanvassRoute[] {
  if (typeof window === 'undefined') return SEED_CANVASS_ROUTES;
  try {
    const raw = localStorage.getItem(CANVASS_ROUTES_STORAGE_KEY) || localStorage.getItem('wardrunner_canvass_routes');
    if (!raw) {
      localStorage.setItem(CANVASS_ROUTES_STORAGE_KEY, JSON.stringify(SEED_CANVASS_ROUTES));
      return SEED_CANVASS_ROUTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Auto-upgrade legacy route-3a-1 to 9th St & South St corridor
      const r3a = parsed.find((r: any) => r.id === 'route-3a-1');
      if (!r3a || r3a.start_point?.address?.includes('Anderson') || !r3a.path_coordinates || r3a.path_coordinates.length !== 16) {
        const others = parsed.filter((r: any) => r.id !== 'route-3a-1');
        const updated = [SEED_CANVASS_ROUTES[0], ...others];
        localStorage.setItem(CANVASS_ROUTES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    return SEED_CANVASS_ROUTES;
  } catch {
    return SEED_CANVASS_ROUTES;
  }
}

export function saveStoredCanvassRoutes(routes: CanvassRoute[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CANVASS_ROUTES_STORAGE_KEY, JSON.stringify(routes));
    localStorage.setItem(CANVASS_ROUTES_PING_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('campaignos_routes_updated', { detail: routes }));
    window.dispatchEvent(new CustomEvent('wardrunner_routes_updated', { detail: routes }));
  } catch (e) {
    console.warn('Failed to save canvass routes to localStorage:', e);
  }
}

// NEW: Supabase-primary fetching
export async function fetchCanvassRoutes(): Promise<CanvassRoute[]> {
  try {
    const campaignId = getCampaignId();
    const routes = await fetchFromSupabase<CanvassRoute>(TABLE_NAME, CANVASS_ROUTES_STORAGE_KEY, campaignId);
    if (routes && routes.length > 0) {
      saveStoredCanvassRoutes(routes); // Update local cache
      return routes;
    }
    return getStoredCanvassRoutes(); // Fallback
  } catch (error) {
    console.error('Error fetching canvass routes:', error);
    return getStoredCanvassRoutes();
  }
}

// NEW: Real-time subscription
export function subscribeCanvassRoutes(onUpdate: (routes: CanvassRoute[]) => void): () => void {
  const campaignId = getCampaignId();
  return subscribeToTable(TABLE_NAME, campaignId, (records) => {
    const routes = records as CanvassRoute[];
    saveStoredCanvassRoutes(routes);
    onUpdate(routes);
  });
}

/**
 * Assign a canvass route to a volunteer (or unassign if volunteerName is null).
 */
export async function assignCanvassRoute(routeId: string, volunteerName: string | null): Promise<CanvassRoute | null> {
  const current = getStoredCanvassRoutes();
  const index = current.findIndex(r => r.id === routeId);
  if (index === -1) return null;

  const updatedRoute: CanvassRoute = {
    ...current[index],
    assigned_volunteer_name: volunteerName ? volunteerName.trim() : null,
    status: volunteerName ? 'assigned' : 'draft',
    assigned_at: volunteerName ? new Date().toISOString() : undefined,
  };

  current[index] = updatedRoute;
  saveStoredCanvassRoutes(current); // Optimistic UI update

  try {
    await upsertToSupabase(TABLE_NAME, CANVASS_ROUTES_STORAGE_KEY, updatedRoute);
  } catch (error) {
    console.error('Error assigning route in Supabase:', error);
  }

  return updatedRoute;
}

/**
 * Update the status of a route (draft, assigned, in_progress, completed).
 */
export async function updateCanvassRouteStatus(routeId: string, status: CanvassRouteStatus): Promise<CanvassRoute | null> {
  const current = getStoredCanvassRoutes();
  const index = current.findIndex(r => r.id === routeId);
  if (index === -1) return null;

  const updatedRoute: CanvassRoute = {
    ...current[index],
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : undefined,
  };

  current[index] = updatedRoute;
  saveStoredCanvassRoutes(current); // Optimistic UI update

  try {
    await upsertToSupabase(TABLE_NAME, CANVASS_ROUTES_STORAGE_KEY, updatedRoute);
  } catch (error) {
    console.error('Error updating route status in Supabase:', error);
  }

  return updatedRoute;
}

/**
 * Add a new AI-generated or custom route.
 */
export async function addCanvassRoute(payload: Partial<CanvassRoute>): Promise<CanvassRoute> {
  const current = getStoredCanvassRoutes();

  // If path coordinates provided, snap to real streets if needed
  let coords = payload.path_coordinates || [];
  if (coords.length >= 2) {
    try {
      coords = await snapWalkingPathToStreets(coords);
    } catch {}
  }

  const campaignId = getCampaignId();

  const newRoute: CanvassRoute = {
    id: payload.id || 'route-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    campaign_id: payload.campaign_id || campaignId,
    name: payload.name || 'New Canvass Turf',
    precinct_code: payload.precinct_code || '3A',
    precinct_name: payload.precinct_name || 'Precinct 3A',
    assigned_volunteer_name: payload.assigned_volunteer_name || null,
    status: (payload.status as CanvassRouteStatus) || (payload.assigned_volunteer_name ? 'assigned' : 'draft'),
    target_doors: Number(payload.target_doors) || 40,
    estimated_walk_minutes: Number(payload.estimated_walk_minutes) || 45,
    distance_miles: Number(payload.distance_miles) || 1.1,
    start_point: payload.start_point || {
      lat: 36.5866,
      lng: -82.1963,
      address: 'Bristol, TN',
    },
    waypoints: payload.waypoints || [],
    path_coordinates: coords,
    strategic_reasoning: payload.strategic_reasoning || 'AI-optimized neighborhood route for maximum voter turnout.',
    created_at: payload.created_at || new Date().toISOString(),
    assigned_at: payload.assigned_at,
  };

  const updated = [newRoute, ...current];
  saveStoredCanvassRoutes(updated); // Optimistic update

  try {
    await upsertToSupabase(TABLE_NAME, CANVASS_ROUTES_STORAGE_KEY, newRoute);
  } catch (error) {
    console.error('Error saving new route to Supabase:', error);
  }

  return newRoute;
}

/**
 * Delete a canvass route.
 */
export async function deleteCanvassRoute(routeId: string): Promise<void> {
  const current = getStoredCanvassRoutes();
  const filtered = current.filter(r => r.id !== routeId);
  saveStoredCanvassRoutes(filtered);

  try {
    await deleteFromSupabase(TABLE_NAME, CANVASS_ROUTES_STORAGE_KEY, routeId);
  } catch (error) {
    console.error('Error deleting route from Supabase:', error);
  }
}

/**
 * Get active route for a specific volunteer.
 */
export function getVolunteerActiveRoute(volunteerName: string): CanvassRoute | undefined {
  if (!volunteerName) return undefined;
  const routes = getStoredCanvassRoutes();
  const norm = volunteerName.toLowerCase().trim();
  return routes.find(r => r.assigned_volunteer_name?.toLowerCase().trim() === norm && r.status !== 'completed');
}

/**
 * Calculate door completion progress for a route based on logged canvass records.
 */
export function calculateRouteProgress(route: CanvassRoute, canvassRecords: CanvassRecord[]) {
  if (!route) return { doorsKnocked: 0, targetDoors: 0, percent: 0, contacts: 0, flyers: 0, noContacts: 0 };

  // Filter records created by assigned volunteer or within 150m of route start/waypoints
  const matchingRecords = canvassRecords.filter(rec => {
    if (route.assigned_volunteer_name && rec.volunteer_name.toLowerCase().trim() === route.assigned_volunteer_name.toLowerCase().trim()) {
      return true;
    }
    // Geofence fallback: within ~200m of start or waypoints
    const distFromStart = Math.hypot(rec.latitude - route.start_point.lat, rec.longitude - route.start_point.lng);
    return distFromStart < 0.003;
  });

  const doorsKnocked = matchingRecords.length;
  const contacts = matchingRecords.filter(r => r.result === 'contact').length;
  const flyers = matchingRecords.filter(r => r.result === 'left_flyer').length;
  const noContacts = matchingRecords.filter(r => r.result === 'no_contact').length;
  const percent = Math.min(100, Math.round((doorsKnocked / Math.max(1, route.target_doors)) * 100));

  return {
    doorsKnocked,
    targetDoors: route.target_doors,
    percent,
    contacts,
    flyers,
    noContacts,
  };
}
