"""
Sandbox Routes
Endpoints for code execution
"""

from fastapi import APIRouter, HTTPException
from models import CodeExecutionRequest, CodeExecutionResponse
from services.executor import CodeExecutor
import asyncio

router = APIRouter()

@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest) -> CodeExecutionResponse:
    """
    Execute code against test cases
    
    - **code**: The user's code to execute
    - **language**: Programming language (javascript, python, typescript, java, cpp, go, rust)
    - **test_cases**: List of test cases with input and expected output
    - **time_limit_ms**: Maximum execution time in milliseconds (default: 5000)
    """
    
    try:
        executor = CodeExecutor()
        response = await executor.execute(
            code=request.code,
            language=request.language,
            test_cases=request.test_cases,
            time_limit_ms=request.time_limit_ms or 5000
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Code execution failed: {str(e)}"
        )

@router.get("/status")
async def execution_status():
    """Check if sandbox is ready"""
    return {
        "status": "ready",
        "supported_languages": list(CodeExecutor.LANGUAGE_CONFIGS.keys())
    }
