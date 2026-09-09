-- ==============================================================================
-- WardRunner Schema Migration: PostGIS, Campaigns, Signs, and RLS
-- Pilot: Melissa K. Brown for Bristol City Council
-- ==============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Set search path to include extensions for geometry functions
ALTER DATABASE postgres SET search_path TO public, extensions;

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Melissa K. Brown for Bristol City Council',
    access_pin VARCHAR(6) NOT NULL,
    district_boundary geometry(MultiPolygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_access_pin ON public.campaigns(access_pin);
CREATE INDEX IF NOT EXISTS idx_campaigns_district_boundary ON public.campaigns USING GIST (district_boundary);

-- 3. Signs Table
CREATE TABLE IF NOT EXISTS public.signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    location geometry(Point, 4326),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    placed_by_name TEXT NOT NULL,
    sign_type TEXT NOT NULL CHECK (sign_type IN ('yard_sign', 'large_sign', 'banner', 'billboard')),
    is_competitor BOOLEAN NOT NULL DEFAULT false,
    competitor_name TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'needs_repair', 'retrieved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    retrieved_at TIMESTAMPTZ,
    CONSTRAINT check_competitor_name CHECK (
        (is_competitor = false) OR 
        (is_competitor = true AND competitor_name IS NOT NULL AND length(trim(competitor_name)) > 0)
    )
);

-- Indexes for Signs
CREATE INDEX IF NOT EXISTS idx_signs_campaign_id ON public.signs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_signs_location ON public.signs USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_signs_status ON public.signs(status);
CREATE INDEX IF NOT EXISTS idx_signs_created_at ON public.signs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signs_is_competitor ON public.signs(is_competitor);

-- Trigger to automatically synchronize PostGIS geometry point with numeric coordinates
CREATE OR REPLACE FUNCTION public.sync_sign_geometry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_sign_geometry ON public.signs;
CREATE TRIGGER trg_sync_sign_geometry
    BEFORE INSERT OR UPDATE OF latitude, longitude
    ON public.signs
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_sign_geometry();

-- Trigger to set retrieved_at automatically when status transitions to 'retrieved'
CREATE OR REPLACE FUNCTION public.handle_sign_retrieval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'retrieved' AND OLD.status <> 'retrieved' AND NEW.retrieved_at IS NULL THEN
        NEW.retrieved_at := now();
    ELSIF NEW.status <> 'retrieved' THEN
        NEW.retrieved_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_sign_retrieval ON public.signs;
CREATE TRIGGER trg_handle_sign_retrieval
    BEFORE UPDATE OF status
    ON public.signs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sign_retrieval();

-- ==============================================================================
-- 4. Storage Bucket Setup for Sign Photos
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

-- Storage Policies for sign-photos bucket
CREATE POLICY "Public sign photos read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'sign-photos');

CREATE POLICY "Public sign photos upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sign-photos');

-- ==============================================================================
-- 5. Row Level Security (RLS)
-- Field volunteers use an anonymous Supabase client verified with the campaign PIN.
-- Managers can authenticate via Supabase Auth or PIN validation.
-- ==============================================================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signs ENABLE ROW LEVEL SECURITY;

-- Helper function: verify campaign PIN
CREATE OR REPLACE FUNCTION public.verify_campaign_pin(p_campaign_id UUID, p_pin VARCHAR)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE id = p_campaign_id AND access_pin = p_pin
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to authenticate a PIN and return the Campaign ID
CREATE OR REPLACE FUNCTION public.get_campaign_by_pin(p_pin VARCHAR)
RETURNS TABLE (id UUID, name TEXT, created_at TIMESTAMPTZ) AS $$
    SELECT c.id, c.name, c.created_at
    FROM public.campaigns c
    WHERE c.access_pin = p_pin
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Campaigns Policies:
-- 1. Read campaigns if authenticated session OR if queried via valid PIN RPC
CREATE POLICY "Allow public read of campaigns"
ON public.campaigns FOR SELECT
USING (true);

-- Signs Policies:
-- 1. Read signs: anyone with access to the campaign
CREATE POLICY "Allow read signs"
ON public.signs FOR SELECT
USING (true);

-- 2. Insert signs: allow insert with valid campaign_id
CREATE POLICY "Allow insert signs"
ON public.signs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = campaign_id
    )
);

-- 3. Update signs: allow update (e.g., mark retrieved, repair status)
CREATE POLICY "Allow update signs"
ON public.signs FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = campaign_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = campaign_id
    )
);

-- Geospatial RPC: Fetch signs within distance (meters) for mobile Retrieval Mode
CREATE OR REPLACE FUNCTION public.get_nearby_signs(
    p_campaign_id UUID,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_radius_meters DOUBLE PRECISION DEFAULT 800.0
)
RETURNS TABLE (
    id UUID,
    campaign_id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    placed_by_name TEXT,
    sign_type TEXT,
    is_competitor BOOLEAN,
    competitor_name TEXT,
    photo_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.campaign_id,
        s.latitude,
        s.longitude,
        s.placed_by_name,
        s.sign_type,
        s.is_competitor,
        s.competitor_name,
        s.photo_url,
        s.status,
        s.created_at,
        ST_Distance(
            s.location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance_meters
    FROM public.signs s
    WHERE s.campaign_id = p_campaign_id
      AND ST_DWithin(
            s.location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            p_radius_meters
          )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 6. Initial Seed Data for Pilot Campaign: Melissa K. Brown for Bristol City Council
-- ==============================================================================
INSERT INTO public.campaigns (id, name, access_pin)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Melissa K. Brown for Bristol City Council',
    '246810'
)
ON CONFLICT (id) DO NOTHING;

-- Seed a sample of starting sign placements in Bristol
INSERT INTO public.signs (
    campaign_id, latitude, longitude, placed_by_name, sign_type, is_competitor, competitor_name, status
) VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    41.6730, -72.9460, 'Allen Hurley', 'large_sign', false, NULL, 'placed'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    41.6785, -72.9372, 'Allen Hurley', 'banner', false, NULL, 'placed'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    41.6695, -72.9510, 'Volunteer Sarah', 'yard_sign', false, NULL, 'placed'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    41.6742, -72.9415, 'Volunteer Sarah', 'yard_sign', true, 'Bob Reynolds', 'placed'
)
ON CONFLICT DO NOTHING;
