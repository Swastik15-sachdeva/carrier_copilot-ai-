from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm_client import stream_gemini_response
from prompts import COVER_LETTER_PROMPT

router = APIRouter(prefix="/cover-letter", tags=["cover-letter"])

class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str

@router.post("")
async def generate_cover_letter(
    req: CoverLetterRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates a tailored cover letter mapping the candidate's resume achievements to a job description.
    Streams back the generated markdown chunks.
    """
    prompt = f"Create a custom cover letter based on candidate resume and job description."
    system_instruction = COVER_LETTER_PROMPT.format(
        resume_text=req.resume_text,
        job_description=req.job_description
    )
    
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )

