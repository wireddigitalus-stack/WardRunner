-- 1. volunteers table
CREATE TABLE IF NOT EXISTS public.volunteers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,  -- bcrypt or pgcrypto crypt hash
    role TEXT NOT NULL DEFAULT 'Field Volunteer' CHECK (role IN ('Field Director', 'Precinct Captain', 'Door Canvasser', 'Flyer Hanger', 'Field Volunteer', 'Field Scout', 'Town Hall / Events')),
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteers_campaign_id_idx ON public.volunteers(campaign_id);
CREATE INDEX IF NOT EXISTS volunteers_pin_hash_idx ON public.volunteers(pin_hash);
CREATE INDEX IF NOT EXISTS volunteers_active_idx ON public.volunteers(active);


-- 2. volunteer_assignments table
CREATE TABLE IF NOT EXISTS public.volunteer_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    volunteer_id TEXT REFERENCES public.volunteers(id),
    volunteer_name TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('intersection', 'precinct', 'scout_rec', 'custom')),
    title TEXT NOT NULL,
    street_address TEXT,
    sign_type TEXT NOT NULL CHECK (sign_type IN ('yard_sign', 'large_sign', 'banner', 'billboard')),
    quantity INTEGER NOT NULL DEFAULT 1,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3. volunteer_pings table
CREATE TABLE IF NOT EXISTS public.volunteer_pings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    volunteer_name TEXT NOT NULL,
    role TEXT DEFAULT 'Field Volunteer',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy NUMERIC,
    is_active BOOLEAN NOT NULL DEFAULT true,
    current_action TEXT,
    breadcrumbs JSONB DEFAULT '[]'::jsonb,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 4. Add updated_at columns to existing tables
ALTER TABLE public.signs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.canvass_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.canvass_routes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- 5. Auto-update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_volunteers_modtime ON public.volunteers;
CREATE TRIGGER update_volunteers_modtime BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_volunteer_assignments_modtime ON public.volunteer_assignments;
CREATE TRIGGER update_volunteer_assignments_modtime BEFORE UPDATE ON public.volunteer_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_signs_modtime ON public.signs;
CREATE TRIGGER update_signs_modtime BEFORE UPDATE ON public.signs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvass_records_modtime ON public.canvass_records;
CREATE TRIGGER update_canvass_records_modtime BEFORE UPDATE ON public.canvass_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvass_routes_modtime ON public.canvass_routes;
CREATE TRIGGER update_canvass_routes_modtime BEFORE UPDATE ON public.canvass_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_modtime ON public.campaigns;
CREATE TRIGGER update_campaigns_modtime BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 6. validate_pin RPC function
CREATE OR REPLACE FUNCTION public.validate_pin(p_pin TEXT, p_campaign_id TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_campaign RECORD;
    v_volunteer RECORD;
BEGIN
    -- First check campaign master PIN
    IF p_campaign_id IS NOT NULL THEN
        SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id AND access_pin = p_pin;
    ELSE
        SELECT * INTO v_campaign FROM public.campaigns WHERE access_pin = p_pin LIMIT 1;
    END IF;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'valid', true,
            'type', 'master',
            'campaign_id', v_campaign.id,
            'campaign_name', v_campaign.name,
            'role', 'Field Director'
        );
    END IF;
    
    -- Then check volunteer PINs (using pgcrypto crypt comparison)
    -- For simplicity in MVP, store PINs as plain text but compare server-side
    -- TODO: Migrate to crypt() hashed PINs
    SELECT * INTO v_volunteer FROM public.volunteers 
    WHERE pin_hash = p_pin AND active = true
    LIMIT 1;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'valid', true,
            'type', 'volunteer',
            'campaign_id', v_volunteer.campaign_id,
            'volunteer_id', v_volunteer.id,
            'volunteer_name', v_volunteer.name,
            'role', v_volunteer.role
        );
    END IF;
    
    RETURN jsonb_build_object('valid', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. RLS Policies
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_pings ENABLE ROW LEVEL SECURITY;

-- MVP: Permissive policies. TODO: restrict to campaign scope
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for all users' AND tablename = 'volunteers') THEN
        CREATE POLICY "Enable all for all users" ON public.volunteers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for all users' AND tablename = 'volunteer_assignments') THEN
        CREATE POLICY "Enable all for all users" ON public.volunteer_assignments FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for all users' AND tablename = 'volunteer_pings') THEN
        CREATE POLICY "Enable all for all users" ON public.volunteer_pings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;


-- 8. Seed volunteer data
INSERT INTO public.volunteers (id, campaign_id, name, pin_hash, role, active)
VALUES
('vol-1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sarah Jenkins', '1234', 'Precinct Captain', true),
('vol-2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Marcus Taylor', '5678', 'Door Canvasser', true),
('vol-3', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ashley Rivera', '9012', 'Field Scout', true)
ON CONFLICT (id) DO NOTHING;
