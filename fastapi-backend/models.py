"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Any, Literal
from enum import Enum

# ============================================================================
# CODE EXECUTION MODELS (kept for compatibility)
# ============================================================================

class TestCase(BaseModel):
    """Test case for code execution"""
    input: str
    expected_output: str
    description: Optional[str] = None
    is_hidden: Optional[bool] = False

class CodeExecutionRequest(BaseModel):
    """Request to execute code"""
    code: str
    language: Literal["javascript", "python", "typescript", "java", "cpp", "go", "rust"]
    test_cases: List[TestCase]
    time_limit_ms: Optional[int] = 5000

class TestResult(BaseModel):
    """Result of a test case execution"""
    test_case_index: int
    passed: bool
    expected_output: str
    actual_output: str
    error_message: Optional[str] = None
    execution_time_ms: int

class CodeExecutionResponse(BaseModel):
    """Response from code execution"""
    success: bool
    test_results: List[TestResult]
    execution_time_ms: int
    error: Optional[str] = None

# ============================================================================
# REACT CHALLENGE EVALUATION MODELS
# ============================================================================

class ReactEvaluationRequest(BaseModel):
    """Request to AI-evaluate a React component challenge submission"""
    code: str
    language: Literal["javascript", "typescript"] = "typescript"
    challenge_title: str
    challenge_description: str
    requirements: List[str]  # List of acceptance criteria strings

class CategoryScore(BaseModel):
    """Score and feedback for one evaluation category"""
    category: str
    score: int          # 0-20 per category
    max_score: int = 20
    feedback: str
    suggestions: List[str]

class ReactEvaluationResponse(BaseModel):
    """Full AI evaluation result for a React challenge submission"""
    overall_score: int          # 0-100
    categories: List[CategoryScore]
    summary: str
    strengths: List[str]
    improvements: List[str]
    requirements_met: List[str]    # which challenge requirements are satisfied
    requirements_unmet: List[str]  # which are not
    is_complete: bool

# ============================================================================
# HINT/MENTOR MODELS
# ============================================================================

class ProblemContext(BaseModel):
    """Problem context for hint generation"""
    id: str
    title: str
    description: str
    requirements: Optional[List[str]] = []
    test_cases: Optional[List[TestCase]] = []

class HintGenerationRequest(BaseModel):
    """Request to generate hint"""
    problem: ProblemContext
    code: str
    hint_level: Literal[0, 1, 2, 3]
    previous_attempts: int = 0

class AISuggestion(BaseModel):
    """AI suggestion for code improvement"""
    suggestion: str
    type: Literal["refactor", "fix", "optimize", "pattern"]
    explanation: str

class HintGenerationResponse(BaseModel):
    """Response with generated hint"""
    hint: str
    code_snippet: Optional[str] = None
    point_penalty: int = 0
    explanation: str

# ============================================================================
# MENTOR ANALYSIS MODELS
# ============================================================================

class CodeAnalysisRequest(BaseModel):
    """Request for code analysis"""
    problem_id: str
    code: str
    language: str
    test_results: Optional[List[TestResult]] = None

class CodeAnalysisResponse(BaseModel):
    """Response from code analysis"""
    issues: List[str]
    suggestions: List[AISuggestion]
    quality_score: float
    performance_issues: Optional[List[str]] = None

# ============================================================================
# HEALTH CHECK MODELS
# ============================================================================

class HealthStatus(BaseModel):
    """Health check response"""
    status: str = "healthy"
    version: str
    timestamp: str
    services: dict = Field(default_factory=dict)
