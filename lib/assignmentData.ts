import { VolunteerAssignment, SignType } from './types';
import { fetchFromSupabase, upsertToSupabase, deleteFromSupabase, subscribeToTable } from '@/lib/syncEngine';
import { getCampaignId } from '@/lib/auth';

export const ASSIGNMENTS_STORAGE_KEY = 'campaignos_assignments';
const TABLE_NAME = 'volunteer_assignments';

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
    title: 'State St & Volunteer Pkwy',
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
    title: 'Precinct 3A – Anderson Neighborhood Grid',
    subtitle: '1100 Anderson St · 9th & 11th St residential lawns',
    lat: 36.5888,
    lng: -82.1982,
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

export const SEED_ASSIGNMENTS: VolunteerAssignment[] = [];

export function getStoredAssignments(): VolunteerAssignment[] {
  if (typeof window === 'undefined') return SEED_ASSIGNMENTS;
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY) || localStorage.getItem('wardrunner_assignments');
    if (!raw) {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(SEED_ASSIGNMENTS));
      return SEED_ASSIGNMENTS;
    }
    return JSON.parse(raw) as VolunteerAssignment[];
  } catch {
    return SEED_ASSIGNMENTS;
  }
}

export function saveStoredAssignments(assignments: VolunteerAssignment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    // Dispatch storage event so other components and tabs react
    window.dispatchEvent(new CustomEvent('campaignos_assignments_updated', { detail: assignments }));
    window.dispatchEvent(new CustomEvent('wardrunner_assignments_updated', { detail: assignments }));
  } catch (e) {
    console.error('Failed to save assignments:', e);
  }
}

export async function fetchAssignments(): Promise<VolunteerAssignment[]> {
  try {
    return await fetchFromSupabase<VolunteerAssignment>(TABLE_NAME, ASSIGNMENTS_STORAGE_KEY, getCampaignId());
  } catch (error) {
    console.error('Failed to fetch assignments from Supabase:', error);
    return getStoredAssignments();
  }
}

export function subscribeAssignments(onUpdate: (records: VolunteerAssignment[]) => void): () => void {
  return subscribeToTable(TABLE_NAME, getCampaignId(), (records) => {
    saveStoredAssignments(records as VolunteerAssignment[]);
    onUpdate(records as VolunteerAssignment[]);
  });
}

export function addAssignment(newAssign: Omit<VolunteerAssignment, 'id' | 'created_at' | 'status'>): VolunteerAssignment {
  const current = getStoredAssignments();
  const item = {
    ...newAssign,
    id: `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'assigned',
    created_at: new Date().toISOString(),
    campaign_id: getCampaignId(),
    notes: newAssign.notes ? newAssign.notes.trim() : null,
  } as VolunteerAssignment;
  
  const updated = [item, ...current];
  saveStoredAssignments(updated);
  
  upsertToSupabase(TABLE_NAME, ASSIGNMENTS_STORAGE_KEY, item).catch(err => {
    console.error('Failed to sync new assignment to Supabase:', err);
  });
  
  return item;
}

export function markAssignmentComplete(assignmentId: string): VolunteerAssignment[] {
  const current = getStoredAssignments();
  let updatedAssignment: VolunteerAssignment | undefined;

  const updated = current.map(a => {
    if (a.id === assignmentId) {
      updatedAssignment = { ...a, status: 'completed' as const, completed_at: new Date().toISOString() };
      return updatedAssignment;
    }
    return a;
  });
  
  saveStoredAssignments(updated);

  if (updatedAssignment) {
    upsertToSupabase(TABLE_NAME, ASSIGNMENTS_STORAGE_KEY, updatedAssignment).catch(err => {
      console.error('Failed to sync completed assignment to Supabase:', err);
    });
  }
  
  return updated;
}
