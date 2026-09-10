import { VolunteerAssignment, SignType } from './types';

export const ASSIGNMENTS_STORAGE_KEY = 'wardrunner_assignments';

export interface TargetPreset {
  id: string;
  type: 'intersection' | 'precinct' | 'corridor';
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  recommendedSign: SignType;
}

export const TARGET_PRESETS: TargetPreset[] = [
  // Intersections
  {
    id: 'int-1',
    type: 'intersection',
    title: 'Volunteer Pkwy & Weaver Pike',
    subtitle: 'High-density intersection · 21,400 AADT',
    lat: 36.5831,
    lng: -82.1859,
    recommendedSign: 'yard_sign',
  },
  {
    id: 'int-2',
    type: 'intersection',
    title: 'State St & Piedmont Ave',
    subtitle: 'Historic Downtown Gateway · 21,500 AADT',
    lat: 36.5951,
    lng: -82.1887,
    recommendedSign: 'large_sign',
  },
  {
    id: 'int-3',
    type: 'intersection',
    title: 'Lee Highway & I-81 Exit 7',
    subtitle: 'High-traffic commercial corridor · 19,200 AADT',
    lat: 36.6085,
    lng: -82.1720,
    recommendedSign: 'banner',
  },
  {
    id: 'int-4',
    type: 'intersection',
    title: 'Bluff City Hwy & Edgemont Ave',
    subtitle: 'South Bristol commuter junction · 14,800 AADT',
    lat: 36.5840,
    lng: -82.1810,
    recommendedSign: 'yard_sign',
  },
  {
    id: 'int-5',
    type: 'intersection',
    title: 'West State St & 24th Street',
    subtitle: 'West Bristol shopping & arterial · 18,200 AADT',
    lat: 36.6030,
    lng: -82.1920,
    recommendedSign: 'large_sign',
  },

  // Precincts
  {
    id: 'prec-2c',
    type: 'precinct',
    title: 'Precinct 2C – Avoca School',
    subtitle: 'Largest voter pool (4,650 voters) · Volunteer Pkwy core',
    lat: 36.5680,
    lng: -82.1950,
    recommendedSign: 'yard_sign',
  },
  {
    id: 'prec-2b',
    type: 'precinct',
    title: 'Precinct 2B – Holston View',
    subtitle: 'Highest turnout (38.2%) · King College Rd & Country Club',
    lat: 36.5980,
    lng: -82.1640,
    recommendedSign: 'yard_sign',
  },
  {
    id: 'prec-3a',
    type: 'precinct',
    title: 'Precinct 3A – Anderson School',
    subtitle: 'Key mobilization upside · West Bristol neighborhood grid',
    lat: 36.5866,
    lng: -82.1963,
    recommendedSign: 'yard_sign',
  },
  {
    id: 'prec-2a',
    type: 'precinct',
    title: 'Precinct 2A – Slater Community Center',
    subtitle: 'Downtown historic district · 325 McDowell St',
    lat: 36.5920,
    lng: -82.1887,
    recommendedSign: 'large_sign',
  },
  {
    id: 'prec-1a',
    type: 'precinct',
    title: 'Precinct 1A – South Holston Ruritan',
    subtitle: 'South Holston & Weaver Pike commuter corridors',
    lat: 36.5500,
    lng: -82.1450,
    recommendedSign: 'yard_sign',
  },
];

export const SEED_ASSIGNMENTS: VolunteerAssignment[] = [
  {
    id: 'assign-1',
    volunteer_name: 'Sarah Jenkins',
    target_type: 'intersection',
    title: 'Volunteer Pkwy & Weaver Pike',
    street_address: '713 Volunteer Pkwy, Bristol, TN',
    sign_type: 'yard_sign',
    quantity: 2,
    lat: 36.5831,
    lng: -82.1859,
    priority: 'critical',
    notes: 'Secure corner visibility at Parkway Executive Plaza / Weaver Pike turn. Ensure signs are 15ft off curb.',
    status: 'assigned',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'assign-2',
    volunteer_name: 'Marcus Taylor',
    target_type: 'precinct',
    title: 'Precinct 3A – Anderson Neighborhood Grid',
    street_address: '901 9th St, Bristol, TN',
    sign_type: 'yard_sign',
    quantity: 5,
    lat: 36.5866,
    lng: -82.1963,
    priority: 'high',
    notes: 'Target residential front lawns along 9th and 11th Street approaching Anderson Elementary.',
    status: 'assigned',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'assign-3',
    volunteer_name: 'Campaign Volunteer',
    target_type: 'intersection',
    title: 'State St & Piedmont Ave',
    street_address: '620 State Street, Bristol, TN',
    sign_type: 'large_sign',
    quantity: 1,
    lat: 36.5951,
    lng: -82.1887,
    priority: 'high',
    notes: 'Place 4×4 sign near high-visibility pedestrian crosswalk on the TN side.',
    status: 'completed',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export function getStoredAssignments(): VolunteerAssignment[] {
  if (typeof window === 'undefined') return SEED_ASSIGNMENTS;
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(SEED_ASSIGNMENTS));
      return SEED_ASSIGNMENTS;
    }
    const parsed: VolunteerAssignment[] = JSON.parse(raw);
    let migrated = false;
    const updated = parsed.map(item => {
      // Fix Volunteer Pkwy & Weaver Pike legacy coordinates
      if (item.id === 'assign-1' || item.title?.includes('Weaver Pike')) {
        if (item.lat === 36.5870 || item.lng === -82.1856 || item.street_address?.includes('1000 Volunteer')) {
          migrated = true;
          return {
            ...item,
            street_address: '713 Volunteer Pkwy, Bristol, TN',
            lat: 36.5831,
            lng: -82.1859,
          };
        }
      }
      // Fix Precinct 3A - Anderson legacy coordinates
      if (item.id === 'assign-2' || item.title?.includes('Anderson')) {
        if (item.lng === -82.2180 || (item.street_address?.includes('9th St') && item.lng < -82.20)) {
          migrated = true;
          return {
            ...item,
            street_address: '901 9th St, Bristol, TN',
            lat: 36.5866,
            lng: -82.1963,
          };
        }
      }
      return item;
    });

    if (migrated) {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return SEED_ASSIGNMENTS;
  }
}

export function saveStoredAssignments(assignments: VolunteerAssignment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    // Dispatch storage event so other components and tabs react
    window.dispatchEvent(new CustomEvent('wardrunner_assignments_updated', { detail: assignments }));
  } catch (e) {
    console.error('Failed to save assignments:', e);
  }
}

export function addAssignment(newAssign: Omit<VolunteerAssignment, 'id' | 'created_at' | 'status'>): VolunteerAssignment {
  const current = getStoredAssignments();
  const item: VolunteerAssignment = {
    ...newAssign,
    id: `assign-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    status: 'assigned',
    created_at: new Date().toISOString(),
  };
  const updated = [item, ...current];
  saveStoredAssignments(updated);
  return item;
}

export function markAssignmentComplete(assignmentId: string): VolunteerAssignment[] {
  const current = getStoredAssignments();
  const updated = current.map(a => a.id === assignmentId ? { ...a, status: 'completed' as const, completed_at: new Date().toISOString() } : a);
  saveStoredAssignments(updated);
  return updated;
}
