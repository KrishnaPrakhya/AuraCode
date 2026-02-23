"""
AI Pair Programmer Routes
Streaming endpoints for real-time collaborative coding assistance
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import logging
from services.pair_programmer import (
    get_pair_programmer,
    PairProgrammerSession,
    CodeSuggestion
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/session/stream")
async def stream_pair_programming(session_data: dict):
    """
    Stream 30-second pair programming session with real-time suggestions
    
    - **session_id**: Unique session identifier
    - **user_code**: Current code from user
    - **problem_description**: Problem statement
    - **language**: Programming language
    """
    
    try:
        session = PairProgrammerSession(
            session_id=session_data.get("session_id", ""),
            user_code=session_data.get("user_code", ""),
            problem_description=session_data.get("problem_description", ""),
            language=session_data.get("language", "python"),
            context_window=session_data.get("context_window", [])
        )
        
        pair_programmer = get_pair_programmer()
        
        async def generate():
            async for chunk in pair_programmer.start_session(session):
                yield chunk.encode() + b"\n"
        
        return StreamingResponse(
            generate(),
            media_type="application/x-ndjson"
        )
        
    except Exception as e:
        logger.error(f"Pair programming session failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Session failed: {str(e)}"
        )

@router.post("/next-step")
async def get_next_step(session_data: dict) -> CodeSuggestion:
    """
    Get synchronized suggestion for next coding step
    
    Returns complete suggestion synchronously (not streaming)
    """
    
    try:
        session = PairProgrammerSession(
            session_id=session_data.get("session_id", ""),
            user_code=session_data.get("user_code", ""),
            problem_description=session_data.get("problem_description", ""),
            language=session_data.get("language", "python"),
            context_window=session_data.get("context_window", [])
        )
        
        pair_programmer = get_pair_programmer()
        suggestion = await pair_programmer.analyze_next_step(session)
        
        return suggestion
        
    except Exception as e:
        logger.error(f"Next step analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@router.post("/end-session")
async def end_pair_session(session_data: dict):
    """End pair programming session and log usage"""
    
    try:
        # TODO: Log session usage to database for billing
        # - session_id
        # - duration (30 seconds)
        # - tokens_used
        # - problem_id
        # - user_id
        
        return {
            "status": "closed",
            "session_id": session_data.get("session_id"),
            "message": "Pair programming session ended"
        }
        
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
