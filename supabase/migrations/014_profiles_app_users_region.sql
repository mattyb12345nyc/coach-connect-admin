-- Add region column to profiles and app_users so regional_manager invites
-- carry the assigned region through to the created user records.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS region TEXT;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles(region);
CREATE INDEX IF NOT EXISTS idx_app_users_region ON public.app_users(region);

-- Update handle_new_user() to copy region from invite to profile.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE invite_record RECORD;
DECLARE normalized_email TEXT;
BEGIN
  normalized_email := lower(trim(NEW.email));

  SELECT * INTO invite_record FROM public.invites
  WHERE lower(trim(email)) = normalized_email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC LIMIT 1;

  IF invite_record IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, role, store_id, region, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(invite_record.first_name, split_part(NEW.email, '@', 1)),
      COALESCE(invite_record.last_name, ''),
      invite_record.role,
      invite_record.store_id,
      invite_record.region,
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
