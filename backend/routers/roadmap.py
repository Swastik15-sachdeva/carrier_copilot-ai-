from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm_client import stream_gemini_response
from prompts import ROADMAP_GENERATOR_PROMPT

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

class RoadmapRequest(BaseModel):
    current_skills: str
    target_role: str

@router.post("/generate")
async def generate_roadmap(
    req: RoadmapRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates a personalized, phased learning roadmap based on current skills and target role.
    Streams back the generated markdown chunks.
    """
    prompt = f"Create a career roadmap from current skills: {req.current_skills} to target job role: {req.target_role}."
    system_instruction = ROADMAP_GENERATOR_PROMPT.format(
        current_skills=req.current_skills,
        target_role=req.target_role
    )
    
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )

