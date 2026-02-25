"""
AI Pair Programmer Service
Provides real-time collaborative coding assistance using Google Gemini
"""

import os
import asyncio
import json
from typing import AsyncGenerator
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
from services.gemini_utils import gemini_retry_sync, _is_rate_error, MAX_RETRIES, INITIAL_DELAY

load_dotenv()

# Initialize default Gemini client (used when no per-user key is provided)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _make_client(api_key: str | None = None) -> genai.Client:
    """Return a Gemini client using the user key if supplied, otherwise fall back to env."""
    key = (api_key or "").strip() or os.getenv("GEMINI_API_KEY") or ""
    return genai.Client(api_key=key)

class CodeSuggestion(BaseModel):
    """Model for AI pair programming suggestions"""
    suggestion: str
    explanation: str
    code_snippet: str | None = None
    language: str

class PairProgrammerSession(BaseModel):
    """Session state for pair programming"""
    session_id: str
    user_code: str
    problem_description: str
    language: str
    context_window: list[dict]  # Conversation history

class PairProgrammer:
    """AI Pair Programmer using Google Gemini"""
    
    def __init__(self):
        self.client = client
        self.model = "gemini-flash-lite-latest"
        # sanity check in case someone accidentally changes the hardcoded value
        assert self.model == "gemini-flash-lite-latest", "PairProgrammer must use gemini-flash-lite-latest"
        self.session_timeout = 30  # 30 seconds per session
    
    async def start_session(self, session: PairProgrammerSession, api_key: str | None = None) -> AsyncGenerator[str, None]:
        """
        Start a 30-second pair programming session with streaming responses
        Yields JSON-formatted suggestions in real-time
        """
        
        prompt = f"""You are an expert React developer pair programming with someone building a React component for a hackathon challenge.

Challenge: {session.problem_description}

Their current React code ({session.language}):
```tsx
{session.user_code}
```

Your goal is to:
1. Identify what they are building and where they left off
2. Suggest the single most impactful next step in building this React component
3. Mention a specific hook, pattern, or JSX snippet they should write next (max 8 lines)
4. Be encouraging and keep it actionable

Focus on React-specific guidance: component structure, hooks (useState, useEffect, useMemo), props, event handlers, conditional rendering, lists, forms, accessibility.

Respond as JSON with keys: suggestion (what to do next), explanation (why this matters), code_snippet (short example, optional), language"""
        
        full_response = ""
        last_exc = None
        gemini_client = _make_client(api_key)

        for attempt in range(MAX_RETRIES + 1):
            if attempt > 0:
                delay = INITIAL_DELAY * (2 ** (attempt - 1))
                import logging
                logging.getLogger(__name__).warning(
                    "[pair_programmer] 429 retry %d/%d after %.1f s", attempt, MAX_RETRIES, delay
                )
                await asyncio.sleep(delay)
            try:
                # Stream response from Gemini
                response = gemini_client.models.generate_content_stream(
                    model=self.model,
                    contents=prompt
                )
                
                for chunk in response:
                    if chunk.text:
                        text = chunk.text
                        full_response += text
                        yield text
                
                # Parse final JSON response
                try:
                    # Extract JSON from response (may contain markdown)
                    import re
                    json_match = re.search(r'\{.*\}', full_response, re.DOTALL)
                    if json_match:
                        suggestion_data = json.loads(json_match.group())
                        yield json.dumps({
                            "type": "suggestion_complete",
                            "data": suggestion_data
                        })
                except json.JSONDecodeError:
                    # Fallback if response isn't valid JSON
                    yield json.dumps({
                        "type": "suggestion_complete",
                        "data": {
                            "suggestion": full_response,
                            "explanation": "Pair programming suggestion",
                            "language": session.language
                        }
                    })
                return  # success — exit the retry loop

            except asyncio.TimeoutError:
                yield json.dumps({
                    "type": "error",
                    "message": "Session timeout - pair programming window closed"
                })
                return
            except Exception as e:
                if _is_rate_error(e) and attempt < MAX_RETRIES:
                    last_exc = e
                    continue
                yield json.dumps({
                    "type": "error",
                    "message": f"Pair programming error: {str(e)}"
                })
                return

        yield json.dumps({"type": "error", "message": f"Rate limit: {last_exc}"})
    
    @gemini_retry_sync
    def _analyze_sync(self, prompt: str, api_key: str | None = None):
        """Isolated sync Gemini call with retry decorator."""
        return _make_client(api_key).models.generate_content(
            model=self.model,
            contents=prompt
        )

    async def analyze_next_step(self, session: PairProgrammerSession) -> CodeSuggestion:
        """Synchronous analysis of the next coding step"""
        
        prompt = f"""Given this code and problem, what's the next best step?

Problem: {session.problem_description}

Current code in {session.language}:
```
{session.user_code}
```

Respond with JSON: {{"suggestion": "...", "explanation": "...", "code_snippet": "..."}}"""

        try:
            response = self._analyze_sync(prompt, api_key)
            
            import re
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            data = json.loads(json_match.group()) if json_match else {}
            return CodeSuggestion(
                suggestion=data.get("suggestion", ""),
                explanation=data.get("explanation", ""),
                code_snippet=data.get("code_snippet"),
                language=session.language
            )
        except Exception as e:
            return CodeSuggestion(
                suggestion="Unable to generate suggestion",
                explanation=str(e),
                language=session.language
            )

# Singleton instance
_pair_programmer: PairProgrammer | None = None

def get_pair_programmer() -> PairProgrammer:
    """Get or create pair programmer instance"""
    global _pair_programmer
    if _pair_programmer is None:
        _pair_programmer = PairProgrammer()
    return _pair_programmer
