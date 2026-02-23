# AuraCode Deployment Guide

Complete instructions for deploying AuraCode to production.

## Table of Contents
1. [Database Setup](#database-setup)
2. [Frontend Deployment](#frontend-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Logs](#monitoring--logs)
6. [Post-Deployment](#post-deployment)

## Database Setup

### Supabase (Recommended)

1. **Create Supabase Project**
   - Go to supabase.com → Create new project
   - Choose region close to your users
   - Set strong password for postgres user

2. **Run Migrations**
   ```bash
   # Option 1: Via Supabase Dashboard
   # SQL Editor → Copy all migration scripts → Execute
   
   # Option 2: Via CLI
   supabase db push
   ```

3. **Enable Row Level Security (RLS)**
   ```sql
   ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE events ENABLE ROW LEVEL SECURITY;
   -- See scripts/02-rls-policies.sql for all policies
   ```

4. **Create Service Role Key**
   - Project Settings → API → Service Role Key
   - Store securely for backend use

### Alternative: Self-Hosted PostgreSQL

```bash
# Docker setup
docker run --name auracode-db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=auracode \
  -p 5432:5432 \
  -d postgres:15

# Run migrations
psql postgresql://admin:secure_password@localhost:5432/auracode < scripts/01-base-tables.sql
psql postgresql://admin:secure_password@localhost:5432/auracode < scripts/02-rls-policies.sql
```

## Frontend Deployment

### Option 1: Vercel (Easiest)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to vercel.com → Import project
   - Select GitHub repository
   - Configure environment variables
   - Click Deploy

3. **Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   NEXT_PUBLIC_FASTAPI_URL=https://api.auracode.dev
   ```

### Option 2: Self-Hosted (Docker)

```dockerfile
# Build
docker build -t auracode-frontend .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_FASTAPI_URL=https://api.auracode.dev \
  auracode-frontend
```

### Option 3: Traditional VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/your-org/auracode.git
cd auracode

# Install and build
pnpm install
pnpm build

# Use PM2 for process management
pnpm add -g pm2
pm2 start "pnpm start" --name "auracode-frontend"
pm2 save

# Configure Nginx reverse proxy
sudo apt-get install nginx
# Configure /etc/nginx/sites-available/auracode
sudo systemctl enable nginx
```

## Backend Deployment

### Option 1: Railway

1. **Create Railway Account** → railway.app

2. **Deploy FastAPI**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and link
   railway login
   railway link
   
   # Deploy
   railway up
   ```

3. **Set Environment Variables**
   - Railway Dashboard → Variables
   - Add: OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.

### Option 2: Render

1. **Create Render Account** → render.com

2. **Connect GitHub Repository**
   - New → Web Service → Select Repository

3. **Configure**
   - Environment: Docker
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables**
   - Render Dashboard → Environment

### Option 3: DigitalOcean App Platform

```bash
# Deploy via app.yaml
services:
- name: auracode-backend
  github:
    repo: your-org/auracode
    branch: main
  build_command: pip install -r fastapi-backend/requirements.txt
  run_command: cd fastapi-backend && uvicorn main:app --host 0.0.0.0 --port $PORT
  http_port: 8000
  envs:
  - key: OPENAI_API_KEY
    scope: RUN_TIME
```

### Option 4: Docker Compose on VPS

```bash
# On your VPS
sudo apt-get update && apt-get install docker.io docker-compose

# Clone repository
git clone https://github.com/your-org/auracode.git
cd auracode/fastapi-backend

# Edit docker-compose.yml with production settings
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Environment Configuration

### Production Checklist

```bash
# Frontend (.env.production)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
NEXT_PUBLIC_FASTAPI_URL=https://api.auracode.dev
NEXT_PUBLIC_ENV=production

# Backend (.env.production)
DATABASE_URL=postgresql://user:pass@prod-db:5432/auracode
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
PORT=8000
ENV=production
CORS_ORIGINS=https://auracode.dev,https://www.auracode.dev
```

### Secrets Management

```bash
# Use environment variable managers
# Option 1: GitHub Secrets (for CI/CD)
# Option 2: Railway/Render/DigitalOcean dashboard
# Option 3: HashiCorp Vault for self-hosted

# Never commit secrets to git
echo ".env" >> .gitignore
```

## Monitoring & Logs

### Application Monitoring

```bash
# Frontend - Vercel Analytics
# https://vercel.com/docs/analytics

# Backend - Sentry
pip install sentry-sdk
# Configure in main.py

import sentry_sdk
sentry_sdk.init(
    dsn="https://xxx@sentry.io/xxx",
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1
)
```

### Database Monitoring

```bash
# Supabase Dashboard
# - Query Performance
# - Storage Usage
# - Connection Pooling

# Self-Hosted PostgreSQL
# pgAdmin for visual monitoring
docker run -p 5050:80 dpage/pgadmin4

# Or use commands:
psql -c "SELECT * FROM pg_stat_statements LIMIT 10;"
```

### Log Aggregation

```bash
# Option 1: Vercel Logs (automatic)

# Option 2: Self-Hosted
# ELK Stack (Elasticsearch, Logstash, Kibana)
docker-compose -f elk-docker-compose.yml up -d

# Option 3: Cloud Services
# - Datadog
# - New Relic
# - LogRocket (for frontend)
```

## Health Checks

### Frontend Health

```bash
# URL Monitoring
curl https://auracode.dev/api/health

# Synthetic Monitoring
# Vercel → Analytics & Monitoring → Synthetic Monitoring
```

### Backend Health

```bash
# Direct health check
curl https://api.auracode.dev/health/status

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "uptime": "24h 30m"
}
```

## SSL/TLS Certificates

### Automatic (Vercel/Render/Railway)
- Handled automatically with Let's Encrypt

### Manual (Self-Hosted)
```bash
# Using Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d auracode.dev -d www.auracode.dev

# Configure Nginx
ssl_certificate /etc/letsencrypt/live/auracode.dev/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/auracode.dev/privkey.pem;
```

## Scaling Considerations

### Database Scaling
- Connection pooling for PostgreSQL
- Read replicas for analytics queries
- Backup strategy: daily snapshots + weekly backups

### Application Scaling
- Frontend: CDN (Vercel, Cloudflare) automatically handles
- Backend: Horizontal scaling with load balancer
  ```bash
  # Multiple FastAPI instances with gunicorn
  gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
  ```

### WebSocket Scaling
- Use Redis for cross-instance session management
- Sticky sessions for long-lived connections

## Post-Deployment

### Smoke Tests

```bash
# Test core features
1. Create account and log in
2. Load sandbox with sample problem
3. Execute test code
4. Generate hint
5. Access admin dashboard
6. Check playback functionality
```

### Performance Optimization

```bash
# Frontend
pnpm build
# Check bundle size: npm run analyze

# Backend
# Profile code execution: py-spy record -o profile.svg -- python main.py
# Check slow queries: log_min_duration_statement = 1000 in PostgreSQL
```

### Backup Strategy

```bash
# Supabase - Automatic
# https://supabase.com/docs/guides/database/backups

# Self-Hosted PostgreSQL
0 2 * * * pg_dump $DATABASE_URL > /backups/auracode-$(date +%Y%m%d).sql
```

## Rollback Procedure

```bash
# Vercel
vercel rollback

# Railway
railway logs --service <service-id>

# DigitalOcean App Platform
# Redeploy previous commit from GitHub
```

## Support & Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Verify firewall rules
   - Test connection: `psql $DATABASE_URL`

2. **LLM API Rate Limits**
   - Implement request queuing
   - Use exponential backoff
   - Monitor usage: OpenAI/Anthropic dashboards

3. **WebSocket Connection Fails**
   - Check CORS configuration
   - Verify proxy settings (Nginx)
   - Enable WebSocket support in load balancer

For more help: GitHub Issues or Documentation
