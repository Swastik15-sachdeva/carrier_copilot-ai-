from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm_client import stream_gemini_response
from prompts import COVER_LETTER_PROMPT

router = APIRouter(prefix="/cover-letter", tags=["cover-letter"])

class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str

cover_letter_cache = {}

@router.post("")
async def generate_cover_letter(
    req: CoverLetterRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates a tailored cover letter mapping the candidate's resume achievements to a job description.
    Streams back the generated markdown chunks.
    """
    # Clean and limit payload to conserve tokens
    clean_resume = " ".join(req.resume_text.split())[:8000]
    clean_jd = " ".join(req.job_description.split())[:4000]
    
    cache_key = (clean_resume, clean_jd)
    if cache_key in cover_letter_cache:
        print("Serving cover letter from cache!")
        async def cached_event_generator():
            for chunk in cover_letter_cache[cache_key]:
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

    prompt = f"Create a custom cover letter based on candidate resume and job description."
    system_instruction = COVER_LETTER_PROMPT.format(
        resume_text=clean_resume,
        job_description=clean_jd
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        cover_letter_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

