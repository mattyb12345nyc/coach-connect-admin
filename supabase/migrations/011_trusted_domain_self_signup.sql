-- Allow trusted company domains to self-register as active associates.
-- Admin/store/regional elevation still requires explicit invitation.

DO $$
BEGIN
  -- Backfill existing pending associate profiles from trusted domains.
  UPDATE public.profiles
  SET status = 'active'
  WHERE status = 'pending'
    AND role = 'associate'
    AND (
      lower(split_part(email, '@', 2)) = 'coach.com'
      OR lower(split_part(email, '@', 2)) = 'tapestry.com'
      OR lower(split_part(email, '@', 2)) = 'futureproof.work'
      OR lower(split_part(email, '@', 2)) = 'mattbritton.com'
    );
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE invite_record RECORD;
DECLARE normalized_email TEXT;
DECLARE email_domain TEXT;
DECLARE trusted_domain BOOLEAN;
BEGIN
  normalized_email := lower(trim(NEW.email));
  email_domain := lower(split_part(normalized_email, '@', 2));
  trusted_domain := email_domain IN ('coach.com', 'tapestry.com', 'futureproof.work', 'mattbritton.com');

  SELECT * INTO invite_record FROM public.invites
  WHERE lower(trim(email)) = normalized_email
    AND status = 'pending'
    AND expires_at > NOW()
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
      CASE WHEN trusted_domain THEN 'active' ELSE 'pending' END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
