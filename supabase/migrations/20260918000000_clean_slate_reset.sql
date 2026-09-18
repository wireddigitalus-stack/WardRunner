-- ==========================================================================
-- Clean Slate Reset for Monday Field Testing
-- Clears ALL volunteer-generated data while preserving campaign identity
-- Bristol TN: Melissa K. Brown for Bristol City Council
-- ==========================================================================

-- 1. Clear all placed signs
DELETE FROM public.signs WHERE campaign_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 2. Clear all canvass door-knock records
DELETE FROM public.canvass_records WHERE campaign_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 3. Clear all volunteer GPS location pings
DELETE FROM public.volunteer_pings WHERE campaign_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 4. Clear all mission assignments
DELETE FROM public.volunteer_assignments WHERE campaign_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 5. Wipe all canvass walking routes
DELETE FROM public.canvass_routes WHERE campaign_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 6. Clear volunteer roster (volunteers will be re-added via Crew Manager)
DELETE FROM public.volunteers WHERE campaign_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 7. Sign photos: clear manually via Supabase Dashboard > Storage > sign-photos > Select All > Delete
-- (Direct DELETE from storage.objects is blocked by Supabase's protect_delete() trigger)

-- Campaign row stays intact:
-- id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
-- name: 'Melissa K. Brown for Bristol City Council'
-- access_pin: '246810'
