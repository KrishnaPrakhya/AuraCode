# Fix 403 Forbidden Error (RLS Issue)

## Problem

You're getting a `403 Forbidden` error when clicking the Hint button because Row Level Security (RLS) is blocking access to the database tables.

## Quick Fix (Recommended for Development)

### Option 1: Apply Permissive Policies (Keeps RLS Enabled)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/vqzyylofglteicuntfir

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run This Script**
   - Open the file: `scripts/04-dev-permissive-policies.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Done!**
   - The sandbox should now work without authentication
   - RLS is still enabled but with permissive policies

### Option 2: Disable RLS Temporarily (Quick but Less Secure)

If you just want to test quickly:

1. **Go to Supabase Dashboard > SQL Editor**

2. **Run This Quick Script:**

   ```sql
   ALTER TABLE events DISABLE ROW LEVEL SECURITY;
   ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
   ALTER TABLE hints DISABLE ROW LEVEL SECURITY;
   ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
   ALTER TABLE problems DISABLE ROW LEVEL SECURITY;
   ```

3. **Done!**
   - All tables are now accessible without authentication
   - ⚠️ Remember to re-enable RLS before production!

## What Happened?

The RLS policies in `scripts/02-rls-policies.sql` require authentication:

- They check `auth.uid()` to verify the user is logged in
- Anonymous users (not logged in) get blocked with 403 Forbidden

## Which Option Should I Use?

### For Development/Testing:

✅ **Option 1** (Permissive Policies) - Recommended

- Keeps RLS enabled
- Allows anonymous access
- Easy to switch to production policies later

### For Quick Testing:

⚠️ **Option 2** (Disable RLS) - Quick but less secure

- Completely disables security
- Faster to set up
- Must remember to re-enable before production

### For Production:

🔒 **Use Proper Authentication**

- Require users to sign in
- Apply the policies from `02-rls-policies.sql`
- Add role-based access control

## Verify It's Working

After applying the fix:

1. **Go to Sandbox**
   - Navigate to: http://localhost:3000/sandbox

2. **Click the Hint Button**
   - Should work without errors
   - Check browser console (F12) for any errors

3. **Try Running Code**
   - Write some code
   - Click "Run Code"
   - Should execute without 403 errors

## Re-Enable Security for Production

Before deploying to production:

1. **Apply Proper RLS Policies**

   ```sql
   -- Run scripts/02-rls-policies.sql in Supabase SQL Editor
   ```

2. **Add Authentication to Sandbox**
   - Require users to sign in before using sandbox
   - Use Supabase Auth like the admin page does

3. **Test Thoroughly**
   - Make sure authenticated users can access their data
   - Verify users can't access other users' data

## Troubleshooting

### Still Getting 403 Errors?

1. **Check if policies were applied**
   - Go to Supabase Dashboard
   - Navigate to: Database > Policies
   - Look for the policies you created

2. **Check browser console**
   - Open DevTools (F12)
   - Look for specific error messages
   - Check which table is causing the error

3. **Verify table names**
   - Make sure table names match exactly
   - Check for typos in policy names

### Other Errors?

- **"relation does not exist"**: Run `scripts/01-create-schema.sql` first
- **"permission denied"**: Make sure you're using the correct Supabase credentials
- **Network errors**: Check if Supabase URL is correct in `.env.local`

## Summary

**Quick Fix:**

```sql
-- Run this in Supabase SQL Editor
-- Copy from scripts/04-dev-permissive-policies.sql
```

**Or Even Quicker:**

```sql
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE hints DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE problems DISABLE ROW LEVEL SECURITY;
```

Then refresh your browser and try the Hint button again! 🎉
