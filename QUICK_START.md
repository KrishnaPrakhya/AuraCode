# 🚀 AuraCode Quick Start

Get up and running in 5 minutes!

## 1️⃣ Install Dependencies

```bash
# Frontend
pnpm install

# Backend
cd fastapi-backend
pip install -r requirements.txt
```

## 2️⃣ Set Up Environment Variables

Create `.env.local` in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
FASTAPI_BACKEND_URL=http://localhost:8000
```

Create `fastapi-backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## 3️⃣ Create Admin User

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication > Users**
3. Click **"Add User"**
4. Enter:
   - Email: `admin@auracode.com`
   - Password: `Admin123!@#`
   - ✅ Check "Auto Confirm User"
5. Click **"Create User"**

## 4️⃣ Run the Servers

```bash
# Terminal 1: Frontend
pnpm dev

# Terminal 2: Backend
cd fastapi-backend
python main.py
```

## 5️⃣ Access the Platform

- **Home**: http://localhost:3000
- **Sandbox**: http://localhost:3000/sandbox
- **Admin**: http://localhost:3000/admin
  - Email: `admin@auracode.com`
  - Password: `Admin123!@#`

## 🎯 What to Do Next

### As Admin:

1. Sign in at `/admin`
2. Go to **Problems** tab
3. Click **"New"** to create a problem
4. Add test cases
5. Click **"Save Problem"**
6. Click **"Broadcast to Participants"** (if WebSocket connected)

### As Participant:

1. Go to `/sandbox`
2. See the demo problem (Two Sum)
3. Write code in the editor
4. Click **"Run Code"** to test
5. Click **"Hint"** for AI assistance

## 📚 Documentation

- **Full Setup**: See `ADMIN_SETUP.md`
- **Development**: See `DEVELOPMENT.md`
- **Deployment**: See `DEPLOYMENT.md`

## 🐛 Troubleshooting

### Can't connect to Supabase?

- Check your `.env.local` file
- Verify credentials in Supabase Dashboard

### Backend not starting?

- Make sure Python 3.10+ is installed
- Install dependencies: `pip install -r requirements.txt`
- Check if port 8000 is available

### Admin login not working?

- Make sure you created the user in Supabase
- Check "Auto Confirm User" was enabled
- Verify email and password are correct

## 🎨 Features

✅ Monaco Code Editor with syntax highlighting  
✅ Real-time code execution  
✅ AI-powered hints (Gemini)  
✅ Admin dashboard for problem management  
✅ WebSocket for live updates  
✅ Session playback  
✅ Analytics and metrics

---

**Need Help?** Check the full documentation or open an issue on GitHub.
