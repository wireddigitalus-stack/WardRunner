import { Sign, SignStatus, SignType } from './types';
import { supabase } from './supabaseClient';

export const SEED_SIGNS: Sign[] = [
  { id: '1', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5951, longitude: -82.1887, placed_by_name: 'Campaign Volunteer', street_address: '620 State Street', sign_type: 'large_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.6010, longitude: -82.1780, placed_by_name: 'Campaign Volunteer', street_address: '1430 Lee Highway', sign_type: 'banner', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: '3', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5880, longitude: -82.1861, placed_by_name: 'Campaign Volunteer', street_address: '920 Volunteer Parkway', sign_type: 'yard_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: '4', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5975, longitude: -82.1830, placed_by_name: 'Opponent Volunteer', street_address: '412 State Street', sign_type: 'yard_sign', is_competitor: true, competitor_name: 'Bob Reynolds', status: 'placed', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: '5', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.6085, longitude: -82.1720, placed_by_name: 'Campaign Volunteer', street_address: '2105 Lee Highway', sign_type: 'billboard', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: '6', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5840, longitude: -82.1810, placed_by_name: 'Campaign Volunteer', street_address: '1750 Bluff City Highway', sign_type: 'yard_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '7', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.6030, longitude: -82.1920, placed_by_name: 'Campaign Volunteer', street_address: '1100 West State Street', sign_type: 'yard_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 1).toISOString() },
  { id: '8', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5860, longitude: -82.1750, placed_by_name: 'Opponent Volunteer', street_address: '1820 Bluff City Highway', sign_type: 'large_sign', is_competitor: true, competitor_name: 'Common Sense Slate', status: 'placed', created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
];

export const SIGNS_STORAGE_KEY = 'wardrunner_signs_data';
export const SIGNS_PING_KEY = 'wardrunner_signs_ping';

export function getStoredSigns(): Sign[] {
  if (typeof window === 'undefined') return SEED_SIGNS;
  try {
    const raw = localStorage.getItem(SIGNS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SIGNS_STORAGE_KEY, JSON.stringify(SEED_SIGNS));
      return SEED_SIGNS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
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
    window.dispatchEvent(new CustomEvent('wardrunner_signs_updated', { detail: signs }));
  } catch (e) {
    console.warn('Failed to save signs to localStorage:', e);
  }
}

export async function addPlacedSign(payload: Partial<Sign>): Promise<Sign> {
  const newSign: Sign = {
    id: payload.id || 'sign-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    campaign_id: payload.campaign_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
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

  // 2. Asynchronously sync to Supabase in background if available
  try {
    const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-publishable-key');
    if (!isPlaceholder) {
      await supabase.from('signs').insert([newSign]);
    }
  } catch (err) {
    console.warn('Supabase remote sign sync offline/deferred:', err);
  }

  return newSign;
}

export async function markSignRetrieved(signId: string): Promise<void> {
  const current = getStoredSigns();
  const updated = current.map(s => {
    if (s.id === signId) {
      return {
        ...s,
        status: 'retrieved' as SignStatus,
        retrieved_at: new Date().toISOString(),
      };
    }
    return s;
  });
  saveStoredSigns(updated);

  try {
    const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-publishable-key');
    if (!isPlaceholder) {
      await supabase.from('signs').update({ status: 'retrieved', retrieved_at: new Date().toISOString() }).eq('id', signId);
    }
  } catch (err) {
    console.warn('Supabase remote retrieval sync offline/deferred:', err);
  }
}
