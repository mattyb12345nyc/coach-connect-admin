-- Coach Connect Auth System
-- Adds profiles, invites, and practice_sessions tables for real auth.
-- References the existing stores table from migration 003.

-- =============================================
-- PROFILES TABLE (linked to auth.users)
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'associate'
    CHECK (role IN ('associate','store_manager','regional_manager','admin','super_admin')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','deactivated')),
  store_id UUID REFERENCES public.stores(id),
  job_title TEXT DEFAULT 'Sales Associate',
  hire_date DATE,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en',
  practice_sessions INTEGER DEFAULT 0,
  average_score INTEGER DEFAULT 0,
  day_streak INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  last_active_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Store managers view their store" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

CREATE POLICY "Service role full access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Store managers view their store" ON public.profiles FOR SELECT TO authenticated
  USING (store_id IN (
    SELECT store_id FROM public.profiles
    WHERE id = auth.uid() AND role IN ('store_manager','regional_manager','admin','super_admin')
  ));
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));

-- =============================================
-- INVITES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'associate'
    CHECK (role IN ('associate','store_manager','regional_manager','admin')),
  store_id UUID REFERENCES public.stores(id),
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.invites;
DROP POLICY IF EXISTS "Admins manage invites" ON public.invites;
DROP POLICY IF EXISTS "Anon can read invites" ON public.invites;

CREATE POLICY "Service role full access" ON public.invites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage invites" ON public.invites FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','store_manager')
  ));
CREATE POLICY "Anon can read invites" ON public.invites FOR SELECT TO anon USING (true);

-- =============================================
-- PRACTICE SESSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  persona TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  overall_score INTEGER,
  scores JSONB,
  highlights JSONB,
  summary TEXT,
  transcript JSONB,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users view own sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Managers view all sessions" ON public.practice_sessions;

CREATE POLICY "Service role full access" ON public.practice_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users view own sessions" ON public.practice_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own sessions" ON public.practice_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Managers view all sessions" ON public.practice_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','store_manager')
  ));

-- =============================================
-- AUTO-CREATE PROFILE TRIGGER
-- Routes invited users to 'active', self-registered to 'pending'.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE invite_record RECORD;
BEGIN
  SELECT * INTO invite_record FROM public.invites
  WHERE email = NEW.email AND status = 'pending' AND expires_at > NOW()
  ORDER BY created_at DESC LIMIT 1;

  IF invite_record IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, role, store_id, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(invite_record.first_name, split_part(NEW.email, '@', 1)),
      COALESCE(invite_record.last_name, ''),
      invite_record.role,
      invite_record.store_id,
      'active'
    );
    UPDATE public.invites SET status = 'accepted', accepted_at = NOW()
    WHERE id = invite_record.id;
  ELSE
    INSERT INTO public.profiles (id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      'associate',
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
