# Fix Admin Participants Error (PGRST200)

## Problem

The admin dashboard shows an error: "Could not find a relationship between 'sessions' and 'users' in the schema cache"

## Root Cause

After dropping foreign key constraints to fix the 409 error, Supabase PostgREST can no longer automatically JOIN the `sessions` and `users` tables.

## Solution

I've created admin API routes that query data directly without relying on foreign key relationships.

### ✅ Already Fixed!

The following files have been created:

- `app/api/admin/participants/route.ts` - Returns active sessions
- `app/api/admin/problems/route.ts` - Returns all problems

These APIs work without foreign key relationships.

### Optional: Restore Foreign Keys (Recommended)

To restore data integrity while keeping anonymous user support:

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard/project/vqzyylofglteicuntfir

2. **Open SQL Editor**

3. **Run This Script:**

```sql
-- Make columns nullable
ALTER TABLE events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE hints ALTER COLUMN user_id DROP NOT NULL;

-- Restore foreign keys with NULL support
ALTER TABLE events
  ADD CONSTRAINT events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE hints
  ADD CONSTRAINT hints_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

Or use the complete script: `scripts/07-restore-foreign-keys-with-nulls.sql`

## What Changed?

### Before:

- Dashboard tried to use Supabase's automatic JOIN feature
- Required foreign key relationships
- Failed when foreign keys were dropped

### After:

- Dashboard uses custom API routes
- Queries tables directly without JOINs
- Works with or without foreign keys

## Verify It's Working

1. **Refresh Admin Dashboard**
   - Go to: http://localhost:3000/admin
   - Sign in if needed

2. **Check Participants Tab**
   - Should load without errors
   - Shows active sessions

3. **Check Problems Tab**
   - Should show all problems
   - Can create/edit problems

4. **Check Browser Console**
   - Should see: `[v0] Loaded participants: X`
   - Should see: `[v0] Loaded problems: X`
   - No PGRST200 errors

## API Endpoints Created

### GET /api/admin/participants

Returns active sessions:

```json
[
  {
    "id": "uuid",
    "user_id": "uuid or null",
    "problem_id": "uuid",
    "status": "in_progress",
    "started_at": "timestamp",
    "points_earned": 0,
    "hints_used": 0,
    "problems_solved": 0
  }
]
```

### GET /api/admin/problems

Returns all active problems:

```json
[
  {
    "id": "uuid",
    "title": "Two Sum",
    "description": "...",
    "difficulty": 2,
    "language": "javascript",
    "test_cases": [...],
    ...
  }
]
```

## Benefits of This Approach

✅ **Works Immediately** - No database changes needed  
✅ **Flexible** - Works with or without foreign keys  
✅ **Simple** - Direct queries, no complex JOINs  
✅ **Maintainable** - Easy to understand and modify

## Alternative: Use Supabase Views

If you want to use Supabase's automatic JOIN feature, create a view:

```sql
CREATE OR REPLACE VIEW admin_participants AS
SELECT
  s.*,
  u.email,
  u.username,
  p.title as problem_title
FROM sessions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN problems p ON s.problem_id = p.id
WHERE s.status = 'in_progress';
```

Then query the view instead of the table.

## Troubleshooting

### Still Getting PGRST200 Errors?

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check API Routes Exist**
   - Verify files exist:
     - `app/api/admin/participants/route.ts`
     - `app/api/admin/problems/route.ts`

3. **Check API Response**
   - Open Network tab in DevTools
   - Look for `/api/admin/participants` request
   - Should return 200 OK with JSON array

4. **Restart Dev Server**
   ```bash
   # Stop the server (Ctrl+C)
   # Start again
   pnpm dev
   ```

### No Participants Showing?

- This is normal if no one is using the sandbox
- Go to `/sandbox` and start coding
- Refresh admin dashboard
- Should see your session in Participants tab

## Summary

The admin dashboard now uses custom API routes that work without foreign key relationships. The PGRST200 error should be resolved!

**Files Created:**

- ✅ `app/api/admin/participants/route.ts`
- ✅ `app/api/admin/problems/route.ts`
- ✅ `scripts/07-restore-foreign-keys-with-nulls.sql`
- ✅ `FIX_ADMIN_PARTICIPANTS.md`

Refresh your admin dashboard and it should work! 🎉
