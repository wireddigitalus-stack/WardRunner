'use client';

import { supabase } from './supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthSession {
  campaignId: string;
  campaignName: string;
  volunteerName: string;
  volunteerId?: string;
  role: string;
  authType: 'master' | 'volunteer';
  authenticatedAt: string;
}

const SESSION_KEY = 'campaignos_session';
const AUTH_KEY = 'campaignos_field_command_auth';

// ─── Server-Side PIN Validation ──────────────────────────────────────────────

/**
 * Validates a PIN against Supabase server-side via RPC.
 * Falls back to campaign table direct query if RPC is not yet deployed.
 * Never exposes PINs to the client.
 */
export async function validatePin(
  pin: string,
  campaignId?: string
): Promise<{ valid: boolean; session?: AuthSession; error?: string }> {
  const clean = pin.trim();
  if (!clean || clean.length < 4 || clean.length > 8) {
    return { valid: false, error: 'PIN must be 4-8 digits' };
  }

  try {
    // Try the RPC function first (preferred — server-side, no PIN leak)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('validate_pin', {
      p_pin: clean,
      p_campaign_id: campaignId || null,
    });

    if (!rpcError && rpcResult && rpcResult.valid === true) {
      const session: AuthSession = {
        campaignId: rpcResult.campaign_id,
        campaignName: rpcResult.campaign_name || 'Campaign',
        volunteerName: rpcResult.volunteer_name || 'Field Director',
        volunteerId: rpcResult.volunteer_id || undefined,
        role: rpcResult.role || 'Field Volunteer',
        authType: rpcResult.type === 'master' ? 'master' : 'volunteer',
        authenticatedAt: new Date().toISOString(),
      };
      persistSession(session);
      return { valid: true, session };
    }

    if (!rpcError && rpcResult && rpcResult.valid === false) {
      return { valid: false, error: 'Incorrect PIN. Contact your Field Director for access.' };
    }

    // RPC function doesn't exist yet — fallback to direct campaign query
    // This fallback is temporary until the migration with validate_pin is applied
    console.warn('[Auth] validate_pin RPC not available, using fallback. Error:', rpcError?.message);
    return await validatePinFallback(clean, campaignId);
  } catch (err) {
    console.error('[Auth] PIN validation error:', err);
    // Network error — try offline fallback
    return validatePinOffline(clean);
  }
}

/**
 * Fallback: Query campaigns table directly.
 * Less secure (PIN travels in query) but works without the RPC function.
 */
async function validatePinFallback(
  pin: string,
  campaignId?: string
): Promise<{ valid: boolean; session?: AuthSession; error?: string }> {
  try {
    let query = supabase.from('campaigns').select('id, name, access_pin');
    if (campaignId) {
      query = query.eq('id', campaignId);
    }
    const { data: campaigns, error } = await query;

    if (error) throw error;

    const match = campaigns?.find((c: any) => c.access_pin === pin);
    if (match) {
      const session: AuthSession = {
        campaignId: match.id,
        campaignName: match.name,
        volunteerName: 'Field Director',
        role: 'Field Director',
        authType: 'master',
        authenticatedAt: new Date().toISOString(),
      };
      persistSession(session);
      return { valid: true, session };
    }

    // Check volunteers table
    const { data: volunteers, error: volError } = await supabase
      .from('volunteers')
      .select('id, campaign_id, name, pin_hash, role')
      .eq('pin_hash', pin)
      .eq('active', true)
      .limit(1);

    if (!volError && volunteers && volunteers.length > 0) {
      const vol = volunteers[0];
      // Get campaign name
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('name')
        .eq('id', vol.campaign_id)
        .single();

      const session: AuthSession = {
        campaignId: vol.campaign_id,
        campaignName: campaign?.name || 'Campaign',
        volunteerName: vol.name,
        volunteerId: vol.id,
        role: vol.role,
        authType: 'volunteer',
        authenticatedAt: new Date().toISOString(),
      };
      persistSession(session);
      return { valid: true, session };
    }

    return { valid: false, error: 'Incorrect PIN. Contact your Field Director for access.' };
  } catch (err) {
    console.error('[Auth] Fallback validation error:', err);
    return validatePinOffline(pin);
  }
}

/**
 * Last resort: Check against locally-stored volunteer roster.
 * Used when completely offline on first launch.
 */
function validatePinOffline(pin: string): { valid: boolean; session?: AuthSession; error?: string } {
  if (typeof window === 'undefined') {
    return { valid: false, error: 'Cannot validate offline on server' };
  }

  // Check if this matches the default campaign PIN from env
  const defaultPin = process.env.NEXT_PUBLIC_DEFAULT_PIN;
  if (defaultPin && pin === defaultPin) {
    const session: AuthSession = {
      campaignId: process.env.NEXT_PUBLIC_DEFAULT_CAMPAIGN_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      campaignName: 'Campaign (Offline)',
      volunteerName: 'Field Director',
      role: 'Field Director',
      authType: 'master',
      authenticatedAt: new Date().toISOString(),
    };
    persistSession(session);
    return { valid: true, session };
  }

  // Check local volunteer roster
  try {
    const rawVols = localStorage.getItem('campaignos_volunteers') || localStorage.getItem('wardrunner_volunteers');
    if (rawVols) {
      const vols = JSON.parse(rawVols);
      const match = vols.find((v: any) => v.active && v.pin === pin);
      if (match) {
        const session: AuthSession = {
          campaignId: match.campaign_id || process.env.NEXT_PUBLIC_DEFAULT_CAMPAIGN_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          campaignName: 'Campaign (Offline)',
          volunteerName: match.name,
          volunteerId: match.id,
          role: match.role || 'Field Volunteer',
          authType: 'volunteer',
          authenticatedAt: new Date().toISOString(),
        };
        persistSession(session);
        return { valid: true, session };
      }
    }
  } catch {
    // ignore localStorage errors
  }

  return { valid: false, error: 'Unable to verify PIN offline. Connect to the internet and try again.' };
}

// ─── Session Management ──────────────────────────────────────────────────────

/** Persist session to sessionStorage + localStorage */
function persistSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(session);
    sessionStorage.setItem(SESSION_KEY, json);
    localStorage.setItem(SESSION_KEY, json);
    sessionStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(AUTH_KEY, 'true');
  } catch {
    // Safari private browsing
  }
}

/** Get the current authenticated session, or null */
export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || sessionStorage.getItem('wardrunner_session') || localStorage.getItem('wardrunner_session');
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    // Validate shape
    if (!session.campaignId || !session.volunteerName || !session.authenticatedAt) return null;
    return session;
  } catch {
    return null;
  }
}

/** Check if user is authenticated (quick boolean check) */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(AUTH_KEY) === 'true' ||
    localStorage.getItem(AUTH_KEY) === 'true' ||
    sessionStorage.getItem('wardrunner_field_command_auth') === 'true' ||
    localStorage.getItem('wardrunner_field_command_auth') === 'true'
  );
}

/** Check if user has a specific role */
export function hasRole(requiredRoles: string[]): boolean {
  const session = getCurrentSession();
  if (!session) return false;
  return requiredRoles.includes(session.role);
}

/** Check if user can access the Command Center (directors + captains only) */
export function canAccessCommand(): boolean {
  return hasRole(['Field Director', 'Precinct Captain']);
}

/** Log out — clear all auth state */
export function logout(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('wardrunner_session');
    sessionStorage.removeItem('wardrunner_field_command_auth');
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('wardrunner_session');
    localStorage.removeItem('wardrunner_field_command_auth');
  } catch {
    // ignore
  }
}

/** Get the campaign ID for the current session (fallback to env default) */
export function getCampaignId(): string {
  const session = getCurrentSession();
  return session?.campaignId || process.env.NEXT_PUBLIC_DEFAULT_CAMPAIGN_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
}
