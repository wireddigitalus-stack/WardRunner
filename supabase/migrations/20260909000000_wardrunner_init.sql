-- ==============================================================================
-- PrecinctOS / WardRunner Database Schema Migration
-- PostGIS, Campaigns, Signs, Canvass Records, Routes, Storage & RLS
-- Pilot: Melissa K. Brown for Bristol City Council
-- ==============================================================================

-- 1. Enable PostGIS Extension (if available)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Set search path to include extensions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL DEFAULT 'Melissa K. Brown for Bristol City Council',
    access_pin VARCHAR(6) NOT NULL DEFAULT '246810',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_access_pin ON public.campaigns(access_pin);

-- 3. Signs Table
CREATE TABLE IF NOT EXISTS public.signs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    placed_by_name TEXT NOT NULL,
    street_address TEXT,
    sign_type TEXT NOT NULL CHECK (sign_type IN ('yard_sign', 'large_sign', 'banner', 'billboard')),
    is_competitor BOOLEAN NOT NULL DEFAULT false,
    competitor_name TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'needs_repair', 'retrieved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    retrieved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signs_campaign_id ON public.signs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_signs_status ON public.signs(status);
CREATE INDEX IF NOT EXISTS idx_signs_created_at ON public.signs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signs_is_competitor ON public.signs(is_competitor);

-- 4. Canvass Records Table (Door Knocks, Flyers, Contacts)
CREATE TABLE IF NOT EXISTS public.canvass_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    volunteer_name TEXT NOT NULL,
    volunteer_role TEXT DEFAULT 'Door Canvasser',
    activity_type TEXT NOT NULL DEFAULT 'door_knock',
    result TEXT NOT NULL DEFAULT 'contact',
    sentiment TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy NUMERIC,
    street_address TEXT,
    voter_name TEXT,
    wants_yard_sign BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canvass_campaign_id ON public.canvass_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_canvass_created_at ON public.canvass_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvass_volunteer ON public.canvass_records(volunteer_name);

-- 5. Canvass Turf Routes Table
CREATE TABLE IF NOT EXISTS public.canvass_routes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    precinct_code TEXT NOT NULL,
    precinct_name TEXT,
    assigned_volunteer_name TEXT,
    status TEXT NOT NULL DEFAULT 'unassigned',
    target_doors INTEGER DEFAULT 30,
    estimated_walk_minutes INTEGER DEFAULT 45,
    distance_miles NUMERIC DEFAULT 1.0,
    waypoints JSONB DEFAULT '[]'::jsonb,
    path_coordinates JSONB DEFAULT '[]'::jsonb,
    strategic_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_routes_campaign_id ON public.canvass_routes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_routes_precinct ON public.canvass_routes(precinct_code);

-- ==============================================================================
-- 6. Row Level Security (RLS) - Permissive for Volunteer Field Access
-- ==============================================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvass_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvass_routes ENABLE ROW LEVEL SECURITY;

-- Campaigns Policies
DROP POLICY IF EXISTS "Allow public read of campaigns" ON public.campaigns;
CREATE POLICY "Allow public read of campaigns" ON public.campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert of campaigns" ON public.campaigns;
CREATE POLICY "Allow public insert of campaigns" ON public.campaigns FOR INSERT WITH CHECK (true);

-- Signs Policies
DROP POLICY IF EXISTS "Allow read signs" ON public.signs;
CREATE POLICY "Allow read signs" ON public.signs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert signs" ON public.signs;
CREATE POLICY "Allow insert signs" ON public.signs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update signs" ON public.signs;
CREATE POLICY "Allow update signs" ON public.signs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete signs" ON public.signs;
CREATE POLICY "Allow delete signs" ON public.signs FOR DELETE USING (true);

-- Canvass Records Policies
DROP POLICY IF EXISTS "Allow read canvass_records" ON public.canvass_records;
CREATE POLICY "Allow read canvass_records" ON public.canvass_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert canvass_records" ON public.canvass_records;
CREATE POLICY "Allow insert canvass_records" ON public.canvass_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update canvass_records" ON public.canvass_records;
CREATE POLICY "Allow update canvass_records" ON public.canvass_records FOR UPDATE USING (true) WITH CHECK (true);

-- Canvass Routes Policies
DROP POLICY IF EXISTS "Allow read canvass_routes" ON public.canvass_routes;
CREATE POLICY "Allow read canvass_routes" ON public.canvass_routes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert canvass_routes" ON public.canvass_routes;
CREATE POLICY "Allow insert canvass_routes" ON public.canvass_routes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update canvass_routes" ON public.canvass_routes;
CREATE POLICY "Allow update canvass_routes" ON public.canvass_routes FOR UPDATE USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. Storage Bucket Setup for Sign Photos
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'sign-photos',
    'sign-photos',
    true,
    10485760, -- 10MB maximum
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

DROP POLICY IF EXISTS "Public sign photos read access" ON storage.objects;
CREATE POLICY "Public sign photos read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'sign-photos');

DROP POLICY IF EXISTS "Public sign photos upload access" ON storage.objects;
CREATE POLICY "Public sign photos upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sign-photos');

-- ==============================================================================
-- 8. Seed Initial Data for Bristol, TN Pilot Campaign
-- ==============================================================================
INSERT INTO public.campaigns (id, name, access_pin)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Melissa K. Brown for Bristol City Council',
    '246810'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    access_pin = EXCLUDED.access_pin;

-- Seed signs removed for clean slate field testing
-- Sign data will be created by real volunteers in the field

-- Seed canvass records removed for clean slate field testing
-- Canvass data will be created by real volunteers in the field
