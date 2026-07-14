from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm_client import stream_gemini_response
from prompts import ROADMAP_GENERATOR_PROMPT

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

class RoadmapRequest(BaseModel):
    current_skills: str
    target_role: str

roadmap_cache = {}

@router.post("/generate")
async def generate_roadmap(
    req: RoadmapRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates a personalized, phased learning roadmap based on current skills and target role.
    Streams back the generated markdown chunks.
    """
    cache_key = (req.current_skills.strip().lower(), req.target_role.strip().lower())
    if cache_key in roadmap_cache:
        print("Serving roadmap from cache!")
        async def cached_event_generator():
            for chunk in roadmap_cache[cache_key]:
                yield chunk
        return StreamingResponse(
            cached_event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    prompt = f"Create a career roadmap from current skills: {req.current_skills} to target job role: {req.target_role}."
    system_instruction = ROADMAP_GENERATOR_PROMPT.format(
        current_skills=req.current_skills,
        target_role=req.target_role
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        roadmap_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

