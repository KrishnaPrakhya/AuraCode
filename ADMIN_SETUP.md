# Admin Setup Guide

This guide will help you set up admin access to the AuraCode platform.

## Quick Start

### Step 1: Create Admin User in Supabase

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Open Authentication Section**
   - Click on "Authentication" in the left sidebar
   - Click on "Users" tab

3. **Add New User**
   - Click the "Add User" button (top right)
   - Fill in the form:
     - **Email**: `admin@auracode.com` (or your preferred email)
     - **Password**: Create a strong password (e.g., `Admin123!@#`)
     - **Auto Confirm User**: ✅ Check this box (important!)
   - Click "Create User"

4. **User Created!**
   - You should see your new user in the users list
   - The user is now ready to sign in

### Step 2: Sign In to Admin Dashboard

1. **Navigate to Admin Page**
   - Go to: http://localhost:3000/admin

2. **Enter Credentials**
   - Email: The email you created (e.g., `admin@auracode.com`)
   - Password: The password you set

3. **Access Granted!**
   - You should now see the Admin Command Center

## Admin Dashboard Features

Once logged in, you'll have access to:

### 📝 Problems Tab

- Create new coding problems
- Edit existing problems
- Set difficulty levels (1-5)
- Add test cases with descriptions
- Broadcast problems to participants via WebSocket

### 👥 Participants Tab

- Monitor active coding sessions
- View participant progress
- Track problems solved and hints used
- Real-time performance metrics

### 📊 Analytics Tab

- View pass rates and trends
- Analyze problem difficulty
- Get recommendations for difficulty adjustments
- Track overall platform metrics

## Troubleshooting

### Can't Sign In?

1. **Check Email Confirmation**
   - In Supabase Dashboard > Authentication > Users
   - Make sure "Email Confirmed At" has a timestamp
   - If not, click the user and manually confirm

2. **Check Password**
   - Passwords are case-sensitive
   - Make sure you're using the correct password

3. **Check Environment Variables**
   - Verify `.env.local` has correct Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Check Browser Console**
   - Open DevTools (F12)
   - Look for any error messages
   - Common issues: CORS errors, network issues

### "Invalid login credentials" Error?

- Double-check your email and password
- Make sure the user exists in Supabase
- Verify the user's email is confirmed

### WebSocket Not Connected?

- The WebSocket connection is optional for basic admin functions
- You can still create and edit problems without it
- To enable WebSocket:
  - Make sure your Next.js dev server is running
  - Check that `/api/ws` route is accessible

## Security Notes

### Production Deployment

When deploying to production:

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols

2. **Enable Row Level Security (RLS)**
   - Supabase has RLS policies in `scripts/02-rls-policies.sql`
   - Make sure these are applied to your database

3. **Limit Admin Access**
   - Only create admin accounts for trusted users
   - Consider adding role-based access control

4. **Use Environment Variables**
   - Never commit passwords or API keys to git
   - Use Vercel/Railway environment variables for production

## Creating Multiple Admin Users

To create additional admin users:

1. Repeat Step 1 above with different email addresses
2. All users created through Supabase Auth can access `/admin`
3. Consider adding a `role` field to users table for more granular permissions

## Next Steps

After setting up admin access:

1. **Create Your First Problem**
   - Go to Problems tab
   - Click "New" button
   - Fill in problem details
   - Add test cases
   - Save!

2. **Test the Sandbox**
   - Go to http://localhost:3000/sandbox
   - Try solving the demo problem
   - Test the hint system

3. **Monitor Sessions**
   - Go to Participants tab
   - Watch for active coding sessions
   - View real-time metrics

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the terminal for server errors
3. Verify Supabase connection in the Network tab
4. Review the `DEVELOPMENT.md` file for more details

---

**Happy Coding! 🚀**
