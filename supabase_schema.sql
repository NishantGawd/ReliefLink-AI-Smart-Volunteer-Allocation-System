-- ============================================================
--  ReliefLink — Supabase SQL Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable PostGIS for geo queries (volunteers near issues)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 1. VOLUNTEER PROFILES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS volunteer_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  city            TEXT,
  skills          TEXT[]   DEFAULT '{}',
  availability    TEXT,
  -- geo location (PostGIS point: longitude, latitude)
  location        GEOGRAPHY(POINT, 4326),
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  -- verification
  phone_verified  BOOLEAN  DEFAULT FALSE,
  doc_url         TEXT,                        -- uploaded ID/cert document
  verified        BOOLEAN  DEFAULT FALSE,      -- set by NGO admin after review
  verification_status TEXT DEFAULT 'pending',  -- pending | submitted | approved | rejected
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. NGO ADMIN PROFILES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ngo_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  ngo_name        TEXT NOT NULL,
  ngo_reg_number  TEXT,
  ngo_city        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. OTP VERIFICATION TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  otp_code    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. ISSUES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name   TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,     -- medical | food | shelter | rescue | education | other
  urgency         TEXT,     -- low | medium | high | critical
  status          TEXT DEFAULT 'open',  -- open | assigned | in_progress | resolved
  -- location
  address         TEXT,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  -- media
  image_url       TEXT,
  -- assignment
  assigned_to     UUID REFERENCES volunteer_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. AUTO-UPDATE updated_at ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_volunteer_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. ROW LEVEL SECURITY ──────────────────────────────────
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngo_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues              ENABLE ROW LEVEL SECURITY;

-- Volunteer profiles: own row + anyone can read (for map)
CREATE POLICY "volunteers_read_all"   ON volunteer_profiles FOR SELECT USING (true);
CREATE POLICY "volunteers_own_write"  ON volunteer_profiles FOR ALL    USING (auth.uid() = id);

-- NGO profiles: own row + anyone can read
CREATE POLICY "ngo_read_all"          ON ngo_profiles FOR SELECT USING (true);
CREATE POLICY "ngo_own_write"         ON ngo_profiles FOR ALL    USING (auth.uid() = id);

-- OTP: only own rows
CREATE POLICY "otp_own"               ON otp_verifications FOR ALL USING (auth.uid() = user_id);

-- Issues: anyone can read, authenticated can insert, owner/admin can update
CREATE POLICY "issues_read_all"       ON issues FOR SELECT USING (true);
CREATE POLICY "issues_insert_auth"    ON issues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "issues_update_own"     ON issues FOR UPDATE USING (auth.uid() = reported_by);

-- ── 7. STORAGE BUCKET for documents ───────────────────────
-- Run this separately if needed:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('volunteer-docs', 'volunteer-docs', false);

-- ── 8. HELPER: volunteers near a point ────────────────────
-- Usage: SELECT * FROM volunteers_near(lat, lng, radius_km)
CREATE OR REPLACE FUNCTION volunteers_near(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID, name TEXT, city TEXT, skills TEXT[],
  availability TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION, verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vp.id, vp.name, vp.city, vp.skills,
    vp.availability, vp.lat, vp.lng,
    ROUND((ST_Distance(
      vp.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000)::numeric, 1)::double precision AS distance_km,
    vp.verified
  FROM volunteer_profiles vp
  WHERE vp.location IS NOT NULL
    AND ST_DWithin(
      vp.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
