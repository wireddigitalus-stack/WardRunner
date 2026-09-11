import { CanvassRoute, CanvassRouteStatus, CanvassRecord } from './types';
import { snapWalkingPathToStreets } from './canvassData';

export const CANVASS_ROUTES_STORAGE_KEY = 'wardrunner_canvass_routes';
export const CANVASS_ROUTES_PING_KEY = 'wardrunner_canvass_routes_ping';

export const SEED_CANVASS_ROUTES: CanvassRoute[] = [
  {
    id: 'route-3a-1',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Turf 3A: Anderson & 9th St Loop',
    precinct_code: '3A',
    precinct_name: 'Anderson Neighborhood Grid',
    assigned_volunteer_name: 'Sarah Jenkins',
    status: 'in_progress',
    target_doors: 40,
    estimated_walk_minutes: 45,
    distance_miles: 1.1,
    start_point: {
      lat: 36.5866,
      lng: -82.1963,
      address: '901 9th St (Anderson Elementary)',
    },
    waypoints: [
      { street: '9th Street', lat: 36.5866, lng: -82.1963, house_range: '901 – 945 9th St', target_doors: 15, notes: 'Even side of 9th St towards Anderson St' },
      { street: 'Anderson Street', lat: 36.5888, lng: -82.1982, house_range: '1000 – 1150 Anderson St', target_doors: 15, notes: 'Residential lots approaching 11th St' },
      { street: 'Windsor Avenue', lat: 36.5875, lng: -82.1945, house_range: '820 – 890 Windsor Ave', target_doors: 10, notes: 'Loop back south towards 9th St' },
    ],
    path_coordinates: [
      [-82.196396, 36.586331],
      [-82.196339, 36.586256],
      [-82.196323, 36.586149],
      [-82.196296, 36.585973],
      [-82.196279, 36.585790],
      [-82.196165, 36.585626],
      [-82.195726, 36.585367],
      [-82.195367, 36.585009],
      [-82.195192, 36.584898],
      [-82.194751, 36.584619],
      [-82.194678, 36.584650],
      [-82.194411, 36.584672],
      [-82.194003, 36.584670],
      [-82.194200, 36.586000],
      [-82.195000, 36.587200],
      [-82.196396, 36.586331],
    ],
    strategic_reasoning: 'Dense residential grid with 41.5% historical turnout. Key swing precinct with high percentage of undecided municipal voters.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    assigned_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'route-2a-1',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Turf 2A: Virginia Ave Corridor & Melrose',
    precinct_code: '2A',
    precinct_name: 'Virginia Ave / Melrose',
    assigned_volunteer_name: 'Marcus Taylor',
    status: 'in_progress',
    target_doors: 45,
    estimated_walk_minutes: 50,
    distance_miles: 1.25,
    start_point: {
      lat: 36.6016,
      lng: -82.1775,
      address: 'Virginia Ave & E Cedar St',
    },
    waypoints: [
      { street: 'Virginia Avenue', lat: 36.6025, lng: -82.1765, house_range: '1120 – 1160 Virginia Ave', target_doors: 20, notes: 'East side residential homes' },
      { street: 'Melrose Street', lat: 36.6042, lng: -82.1738, house_range: '400 – 480 Melrose St', target_doors: 15, notes: 'Turn east onto Melrose' },
      { street: 'Carolina Avenue', lat: 36.6015, lng: -82.1740, house_range: '1050 – 1100 Carolina Ave', target_doors: 10, notes: 'Return corridor to Virginia Ave' },
    ],
    path_coordinates: [
      [-82.1775, 36.6016],
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
      [-82.172500, 36.603800],
      [-82.174000, 36.602000],
      [-82.1775, 36.6016],
    ],
    strategic_reasoning: 'Active pedestrian corridor with moderate turnout (33.8%) and strong receptiveness to municipal election literature.',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    assigned_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'route-2b-1',
    campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Turf 2B: Holston View Suburban Circle',
    precinct_code: '2B',
    precinct_name: 'Holston View',
    assigned_volunteer_name: null,
    status: 'draft',
    target_doors: 50,
    estimated_walk_minutes: 60,
    distance_miles: 1.45,
    start_point: {
      lat: 36.5910,
      lng: -82.1550,
      address: '1840 King College Rd (Holston View School)',
    },
    waypoints: [
      { street: 'King College Rd', lat: 36.5910, lng: -82.1550, house_range: '1800 – 1950 King College Rd', target_doors: 18, notes: 'East of King University campus' },
      { street: 'Country Club Drive', lat: 36.5935, lng: -82.1520, house_range: '100 – 190 Country Club Dr', target_doors: 18, notes: 'Suburban single-family cul-de-sacs' },
      { street: 'Valley View Drive', lat: 36.5890, lng: -82.1535, house_range: '200 – 280 Valley View Dr', target_doors: 14, notes: 'High lawn sign visibility along the loop' },
    ],
    path_coordinates: [
      [-82.1550, 36.5910],
      [-82.1540, 36.5922],
      [-82.1525, 36.5935],
      [-82.1512, 36.5928],
      [-82.1520, 36.5905],
      [-82.1535, 36.5890],
      [-82.1550, 36.5910],
    ],
    strategic_reasoning: 'Highest historical municipal turnout precinct (38.2%). High early voting propensity and prime yard sign placement opportunities.',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

/* =========================================================================
   CANVASS ROUTES STORAGE & PERSISTENCE
   ========================================================================= */

export function getStoredCanvassRoutes(): CanvassRoute[] {
  if (typeof window === 'undefined') return SEED_CANVASS_ROUTES;
  try {
    const raw = localStorage.getItem(CANVASS_ROUTES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CANVASS_ROUTES_STORAGE_KEY, JSON.stringify(SEED_CANVASS_ROUTES));
      return SEED_CANVASS_ROUTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Auto-migrate route-2a-1 start point if still at legacy 36.6025 to avoid overlapping Marcus's stop
      const r2a = parsed.find((r: any) => r.id === 'route-2a-1');
      if (r2a && Math.abs(r2a.start_point?.lat - 36.6025) < 0.0005) {
        r2a.start_point = {
          lat: 36.6016,
          lng: -82.1775,
          address: 'Virginia Ave & E Cedar St',
        };
        const seed2a = SEED_CANVASS_ROUTES.find(s => s.id === 'route-2a-1');
        if (seed2a) {
          r2a.path_coordinates = seed2a.path_coordinates;
        }
        localStorage.setItem(CANVASS_ROUTES_STORAGE_KEY, JSON.stringify(parsed));
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
    window.dispatchEvent(new CustomEvent('wardrunner_routes_updated', { detail: routes }));
  } catch (e) {
    console.warn('Failed to save canvass routes to localStorage:', e);
  }
}

/**
 * Assign a canvass route to a volunteer (or unassign if volunteerName is null).
 */
export function assignCanvassRoute(routeId: string, volunteerName: string | null): CanvassRoute | null {
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
  saveStoredCanvassRoutes(current);
  return updatedRoute;
}

/**
 * Update the status of a route (draft, assigned, in_progress, completed).
 */
export function updateCanvassRouteStatus(routeId: string, status: CanvassRouteStatus): CanvassRoute | null {
  const current = getStoredCanvassRoutes();
  const index = current.findIndex(r => r.id === routeId);
  if (index === -1) return null;

  const updatedRoute: CanvassRoute = {
    ...current[index],
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : undefined,
  };

  current[index] = updatedRoute;
  saveStoredCanvassRoutes(current);
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

  const newRoute: CanvassRoute = {
    id: payload.id || 'route-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    campaign_id: payload.campaign_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
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
  saveStoredCanvassRoutes(updated);
  return newRoute;
}

/**
 * Delete a canvass route.
 */
export function deleteCanvassRoute(routeId: string): void {
  const current = getStoredCanvassRoutes();
  const filtered = current.filter(r => r.id !== routeId);
  saveStoredCanvassRoutes(filtered);
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
