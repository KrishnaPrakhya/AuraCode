# AuraCode: AI-Driven Hackathon Platform

A modern, full-stack hackathon platform powered by AI, featuring real-time code execution, intelligent mentoring, admin controls, and session playback capabilities.

## Core Features

### 1. The Sandbox
- **Monaco Editor** with syntax highlighting and language support
- **Real-time code execution** against test cases
- **Event recording** for every code change and execution
- **Split-panel design** showing problem description and test results
- Multi-language support (Python, JavaScript, TypeScript, Java)

### 2. AI Mentor Agent
- **LangGraph-based state machine** for intelligent hint generation
- **Multi-level hints** (0: nudge → 3: code structure) with dynamic penalty calculation
- **Code evaluation** using problem-specific test cases
- **Context-aware suggestions** based on user progress and problem requirements

### 3. Admin Command Center
- **Real-time problem broadcasting** via WebSocket to all participants
- **Live participant monitoring** with pass/fail statistics
- **Analytics dashboard** with difficulty scaling suggestions
- **Problem editor** with Markdown support

### 4. Playback Mode
- **Session reconstruction** from timestamped events
- **Timeline scrubbing** to jump to any point in a coding session
- **Pause detection** showing thinking time between edits
- **Useful for spotting problem-solving patterns**

### 5. AI Pair Programmer (Premium)
- **30-second collaborative coding sessions**
- **Real-time streaming suggestions** using Claude or GPT-4
- **Code snippet recommendations** and explanations
- **Token-based billing** ready for monetization

### 6. Difficulty Scaling Analytics
- **Real-time pass rate tracking** per test case
- **Automatic detection** of challenging test cases
- **Suggestions for problem description improvements**
- **Helps admins optimize problem difficulty**

## Technology Stack

### Frontend
- **Next.js 16** with TypeScript
- **Shadcn UI** and **Tailwind CSS v4**
- **Monaco Editor** for code editing
- **React Resizable Panels** for layout
- **SWR** for data fetching and caching

### Backend
- **FastAPI** (Python) for microservices
- **LangGraph** and **LangChain** for AI agents
- **Supabase PostgreSQL** for data persistence
- **Native WebSocket** for real-time updates
- **Docker** for containerization

### AI/ML
- **OpenAI GPT-4** for pair programming and analysis
- **Anthropic Claude** for hint generation and mentoring
- **LangGraph state machines** for multi-step agent logic

## Project Structure

```
auracode/
├── app/                          # Next.js App Router
│   ├── sandbox/                  # Sandbox page
│   ├── admin/                    # Admin dashboard
│   ├── playback/                 # Session playback
│   └── api/                      # API routes
├── components/                   # React components
│   ├── editor/                   # Code editor components
│   ├── admin/                    # Admin components
│   └── playback/                 # Playback components
├── lib/                          # Utilities and hooks
│   ├── hooks/                    # Custom React hooks
│   ├── supabase/                 # Database layer
│   ├── websocket/                # WebSocket management
│   ├── playback/                 # Playback engine
│   ├── analytics/                # Analytics services
│   └── types/                    # TypeScript types
├── fastapi-backend/              # Python backend
│   ├── services/                 # Business logic
│   │   ├── executor.py           # Code execution
│   │   ├── mentor.py             # LangGraph mentor agent
│   │   └── pair_programmer.py    # Pair programming service
│   ├── routes/                   # API endpoints
│   └── models.py                 # Pydantic models
└── scripts/                      # Database migrations
```

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.10+ with pip
- Supabase account (or local PostgreSQL)
- OpenAI API key (for pair programmer)
- Anthropic API key (for mentor agent)

### Frontend Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev
```

Navigate to `http://localhost:3000`

### Backend Setup

```bash
cd fastapi-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run FastAPI server
python main.py
# Server runs at http://localhost:8000
```

### Database Setup

```bash
# Run migrations in Supabase SQL editor or via scripts
# Tables: users, problems, sessions, submissions, events, hints, ai_pair_sessions, test_case_analytics
```

## API Documentation

### Frontend APIs (Next.js)

- `POST /api/sandbox/execute` - Execute code against test cases
- `POST /api/hints/generate` - Generate contextual hints from AI mentor
- `GET /api/playback/sessions` - Fetch session data with events
- `GET /api/analytics/difficulty-scaling` - Get difficulty metrics
- `WS /api/ws` - WebSocket for admin broadcasts

### Backend APIs (FastAPI)

- `POST /api/sandbox/execute` - Execute code with Docker
- `POST /api/mentor/hint` - LangGraph hint generation
- `POST /api/pair-programmer/session/stream` - Streaming pair programming
- `GET /health/status` - Server health check

## Environment Variables

### Frontend (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

### Backend (.env)

```
DATABASE_URL=postgresql://user:password@localhost/auracode
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=claude-...
FASTAPI_PORT=8000
```

## Development Workflow

1. **Create a problem** in the admin dashboard
2. **Write code** in the sandbox
3. **Get hints** from the AI mentor (with point penalty)
4. **Use pair programmer** for 30-second collaborative sessions
5. **Submit solution** for scoring
6. **Admins monitor** real-time progress and difficulty metrics
7. **Playback sessions** to analyze problem-solving approaches

## Performance & Scaling

- **WebSocket connections** handled by Next.js Edge Runtime
- **Code execution** sandboxed via Docker with 5-second timeout
- **LLM caching** for repeated problems and hints
- **Event streaming** for low-latency playback
- **Database indexing** on problem_id, user_id, session_id for quick lookups

## Security

- **RLS policies** on Supabase for user data isolation
- **Docker sandboxing** prevents code injection attacks
- **JWT authentication** for admin endpoints
- **WebSocket validation** before accepting connections
- **Input sanitization** on all user code

## Testing

```bash
# Frontend tests
pnpm test

# Backend tests
cd fastapi-backend
pytest

# E2E tests
pnpm test:e2e
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Vercel deployment for frontend
- Railway/Render deployment for FastAPI
- Database backups and migrations
- Monitoring and logging setup

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "feat: description"`
3. Push: `git push origin feature/your-feature`
4. Open Pull Request

## License

MIT License - See LICENSE file

## Support

For issues and questions, open an issue on GitHub or contact the development team.

---

**AuraCode** - Empowering hackathon participants with AI-driven mentoring and real-time collaboration.
