"""
Health Check Routes
"""

from fastapi import APIRouter
from models import HealthStatus
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=HealthStatus)
async def health_check():
    """Health check endpoint"""
    return HealthStatus(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat(),
        services={
            "code_executor": "operational",
            "ai_mentor": "operational"
        }
    )

@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive"}

@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    return {"status": "ready"}
