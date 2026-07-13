"""
main.py

Entry point for the AI Career Copilot backend.

Responsibilities:
- Initialize the FastAPI application.
- Configure middleware (CORS).
- Register all feature routers.
- Provide a health check endpoint for monitoring and AWS deployment.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import feature routers
from routers import (
    resume,
    roadmap,
    interview,
    cover_letter,
)

# Create the FastAPI application
app = FastAPI(
    title="AI Career Copilot API",
    version="1.0.0",
    description="Backend API for AI-powered career assistance."
)


# CORS Configuration
#
# Allows the frontend application to communicate with this backend.
# In production, replace "*" with your frontend domain.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routers
#
# Each router represents one major feature of the application.
# This keeps the project modular and easy to maintain.

app.include_router(
    resume.router,
    prefix="/resume",
    tags=["Resume Analysis"],
)

app.include_router(
    roadmap.router,
    prefix="/roadmap",
    tags=["Career Roadmap"],
)

app.include_router(
    interview.router,
    prefix="/interview",
    tags=["Mock Interview"],
)

app.include_router(
    cover_letter.router,
    prefix="/cover-letter",
    tags=["Cover Letter"],
)


# Health Check Endpoint
# Used by AWS App Runner and developers to verify that
# the backend service is running successfully.

@app.get("/health")
def health_check():
    """
    Returns the current status of the backend service.
    """
    return {
        "status": "ok",
        "service": "AI Career Copilot Backend"
    }
