"""
AI React Mentor Service using Google Gemini
Provides intelligent coaching for React component building challenges
"""

from typing import List, Optional
from google import genai
from models import HintGenerationResponse
import os
from services.gemini_utils import gemini_retry_sync, cache_get, cache_put

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ============================================================================
# REACT-FOCUSED PROMPTS
# ============================================================================

HINT_GENERATION_PROMPTS = {
    0: """You are a React mentor. Give a gentle nudge (one encouraging sentence) for this React challenge.

Challenge: {problem}
Student code (summarised):
{code}

Focus on React-specific guidance. Be brief and encouraging. Do NOT give away the solution.""",

    1: """You are a React mentor. Give a helpful guidance-level hint (2-3 sentences).

Challenge: {problem}
Student code:
{code}

Guide the developer toward the right React approach — component structure, which hooks to use, or state management strategy. Don’t show code yet.""",

    2: """You are a React mentor. Give a pattern-level hint showing a React pattern or hook example.

Challenge: {problem}
Student code:
{code}

Explain the relevant React pattern (e.g. controlled inputs, lifting state, useEffect cleanup, custom hooks). Include a short code snippet showing the pattern skeleton, NOT the full solution.""",

    3: """You are a React mentor. Give structure-level guidance with a component scaffold.

Challenge: {problem}
Student code:
{code}

Provide the component structure outline with:
- Suggested component breakdown
- Which hooks to use and why
- Key props/state shape
- Commented scaffold code (not the full working solution)""",
}

# ============================================================================
# GEMINI REACT MENTOR AGENT
# ============================================================================

class MentorAgent:
    """AI React Mentor Agent using Google Gemini for React-focused coaching"""
    
    def __init__(self):
        self.client = client
        self.model = "gemini-2.0-flash-lite"

    @gemini_retry_sync
    def _call_gemini(self, prompt: str) -> str:
        """Single Gemini call, decorated with exponential-backoff retry on 429."""
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        return response.text.strip()

    def _generate_hint(
        self,
        problem_title: str,
        problem_description: str,
        user_code: str,
        hint_level: int,
    ) -> tuple[str, Optional[str]]:
        """Generate a React hint using a single Gemini call (no separate analysis pass)."""
        problem_text = f"{problem_title}: {problem_description}"
        code_preview = user_code[:1500]  # cap to keep tokens down

        prompt = HINT_GENERATION_PROMPTS[hint_level].format(
            problem=problem_text,
            code=code_preview,
        )

        try:
            hint_content = self._call_gemini(prompt)
            code_snippet = None

            if hint_level >= 2 and "```" in hint_content:
                parts = hint_content.split("```")
                if len(parts) >= 3:
                    code_snippet = parts[1].strip()
                    lang_prefixes = ("tsx", "typescript", "javascript", "jsx", "python", "java", "cpp")
                    if code_snippet.startswith(lang_prefixes):
                        code_snippet = "\n".join(code_snippet.split("\n")[1:])
        except Exception as e:
            print(f"Hint generation error: {e}")
            hint_content = "Think about breaking your component into smaller, focused pieces."
            code_snippet = None

        return hint_content, code_snippet

    def _calculate_penalty(self, hint_level: int, previous_attempts: int) -> int:
        base_penalties = {0: 2, 1: 5, 2: 10, 3: 20}
        penalty = base_penalties.get(hint_level, 0)
        if previous_attempts > 3:
            penalty = int(penalty * 1.5)
        return penalty

    async def generate_hint(
        self,
        problem_title: str,
        problem_description: str,
        requirements: List[str],
        user_code: str,
        hint_level: int,
        previous_attempts: int = 0
    ) -> HintGenerationResponse:
        """Generate AI React coaching hint (single Gemini call with cache)."""
        try:
            adjusted_level = min(hint_level, 3)
            if previous_attempts > 5 and adjusted_level < 3:
                adjusted_level += 1

            # Build the prompt to check cache before calling Gemini
            problem_text = f"{problem_title}: {problem_description}"
            cache_prompt = HINT_GENERATION_PROMPTS[adjusted_level].format(
                problem=problem_text,
                code=user_code[:1500],
            )

            # Check in-memory cache — same code + same level = same hint
            cached_text = cache_get(cache_prompt, self.model)
            if cached_text:
                print("[mentor] cache hit — skipping Gemini call")
                hint_content = cached_text
                code_snippet = None
                if adjusted_level >= 2 and "```" in hint_content:
                    parts = hint_content.split("```")
                    if len(parts) >= 3:
                        code_snippet = parts[1].strip()
            else:
                hint_content, code_snippet = self._generate_hint(
                    problem_title, problem_description, user_code, adjusted_level
                )
                if hint_content:
                    cache_put(cache_prompt, hint_content, self.model)

            penalty = self._calculate_penalty(adjusted_level, previous_attempts)

            return HintGenerationResponse(
                hint=hint_content,
                code_snippet=code_snippet,
                point_penalty=penalty,
                explanation=f"Level {adjusted_level} React coaching hint."
            )
        except Exception as e:
            print(f"Mentor error: {e}")
            return HintGenerationResponse(
                hint="Try thinking about component decomposition — what smaller pieces does this UI need?",
                code_snippet=None,
                point_penalty=5,
                explanation="Error generating hint — please try again"
            )


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_mentor_instance: Optional[MentorAgent] = None


def get_mentor_agent() -> MentorAgent:
    """Get or create mentor agent singleton"""
    global _mentor_instance
    if _mentor_instance is None:
        _mentor_instance = MentorAgent()
    return _mentor_instance
