# AuraCode FastAPI Backend

Backend service for the AuraCode hackathon platform. Handles code execution, AI mentor hints, and real-time updates.

## Features

- **Code Execution**: Safe sandbox execution for multiple programming languages
- **AI Mentor**: LangGraph-based agent for hint generation
- **Real-time Updates**: WebSocket support for live problem updates
- **Analytics**: Track problem difficulty and hint effectiveness

## Setup

### Prerequisites
- Python 3.11+
- Docker & Docker Compose (optional)
- Node.js (for JavaScript/TypeScript execution)

### Installation

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Run development server:
```bash
uvicorn main:app --reload
```

Server will be available at `http://localhost:8000`

### Docker Setup

```bash
docker-compose up --build
```

## API Endpoints

### Code Execution

**POST** `/api/sandbox/execute`

Execute code against test cases.

```json
{
  "code": "function solution(x) { return x * 2; }",
  "language": "javascript",
  "test_cases": [
    {
      "input": "5",
      "expected_output": "10",
      "description": "Double the input"
    }
  ],
  "time_limit_ms": 5000
}
```

### AI Mentor

**POST** `/api/mentor/hint`

Generate AI hint for problem.

```json
{
  "problem": {
    "id": "prob-123",
    "title": "Two Sum",
    "description": "...",
    "test_cases": [...]
  },
  "code": "function solution(nums, target) { ... }",
  "hint_level": 1,
  "previous_attempts": 2
}
```

### Health

**GET** `/health` - Health check endpoint

## Development

### Code Structure

```
fastapi-backend/
├── main.py              # FastAPI app initialization
├── models.py            # Pydantic models
├── routes/
│   ├── sandbox.py       # Code execution endpoints
│   ├── mentor.py        # AI mentor endpoints
│   └── health.py        # Health check endpoints
├── services/
│   ├── executor.py      # Code execution service
│   └── mentor.py        # AI mentor service (TODO)
└── requirements.txt     # Python dependencies
```

### Adding New Routes

1. Create route file in `routes/`
2. Create APIRouter and define endpoints
3. Include router in `main.py`:

```python
from routes.myroute import router as myroute_router
app.include_router(myroute_router, prefix="/api/myroute", tags=["myroute"])
```

## Supported Languages

- Python
- JavaScript
- TypeScript
- Java (coming soon)
- C++ (coming soon)
- Go (coming soon)
- Rust (coming soon)

## Configuration

Key environment variables:

- `ENV` - Development or production
- `PORT` - Server port (default: 8000)
- `CORS_ORIGINS` - CORS allowed origins
- `CODE_EXECUTION_TIMEOUT_MS` - Execution timeout
- `OPENAI_API_KEY` - OpenAI API key for LLM
- `ANTHROPIC_API_KEY` - Anthropic API key for LLM

## Deployment

### Production Build

```bash
docker build -t auracode-backend:latest .
docker run -p 8000:8000 auracode-backend:latest
```

### Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
```

## Troubleshooting

### Port Already in Use
```bash
lsof -i :8000  # Find process
kill -9 <PID>  # Kill process
```

### Module Import Errors
```bash
pip install -r requirements.txt --force-reinstall
```

### Docker Build Issues
```bash
docker-compose down
docker system prune
docker-compose up --build
```

## Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Commit changes: `git commit -m "Add new feature"`
3. Push to branch: `git push origin feature/new-feature`
4. Submit pull request

## License

MIT
