"""
Mentor Routes
Endpoints for AI hint generation and code analysis using LangGraph
"""

from fastapi import APIRouter, HTTPException
from models import HintGenerationRequest, HintGenerationResponse, CodeAnalysisRequest, CodeAnalysisResponse
from services.mentor import get_mentor_agent
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/hint", response_model=HintGenerationResponse)
async def generate_hint(request: HintGenerationRequest) -> HintGenerationResponse:
    """
    Generate AI-powered hint for code problem using LangGraph state machine
    
    - **problem**: Problem context (id, title, description, test_cases)
    - **code**: Current user code
    - **hint_level**: Hint level (0=nudge, 1=guidance, 2=pattern, 3=code structure)
    - **previous_attempts**: Number of hint requests so far
    """
    
    try:
        mentor = get_mentor_agent()
        
        hint_response = await mentor.generate_hint(
            problem_title=request.problem.title,
            problem_description=request.problem.description,
            requirements=request.problem.requirements or [],
            user_code=request.code,
            hint_level=request.hint_level,
            previous_attempts=request.previous_attempts
        )
        
        return hint_response
        
    except Exception as e:
        logger.error(f"Hint generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Hint generation failed: {str(e)}"
        )

@router.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest) -> CodeAnalysisResponse:
    """
    Analyze user code for improvements and issues
    
    - **problem_id**: Problem ID
    - **code**: User code to analyze
    - **language**: Programming language
    - **test_results**: Optional test results
    """
    try:
        # TODO: Implement detailed code analysis with LangChain
        return CodeAnalysisResponse(
            issues=[],
            suggestions=[],
            quality_score=0.75,
            performance_issues=None
        )
        
    except Exception as e:
        logger.error(f"Code analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Code analysis failed: {str(e)}"
        )
