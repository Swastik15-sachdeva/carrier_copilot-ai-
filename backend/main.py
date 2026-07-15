import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GzipMiddleware
from fastapi.staticfiles import StaticFiles
from routers import resume, roadmap, interview, cover_letter, mentor_tools, telemetry
from services.storage import init_db

app = FastAPI(
    title="AI Career Copilot API",
    description="Full-stack AI Career Copilot MVP backend endpoints",
    version="1.0"
)

@app.on_event("startup")
def on_startup():
    init_db()

# Enable CORS for frontend flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable Gzip compression to speed up delivery over cellular/mobile networks
app.add_middleware(GzipMiddleware, minimum_size=1000)

# Register routers
app.include_router(resume.router)
app.include_router(roadmap.router)
app.include_router(interview.router)
app.include_router(cover_letter.router)
app.include_router(mentor_tools.router)
app.include_router(telemetry.router)

@app.get("/health")
def health_check():
    """Simple health check endpoint for deployment monitoring."""
    return {"status": "ok"}

# Custom static files subclass to add browser cache control headers for frontend assets
class CacheControlStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        # Cache static assets (JS, CSS, SVGs, etc.) heavily for performance, except HTML
        if not path.endswith(".html") and (path.startswith("assets/") or path.startswith("static/")):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response

# Mount the static frontend assets at the root index
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))

if os.path.exists(frontend_dir):
    app.mount("/", CacheControlStaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    print(f"Warning: Frontend directory '{frontend_dir}' not found. Serving API routes only.")
