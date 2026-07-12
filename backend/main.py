import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import resume, roadmap, interview, cover_letter

app = FastAPI(
    title="AI Career Copilot API",
    description="Full-stack AI Career Copilot MVP backend endpoints",
    version="1.0"
)

# Enable CORS for frontend flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(resume.router)
app.include_router(roadmap.router)
app.include_router(interview.router)
app.include_router(cover_letter.router)

@app.get("/health")
def health_check():
    """Simple health check endpoint for deployment monitoring."""
    return {"status": "ok"}

# Mount the static frontend assets at the root index
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    print(f"Warning: Frontend directory '{frontend_dir}' not found. Serving API routes only.")
