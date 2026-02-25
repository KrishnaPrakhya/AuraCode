"""
AI React Component Evaluator Service
Uses Google Gemini to evaluate React challenge submissions across 5 dimensions
"""

import os
import json
from typing import List, Optional
from google import genai
from models import ReactEvaluationRequest, ReactEvaluationResponse, CategoryScore
from services.gemini_utils import gemini_retry_async, cache_get, cache_put

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _make_client(api_key: Optional[str] = None) -> genai.Client:
    """Return a Gemini client using the user key if supplied, otherwise fall back to env."""
    key = (api_key or "").strip() or os.getenv("GEMINI_API_KEY") or ""
    return genai.Client(api_key=key)

EVALUATION_PROMPT = """You are an expert React developer and hackathon judge. Evaluate the following React component submission for a hackathon challenge.

## Challenge
Title: {title}
Description: {description}

## Requirements the submission must meet
{requirements}

## Submitted Code ({language})
```tsx
{code}
```

## Evaluation Rubric (score each category 0-20, total /100)

1. **Component Architecture** (0-20)
   - Is the component well decomposed?
   - Are concerns properly separated?
   - Is it reusable and extensible?

2. **React Patterns & Hooks** (0-20)
   - Correct use of useState, useEffect, useMemo, useCallback
   - Proper hook rules followed
   - Good state management approach

3. **Code Quality** (0-20)
   - Clean, readable code
   - Good TypeScript types / prop types
   - Proper naming conventions and comments

4. **Functionality & Requirements** (0-20)
   - Does the component actually work as described?
   - Are all listed requirements addressed?
   - Edge cases handled

5. **UI & Accessibility** (0-20)
   - Visual quality and styling
   - Accessible (ARIA, keyboard navigation, semantic HTML)
   - Responsive design consideration

Return ONLY valid JSON in this exact format:
{{
  "overall_score": <0-100>,
  "categories": [
    {{
      "category": "Component Architecture",
      "score": <0-20>,
      "max_score": 20,
      "feedback": "<specific feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }},
    {{
      "category": "React Patterns & Hooks",
      "score": <0-20>,
      "max_score": 20,
      "feedback": "<specific feedback>",
      "suggestions": ["<suggestion 1>"]
    }},
    {{
      "category": "Code Quality",
      "score": <0-20>,
      "max_score": 20,
      "feedback": "<specific feedback>",
      "suggestions": ["<suggestion 1>"]
    }},
    {{
      "category": "Functionality & Requirements",
      "score": <0-20>,
      "max_score": 20,
      "feedback": "<specific feedback>",
      "suggestions": ["<suggestion 1>"]
    }},
    {{
      "category": "UI & Accessibility",
      "score": <0-20>,
      "max_score": 20,
      "feedback": "<specific feedback>",
      "suggestions": ["<suggestion 1>"]
    }}
  ],
  "summary": "<2-3 sentence overall summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "requirements_met": ["<requirement that is met>"],
  "requirements_unmet": ["<requirement not met>"],
  "is_complete": <true|false>
}}"""


class ReactEvaluator:
    """AI-powered React component evaluator using Gemini"""

    def __init__(self):
        self.client = client
        self.model = "gemini-flash-lite-latest"
        assert self.model == "gemini-flash-lite-latest", "ReactEvaluator must use gemini-flash-lite-latest"

    @gemini_retry_async
    async def _generate(self, prompt: str, api_key: Optional[str] = None):
        """Isolated async Gemini call — decorated with exponential-backoff retry."""
        c = _make_client(api_key)
        return c.models.generate_content(
            model=self.model,
            contents=prompt,
        )

    async def evaluate(self, request: ReactEvaluationRequest) -> ReactEvaluationResponse:
        requirements_text = "\n".join(
            f"- {r}" for r in request.requirements
        ) if request.requirements else "No specific requirements listed."

        prompt = EVALUATION_PROMPT.format(
            title=request.challenge_title,
            description=request.challenge_description,
            requirements=requirements_text,
            code=request.code,
            language=request.language,
        )

        try:
            # Check cache first — evaluation of same code+challenge is expensive
            cached = cache_get(prompt, self.model)
            if cached:
                text = cached
            else:
                response = await self._generate(prompt, getattr(request, 'gemini_api_key', None))
                text = response.text.strip()
                cache_put(prompt, text, self.model)

            # Extract JSON
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            data = json.loads(text)

            categories = [
                CategoryScore(
                    category=c["category"],
                    score=c["score"],
                    max_score=c.get("max_score", 20),
                    feedback=c["feedback"],
                    suggestions=c.get("suggestions", []),
                )
                for c in data.get("categories", [])
            ]

            return ReactEvaluationResponse(
                overall_score=data.get("overall_score", 0),
                categories=categories,
                summary=data.get("summary", ""),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                requirements_met=data.get("requirements_met", []),
                requirements_unmet=data.get("requirements_unmet", []),
                is_complete=data.get("is_complete", False),
            )

        except Exception as e:
            print(f"[Evaluator] Error: {e}")
            # Graceful fallback
            return ReactEvaluationResponse(
                overall_score=0,
                categories=[
                    CategoryScore(
                        category="Error",
                        score=0,
                        max_score=100,
                        feedback=f"Evaluation failed: {str(e)}",
                        suggestions=["Please try again"],
                    )
                ],
                summary="Evaluation service encountered an error. Please try again.",
                strengths=[],
                improvements=["Try submitting your code again"],
                requirements_met=[],
                requirements_unmet=request.requirements,
                is_complete=False,
            )


_evaluator_instance: Optional[ReactEvaluator] = None


def get_evaluator() -> ReactEvaluator:
    global _evaluator_instance
    if _evaluator_instance is None:
        _evaluator_instance = ReactEvaluator()
    return _evaluator_instance
