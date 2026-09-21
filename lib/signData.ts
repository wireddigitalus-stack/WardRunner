import { Sign, SignStatus, SignType } from './types';
import { getCampaignId } from '@/lib/auth';
import { fetchFromSupabase, upsertToSupabase, deleteFromSupabase, subscribeToTable } from '@/lib/syncEngine';

export const SEED_SIGNS: Sign[] = [];

export const SIGNS_STORAGE_KEY = 'campaignos_signs_data';
export const SIGNS_PING_KEY = 'campaignos_signs_ping';

// Data version stamp — bump to force client-side cache reset
export const DATA_VERSION = '3';
export const DATA_VERSION_KEY = 'campaignos_data_version';

export function checkDataVersion(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(DATA_VERSION_KEY);
  if (stored !== DATA_VERSION) {
    // Clean slate: clear all field data localStorage keys
    [
      'campaignos_signs_data', 'campaignos_signs_ping',
      'campaignos_canvass_records', 'campaignos_canvass_ping',
      'campaignos_volunteer_pings', 'campaignos_volunteer_pings_tick',
      'campaignos_assignments',
      'campaignos_volunteers',
      'campaignos_inventory_stock',
      'campaignos_sync_queue',
      'campaignos_canvass_routes', 'campaignos_canvass_routes_ping',
      // Legacy keys
      'wardrunner_signs_data', 'wardrunner_canvass_records',
      'wardrunner_volunteer_pings', 'wardrunner_assignments',
      'wardrunner_volunteers', 'wardrunner_sync_queue',
      'wardrunner_canvass_routes',
    ].forEach(k => localStorage.removeItem(k));
    localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
    return true;
  }
  return false;
}

export function getStoredSigns(): Sign[] {
  if (typeof window === 'undefined') return SEED_SIGNS;

  // Force reset if data version changed (clean slate deploy)
  checkDataVersion();

  // Kick off an async Supabase fetch in the background to update the cache
  setTimeout(() => {
    fetchSigns().catch(e => console.warn('Background fetch failed:', e));
  }, 0);

  try {
    const raw = localStorage.getItem(SIGNS_STORAGE_KEY) || localStorage.getItem('wardrunner_signs_data');
    if (!raw) {
      localStorage.setItem(SIGNS_STORAGE_KEY, JSON.stringify(SEED_SIGNS));
      return SEED_SIGNS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return SEED_SIGNS;
  } catch {
    return SEED_SIGNS;
  }
}

export function saveStoredSigns(signs: Sign[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SIGNS_STORAGE_KEY, JSON.stringify(signs));
    localStorage.setItem(SIGNS_PING_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('campaignos_signs_updated', { detail: signs }));
    window.dispatchEvent(new CustomEvent('wardrunner_signs_updated', { detail: signs }));
  } catch (e) {
    console.warn('Failed to save signs to localStorage:', e);
  }
}

export async function addPlacedSign(payload: Partial<Sign>): Promise<Sign> {
  const campaignId = getCampaignId();
  const newSign: Sign = {
    id: payload.id || 'sign-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    campaign_id: payload.campaign_id || campaignId,
    latitude: Number(payload.latitude) || 36.595,
    longitude: Number(payload.longitude) || -82.188,
    placed_by_name: payload.placed_by_name || 'Campaign Volunteer',
    street_address: payload.street_address,
    sign_type: payload.sign_type || 'yard_sign',
    is_competitor: !!payload.is_competitor,
    competitor_name: payload.competitor_name || null,
    photo_url: payload.photo_url || null,
    status: (payload.status as SignStatus) || 'placed',
    created_at: payload.created_at || new Date().toISOString(),
  };

  // 1. Immediately persist locally and broadcast to all tabs/windows
  const current = getStoredSigns();
  const updated = [newSign, ...current.filter(s => s.id !== newSign.id)];
  saveStoredSigns(updated);

  // 2. Asynchronously sync to Supabase via sync engine
  try {
    await upsertToSupabase('signs', SIGNS_STORAGE_KEY, newSign);
  } catch (err) {
    console.warn('Supabase remote sign sync offline/deferred:', err);
  }

  return newSign;
}

export async function markSignRetrieved(signId: string): Promise<void> {
  const current = getStoredSigns();
  let updatedSign: Sign | undefined;

  const updated = current.map(s => {
    if (s.id === signId) {
      updatedSign = {
        ...s,
        status: 'retrieved' as SignStatus,
        retrieved_at: new Date().toISOString(),
      };
      return updatedSign;
    }
    return s;
  });
  saveStoredSigns(updated);

  if (updatedSign) {
    try {
      await upsertToSupabase('signs', SIGNS_STORAGE_KEY, updatedSign);
    } catch (err) {
      console.warn('Supabase remote retrieval sync offline/deferred:', err);
    }
  }
}

export async function deleteSign(signId: string): Promise<void> {
  const current = getStoredSigns();
  const updated = current.filter(s => s.id !== signId);
  saveStoredSigns(updated);

  try {
    await deleteFromSupabase('signs', SIGNS_STORAGE_KEY, signId);
  } catch (err) {
    console.warn('Supabase remote sign delete offline/deferred:', err);
  }
}

export async function fetchSigns(): Promise<Sign[]> {
  const campaignId = getCampaignId();
  try {
    // Primary: fetch from Supabase
    return await fetchFromSupabase<Sign>('signs', SIGNS_STORAGE_KEY, campaignId);
  } catch (err) {
    console.warn('Failed to fetch from Supabase, falling back to local cache', err);
    // Fallback: localStorage
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SIGNS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }
}

export function subscribeSigns(onUpdate: (signs: Sign[]) => void): () => void {
  const campaignId = getCampaignId();
  return subscribeToTable('signs', campaignId, (records) => {
    onUpdate(records as Sign[]);
  });
}
