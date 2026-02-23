"""
React Challenge Evaluation Routes
AI-powered evaluation of React component submissions
"""

from fastapi import APIRouter, HTTPException
from models import ReactEvaluationRequest, ReactEvaluationResponse
from services.evaluator import get_evaluator

router = APIRouter(prefix="/api/evaluate", tags=["evaluate"])


@router.post("/", response_model=ReactEvaluationResponse)
async def evaluate_react_component(request: ReactEvaluationRequest):
    """
    AI-evaluate a React component submission.
    Returns scored rubric across 5 dimensions with specific feedback.
    """
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    if not request.challenge_title:
        raise HTTPException(status_code=400, detail="challenge_title is required")

    evaluator = get_evaluator()
    result = await evaluator.evaluate(request)
    return result
