# Fix 409 Conflict Error

## Problem

You're getting a `409 Conflict` error when clicking the Hint button because the database is trying to insert records with `user_id` values that don't exist in the `users` table.

## Root Cause

The sandbox generates random UUIDs for `userId` and `sessionId`, but these don't exist in the database. When trying to insert into tables with foreign key constraints, PostgreSQL rejects the insert with a 409 Conflict error.

## Quick Fix (Recommended)

### Step 1: Make user_id Nullable

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/project/vqzyylofglteicuntfir

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run This Script:**

```sql
-- Make user_id nullable to allow anonymous users
ALTER TABLE events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE hints ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE submissions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE problems ALTER COLUMN created_by DROP NOT NULL;
```

4. **Click "Run"**

### Step 2: Drop Foreign Key Constraints (Optional but Recommended)

If you still get errors, also run this:

```sql
-- Drop foreign key constraints for development
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_session_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE hints DROP CONSTRAINT IF EXISTS hints_user_id_fkey;
ALTER TABLE hints DROP CONSTRAINT IF EXISTS hints_session_id_fkey;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_session_id_fkey;
```

5. **Refresh Browser and Try Again!**

## Alternative Solutions

### Option A: Use the Script Files

I've created SQL scripts for you:

1. **Run `scripts/06-make-user-id-nullable.sql`**
   - Makes user_id optional
   - Keeps foreign key constraints
   - Best for maintaining some data integrity

2. **Or run `scripts/05-fix-foreign-keys-for-dev.sql`**
   - Removes all foreign key constraints
   - Fastest fix
   - Less data integrity

### Option B: Create a Default User

Instead of making fields nullable, create a default "anonymous" user:

```sql
-- Create an anonymous user
INSERT INTO users (id, email, username, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'anonymous@auracode.com',
  'anonymous',
  'Anonymous User',
  'participant'
)
ON CONFLICT (id) DO NOTHING;
```

Then update your sandbox to use this UUID instead of random ones.

## Verify It's Working

After applying the fix:

1. **Open Browser Console** (F12)
2. **Go to Sandbox**: http://localhost:3000/sandbox
3. **Click Hint Button**
4. **Check Console** - Should see no 409 errors
5. **Check Network Tab** - POST to `/rest/v1/events` should return 201 Created

## What Changed?

### Before:

```sql
CREATE TABLE events (
  user_id UUID NOT NULL REFERENCES users(id),  -- ❌ Required, must exist
  ...
);
```

### After:

```sql
CREATE TABLE events (
  user_id UUID,  -- ✅ Optional, can be NULL
  ...
);
```

## For Production

Before deploying to production, you should:

1. **Require Authentication**
   - Make users sign in before using sandbox
   - Use real user IDs from Supabase Auth

2. **Restore Constraints**
   - Re-add foreign key constraints
   - Make user_id NOT NULL again

3. **Add Validation**
   - Validate user_id exists before inserting
   - Handle errors gracefully

## Troubleshooting

### Still Getting 409 Errors?

1. **Check which table is failing**
   - Look at the error message in console
   - It will show the table name

2. **Check if the constraint was dropped**

   ```sql
   SELECT constraint_name, table_name
   FROM information_schema.table_constraints
   WHERE table_name IN ('events', 'sessions', 'hints')
   AND constraint_type = 'FOREIGN KEY';
   ```

3. **Check if column is nullable**
   ```sql
   SELECT column_name, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'events' AND column_name = 'user_id';
   ```

### Other Errors?

- **"column does not exist"**: Run the schema creation script first
- **"permission denied"**: Check RLS policies (see FIX_RLS_ERROR.md)
- **"invalid input syntax for type uuid"**: Check that UUIDs are valid format

## Summary

**Quickest Fix:**

```sql
-- Run in Supabase SQL Editor
ALTER TABLE events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE hints ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE hints DROP CONSTRAINT IF EXISTS hints_user_id_fkey;
```

Then refresh and try the Hint button again! 🎉

## Files Created

- ✅ `scripts/05-fix-foreign-keys-for-dev.sql` - Drop all foreign keys
- ✅ `scripts/06-make-user-id-nullable.sql` - Make user_id optional
- ✅ `FIX_409_CONFLICT.md` - This guide

Choose the solution that works best for your needs!
