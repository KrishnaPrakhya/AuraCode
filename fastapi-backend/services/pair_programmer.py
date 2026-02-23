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

load_dotenv()

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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
        self.model = "gemini-2.5-flash-lite"
        self.session_timeout = 30  # 30 seconds per session
    
    async def start_session(self, session: PairProgrammerSession) -> AsyncGenerator[str, None]:
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
        
        try:
            # Stream response from Gemini
            response = self.client.models.generate_content_stream(
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
                
        except asyncio.TimeoutError:
            yield json.dumps({
                "type": "error",
                "message": "Session timeout - pair programming window closed"
            })
        except Exception as e:
            yield json.dumps({
                "type": "error",
                "message": f"Pair programming error: {str(e)}"
            })
    
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
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
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
