-- AuraCode Admin Access Fix
-- Run this in your Supabase SQL Editor once:
-- https://supabase.com/dashboard/project/vqzyylofglteicuntfir/sql
-- ============================================================================
-- 1. INSERT SYSTEM ADMIN USER
--    A known UUID used when dev-bypass is active or no real user session exists.
-- ============================================================================
INSERT INTO users (id, email, username, display_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system@auracode.local',
    'system',
    'System Admin',
    'admin'
  ) ON CONFLICT (id) DO NOTHING;
-- ============================================================================
-- 2. AUTO-SYNC TRIGGER
--    Automatically creates a public.users row whenever someone signs up
--    through Supabase Auth, so the FK created_by constraint never fails.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.users (id, email, username, display_name, role)
VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'admin' -- all manually-created users default to admin for this hackathon
  ) ON CONFLICT (id) DO NOTHING;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
-- ============================================================================
-- 3. BACKFILL: sync any existing auth.users not yet in public.users
-- ============================================================================
INSERT INTO public.users (id, email, username, display_name, role)
SELECT au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1)
  ),
  COALESCE(
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  'admin'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1
    FROM public.users pu
    WHERE pu.id = au.id
  ) ON CONFLICT (id) DO NOTHING;
-- ============================================================================
-- 4. SIMPLIFY PROBLEMS RLS
--    Drop the complex admin-check policy and replace with:
--    "any authenticated user can manage problems" (fine for hackathon)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage problems" ON problems;
CREATE POLICY "Authenticated users can manage problems" ON problems FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);