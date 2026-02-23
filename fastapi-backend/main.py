"""
AuraCode FastAPI Backend
Main application server for code execution and AI mentor
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from routes.sandbox import router as sandbox_router
from routes.mentor import router as mentor_router
from routes.health import router as health_router
from routes.pair_programmer import router as pair_programmer_router
from routes.evaluate import router as evaluate_router

# Initialize FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("AuraCode FastAPI backend starting...")
    yield
    # Shutdown
    print("AuraCode FastAPI backend shutting down...")

app = FastAPI(
    title="AuraCode API",
    description="Backend for AI-driven Hackathon Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(sandbox_router, prefix="/api/sandbox", tags=["sandbox"])
app.include_router(mentor_router, prefix="/api/mentor", tags=["mentor"])
app.include_router(pair_programmer_router, prefix="/api/pair-programmer", tags=["pair-programmer"])
app.include_router(evaluate_router, tags=["evaluate"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AuraCode API",
        "status": "running",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV", "development") == "development"
    )
