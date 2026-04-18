-- ============================================================================
-- SUPABASE SCHEMA - Copy and paste this entire file into Supabase SQL Editor
-- ============================================================================
-- This script creates all necessary tables and Row-Level Security policies
-- Execution time: ~30 seconds
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT CHECK (sex IN ('Male', 'Female', 'Other')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  state TEXT,
  city TEXT,
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  userid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patientname TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  biomarkers JSONB DEFAULT '{}'::jsonb
);

-- Keep email uniqueness case-insensitive and allow idempotent upsert behavior.
CREATE UNIQUE INDEX IF NOT EXISTS doctors_email_lower_unique_idx ON doctors (LOWER(email));

-- ============================================================================
-- PART 1B: AUTO-CREATE DOCTOR PROFILE ON AUTH SIGNUP (permanent fix)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_doctor_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.doctors (id, name, email, specialty)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), 'Doctor'),
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'specialty', ''), 'General')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    specialty = EXCLUDED.specialty;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_doctor_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_doctor_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_doctor_profile();

-- Backfill doctor rows for existing auth users (safe to rerun).
INSERT INTO public.doctors (id, name, email, specialty)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'name', ''), 'Doctor') AS name,
  COALESCE(u.email, '') AS email,
  COALESCE(NULLIF(u.raw_user_meta_data->>'specialty', ''), 'General') AS specialty
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  specialty = EXCLUDED.specialty;

-- ============================================================================
-- PART 2: CREATE INDEXES (For performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_patients_userid ON patients(userid);
CREATE INDEX IF NOT EXISTS idx_recordings_userid ON recordings(userid);
CREATE INDEX IF NOT EXISTS idx_recordings_patientid ON recordings(patientid);
CREATE INDEX IF NOT EXISTS idx_patients_location ON patients(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- PART 3: ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: CREATE RLS POLICIES FOR DOCTORS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Doctors can view own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can insert own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can update own profile" ON doctors;

-- Doctors can view their own profile
CREATE POLICY "Doctors can view own profile" ON doctors
  FOR SELECT USING (auth.uid() = id);

-- Doctors can create their own profile
CREATE POLICY "Doctors can insert own profile" ON doctors
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Doctors can update their own profile
CREATE POLICY "Doctors can update own profile" ON doctors
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PART 5: CREATE RLS POLICIES FOR PATIENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert their own patients" ON patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete their own patients" ON patients;

-- Users can only see their own patients
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT USING (auth.uid() = userid);

-- Users can only insert their own patients
CREATE POLICY "Users can insert their own patients" ON patients
  FOR INSERT WITH CHECK (auth.uid() = userid);

-- Users can only update their own patients
CREATE POLICY "Users can update their own patients" ON patients
  FOR UPDATE USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid);

-- Users can only delete their own patients
CREATE POLICY "Users can delete their own patients" ON patients
  FOR DELETE USING (auth.uid() = userid);

-- ============================================================================
-- PART 6: CREATE RLS POLICIES FOR RECORDINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert their own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON recordings;

-- Users can only view their own recordings
CREATE POLICY "Users can view their own recordings" ON recordings
  FOR SELECT USING (auth.uid() = userid);

-- Users can only insert their own recordings
CREATE POLICY "Users can insert their own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = userid);

-- Users can only delete their own recordings
CREATE POLICY "Users can delete their own recordings" ON recordings
  FOR DELETE USING (auth.uid() = userid);

-- ============================================================================
-- PART 7: VERIFY SETUP (Run this to test)
-- ============================================================================

-- Check tables created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('doctors', 'patients', 'recordings');

-- Check RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('doctors', 'patients', 'recordings');

-- Check indexes created
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('patients', 'recordings');

-- ============================================================================
-- END OF SCHEMA SETUP
-- ============================================================================
-- If you see no errors, everything is successfully created!
-- You can now test the application with the .env.local configured.
-- ============================================================================
