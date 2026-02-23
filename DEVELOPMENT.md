# AuraCode Development Guide

Contributing to AuraCode? This guide covers architecture, development workflow, and best practices.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  Sandbox │ Admin Dashboard │ Playback │ Pair Programmer   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐  ┌──────▼──────┐  ┌────▼──────┐
    │ Supabase │  │  FastAPI    │  │  WebSocket│
    │PostgreSQL│  │  (Python)   │  │  Manager  │
    └────┬─────┘  └──────┬──────┘  └────┬──────┘
         │               │               │
    ┌────▼─────────┬─────▼──────┬───────▼────┐
    │  Database    │Executors   │ LangGraph  │
    │  Migrations  │ Mentoring  │ AI Agents  │
    └──────────────┴────────────┴────────────┘
```

## Development Setup

### Prerequisites
```bash
# Frontend
- Node.js 18+
- pnpm 8+
- Git

# Backend
- Python 3.10+
- pip/venv
- Docker (for code execution)

# Database
- Supabase account (free tier OK)
- psql CLI tool (optional)
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/auracode.git
cd auracode

# Frontend setup
pnpm install

# Backend setup
cd fastapi-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Return to root
cd ..
```

### Environment Setup

Create `.env.local` in project root:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# FastAPI Backend
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000

# AI Keys (optional for development)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Running Development Servers

```bash
# Terminal 1: Frontend
pnpm dev
# Open http://localhost:3000

# Terminal 2: Backend
cd fastapi-backend
python main.py
# API at http://localhost:8000
# Docs at http://localhost:8000/docs

# Terminal 3: Monitor logs
tail -f logs/app.log
```

## Code Organization

### Frontend (/app and /components)

**Page Structure:**
```
app/
├── (marketing)/       # Public pages
│   └── page.tsx
├── sandbox/           # Problem solving
│   └── page.tsx
├── admin/             # Admin only
│   ├── layout.tsx
│   └── page.tsx
├── playback/          # Session review
│   └── [sessionId]/page.tsx
└── api/               # API routes
    ├── sandbox/
    ├── hints/
    ├── ws/
    ├── playback/
    └── analytics/
```

**Component Structure:**
```
components/
├── ui/                # Shadcn UI (auto-imported)
├── editor/            # Code editor components
│   ├── CodeEditor.tsx
│   ├── Sandbox.tsx
│   ├── ProblemPanel.tsx
│   └── PairProgrammer.tsx
├── admin/             # Admin components
│   ├── Dashboard.tsx
│   ├── ProblemEditor.tsx
│   ├── ParticipantMonitor.tsx
│   └── AnalyticsPanel.tsx
└── playback/          # Playback components
    └── SessionPlayback.tsx
```

**Hook Structure:**
```
lib/hooks/
├── useCodeEditor.ts      # Editor state
├── useWebSocket.ts       # Real-time connection
├── usePairProgrammer.ts  # 30-second sessions
└── use-mobile.ts         # Responsive design
```

**Utility Structure:**
```
lib/
├── supabase/            # Database layer
│   ├── client.ts
│   ├── database.types.ts
│   └── repositories/    # Data access layer
│       ├── sessions.ts
│       ├── problems.ts
│       └── events.ts
├── types/               # TypeScript types
│   └── database.ts
├── websocket/           # Real-time
│   └── manager.ts
├── playback/            # Playback engine
│   └── engine.ts
├── analytics/           # Analytics
│   └── difficulty-scaling.ts
└── utils.ts             # Helpers (cn, etc)
```

### Backend (/fastapi-backend)

**Route Structure:**
```
fastapi-backend/
├── main.py              # App initialization
├── models.py            # Pydantic schemas
├── routes/
│   ├── sandbox.py       # Code execution endpoints
│   ├── mentor.py        # Hint generation endpoints
│   ├── pair_programmer.py # Pair session endpoints
│   └── health.py        # Health checks
└── services/
    ├── executor.py      # Code execution logic
    ├── mentor.py        # LangGraph mentor agent
    └── pair_programmer.py # Pair programming logic
```

## Development Workflows

### Adding a New Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Create types**
   ```typescript
   // lib/types/amazing.ts
   export interface AmazingData {
     id: string;
     value: string;
   }
   ```

3. **Create database access**
   ```typescript
   // lib/supabase/repositories/amazing.ts
   export const amazingRepository = {
     async fetchOne(id: string) { ... },
     async create(data: AmazingData) { ... },
   }
   ```

4. **Create API endpoint**
   ```typescript
   // app/api/amazing/route.ts
   export async function GET(request: Request) {
     const data = await amazingRepository.fetchOne('id');
     return NextResponse.json(data);
   }
   ```

5. **Create component/page**
   ```tsx
   // components/amazing/AmazingComponent.tsx
   export function AmazingComponent() {
     const { data } = useSWR('/api/amazing');
     return <div>...</div>;
   }
   ```

6. **Test and commit**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   git push origin feature/amazing-feature
   ```

### Adding a New AI Model

1. **Add to requirements.txt**
   ```
   langchain-mistral==0.1.0
   ```

2. **Update mentorservice**
   ```python
   # services/mentor.py
   self.model = "mistral-large"
   self.client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
   ```

3. **Test in local environment**
   ```bash
   python -c "from services.mentor import get_mentor_agent; print('OK')"
   ```

### Running Tests

```bash
# Frontend
pnpm test
pnpm test:watch
pnpm test:coverage

# Backend
cd fastapi-backend
pytest
pytest --cov=services
pytest -k "test_executor"

# E2E tests
pnpm test:e2e
```

## Database Development

### Adding a New Table

1. **Create migration script**
   ```sql
   -- scripts/03-new-feature.sql
   CREATE TABLE IF NOT EXISTS amazing_table (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     data JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Update database.types.ts**
   ```typescript
   export type AmazingTable = {
     id: string;
     user_id: string;
     data: any;
     created_at: string;
   }
   ```

3. **Create repository**
   ```typescript
   // lib/supabase/repositories/amazing.ts
   export const amazingRepository = {
     async create(data: any) {
       return supabase
         .from('amazing_table')
         .insert({ ...data })
         .single();
     }
   }
   ```

### Running Migrations

```bash
# Via Supabase Dashboard SQL Editor
# Copy script and execute

# Or if using supabase-js in code:
// lib/supabase/migrations.ts
export async function runMigrations() {
  const scripts = [
    await fetch('/scripts/01-base-tables.sql').then(r => r.text()),
    await fetch('/scripts/02-rls-policies.sql').then(r => r.text()),
  ];
  
  for (const script of scripts) {
    await supabase.rpc('execute_sql', { sql: script });
  }
}
```

## WebSocket Development

### Adding a New WebSocket Handler

1. **Define message types**
   ```typescript
   // lib/websocket/types.ts
   export type WSMessage = 
     | { type: 'problem-update'; data: Problem }
     | { type: 'session-ended'; sessionId: string };
   ```

2. **Create handler**
   ```typescript
   // app/api/ws/route.ts
   case 'problem-update':
     broadcast({ type: 'problem-update', data: message.data });
     break;
   ```

3. **Connect in component**
   ```tsx
   const { send } = useWebSocket();
   
   useEffect(() => {
     const handleProblemUpdate = (msg) => {
       setProblem(msg.data);
     };
     
     ws.addEventListener('message', handleProblemUpdate);
     return () => ws.removeEventListener('message', handleProblemUpdate);
   }, []);
   ```

## Performance Optimization

### Frontend

```bash
# Bundle analysis
pnpm add -g webpack-bundle-analyzer
pnpm build
npm run analyze

# Lighthouse audits
# Chrome DevTools → Lighthouse

# Performance metrics
// lib/analytics/performance.ts
import { reportWebVitals } from 'web-vitals';
reportWebVitals(console.log);
```

### Backend

```bash
# Profile execution
python -m cProfile -s cumulative main.py

# Query optimization
# Use EXPLAIN ANALYZE in PostgreSQL
EXPLAIN ANALYZE SELECT * FROM sessions WHERE user_id = 'xxx';

# Monitor slow queries
log_min_duration_statement = 1000  -- Log queries > 1s
```

## Debugging

### Frontend Debug Statements

```typescript
// Use console.log with [v0] prefix
console.log('[v0] Code execution response:', response);

// In React components
const [code, setCode] = useState('');

useEffect(() => {
  console.log('[v0] Code updated:', code);
}, [code]);
```

### Backend Debug Statements

```python
import logging
logger = logging.getLogger(__name__)

logger.debug(f"[v0] User code: {user_code}")
logger.error(f"[v0] Execution error: {error}")
```

### Database Debugging

```sql
-- Slow query log
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC;

-- Table stats
SELECT count(*) FROM sessions WHERE created_at > NOW() - INTERVAL '1 day';

-- Connection info
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
```

## Code Style & Conventions

### Frontend (TypeScript/React)

```typescript
// Use named exports
export function ComponentName() { }

// Use interfaces for objects
interface Props {
  title: string;
  onClick: () => void;
}

// Use const for functions
const useMyHook = () => { }

// Use async/await
const data = await fetch('/api/data').then(r => r.json());
```

### Backend (Python)

```python
# Use type hints
def execute_code(code: str, language: str) -> ExecutionResult:
    pass

# Use docstrings
def analyze_code(code: str) -> CodeAnalysis:
    """Analyze user code for issues and suggestions."""
    pass

# Use logging
logger.info(f"Executing code for session {session_id}")
```

### SQL

```sql
-- Use UPPERCASE for keywords
SELECT * FROM sessions WHERE user_id = $1;

-- Use snake_case for identifiers
CREATE TABLE user_sessions (
  id UUID,
  user_id UUID
);
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/description

# Make changes
# Commit frequently with descriptive messages
git commit -m "feat: add amazing feature"
git commit -m "fix: handle edge case in parser"
git commit -m "refactor: simplify code execution logic"

# Push branch
git push origin feature/description

# Create Pull Request on GitHub
# Request review from maintainers

# After approval, squash and merge
git checkout main
git pull
git merge --squash feature/description
git commit -m "feat: add amazing feature

- Detailed explanation
- Related to issue #123"

# Delete branch
git branch -d feature/description
git push origin --delete feature/description
```

## Commit Message Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Tests
- `docs`: Documentation

**Examples:**
```
feat(editor): add code formatting support
fix(mentor): prevent duplicate hints
refactor(database): split repositories by domain
perf(websocket): add message batching
test(playback): add timeline scrubbing tests
docs(deployment): update Railway instructions
```

## Common Tasks

### Resetting Local Database

```bash
# Delete all data (development only!)
# Supabase Dashboard → SQL Editor
TRUNCATE TABLE events, hints, submissions, sessions CASCADE;

# Or recreate
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Run all migrations again
```

### Updating Dependencies

```bash
# Frontend
pnpm up
pnpm update --interactive

# Backend
pip list --outdated
pip install -U -r requirements.txt
```

### Adding Environment Variables

1. Update `.env.example`
2. Update `.env.local` with value
3. Reference in code: `process.env.NEXT_PUBLIC_VAR`
4. Document in README

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# For backend
rm -rf venv __pycache__
python -m venv venv
pip install -r requirements.txt
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check env variable
echo $DATABASE_URL

# Verify credentials in .env
```

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

Happy coding! Questions? Open an issue or contact the team.
